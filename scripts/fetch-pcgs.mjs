/**
 * PCGS CoinFacts, a hundred calls a day, spent on purpose.
 *
 *   npm run pcgs -- morgan-dollar                 today's budget, best coins first
 *   npm run pcgs -- morgan-dollar --budget 40     spend less
 *   npm run pcgs -- morgan-dollar --plan          what it WOULD ask, spends nothing
 *   npm run pcgs -- morgan-dollar --coin 1889-cc-morgan-dollar
 *   npm run pcgs -- morgan-dollar --numbers       resolve PCGS numbers only
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT A CRAWL
 * ---------------------------------------------------------------------------
 *
 * The two free guides are enumerated: one request lists a hundred coins and the
 * only cost is politeness. This source is metered at ONE HUNDRED CALLS A DAY
 * per key, and the endpoint answers for one (PCGS number, grade) pair. A Morgan
 * dollar is about twenty rungs, so a hundred calls is five coins, and the whole
 * series is three weeks.
 *
 * That changes what the script is. It is not a fetcher that happens to cache;
 * it is a LEDGER with a fetcher attached. Three rules follow and all three are
 * load-bearing:
 *
 *   THE STORE IS PERMANENT AND COMMITTED. Unlike `data/prices/.cache`, which is
 *   scratch and deletes itself, `data/pcgs/<series>.json` is the only copy of
 *   something that cost a share of a daily allowance. Re-fetching it is not
 *   free and not fast: it is a day of the budget per five coins. It is small --
 *   a few kilobytes a coin once the prose is stripped -- so it goes in git.
 *
 *   A PAIR IS NEVER ASKED TWICE. Answered or empty, the ledger records that it
 *   was asked and on what date, and the queue skips it. An empty answer is a
 *   fact about the coin and costs exactly as much to learn as a full one.
 *
 *   THE BUDGET LIVES IN THE STORE, NOT IN THE PROCESS. Same reason `/api/spot`
 *   keeps its guards in the cached document: a run is not a place to keep
 *   state, and the second run of the day has to know what the first one spent.
 *   Keys are counted separately and identified by a hash, never written down.
 *
 * ---------------------------------------------------------------------------
 * WHAT ONE CALL RETURNS, AND WHAT IS KEPT
 * ---------------------------------------------------------------------------
 *
 *   PriceGuideValue      the guide figure for that exact grade
 *   Population/PopHigher the certified census at and above it
 *   AuctionList          up to ten realized sales: house, month, price, IsCAC
 *
 * All three are kept. Only the first reaches a page today, as a third source in
 * `data/grade-prices.json`; the sales and the populations are held against the
 * pass that wires them into the ladder, because the expensive part is the call
 * and it has already been made.
 *
 * `CoinFactsNotes` is NOT kept. It is several kilobytes of somebody else's
 * prose per response and it must never reach a page.
 *
 * A CAC SALE IS A DIFFERENT MARKET and is kept apart. On the 1932-D MS65 the
 * ordinary sales run $5,280 to $9,150 and one CAC coin fetched $19,520; folded
 * in, that doubles the range and the importer then accepts it as evidence of
 * its own range.
 *
 * ---------------------------------------------------------------------------
 * WHICH PAIRS, AND WHY THOSE
 * ---------------------------------------------------------------------------
 *
 * The queue is the rungs this site cannot price, on the coins where that costs
 * most. The free guides are weakest on exactly the coins people search for --
 * PriceCharting computes from completed sales and a scarce date has almost
 * none, so its 1889-CC reads $37 in VG8 against a thousand-dollar coin, the
 * spread gate refuses the rung, and the key date of the series comes out TBD.
 * So: key dates first, then scarce, then ascending mintage, and within a coin
 * the ladder in order so a coin is finished rather than sampled.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

const API = 'https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByGrade';
const FEED = 'data/grade-prices.json';
const store = (series) => `data/pcgs/${series}.json`;

/** Polite, and nowhere near a rate limit at a hundred calls a day. */
const PAUSE_MS = 300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
const line = (char = '-') => console.log(char.repeat(78));

/**
 * The key, and a name for it that is not the key.
 *
 * Several keys are rotated and each one has its own daily count, so the ledger
 * has to tell them apart -- and a ledger in git must not be able to tell anyone
 * else. Eight hex characters of a digest is enough to separate three keys and
 * is not a key.
 */
const keys = () => {
  const found = [
    process.env.COINFACTS_API_KEY,
    process.env.COINFACTS_API_KEY_2,
    process.env.COINFACTS_API_KEY_3,
  ].filter(Boolean);
  if (found.length === 0) {
    throw new Error(
      'COINFACTS_API_KEY is not set. It is a build-time research credential; see .env.example. Nothing under src/ reads it and no page may call this API.',
    );
  }
  return found.map((value) => ({ value, id: createHash('sha256').update(value).digest('hex').slice(0, 8) }));
};

/* ---------------------------------------------------------------------------
   The ledger
   --------------------------------------------------------------------------- */

const load = (series) =>
  existsSync(store(series))
    ? JSON.parse(readFileSync(store(series), 'utf8'))
    : {
        note: 'GENERATED and COMMITTED by `npm run pcgs`. Every entry here cost a share of a daily allowance of a hundred calls, so this file is the only copy and re-fetching it is not free. See scripts/fetch-pcgs.mjs.',
        series,
        source: {
          id: 'pcgs',
          name: 'PCGS CoinFacts',
          home: 'https://www.pcgs.com/coinfacts',
          used: 'the published price guide, with the certified population and realized auction sales behind it',
        },
        budget: {},
        coins: {},
      };

const save = (series, ledger) => {
  ledger.coins = Object.fromEntries(Object.entries(ledger.coins).sort(([a], [b]) => a.localeCompare(b)));
  mkdirSync(dirname(store(series)), { recursive: true });
  writeFileSync(store(series), `${JSON.stringify(ledger, undefined, 1)}\n`);
};

/** Calls this key has left today, off the ledger rather than off this process. */
const remaining = (ledger, key, perKey) => {
  const held = ledger.budget[key.id];
  if (!held || held.date !== today()) return perKey;
  return Math.max(0, perKey - held.calls);
};

const spend = (ledger, key) => {
  const held = ledger.budget[key.id];
  if (!held || held.date !== today()) ledger.budget[key.id] = { date: today(), calls: 1 };
  else held.calls += 1;
};

/* ---------------------------------------------------------------------------
   Resolving a PCGS number, which costs nothing
   --------------------------------------------------------------------------- */

/**
 * The PCGS number for each coin, read off the Numista cache.
 *
 * Free: that document is already fetched and committed for the mintage
 * pipeline, and every issue in it carries the reference. Getting the same fact
 * from PCGS would cost a call out of a hundred a day, per coin, before a single
 * price had been asked for.
 *
 * AMBIGUITY IS REFUSED RATHER THAN RESOLVED. The catalogue splits a year by
 * reverse hub and by variety, so the 1878 Philadelphia dollar has five issue
 * records with five different PCGS numbers -- the eight-feather reverse, the
 * seven-feather reverse, the seven-over-eight. Picking one would price a
 * variety as the ordinary coin, which is the failure the whole grade section is
 * built to avoid. Two numbers for one coin means no number for that coin, and
 * the report says so.
 */
const resolveNumbers = async (series, coins) => {
  const path = `data/numista/${series}.json`;
  if (!existsSync(path)) {
    throw new Error(`${path} is missing. Run \`npm run mintages\` first: the PCGS numbers come out of it.`);
  }
  const document = JSON.parse(readFileSync(path, 'utf8'));
  const { NUMISTA_SERIES } = await import('./numista.mjs');
  const finishOf = NUMISTA_SERIES[series]?.finishOf;

  const candidates = new Map();
  for (const type of document.types) {
    for (const issue of type.issues) {
      if (!issue.pcgs || issue.year === null) continue;
      // The same finish vocabulary the mintage merge uses, so a proof record
      // cannot be resolved onto a circulation coin.
      const finish = finishOf ? finishOf(issue.comment) : undefined;
      if (finish === null) continue;
      const key = `${issue.year}|${(issue.mark || 'P').toUpperCase()}|${finish ?? 'circulation'}`;
      const held = candidates.get(key) ?? new Set();
      held.add(issue.pcgs);
      candidates.set(key, held);
    }
  }

  const resolved = new Map();
  const ambiguous = [];
  for (const coin of coins) {
    const finish = coin.finish?.kind ?? 'circulation';
    const key = `${coin.years.from}|${coin.mintMark || 'P'}|${finish}`;
    const found = candidates.get(key);
    if (!found) continue;
    if (found.size > 1) {
      ambiguous.push(`${coin.slug}: ${found.size} PCGS numbers (${[...found].join(', ')}), so none is this coin`);
      continue;
    }
    resolved.set(coin.slug, [...found][0]);
  }
  return { resolved, ambiguous };
};

/* ---------------------------------------------------------------------------
   One call
   --------------------------------------------------------------------------- */

/**
 * `{ guide, population, popHigher, sales, cacSales }` for one pair.
 *
 * Everything the response says that this site can use, and nothing it says that
 * this site must not print. A missing figure stays missing: `PriceGuideValue`
 * of zero is the guide declining to state one, not a coin worth nothing, which
 * is the same distinction `money()` draws for a dash in the free guides.
 */
const shape = (body) => {
  const sales = [];
  const cacSales = [];
  for (const row of body.AuctionList ?? []) {
    const sale = {
      date: row.Date ?? null,
      house: row.Auctioneer ?? null,
      price: typeof row.Price === 'number' && row.Price > 0 ? row.Price : null,
    };
    if (sale.price === null) continue;
    (row.IsCAC ? cacSales : sales).push(sale);
  }
  return {
    askedAt: today(),
    guide: typeof body.PriceGuideValue === 'number' && body.PriceGuideValue > 0 ? body.PriceGuideValue : null,
    population: typeof body.Population === 'number' ? body.Population : null,
    popHigher: typeof body.PopHigher === 'number' ? body.PopHigher : null,
    name: body.Name ?? null,
    sales,
    cacSales,
  };
};

const ask = async (key, pcgsNo, gradeNo) => {
  const url = `${API}?PCGSNo=${encodeURIComponent(pcgsNo)}&GradeNo=${gradeNo}&PlusGrade=false`;
  const response = await fetch(url, { headers: { authorization: `bearer ${key.value}` } });
  if (response.status === 401 || response.status === 403) {
    throw new Error(`PCGS answered ${response.status}: the key is rejected. Nothing further was asked.`);
  }
  if (response.status === 429) {
    return { exhausted: true };
  }
  if (!response.ok) return { failed: `${response.status}` };
  const body = await response.json().catch(() => undefined);
  if (!body) return { failed: 'the response was not JSON' };
  // CoinFactsNotes is dropped here, before anything is written, and it is never
  // in memory longer than this function.
  return { record: shape(body) };
};

/* ---------------------------------------------------------------------------
   Running
   --------------------------------------------------------------------------- */

/**
 * The order the budget is spent in.
 *
 * Key dates first, then scarce, then ascending mintage, because the free guides
 * fail hardest on exactly those and a common date is already priced. Within a
 * coin the ladder runs in order, so a coin is FINISHED rather than sampled --
 * five complete ladders are worth more than a hundred scattered rungs, since a
 * rung needs two sources and a neighbour to be worth anything.
 */
const RANK = { 'key-date': 0, scarce: 1, common: 2, 'very-common': 3 };

/**
 * Within a coin: the rungs a reader is likely to be holding, first.
 *
 * The budget runs out in the middle of a coin, so the order inside one decides
 * what gets asked and what waits a day. Three bands:
 *
 *   0  G4 to MS67, which is every grade a Morgan dollar is actually given and
 *      every grade anybody types into a search box.
 *   1  AG3, which is a real grade and a rare one to see quoted -- the guides
 *      mostly start at G4, and a coin that worn is usually sold as a bullion
 *      piece.
 *   2  MS68 to MS70, which are almost never awarded to a coin struck for
 *      circulation. Asking is not wasted -- an empty answer is a fact about the
 *      coin and it is recorded so it is never asked again -- but it is the last
 *      thing worth a call out of a hundred.
 */
const rungBand = (rung) => (rung.number >= 68 ? 2 : rung.number < 4 ? 1 : 0);
const priority = (a, b) =>
  (RANK[a.commonality] ?? 9) - (RANK[b.commonality] ?? 9) ||
  (a.mintage ?? Infinity) - (b.mintage ?? Infinity) ||
  a.slug.localeCompare(b.slug);

async function main() {
  const argv = process.argv.slice(2);
  const series = argv.find((a) => !a.startsWith('--') && !argv[argv.indexOf(a) - 1]?.match(/^--(budget|coin)$/));
  if (!series) throw new Error('name the series: npm run pcgs -- morgan-dollar');

  const plan = argv.includes('--plan');
  const numbersOnly = argv.includes('--numbers');
  const only = argv.includes('--coin') ? argv[argv.indexOf('--coin') + 1] : undefined;
  const perKey = argv.includes('--budget') ? Number(argv[argv.indexOf('--budget') + 1]) : 100;
  if (!Number.isInteger(perKey) || perKey < 1 || perKey > 100) {
    throw new Error('--budget is a whole number of calls per key, 1 to 100. The allowance is a hundred a day.');
  }

  const { COINS } = await import('../src/data/coin-catalog.ts');
  const { eligibleRungs } = await import('../src/data/grades.ts');
  const coins = COINS.filter((c) => (c.tags ?? []).includes(series) && (!only || c.slug === only));
  if (coins.length === 0) throw new Error(`no coins are tagged "${series}"`);

  const ledger = load(series);
  const { resolved, ambiguous } = await resolveNumbers(series, coins);
  for (const coin of coins) {
    const number = resolved.get(coin.slug);
    if (!number) continue;
    const held = (ledger.coins[coin.slug] ??= { pcgsNo: number, grades: {} });
    held.pcgsNo = number;
  }
  console.log(`${series}: ${coins.length} coin(s), ${resolved.size} with a PCGS number`);
  if (ambiguous.length > 0) {
    console.log(`${ambiguous.length} coin(s) whose PCGS number cannot be told apart from a variety's:`);
    for (const a of ambiguous.slice(0, 12)) console.log(`  ${a}`);
    if (ambiguous.length > 12) console.log(`  ... and ${ambiguous.length - 12} more`);
  }
  if (numbersOnly) {
    save(series, ledger);
    console.log(`Wrote ${store(series)}: numbers only, no calls made.`);
    return;
  }

  /* -------------------------------------------------------------------------
     The queue
     ------------------------------------------------------------------------- */

  const feed = existsSync(FEED) ? JSON.parse(readFileSync(FEED, 'utf8')) : { coins: {} };
  const queue = [];
  for (const coin of [...coins].sort(priority)) {
    const held = ledger.coins[coin.slug];
    if (!held?.pcgsNo) continue;
    const mine = [];
    for (const rung of eligibleRungs(coin)) {
      // A proof is a different PCGS number, not a different grade of this one,
      // and asking with this coin's number returns the circulation strike.
      if (rung.tier === 'proof') continue;
      // A colour designation is a second axis and the endpoint takes it as a
      // separate parameter; copper only, and neither series here is copper.
      if (rung.chain) continue;
      if (held.grades[rung.slug]) continue;
      mine.push({ coin, rung, pcgsNo: held.pcgsNo });
    }
    mine.sort((a, b) => rungBand(a.rung) - rungBand(b.rung) || a.rung.number - b.rung.number);
    queue.push(...mine);
  }

  if (plan) {
    line('=');
    console.log(`${queue.length} pair(s) not yet asked. The first ${Math.min(perKey, queue.length)}:`);
    for (const item of queue.slice(0, perKey)) {
      const priced = feed.coins?.[item.coin.slug]?.observations?.[item.rung.slug];
      console.log(
        `  ${item.coin.slug} ${item.rung.code} (PCGS ${item.pcgsNo})` +
          ` — ${priced ? `${new Set(priced.map((o) => o.source)).size} source(s) today` : 'nothing today'}`,
      );
    }
    line();
    console.log('--plan: nothing asked, nothing written.');
    return;
  }

  /* -------------------------------------------------------------------------
     Spending it
     ------------------------------------------------------------------------- */

  const available = keys();
  let asked = 0;
  let answered = 0;
  const failures = [];

  outer: for (const item of queue) {
    const key = available.find((k) => remaining(ledger, k, perKey) > 0);
    if (!key) break;

    const result = await ask(key, item.pcgsNo, item.rung.number);
    spend(ledger, key);
    asked += 1;
    await sleep(PAUSE_MS);

    if (result.exhausted) {
      // The service says this key is done for the day whatever the ledger
      // thinks. Record it as spent in full so the next run does not try again.
      ledger.budget[key.id] = { date: today(), calls: perKey };
      failures.push(`${item.coin.slug} ${item.rung.code}: the key is rate-limited, so it was marked spent`);
      if (available.every((k) => remaining(ledger, k, perKey) === 0)) break outer;
      continue;
    }
    if (result.failed) {
      failures.push(`${item.coin.slug} ${item.rung.code}: PCGS answered ${result.failed}`);
      continue;
    }
    ledger.coins[item.coin.slug].grades[item.rung.slug] = result.record;
    if (result.record.guide !== null) answered += 1;

    // Written after every call, not at the end. An interrupted run has already
    // spent what it spent, and the one thing worse than a lost call is a lost
    // call nobody knows was made.
    save(series, ledger);
  }

  /* -------------------------------------------------------------------------
     Into the feed, as a third source
     ------------------------------------------------------------------------- */

  let added = 0;
  for (const [slug, held] of Object.entries(ledger.coins)) {
    const record = (feed.coins[slug] ??= { designs: 1, observations: {} });
    for (const rung of Object.keys(record.observations)) {
      record.observations[rung] = record.observations[rung].filter((o) => o.source !== 'pcgs');
      if (record.observations[rung].length === 0) delete record.observations[rung];
    }
    for (const [rung, figure] of Object.entries(held.grades)) {
      if (figure.guide === null) continue;
      (record.observations[rung] ??= []).push({
        source: 'pcgs',
        price: figure.guide,
        url: `https://www.pcgs.com/coinfacts/coin/detail/${held.pcgsNo}/${rung.replace(/\D/g, '')}`,
      });
      added += 1;
    }
  }
  feed.sources = [
    // Whatever the free-guide crawl registered, plus this one. `npm run prices`
    // rewrites its own entries and leaves anything it does not know alone, so
    // the two scripts can write this list without either owning it.
    ...(feed.sources ?? []).filter((s) => s.id !== 'pcgs'),
    ledger.source,
  ];
  feed.coins = Object.fromEntries(Object.entries(feed.coins).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(FEED, `${JSON.stringify(feed, undefined, 1)}\n`);

  line('=');
  if (failures.length > 0) {
    for (const f of failures.slice(0, 20)) console.log(`  ${f}`);
    line();
  }
  const left = available.map((k) => `${k.id}: ${remaining(ledger, k, perKey)}`).join(', ');
  console.log(`Asked ${asked}, ${answered} with a guide figure. ${queue.length - asked} pair(s) still unasked.`);
  console.log(`Budget left today — ${left}`);
  console.log(`Wrote ${store(series)} and ${FEED} (${added} pcgs observation(s) in the feed).`);
  console.log('Next: npm run grades');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
