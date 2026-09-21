/**
 * Spot prices and the melt arithmetic.
 *
 * Two kinds of check, and the second is the one that matters:
 *
 *   - the arithmetic and the formatting are what the pages print, so they are
 *     pinned here rather than eyeballed in a browser;
 *   - every rendered figure must carry the phrase "based on spot prices at
 *     <time>". The failure this guards against is somebody editing the copy and
 *     leaving the site stating a reading taken hours ago as the current price.
 *   - `/api/spot` reads a cache and must never call a price feed. The feed
 *     behind the cache allows a hundred calls a month, and an endpoint that
 *     called it would spend one per region per hour.
 *
 * Run: node --experimental-strip-types --no-warnings --import ./tests/ts-resolve.mjs tests/spot.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  METALS,
  SPOT,
  SPOT_AS_OF,
  SPOT_MAX_AGE_SECONDS,
  SPOT_BROWSER_MAX_AGE_SECONDS,
  SPOT_CACHE_CONTROL,
  REFERENCE_SPOT,
  METAL_LABEL,
  spotPrice,
  meltValue,
  formatUsd,
  formatOzt,
  coinMetal,
  spotCaveat,
  spotStamp,
  spotStripNote,
  spotLadder,
  parseSpot,
  plainUsd,
  markedUsd,
  spotAsOfLabel,
  spotBasis,
  referenceClause,
} from '../src/lib/spot.ts';
import { SPOT_SNAPSHOT } from '../src/data/spot-snapshot.ts';
import { handleSpot, refreshDecision } from '../src/server/spot.ts';

/** The feed's name, which must never appear in anything a reader sees. */
const SPOT_SOURCE_LITERAL = 'metals.dev';

/** A snapshot that is nothing like the reference one, for the rescale checks. */
const LIVE = {
  prices: { silver: 41.5, gold: 3120, platinum: 980 },
  asOf: '2027-03-02T11:05:00Z',
  source: 'a feed',
  live: true,
};

test('every metal has a positive price and a label', () => {
  for (const metal of Object.keys(SPOT)) {
    assert.ok(SPOT[metal] > 0, `${metal} has no price`);
    assert.equal(spotPrice(metal), SPOT[metal]);
    assert.ok(METAL_LABEL[metal], `${metal} has no display label`);
  }
});

test('SPOT_AS_OF is a real timestamp, not a bumped one', () => {
  // A full timestamp rather than a day, because the minute is printed: the
  // figures are refreshed on a schedule the site does not control, so the time
  // of the reading is what tells a reader how much to trust the number.
  assert.match(SPOT_AS_OF, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(!Number.isNaN(Date.parse(SPOT_AS_OF)));
  assert.ok(Date.parse(SPOT_AS_OF) <= Date.now(), 'the built-in reading is dated in the future');
});

test('the built-in reading is what the build renders, unrounded', () => {
  // src/data/spot-snapshot.ts is what the static build bakes into every page
  // and what /api/spot falls back to. REFERENCE_SPOT must be that file and not
  // a re-assembly of it: prices under a timestamp from a different reading is
  // the one thing the snapshot type exists to prevent.
  assert.equal(REFERENCE_SPOT, SPOT_SNAPSHOT);
  assert.ok(parseSpot(JSON.parse(JSON.stringify(SPOT_SNAPSHOT))), 'the built-in reading is malformed');

  // Unrounded, as read. Rounding happens once, at the point of display, so a
  // figure a page prints is rounded from the number its arithmetic used. A
  // table of prices that are all exactly two decimals is a table somebody
  // rounded on the way in.
  const rounded = METALS.filter((m) => SPOT[m] === Math.round(SPOT[m] * 100) / 100);
  assert.ok(
    rounded.length < METALS.length,
    'every built-in price is rounded to the cent -- rounding belongs at display only',
  );

  // And display does round: cents under $100, whole dollars above.
  assert.match(formatUsd(SPOT.silver), /^\$\d+\.\d{2}$/);
  assert.ok(!formatUsd(SPOT.gold).includes('.'));
});

test('nothing reachable from api/ imports without an extension', () => {
  // This one shipped and 500ed in production, which is the only reason it has a
  // test. `src/lib/` imports extensionlessly because Vite prefers it, and that
  // was harmless for as long as every endpoint ran on the edge runtime: esbuild
  // bundles an edge function and resolves the specifier on the way through.
  //
  // The Node runtime does not bundle. It ships the compiled files and resolves
  // them with real Node ESM rules, which require the extension -- so the moment
  // /api/spot moved to Node to get the Blob SDK, an extensionless import three
  // modules deep became ERR_MODULE_NOT_FOUND at invocation. Nothing local
  // catches it: the build passes, the typecheck passes, the tests pass, because
  // Vite and the test hook both resolve it.
  const seen = new Set();
  const offenders = [];

  const walk = (file) => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const [, spec] of source.matchAll(/from\s+'(\.[^']*)'/g)) {
      if (!/\.(js|ts|json)$/.test(spec)) {
        offenders.push(`${file} imports '${spec}' without an extension`);
        continue;
      }
      // '.js' on disk is '.ts'; follow it either way.
      const resolved = join(dirname(file), spec.replace(/\.js$/, '.ts'));
      walk(existsSync(resolved) ? resolved : join(dirname(file), spec));
    }
  };

  for (const entry of readdirSync('api').filter((f) => f.endsWith('.ts'))) {
    walk(join('api', entry));
  }

  assert.ok(seen.size > 3, 'the import walk found nothing -- the test is not testing');
  assert.deepEqual(offenders, [], `these would fail on the Node runtime:\n${offenders.join('\n')}`);
});

test('the feed is reached one way only, and never through the cache URL', () => {
  // The endpoint does hold the feed key -- it is what refreshes the cached
  // document. What must stay true is that there is exactly ONE path to the feed,
  // the guarded refresh, so the clock and the budget cannot be bypassed. A
  // second call site would be a second way to spend the month's allowance.
  const handler = readFileSync('src/server/spot.ts', 'utf8');
  assert.ok(!/api\.metals\.dev/.test(handler), 'the handler builds its own feed URL');
  assert.equal(
    (handler.match(/fetchMetalsDev\(/g) ?? []).length,
    1,
    'the feed is called from somewhere other than refresh() -- there is one call site',
  );
  // And the key is never put in a URL by anything here: a key in a URL is a key
  // in the platform's logs, the CDN's logs and the next request's Referer. The
  // one place it is allowed is the feed request itself, in metals-dev.ts.
  assert.ok(!/api_key/.test(handler), 'the handler puts a key in a URL');

  const example = readFileSync('.env.example', 'utf8');
  assert.ok(example.includes('SPOT_CACHE_URL='), '.env.example does not document the cache URL');
  assert.ok(example.includes('METALS_DEV_API_KEY='), '.env.example does not document the feed key');
  assert.ok(!example.includes('SPOT_API_KEY='), '.env.example still documents the retired key');
});

test('melt value is weight times spot', () => {
  assert.equal(meltValue(1, 'silver'), SPOT.silver);
  assert.equal(meltValue(0.1808, 'silver'), 0.1808 * SPOT.silver);
  assert.equal(meltValue(0.9675, 'gold'), 0.9675 * SPOT.gold);
});

test('a coin with no precious metal has no melt value, not a zero', () => {
  // Rendering "$0.00 of silver" on a bronze cent is worse than rendering
  // nothing, so the absence has to be distinguishable from a number.
  assert.equal(meltValue(undefined, 'silver'), undefined);
  assert.equal(meltValue(0, 'silver'), undefined);
  assert.equal(coinMetal({}), undefined);
  assert.deepEqual(coinMetal({ silverOzt: 0.1808 }), { metal: 'silver', troyOunces: 0.1808 });
  assert.deepEqual(coinMetal({ goldOzt: 0.2419 }), { metal: 'gold', troyOunces: 0.2419 });
});

test('money is formatted to cents under $100 and whole dollars above', () => {
  assert.equal(formatUsd(11.752), '$11.75');
  assert.equal(formatUsd(0.7), '$0.70');
  assert.equal(formatUsd(4353.75), '$4,354');
});

test('every provenance string is the one phrase, with a time and no vendor', () => {
  // One sentence, written once in spotBasis() and built into everything else,
  // so it cannot be reworded on one page and not another.
  assert.match(spotBasis(LIVE), /^based on spot prices at 2 March 2027 11:05 UTC$/);

  for (const metal of METALS) {
    for (const [name, text] of [
      ['stamp', spotStamp(metal, LIVE)],
      ['caveat', spotCaveat(metal, LIVE)],
    ]) {
      assert.ok(text.includes(spotBasis(LIVE)), `${metal} ${name} omits the provenance phrase`);
      assert.ok(text.includes(formatUsd(LIVE.prices[metal])), `${metal} ${name} omits its price`);
      // No vendor name anywhere a reader can see it. The source travels in the
      // snapshot and comes back from /api/spot; it is simply not printed.
      assert.ok(!text.includes(LIVE.source), `${metal} ${name} names the source`);
    }
  }
  assert.ok(spotStripNote(LIVE).startsWith('Based on spot prices at '));
  assert.ok(!spotStripNote(LIVE).includes(LIVE.source));
  assert.equal(referenceClause(LIVE), `, ${spotBasis(LIVE)}`);

  // A price with no time on it is the failure this replaced: the old wording
  // named a vendor and a day, which told a reader nothing about how stale the
  // figure was.
  for (const text of [spotStamp('silver'), spotCaveat('silver'), spotStripNote()]) {
    assert.ok(text.includes(spotAsOfLabel()), 'a provenance string omits the reading time');
    assert.ok(!text.includes(SPOT_SOURCE_LITERAL), 'a provenance string names the feed');
  }
});


/* ===========================================================================
   The snapshot, the endpoint and the browser's half
   ===========================================================================

   The prices are rendered twice -- once by the build, once by the browser
   after /api/spot answers -- and the whole arrangement rests on both halves
   calling these same functions. What is pinned below is that a function
   actually reads the snapshot it was handed, because the failure mode of one
   that quietly reads the module constant instead is a page that fetches a new
   price, congratulates itself, and prints the old one.
   =========================================================================== */

test('every derived string reads the snapshot it was given, not the module', () => {
  for (const metal of METALS) {
    assert.ok(
      spotStamp(metal, LIVE).includes(formatUsd(LIVE.prices[metal])),
      `${metal} stamp ignored the snapshot it was handed`,
    );
    assert.ok(
      spotCaveat(metal, LIVE).includes(formatUsd(LIVE.prices[metal])),
      `${metal} caveat ignored the snapshot it was handed`,
    );
    assert.ok(
      !spotStamp(metal, LIVE).includes(formatUsd(SPOT[metal])),
      `${metal} stamp still carries the reference price`,
    );
    // Including the time in it: a stamp still carrying the build's timestamp
    // beside a price the browser has just rewritten is the failure mode this
    // whole arrangement exists to prevent.
    assert.ok(spotStamp(metal, LIVE).includes('2 March 2027'));
    assert.ok(!spotStamp(metal, LIVE).includes(spotAsOfLabel(REFERENCE_SPOT)));
  }
  assert.ok(spotStripNote(LIVE).includes('2 March 2027'));
  assert.ok(!spotStripNote(LIVE).includes(spotAsOfLabel(REFERENCE_SPOT)));
});

test('a reading renders with its time, and a bare date without one', () => {
  // A timestamp is what a feed gives and what the site now prints, to the
  // minute and named as UTC -- a static page cannot know the reader's zone, and
  // a time with no zone on it is wrong for most of the world.
  assert.equal(spotAsOfLabel(LIVE), '2 March 2027 11:05 UTC');
  // A bare ISO date still renders, as the day alone, because parseSpot accepts
  // one and a cache document is written by something outside this repository.
  assert.equal(spotAsOfLabel({ ...LIVE, asOf: '2027-03-02' }), '2 March 2027');
  // Not pinned to a literal: `npm run spot` rewrites the built-in reading, so a
  // date typed in here would be a test that fails on a Tuesday. What is pinned
  // is that the ISO form never reaches a reader.
  assert.ok(spotStamp('silver').includes(spotAsOfLabel()));
  assert.ok(!spotStamp('silver').includes(SPOT_AS_OF));
});

test('the ladder re-centres on the snapshot', () => {
  // The rungs move with the price, not only the ratios. A ladder still
  // centred on yesterday's price, under figures worked at today's, is the one
  // block on an archive that visibly contradicts itself.
  for (const metal of METALS) {
    assert.ok(spotLadder(metal, LIVE).includes(LIVE.prices[metal]), 'spot is not on its own ladder');
    assert.ok(!spotLadder(metal, LIVE).includes(SPOT[metal]) || SPOT[metal] === LIVE.prices[metal]);
    assert.deepEqual(
      [...spotLadder(metal, LIVE)].sort((a, b) => a - b),
      spotLadder(metal, LIVE),
      'the ladder is not ascending',
    );
  }
});

test('a marked figure is the plain figure plus a span that describes it', () => {
  const spec = { kind: 'value', metal: 'silver', ozt: 0.1808 };
  const amount = 0.1808 * SPOT.silver;
  assert.equal(plainUsd(amount, spec), formatUsd(amount));
  assert.equal(
    markedUsd(amount, spec),
    `<span data-spot="value" data-spot-metal="silver" data-spot-ozt="0.1808">${formatUsd(amount)}</span>`,
  );
  // A price carries its unit in the plain form too, or the sentence around it
  // would read "worked at $65.00 a troy ounce/ozt" on one side and not the
  // other.
  assert.equal(plainUsd(65, { kind: 'price-unit', metal: 'silver' }), '$65.00/ozt');
  assert.equal(plainUsd(65, { kind: 'price', metal: 'silver' }), '$65.00');
});

test('parseSpot accepts what the site produces and refuses what it cannot use', () => {
  assert.deepEqual(parseSpot(JSON.parse(JSON.stringify(REFERENCE_SPOT))), REFERENCE_SPOT);
  assert.deepEqual(parseSpot(JSON.parse(JSON.stringify(LIVE))), LIVE);

  // A partial answer is refused outright rather than merged over the
  // reference table: a live silver price beside a hand-set gold one, under one
  // dateline claiming both, is the outcome the snapshot type exists to stop.
  assert.equal(parseSpot({ ...LIVE, prices: { silver: 41.5, gold: 3120 } }), undefined);
  assert.equal(parseSpot({ ...LIVE, prices: { ...LIVE.prices, silver: 0 } }), undefined);
  assert.equal(parseSpot({ ...LIVE, prices: { ...LIVE.prices, silver: -1 } }), undefined);
  assert.equal(parseSpot({ ...LIVE, prices: { ...LIVE.prices, silver: 'lots' } }), undefined);
  assert.equal(parseSpot({ ...LIVE, asOf: '' }), undefined);
  assert.equal(parseSpot({ ...LIVE, source: '' }), undefined);
  assert.equal(parseSpot(undefined), undefined);
  assert.equal(parseSpot('nope'), undefined);

  // `live` is true only when it is exactly true. Anything else is a snapshot
  // that gets the caveat, which is the safe direction to be wrong in.
  assert.equal(parseSpot({ ...LIVE, live: 'yes' })?.live, false);
});

test('the endpoint answers with a snapshot the browser will accept', async () => {
  const res = await handleSpot(new Request('https://example.com/api/spot'), {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);

  const body = await res.json();
  const snap = parseSpot(body);
  assert.ok(snap, 'the endpoint returned something its own parser refuses');
  assert.deepEqual(snap, REFERENCE_SPOT);

  // Nothing on this site is a real-time quote, and the snapshot says so on the
  // wire as well as in the wording on the page.
  assert.equal(snap.live, false);
});

/* ---------------------------------------------------------------------------
   The cache the endpoint reads
   ---------------------------------------------------------------------------

   The endpoint's whole job is to hand the browser a cached snapshot somebody
   else wrote. Everything below is a way that can go wrong, and every one of
   them has to end with a reader seeing a correct figure rather than a blank.
   --------------------------------------------------------------------------- */

/** Run `fn` with global fetch replaced, recording what was asked for. */
async function withFetch(reply, fn) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    return reply(String(url), init);
  };
  try {
    return { result: await fn(), calls };
  } finally {
    globalThis.fetch = real;
  }
}

const ask = (env) => handleSpot(new Request('https://example.com/api/spot'), env);

const CACHED = {
  prices: { silver: 52.125, gold: 3999.5, platinum: 1234.75 },
  asOf: '2027-01-04T09:30:00Z',
  source: 'a cache',
  live: false,
};

test('the cached snapshot is what the endpoint serves', async () => {
  const { result, calls } = await withFetch(
    () => new Response(JSON.stringify(CACHED), { headers: { 'content-type': 'application/json' } }),
    () => ask({ SPOT_CACHE_URL: 'https://cache.example/spot.json' }),
  );
  assert.deepEqual(calls, ['https://cache.example/spot.json']);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), CACHED);
});

test('every way the cache can fail ends in the built-in reading, at 200', async () => {
  // Not a 503. A reader whose browser cannot reach the cache is looking at a
  // page that already shows the built-in figures, and the honest answer is the
  // one the build rendered -- labelled with the time it was read, like every
  // other figure on the site.
  const failures = {
    'a 500': () => new Response('nope', { status: 500 }),
    'a 404': () => new Response('', { status: 404 }),
    'not JSON': () => new Response('<html>', { headers: { 'content-type': 'text/html' } }),
    'a thrown request': () => {
      throw new Error('ECONNREFUSED');
    },
    // Half a snapshot is a failure, not something to merge over the built-in
    // table: one metal's price from one reading beside another's from a
    // different one, under a single timestamp claiming both.
    'half a snapshot': () =>
      new Response(JSON.stringify({ ...CACHED, prices: { silver: 52.125 } })),
    'a snapshot with no time on it': () =>
      new Response(JSON.stringify({ ...CACHED, asOf: '' })),
    'a negative price': () =>
      new Response(JSON.stringify({ ...CACHED, prices: { ...CACHED.prices, gold: -1 } })),
  };

  for (const [name, reply] of Object.entries(failures)) {
    const { result } = await withFetch(reply, () =>
      ask({ SPOT_CACHE_URL: 'https://cache.example/spot.json' }),
    );
    assert.equal(result.status, 200, `${name} produced a ${result.status}`);
    assert.deepEqual(await result.json(), REFERENCE_SPOT, `${name} did not fall back`);
  }
});

test('with no cache configured the endpoint asks nobody', async () => {
  const { result, calls } = await withFetch(
    () => assert.fail('the endpoint fetched with no cache URL set'),
    () => ask({}),
  );
  assert.deepEqual(calls, []);
  assert.deepEqual(await result.json(), REFERENCE_SPOT);
});

test('a cache URL that is really a price feed is refused, unfetched', async () => {
  // The mistake this exists to stop: somebody "simplifying" the arrangement by
  // pointing this straight at the upstream, which bills per call and would be
  // hit once per region per hour until the month's allowance was gone. And a
  // key in a URL is a key in this platform's logs, the CDN's logs and the next
  // request's Referer.
  const refused = [
    'https://api.metals.dev/v1/latest?api_key=secret&currency=USD&unit=toz',
    'https://metals.dev/v1/latest',
    'https://cache.example/spot.json?api_key=secret',
    'https://cache.example/spot.json?token=secret',
    'http://cache.example/spot.json',
    'not-a-url',
  ];
  for (const url of refused) {
    const { result, calls } = await withFetch(
      () => assert.fail(`the endpoint fetched a refused URL: ${url}`),
      () => ask({ SPOT_CACHE_URL: url }),
    );
    assert.deepEqual(calls, [], `${url} was fetched`);
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), REFERENCE_SPOT);
  }

  // An ordinary https document is not refused, or the guard would be a way of
  // switching the feature off by accident.
  const { calls } = await withFetch(
    () => new Response(JSON.stringify(CACHED)),
    () => ask({ SPOT_CACHE_URL: 'https://assets.example/spot.json' }),
  );
  assert.deepEqual(calls, ['https://assets.example/spot.json']);
});

/* ---------------------------------------------------------------------------
   Refreshing the cache, and not spending the allowance
   ---------------------------------------------------------------------------

   There is no cron: the endpoint refreshes the cached document when it has gone
   stale. The feed allows a hundred calls a MONTH, so what is pinned below is
   every reason NOT to call it. These are the tests that stand between a
   mistake and a suspended feed account.
   --------------------------------------------------------------------------- */

const HOUR = 3_600_000;
const NOW = new Date('2027-01-20T12:00:00Z');
/**
 * The month the refresh path will compute for itself.
 *
 * `refresh()` reads the real clock, so a fixture pinned to a literal month
 * would look like a different month to it and have its call count reset -- which
 * is correct behaviour and a misleading test.
 */
const THIS_MONTH = new Date().toISOString().slice(0, 7);
const doc = (over = {}) => ({
  ...CACHED,
  fetchedAt: new Date(NOW.getTime() - 1 * HOUR).toISOString(),
  month: THIS_MONTH,
  calls: 3,
  ...over,
});

/** The same fixture, but dated to NOW's month, for the decisions that pass NOW. */
const docAtNow = (over = {}) => doc({ month: NOW.toISOString().slice(0, 7), ...over });

test('the clock decides when a call is spent', () => {
  // The ordinary case: one refresh a day, and nothing in between.
  assert.equal(refreshDecision(docAtNow(), NOW).refresh, false);
  assert.equal(
    refreshDecision(docAtNow({ fetchedAt: new Date(NOW.getTime() - 19 * HOUR).toISOString() }), NOW)
      .refresh,
    false,
  );
  assert.equal(
    refreshDecision(docAtNow({ fetchedAt: new Date(NOW.getTime() - 21 * HOUR).toISOString() }), NOW)
      .refresh,
    true,
  );

  // Nothing cached at all is the first-run state, and the one case that must
  // refresh immediately -- it is what creates the document.
  assert.equal(refreshDecision(undefined, NOW).refresh, true);
  // A document from an older writer, or edited by hand, records no fetch time.
  assert.equal(refreshDecision(docAtNow({ fetchedAt: '' }), NOW).refresh, true);

  // A fetch time in the future is a clock fault somewhere, and refreshing on it
  // would refresh on every single request until real time caught up.
  assert.equal(
    refreshDecision(docAtNow({ fetchedAt: new Date(NOW.getTime() + HOUR).toISOString() }), NOW).refresh,
    false,
  );
});

test('the schedule reads fetchedAt, never asOf -- the weekend bug', () => {
  // The subtle one. `asOf` is the feed's own reading time, which barely moves
  // while the metals market is shut. A document fetched an hour ago whose
  // prices were read on Friday must NOT look overdue on Sunday: scheduling off
  // `asOf` would refresh on every cache miss all weekend, each call returning
  // the same Friday timestamp it had just rejected, and spend the month's
  // allowance in two days.
  const friday = new Date(NOW.getTime() - 60 * HOUR).toISOString();
  const decision = refreshDecision(
    docAtNow({ asOf: friday, fetchedAt: new Date(NOW.getTime() - HOUR).toISOString() }),
    NOW,
  );
  assert.equal(decision.refresh, false, 'a stale asOf triggered a refresh');
});

test('the monthly ceiling is a fuse the clock cannot talk past', () => {
  const overdue = new Date(NOW.getTime() - 40 * HOUR).toISOString();
  // Overdue by the clock, but out of budget: no call.
  const spent = refreshDecision(docAtNow({ fetchedAt: overdue, calls: 60 }), NOW);
  assert.equal(spent.refresh, false);
  assert.match(spent.reason, /monthly call limit/);
  assert.equal(refreshDecision(docAtNow({ fetchedAt: overdue, calls: 59 }), NOW).refresh, true);

  // The count resets when the month does, and a count from another month never
  // holds a refresh back.
  assert.equal(
    refreshDecision(docAtNow({ fetchedAt: overdue, month: '1999-12', calls: 99 }), NOW).refresh,
    true,
  );
});

test('a stale cache is refreshed, published and served', async () => {
  const FEED = {
    status: 'success',
    currency: 'USD',
    unit: 'toz',
    metals: { silver: 70.1234, gold: 4100.5678, platinum: 1500.999 },
    timestamps: { metal: '2027-01-20T11:58:00.000Z' },
  };
  const stale = doc({ fetchedAt: new Date(Date.now() - 40 * HOUR).toISOString() });

  const written = [];
  const { result, calls } = await withFetch(
    (url) =>
      url.includes('metals.dev')
        ? new Response(JSON.stringify(FEED), { headers: { 'x-api-usage': '7' } })
        : new Response(JSON.stringify(stale)),
    () =>
      ask({
        SPOT_CACHE_URL: 'https://cache.example/spot.json',
        METALS_DEV_API_KEY: 'k',
        writeCache: async (body) => written.push(JSON.parse(body)),
      }),
  );

  assert.equal(calls.length, 2, 'the endpoint did not read the cache and then the feed');
  assert.ok(calls[1].includes('api.metals.dev'), 'the feed was not called');
  // The units are asked for explicitly: an account default of grams would
  // multiply every melt value on the site by 31.
  assert.ok(calls[1].includes('currency=USD') && calls[1].includes('unit=toz'));

  // The reader gets the new figures, unrounded, in the same request.
  const body = await result.json();
  assert.deepEqual(body.prices, FEED.metals);
  assert.equal(body.asOf, FEED.timestamps.metal);
  assert.equal(body.live, false);
  // And nothing but the four snapshot fields: the bookkeeping never leaks into
  // a response.
  assert.deepEqual(Object.keys(body).sort(), ['asOf', 'live', 'prices', 'source']);

  // The published document carries the bookkeeping, with the count advanced and
  // fetchedAt set to now rather than to the feed's reading time.
  assert.equal(written.length, 1);
  assert.deepEqual(written[0].prices, FEED.metals);
  assert.equal(written[0].calls, stale.calls + 1);
  assert.equal(written[0].month, THIS_MONTH);
  assert.notEqual(written[0].fetchedAt, written[0].asOf);
  assert.ok(Math.abs(Date.parse(written[0].fetchedAt) - Date.now()) < 5_000);
});

test('a refresh pokes the deploy hook, so the built pages catch up', async () => {
  // Readers with JavaScript get their figure from this endpoint. A crawler, and
  // a reader without it, keep whatever the last BUILD rendered -- and that only
  // changes when the site is rebuilt. Without this the crawler-facing price is
  // as old as the last deploy.
  const FEED = {
    status: 'success',
    currency: 'USD',
    unit: 'toz',
    metals: { silver: 70.1234, gold: 4100.5678, platinum: 1500.999 },
    timestamps: { metal: '2027-01-20T11:58:00.000Z' },
  };
  const stale = doc({ fetchedAt: new Date(Date.now() - 40 * HOUR).toISOString() });
  const order = [];

  const { calls } = await withFetch(
    (url, init) => {
      if (url.includes('metals.dev')) return new Response(JSON.stringify(FEED));
      if (url.includes('deploy')) {
        order.push(`hook:${init?.method}`);
        return new Response('', { status: 201 });
      }
      return new Response(JSON.stringify(stale));
    },
    () =>
      ask({
        SPOT_CACHE_URL: 'https://cache.example/spot.json',
        METALS_DEV_API_KEY: 'k',
        deployHookUrl: 'https://api.vercel.com/v1/integrations/deploy/prj_x/y',
        writeCache: async () => order.push('write'),
      }),
  );

  assert.ok(calls.some((c) => c.includes('deploy')), 'the deploy hook was not poked');
  assert.deepEqual(order, ['write', 'hook:POST'], 'the hook fired before the document was written');
});

test('the deploy hook is never poked when nothing was refreshed', async () => {
  // Once a day, not once a request: it fires only behind the clock and the
  // budget, which is what stops a deploy per visitor.
  const fresh = doc({ fetchedAt: new Date().toISOString() });
  await withFetch(
    (url) => {
      assert.ok(!url.includes('deploy'), 'a fresh cache triggered a deploy');
      return new Response(JSON.stringify(fresh));
    },
    () =>
      ask({
        SPOT_CACHE_URL: 'https://cache.example/spot.json',
        METALS_DEV_API_KEY: 'k',
        deployHookUrl: 'https://api.vercel.com/v1/integrations/deploy/prj_x/y',
        writeCache: async () => assert.fail('a fresh cache was rewritten'),
      }),
  );

  // And a refresh that failed at the feed leaves the built pages alone too --
  // there is no new price to bake in.
  const stale = doc({ fetchedAt: new Date(Date.now() - 40 * HOUR).toISOString() });
  await withFetch(
    (url) => {
      if (url.includes('metals.dev')) return new Response('no', { status: 500 });
      assert.ok(!url.includes('deploy'), 'a failed refresh triggered a deploy');
      return new Response(JSON.stringify(stale));
    },
    () =>
      ask({
        SPOT_CACHE_URL: 'https://cache.example/spot.json',
        METALS_DEV_API_KEY: 'k',
        deployHookUrl: 'https://api.vercel.com/v1/integrations/deploy/prj_x/y',
        writeCache: async () => assert.fail('a failed refresh published a document'),
      }),
  );
});

test('a broken deploy hook never costs the reader their figures', async () => {
  // The prices are refreshed and published before the hook is touched, so a
  // hook that is down, slow or misconfigured loses the rebuild and nothing
  // else. An http URL is refused outright: it is a capability, and one that
  // travels in clear is one anybody on the path can replay.
  const FEED = {
    status: 'success',
    currency: 'USD',
    unit: 'toz',
    metals: { silver: 70.1234, gold: 4100.5678, platinum: 1500.999 },
    timestamps: { metal: '2027-01-20T11:58:00.000Z' },
  };
  const stale = doc({ fetchedAt: new Date(Date.now() - 40 * HOUR).toISOString() });

  for (const hook of ['https://hook.example/deploy', 'http://hook.example/deploy']) {
    const written = [];
    const { result } = await withFetch(
      (url) => {
        if (url.includes('metals.dev')) return new Response(JSON.stringify(FEED));
        if (url.includes('deploy')) throw new Error('hook is down');
        return new Response(JSON.stringify(stale));
      },
      () =>
        ask({
          SPOT_CACHE_URL: 'https://cache.example/spot.json',
          METALS_DEV_API_KEY: 'k',
          deployHookUrl: hook,
          writeCache: async (body) => written.push(JSON.parse(body)),
        }),
    );
    assert.equal(result.status, 200);
    assert.deepEqual((await result.json()).prices, FEED.metals, 'a dead hook cost the new prices');
    assert.equal(written.length, 1, 'a dead hook stopped the document being published');
  }
});

test('a fresh cache is served without touching the feed', async () => {
  const { result, calls } = await withFetch(
    (url) => {
      assert.ok(!url.includes('metals.dev'), 'the feed was called for a fresh cache');
      return new Response(JSON.stringify(doc({ fetchedAt: new Date().toISOString() })));
    },
    () =>
      ask({
        SPOT_CACHE_URL: 'https://cache.example/spot.json',
        METALS_DEV_API_KEY: 'k',
        writeCache: async () => assert.fail('a fresh cache was rewritten'),
      }),
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(await result.json(), CACHED);
});

test('a failed refresh serves the stale figures rather than nothing', async () => {
  // The feed is down, rate-limited, or answering nonsense. The reader has a
  // page in front of them with figures on it; the right answer is the older
  // ones and their timestamp, not a blank.
  const stale = doc({ fetchedAt: new Date(Date.now() - 40 * HOUR).toISOString() });
  for (const feedReply of [
    () => new Response('nope', { status: 429 }),
    () => new Response(JSON.stringify({ status: 'error', error: 'bad key' })),
    // The unit check: a feed quoting grams must not be written.
    () =>
      new Response(
        JSON.stringify({ status: 'success', currency: 'USD', unit: 'g', metals: { silver: 2 } }),
      ),
    () => {
      throw new Error('ETIMEDOUT');
    },
  ]) {
    const { result } = await withFetch(
      (url) => (url.includes('metals.dev') ? feedReply() : new Response(JSON.stringify(stale))),
      () =>
        ask({
          SPOT_CACHE_URL: 'https://cache.example/spot.json',
          METALS_DEV_API_KEY: 'k',
          writeCache: async () => assert.fail('a failed refresh still published a document'),
        }),
    );
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), CACHED, 'a failed refresh lost the cached figures');
  }
});

test('no key and no writer means read-only, which is what a preview is', async () => {
  // A preview deployment reads production's document and spends none of the
  // month's allowance. Configuring half of it must not half-work.
  const stale = doc({ fetchedAt: new Date(Date.now() - 40 * HOUR).toISOString() });
  for (const env of [
    { SPOT_CACHE_URL: 'https://cache.example/spot.json' },
    { SPOT_CACHE_URL: 'https://cache.example/spot.json', METALS_DEV_API_KEY: 'k' },
    { SPOT_CACHE_URL: 'https://cache.example/spot.json', writeCache: async () => {} },
  ]) {
    const { result, calls } = await withFetch(
      (url) => {
        assert.ok(!url.includes('metals.dev'), 'the feed was called with no writer configured');
        return new Response(JSON.stringify(stale));
      },
      () => ask(env),
    );
    assert.deepEqual(calls.length, 1);
    assert.deepEqual(await result.json(), CACHED);
  }
});

test('a HEAD request never spends a call', async () => {
  // A cache or a crawler checking the document exists is not a reader who needs
  // a current figure.
  const stale = doc({ fetchedAt: new Date(Date.now() - 40 * HOUR).toISOString() });
  const { calls } = await withFetch(
    (url) => {
      assert.ok(!url.includes('metals.dev'), 'a HEAD request called the feed');
      return new Response(JSON.stringify(stale));
    },
    () =>
      handleSpot(new Request('https://example.com/api/spot', { method: 'HEAD' }), {
        SPOT_CACHE_URL: 'https://cache.example/spot.json',
        METALS_DEV_API_KEY: 'k',
        writeCache: async () => assert.fail('a HEAD request published a document'),
      }),
  );
  assert.equal(calls.length, 1);
});

test('the store is told to cache the document for a minute, not a month', () => {
  // The default in Vercel Blob is a month. Left at that, the handler would read
  // a copy of the document from before its own last write, see an old
  // fetchedAt, decide a refresh was overdue and spend a call on every
  // invocation for a month.
  const adapter = readFileSync('api/spot.ts', 'utf8');
  assert.match(adapter, /cacheControlMaxAge/, 'the adapter does not bound the blob cache');
  assert.match(adapter, /allowOverwrite: true/, 'the adapter cannot overwrite the document');
  assert.match(adapter, /addRandomSuffix: false/, 'the document URL would move on every write');
  // And the read must not be served from a cache either.
  const handler = readFileSync('src/server/spot.ts', 'utf8');
  assert.match(handler, /cache: 'no-store'/, 'the cache read may be served a stale copy');
});

test('the endpoint is cached for an hour, and the rule is written once', async () => {
  // The whole point of the endpoint: one document allowed to be younger than
  // the HTML around it. Four places state that -- the response, and the three
  // host configs -- and all four have to be this one string.
  const res = await handleSpot(new Request('https://example.com/api/spot'), {});
  assert.equal(res.headers.get('cache-control'), SPOT_CACHE_CONTROL);

  for (const [file, needle] of [
    ['vercel.json', `"value": "${SPOT_CACHE_CONTROL}"`],
    ['netlify.toml', `Cache-Control = "${SPOT_CACHE_CONTROL}"`],
    ['public/_headers', `Cache-Control: ${SPOT_CACHE_CONTROL}`],
  ]) {
    assert.ok(
      readFileSync(file, 'utf8').includes(needle),
      `${file} does not carry the spot endpoint's cache rule -- the three host configs must agree`,
    );
  }
});


test('the cache rule survives being read by a cache', () => {
  // Three properties, each of which something would quietly break.
  //
  // The edge holds it far longer than the browser: without that ratio the
  // endpoint is hit once per reader rather than once per hour per region,
  // which is the whole economics of putting a metered feed behind it.
  assert.ok(
    SPOT_BROWSER_MAX_AGE_SECONDS < SPOT_MAX_AGE_SECONDS,
    'the browser is allowed to hold the price longer than the edge is',
  );
  assert.match(SPOT_CACHE_CONTROL, new RegExp(`\\bmax-age=${SPOT_BROWSER_MAX_AGE_SECONDS}\\b`));
  assert.match(SPOT_CACHE_CONTROL, new RegExp(`\\bs-maxage=${SPOT_MAX_AGE_SECONDS}\\b`));

  // It must be cacheable by a shared cache at all. `private` or `no-store`
  // here would move the cost from one fetch an hour to one fetch a reader
  // without changing a single thing a reader sees.
  assert.match(SPOT_CACHE_CONTROL, /\bpublic\b/);
  assert.ok(!/no-store|private/.test(SPOT_CACHE_CONTROL));

  // And `must-revalidate` must stay off it. That directive forbids serving a
  // stale response; `stale-while-revalidate` exists to permit one. A CDN
  // resolving that contradiction drops the SWR, which is the behaviour this
  // endpoint most wants: an older price, labelled with its date, beats no
  // price when the upstream is slow or down.
  assert.match(SPOT_CACHE_CONTROL, /\bstale-while-revalidate=\d+/);
  assert.ok(
    !/must-revalidate|proxy-revalidate|no-cache/.test(SPOT_CACHE_CONTROL),
    'must-revalidate is back on the spot rule and has disabled its stale-while-revalidate',
  );
});


test('the price is the only thing on the site cached in hours rather than days', () => {
  // The arrangement only works because the endpoint outlives nothing. If the
  // HTML rule were ever tightened to the endpoint's hour, the whole second
  // rendering would be pointless; if the endpoint's were loosened to the
  // HTML's day, it would be useless. The gap between them is the feature.
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const ruleFor = (path) => {
    let winner;
    for (const rule of vercel.headers) {
      let re;
      try {
        re = new RegExp(`^${rule.source}$`);
      } catch {
        continue;
      }
      const value = rule.headers.find((h) => h.key === 'Cache-Control')?.value;
      if (value && re.test(path)) winner = value;
    }
    return winner;
  };

  assert.equal(ruleFor('/api/spot'), SPOT_CACHE_CONTROL);
  // Every other endpoint takes a key, a token or a message.
  assert.equal(ruleFor('/api/contact'), 'no-store');
  assert.equal(ruleFor('/api/subscribe'), 'no-store');
  assert.equal(ruleFor('/api/stripe-webhook'), 'no-store');

  const html = ruleFor('/coin-value/silver/quarter/1964-washington-quarter');
  const edge = Number(/s-maxage=(\d+)/.exec(html)?.[1]);
  assert.ok(
    edge > SPOT_MAX_AGE_SECONDS,
    'the HTML is no longer cached for longer than the price -- the second rendering has nothing left to do',
  );

  // The module that does the rewriting is content-hashed, so it is the one
  // thing here safe to cache forever. A rule that stopped being immutable
  // would put a revalidation on the critical path of every page.
  assert.match(ruleFor('/_astro/SpotLive.abcd1234.js'), /immutable/);
});

test('an unusable method is refused and never cached', async () => {
  const res = await handleSpot(
    new Request('https://example.com/api/spot', { method: 'POST' }),
    {},
  );
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('a weight is formatted the same everywhere it is printed', () => {
  // formatOzt lives in spot.ts now, because the browser calls it, and melt.ts
  // re-exports it. Both paths must be the one function.
  assert.equal(formatOzt(0.1808), '0.1808');
  assert.equal(formatOzt(18.08), '18.08');
});
