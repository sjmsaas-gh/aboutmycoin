/**
 * The browser half, run against pages the build actually produced.
 *
 * `src/lib/spot-dom.ts` is the only code on this site that runs in a browser
 * and changes what a reader sees. Everything else is checked by reading the
 * built HTML, which cannot see this at all: a page whose figures are never
 * rewritten looks exactly like a page whose figures are.
 *
 * So the built pages are parsed into a real DOM, the endpoint is stubbed with
 * a snapshot nothing like the reference one, and the module is run. What is
 * asserted is the thing the arrangement exists for -- that the figure, its
 * working, its dateline, the ladder under it and the copy of the sentence in
 * the page's JSON-LD all move together, and that they move to the numbers the
 * shared functions in spot.ts say they should.
 *
 * Run: node --experimental-strip-types --no-warnings --import ./tests/ts-resolve.mjs tests/spot-dom.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import {
  REFERENCE_SPOT,
  formatOzt,
  formatUsd,
  spotCaveat,
  spotAsOfLabel,
  spotLadder,
  spotStamp,
} from '../src/lib/spot.ts';

const DIST = 'dist';

if (!existsSync(DIST)) {
  console.error('dist/ is missing -- run `npm run build` first.');
  process.exit(1);
}

/** A snapshot deliberately unlike the reference one, so nothing passes by luck. */
const LIVE = {
  prices: { silver: 41.5, gold: 3120, platinum: 980 },
  // A distinctive minute, not the top of the hour: the browser has to print the
  // time and not just the day, and :43 is unmistakable in an assertion message.
  asOf: '2027-03-02T11:43:00Z',
  source: 'a feed',
  live: true,
};

/** Every built page, so a check can hunt for the one that has the block it needs. */
function htmlFiles(dir = DIST, prefix = '') {
  const out = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...htmlFiles(dir, rel));
    else if (entry.name.endsWith('.html')) out.push(rel);
  }
  return out;
}

const PAGES = htmlFiles();

/** The first built page whose HTML satisfies a predicate. */
const pageWith = (test) => {
  const found = PAGES.find((p) => test(readFileSync(join(DIST, p), 'utf8')));
  assert.ok(found, 'no built page carries the block this check needs');
  return found;
};

/**
 * Load one built page into a DOM, point the module's globals at it, stub the
 * endpoint, and run the module exactly as a browser would.
 *
 * The module holds the current snapshot in module scope, which is right in a
 * browser -- a page load is a fresh module -- and wrong here, where one import
 * serves every test. So each boot resets it to the reference snapshot first,
 * which is the state a freshly loaded page is in: the figures on it are the
 * ones the build rendered. The quantity needs no reset; `wireQuantity()` reads
 * it back off the new document's input, which is server-rendered at one.
 */
async function boot(page, snapshot = LIVE) {
  const { window, document } = parseHTML(readFileSync(join(DIST, page), 'utf8'));
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLInputElement = window.HTMLInputElement;

  let asked = 0;
  let serving = snapshot;
  globalThis.fetch = async (url) => {
    asked += 1;
    assert.equal(String(url), '/api/spot', 'the module asked somewhere other than /api/spot');
    // `null` is "the endpoint is unreachable". Not `undefined`, which a
    // default parameter would quietly turn back into the live snapshot.
    if (serving === null) return { ok: false, status: 503, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => serving };
  };

  const mod = await import('../src/lib/spot-dom.ts');
  mod.setSpot(REFERENCE_SPOT);
  await mod.bootSpot();
  // `snapshot()` moves the market while a page is sitting there, for the
  // checks that need it to change between one boot and the next.
  return { document, mod, asked: () => asked, snapshot: (next) => { serving = next; } };
}

const text = (doc, selector) => doc.querySelector(selector)?.textContent?.trim();

/** The built page, parsed but never booted -- what the reader sees before the
 *  endpoint answers, and what they keep if it never does. */
const builtDoc = (page) => parseHTML(readFileSync(join(DIST, page), 'utf8')).document;



test('a coin melt page moves its figure, its working and its dateline together', async () => {
  const page = pageWith(
    (html) => html.includes('id="calc-total"') && html.includes('data-spot="ozt"'),
  );
  const { document } = await boot(page);

  const total = document.querySelector('#calc-total');
  const ozt = Number(total.getAttribute('data-spot-ozt'));
  const metal = total.getAttribute('data-spot-metal');

  assert.equal(total.textContent, formatUsd(ozt * LIVE.prices[metal]));
  assert.equal(
    text(document, '#calc-ozt'),
    `${formatOzt(ozt)} troy oz ${metal}`,
    'the weight changed when only the price did',
  );
  assert.equal(text(document, '[data-spot="stamp"]'), spotStamp(metal, LIVE));
  // The dateline has to move with the price. A new figure under the time of the
  // build's own reading is the one outcome worse than a stale figure, because it
  // is a fresh figure wearing a stale timestamp -- or a stale one wearing a
  // fresh timestamp's authority.
  assert.match(text(document, '[data-spot="stamp"]'), /based on spot prices at /);
  assert.ok(text(document, '[data-spot="stamp"]').includes(spotAsOfLabel(LIVE)));
  assert.ok(!text(document, '[data-spot="stamp"]').includes(spotAsOfLabel(REFERENCE_SPOT)));
});


test('the browser prints the reading TIME, not just the day', async () => {
  // The two renderings call one function, so this cannot drift in principle --
  // and it did in practice, because a snapshot whose `asOf` is a bare ISO date
  // has no time to print and renders the day alone. That is a legitimate input
  // (`parseSpot` accepts one, and whatever writes the cache document is outside
  // this repository), so the failure it causes is silent: the server half shows
  // a timestamp, the browser replaces it with a date, and nothing errors.
  //
  // What is pinned here is the end state a reader sees after the rewrite.
  const page = pageWith((html) => html.includes('data-spot="stamp"'));
  const { document } = await boot(page);
  const stamp = text(document, '[data-spot="stamp"]');

  assert.match(stamp, /based on spot prices at /, 'the stamp lost its provenance phrase');
  assert.match(stamp, /2 March 2027 11:43 UTC/, 'the browser dropped the time from the stamp');

  // And the date leads, with the time behind it.
  assert.ok(
    stamp.indexOf('2 March 2027') < stamp.indexOf('11:43'),
    'the time is printed before the date',
  );
});


test('the quantity box multiplies the figure and nothing else', async () => {
  const page = pageWith((html) => html.includes('id="calc-count"'));
  const { document, mod } = await boot(page);

  const input = document.querySelector('#calc-count');
  const total = document.querySelector('#calc-total');
  const ozt = Number(total.getAttribute('data-spot-ozt'));
  const metal = total.getAttribute('data-spot-metal');
  const perOunce = document.querySelector('[data-spot="price"]');

  input.value = '40';
  input.dispatchEvent(new document.defaultView.Event('input'));

  assert.equal(total.textContent, formatUsd(40 * ozt * LIVE.prices[metal]));
  assert.equal(text(document, '#calc-ozt'), `${formatOzt(40 * ozt)} troy oz ${metal}`);
  // A per-ounce price is not a quantity of anything. It carries no
  // data-spot-qty and must not move when the box does.
  assert.equal(perOunce.textContent, formatUsd(LIVE.prices[metal]));

  // An emptied box reads as one coin rather than as zero: somebody clearing
  // the field to type a new number should not watch the answer collapse to
  // $0.00 between keystrokes.
  input.value = '';
  input.dispatchEvent(new document.defaultView.Event('input'));
  assert.equal(total.textContent, formatUsd(ozt * LIVE.prices[metal]));

  assert.ok(mod, 'the module did not load');
});


test('a rewritten sentence takes the page’s JSON-LD with it', async () => {
  // Visible HTML and structured data are built from the same object at build
  // time. The moment the browser rewrites a figure inside a visible answer,
  // the copy of that answer in the page's schema is the old sentence -- and a
  // page whose schema states a different price from its body is the mismatch
  // Google issues manual actions for.
  const page = pageWith((html) => html.includes('data-spot-sync="'));
  const { document } = await boot(page);

  const node = document.querySelector('[data-spot-sync]');
  const rewritten = node.textContent;
  assert.ok(rewritten.includes(formatUsd(LIVE.prices.silver)) || /\$\d/.test(rewritten));

  const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((s) => s.textContent)
    .join('\n');
  assert.ok(
    schemas.includes(JSON.stringify(rewritten).slice(1, -1)),
    'the visible answer was rewritten and the schema kept the old one',
  );
  // And the old sentence is gone from it, rather than sitting beside the new
  // one in another field. Read off the built DOM rather than the raw file, so
  // the comparison is against the decoded sentence the generator produced.
  const stale = builtDoc(page).querySelector('[data-spot-sync]').getAttribute('data-spot-sync');
  assert.notEqual(stale, rewritten, 'the sentence did not change at all');
  assert.ok(
    !schemas.includes(JSON.stringify(stale).slice(1, -1)),
    'the schema still carries the sentence the build wrote',
  );
});


test('a ladder is rebuilt around the new price, rungs and ratios', async () => {
  const page = pageWith((html) => html.includes('data-spot="ladder"'));
  const { document } = await boot(page);

  const tbody = document.querySelector('[data-spot="ladder"]');
  const metal = tbody.getAttribute('data-spot-metal');
  const rows = [...tbody.querySelectorAll('tr')].map((tr) =>
    [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()),
  );
  const spot = LIVE.prices[metal];
  assert.deepEqual(
    rows,
    spotLadder(metal, LIVE).map((price) => [
      `${formatUsd(price)}/ozt${price === spot ? ' used above' : ''}`,
      `${(price / spot).toFixed(2)}×`,
    ]),
    'the ladder was not re-centred on the price the page is now showing',
  );
  // "used above" has to land on the rung the page is actually working at, or
  // the table quietly points the reader at the wrong row.
  assert.equal(
    rows.filter(([left]) => left.endsWith('used above')).length,
    1,
    'the ladder marks something other than exactly one rung as the one in use',
  );
});


test('an unreachable endpoint leaves the built figures exactly as they were', async () => {
  // The honest failure. Those figures state their own price and date, so a
  // reader looking at them is not being told anything untrue, only something
  // older than it could have been. Blanking them because a fetch failed loses
  // the answer the page exists to give.
  const page = pageWith((html) => html.includes('id="calc-total"'));
  const built = builtDoc(page);
  const { document } = await boot(page, null);

  for (const selector of ['#calc-total', '#calc-ozt', '[data-spot="stamp"]']) {
    assert.equal(
      text(document, selector),
      text(built, selector),
      `${selector} changed when the endpoint could not be reached`,
    );
  }
  assert.equal(text(document, '[data-spot="stamp"]'), spotStamp(
    document.querySelector('#calc-total').getAttribute('data-spot-metal'),
    REFERENCE_SPOT,
  ));
});


test('a page restored from the back/forward cache catches up', async () => {
  // The one path that can show a figure older than the endpoint's own hour.
  // A restored page is not reloaded and its module scripts do not run again:
  // it is the DOM as the reader left it, which may be a long browsing session
  // ago, quantity box and all. Everything else on this site is allowed to be
  // stale like that; a price beside a dateline is not.
  const page = pageWith((html) => html.includes('id="calc-total"'));
  const { document, snapshot } = await boot(page);

  const total = document.querySelector('#calc-total');
  const ozt = Number(total.getAttribute('data-spot-ozt'));
  const metal = total.getAttribute('data-spot-metal');
  assert.equal(total.textContent, formatUsd(ozt * LIVE.prices[metal]));

  // The reader goes away, the market moves, and they hit Back.
  const MOVED = { ...LIVE, prices: { ...LIVE.prices, [metal]: LIVE.prices[metal] * 2 } };
  snapshot(MOVED);
  const event = new document.defaultView.Event('pageshow');
  Object.defineProperty(event, 'persisted', { value: true });
  document.defaultView.dispatchEvent(event);
  // The listener re-enters bootSpot(), which is async.
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(
    total.textContent,
    formatUsd(ozt * MOVED.prices[metal]),
    'a restored page kept the figure it had when the reader left it',
  );
  assert.equal(text(document, '[data-spot="stamp"]'), spotStamp(metal, MOVED));
});


test('a page with no figure on it asks the endpoint nothing at all', async () => {
  // The module is on every page, because a per-page flag fails silently the
  // first time somebody forgets it. The price of that decision is meant to be
  // one early return, not a request.
  const page = pageWith((html) => !html.includes('data-spot='));
  const { asked } = await boot(page);
  assert.equal(asked(), 0, `${page} has no figure on it and fetched a price anyway`);
});


test('the caveat on an archive is rewritten with the price above it', async () => {
  const page = pageWith((html) => html.includes('data-spot="caveat"'));
  const { document } = await boot(page);
  const node = document.querySelector('[data-spot="caveat"]');
  const metal = node.getAttribute('data-spot-metal');
  assert.equal(node.textContent, spotCaveat(metal, LIVE));
  assert.equal(
    text(document, `[data-spot="price-unit"][data-spot-metal="${metal}"]`),
    `${formatUsd(LIVE.prices[metal])}/ozt`,
  );
});
