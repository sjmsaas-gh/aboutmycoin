/**
 * The priced-ladder feed: two retail guides in, one committed JSON file out.
 *
 *   npm run prices -- washington-quarter  one series
 *   npm run prices -- morgan-dollar       another
 *   npm run prices -- --coin 1932-d-washington-quarter
 *   npm run prices -- --refresh          ignore the cache and re-fetch
 *   npm run prices -- --report           print what was found, fetch nothing
 *   npm run prices -- --keep-cache       leave the responses on disk afterwards
 *   npm run prices -- --clean            delete the cache and do nothing else
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS AND WHERE IT SITS
 * ---------------------------------------------------------------------------
 *
 * It is the grade section's `npm run mintages`: it goes to the network, it
 * writes `data/grade-prices.json`, that file is committed, and `npm run grades`
 * turns it into `src/data/graded-values.ts` offline. A build never fetches and
 * neither does the import -- same rule, same shape, as the mintage pipeline and
 * as `npm run spot`.
 *
 * The one deliberate departure from the mintage pipeline is the cache. That one
 * commits every source response under `data/wikitext/` and `data/numista/` so
 * the exact text each figure was read out of is in the repository. Three
 * hundred issues times two sources of full HTML is a few hundred megabytes and
 * a diff nobody can read, so the responses are NOT kept -- the OWNER'S DECISION
 * of 2026-09-21, taken knowing what it costs. What is kept instead is every
 * figure with the URL it came from and the date it was read, which is what the
 * pages cite.
 *
 * ---------------------------------------------------------------------------
 * THE CACHE IS SCRATCH, NOT A STORE, AND IT DELETES ITSELF
 * ---------------------------------------------------------------------------
 *
 * `data/prices/.cache` exists for one job: a crawl of this length is written by
 * running it, reading what the parsers made of it, fixing a parser and running
 * it again, and paying for the network on every one of those passes is what
 * makes nobody fix the parser. So responses are held WHILE the crawl is being
 * got right, and the moment a run writes the feed successfully they go. A
 * quarter of a gigabyte sitting in the working tree after the figures are safely
 * out of it is a directory whose only future is somebody wondering what it is
 * for -- which is the question that produced this paragraph.
 *
 * `--keep-cache` is how you iterate on a parser: it leaves the responses behind
 * so the next pass is free. `--clean` deletes them and does nothing else, for
 * when a run was interrupted and the feed never got written.
 *
 * The cost of not keeping them is real and worth stating: when a source
 * redesigns its page, the mintage pipeline shows you the diff and this one does
 * not. What it has instead is `--report`, which prints every label a parser did
 * not recognise, because a source adding a rung and a parser going blind look
 * identical in the output and only one of them is nothing to worry about.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT DECIDE
 * ---------------------------------------------------------------------------
 *
 * Nothing. It records observations: one figure, one source, one URL, one rung.
 * Whether a rung has enough behind it to be a page, what its range is, and
 * whether it separates from the rung below are all decided in
 * `scripts/import-grades.mjs`, which is where the judgement and the checks
 * already live. Splitting it this way means a re-run of the merge costs no
 * network at all, which is what makes the gate cheap to argue about.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { sourcesFor, LABEL_RUNGS } from './grade-sources.mjs';

const CACHE = 'data/prices/.cache';
const OUT = 'data/grade-prices.json';
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

/** Polite, and slow enough that a full run is one long coffee rather than a ban. */
const PAUSE_MS = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const line = (char = '-') => console.log(char.repeat(78));

const cachePath = (url) =>
  `${CACHE}/${url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_').slice(0, 180)}.html`;

/**
 * Fetch, or read what a previous run fetched.
 *
 * An empty cache file records a page that answered 404, so a re-run does not
 * ask again for something that is not there. That matters more here than it
 * looks: most of the misses are structural -- PriceCharting has no page for a
 * Mint-set uncirculated issue -- and without this every run would re-request
 * the same hundred absent pages.
 */
async function get(url, refresh) {
  const path = cachePath(url);
  if (!refresh && existsSync(path)) {
    const held = readFileSync(path, 'utf8');
    return held === '' ? undefined : held;
  }
  await sleep(PAUSE_MS);
  let body = '';
  try {
    const response = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (response.ok) body = await response.text();
  } catch {
    // A network failure caches nothing, so the next run tries again. A 404 is
    // an answer and is cached; a timeout is not an answer and must not be.
    return undefined;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  return body === '' ? undefined : body;
}

/* ---------------------------------------------------------------------------
   Matching a source's issue to a coin in this catalogue
   --------------------------------------------------------------------------- */

/**
 * Philadelphia is the only mint that struck quarters without a mark, so a coin
 * with no `mintMark` is a Philadelphia coin and both sources call it P. Reading
 * it the other way round -- treating P as "no mark" -- would merge the 1979-P
 * with nothing and the 1980-P with the year the mark appeared, which is the
 * error that put "(No Mint Mark)" on nineteen coin pages once already.
 */
const markOf = (coin) => (coin.mintMark || 'P').toUpperCase();

const finishOf = (coin) => coin.finish?.kind;

/** The key both sides are reduced to before they are compared. */
/*
 * The hub is part of the key for the same reason the finish is: two hubs of
 * one date are two coins with two pages and two mintages, and a key that
 * cannot tell them apart prices both from whichever page was fetched first.
 * The 1909 proof pair is what proved it -- the crawl refused to run rather
 * than guess, which is the check below doing its job.
 */
const issueKey = (year, mark, finish, hub) => `${year}|${mark}|${finish ?? ''}|${hub ?? ''}`;

const coinKey = (coin) => issueKey(coin.years.from, markOf(coin), finishOf(coin), (coin.hub ?? '').toLowerCase());

/* ---------------------------------------------------------------------------
   One source, one series
   --------------------------------------------------------------------------- */

/**
 * Walk a source's listing pages until one adds nothing.
 *
 * The cursor form both sources use has no end marker: past the last row the
 * page still answers 200 with the same furniture on it. So the stop condition
 * is that a page produced no URL the crawl had not already seen, which is also
 * the right behaviour for a source whose listing is a single page.
 */
async function enumerate(source, refresh) {
  const seen = new Map();
  for (const listing of source.listings()) {
    const html = await get(listing, refresh);
    if (!html) continue;
    let added = 0;
    for (const entry of source.index(html)) {
      if (seen.has(entry.url)) continue;
      seen.set(entry.url, entry);
      added += 1;
    }
    // Not a break: a source's listings span four separate lists here and the
    // first one runs out long before the last one starts. An exhausted cursor
    // is one empty page, not the end of the crawl.
    if (added === 0) continue;
  }
  return [...seen.values()];
}

/* ---------------------------------------------------------------------------
   Running
   --------------------------------------------------------------------------- */

async function main() {
  const argv = process.argv.slice(2);
  const refresh = argv.includes('--refresh');
  const reportOnly = argv.includes('--report');
  const keepCache = argv.includes('--keep-cache');

  if (argv.includes('--clean')) {
    rmSync(CACHE, { recursive: true, force: true });
    console.log(`Deleted ${CACHE}. The figures are in ${OUT}; the pages they came from are not kept.`);
    return;
  }

  const only = argv.includes('--coin') ? argv[argv.indexOf('--coin') + 1] : undefined;
  let series = argv.find((a) => !a.startsWith('--') && a !== only);

  const { COINS } = await import('../src/data/coin-catalog.ts');
  /*
   * A SERIES AT A TIME, ALWAYS, and this is not a convenience.
   *
   * Both sources file their pages by series -- the console slug, the category
   * path, the words to strip out of a title, and which mint marks exist -- so
   * there is no such thing as a crawl of "every coin". The whole catalogue used
   * to be the default because the whole catalogue was one series. Naming it is
   * what makes the second one possible, and `--coin` reads the series off the
   * coin so the shortest command still works.
   */
  if (!series && only) {
    const coin = COINS.find((c) => c.slug === only);
    if (!coin) throw new Error(`no coin in the catalogue is called "${only}"`);
    series = (coin.tags ?? []).find((t) => t.endsWith('-quarter') || t.endsWith('-dollar'));
    if (!series) throw new Error(`${only} carries no series tag, so no source can be chosen for it`);
  }
  if (!series) {
    throw new Error(
      'name the series: npm run prices -- morgan-dollar. Each source files its pages by series, so there is no crawl of the whole catalogue.',
    );
  }
  const SOURCES = sourcesFor(series);

  const wanted = COINS.filter(
    (c) => (c.tags ?? []).includes(series) && (!only || c.slug === only),
  );
  if (wanted.length === 0) {
    throw new Error(
      only ? `${only} is not a coin tagged "${series}"` : `no coins are tagged "${series}"`,
    );
  }
  console.log(`${series}: ${wanted.length} coin(s) in the catalogue`);

  const byKey = new Map();
  for (const coin of wanted) {
    const list = byKey.get(coinKey(coin)) ?? [];
    list.push(coin);
    byKey.set(coinKey(coin), list);
  }

  // A key holding two coins would silently price both from one page. It cannot
  // happen while a slug is (year, mark, finish) and the taxonomy enforces that,
  // which is exactly why it is worth failing on rather than assuming.
  for (const [key, coins] of byKey) {
    if (coins.length > 1) {
      throw new Error(`${coins.map((c) => c.slug).join(' and ')} are both ${key}`);
    }
  }

  const held = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { coins: {} };
  const out = {
    note: 'GENERATED by `npm run prices`. Observations only -- no range, no page decision. See scripts/fetch-grade-prices.mjs.',
    fetchedAt: new Date().toISOString().slice(0, 10),
    /*
     * This crawl's own sources, and anything another script put here.
     *
     * `npm run pcgs` writes a third entry into the same feed, and a full
     * rewrite of this list would drop it while leaving its observations in
     * place -- which the importer reads as figures from a source with no name,
     * so the rung publishes and cites nothing. Each script owns its own ids and
     * leaves the rest alone, the same split the observations already use.
     */
    sources: [
      ...(held.sources ?? []).filter((s) => !SOURCES.some((mine) => mine.id === s.id)),
      ...SOURCES.map((s) => ({ id: s.id, name: s.name, home: s.home, used: s.used })),
    ],
    coins: { ...held.coins },
  };

  const unknownLabels = new Map();
  const missing = [];
  let fetched = 0;

  /* -------------------------------------------------------------------------
     Every source's listing first, because a design has to be corroborated
     ------------------------------------------------------------------------- */

  const indexes = new Map();
  for (const source of SOURCES) {
    const index = await enumerate(source, refresh);
    indexes.set(source.id, index);
    console.log(`${source.name}: ${index.length} issue pages listed`);
  }

  /*
   * A DESIGN IS ONLY A DESIGN IF BOTH CATALOGUES NAME IT.
   *
   * Both sources list the famous varieties beside the ordinary dates -- the
   * doubled dies, the 2004-D Wisconsin extra leaf -- and a variety is priced at
   * a large multiple of the plain coin. One of them files a variety in a path
   * segment of its own, which is easy to drop; the other files it exactly where
   * a state name goes, so "1952 Double Die" and "1999 P Delaware" are the same
   * shape and only the words differ. A word list catches the doubled dies and
   * then misses the next one somebody names after a leaf.
   *
   * So a design is accepted only where both sources list it for that year and
   * mint. A variety appears in one catalogue's design slot and never in the
   * other's, because the other has put it a level down. This is the mintage
   * pipeline's loose design pairing pointed at the opposite failure: there the
   * risk was a design going missing and being filled as a gap, here it is a
   * variety arriving as an extra design and taking the top of the range with
   * it.
   *
   * The cost is that two sources spelling one design differently lose it from
   * both. That is a miss, it is in the report, and a miss is the failure worth
   * having: the range stays right and the page says less.
   */
  /*
   * A DESIGN IS CHECKED BY COUNT, AGAINST THE MINT'S OWN, AND NEVER BY NAME.
   *
   * Both sources list the famous varieties where a state name goes -- 176
   * doubled dies in the first six listing pages of one of them, and the 2004-D
   * Wisconsin extra leaf -- and a variety trades at a multiple of the plain
   * coin, so matched onto its date it arrives as "another design" and takes the
   * top of the range with it.
   *
   * Two rules were tried before this one and both were wrong.
   *
   *   A WORD LIST catches the doubled dies and misses the next variety somebody
   *   names after a leaf.
   *
   *   CROSS-SOURCE AGREEMENT ON THE NAME looks principled and is defeated by
   *   the fact these two catalogues do not call one design by one name: the
   *   2020 Salt River Bay quarter is `salt-river-bay` in one and
   *   `salt-bay-national-park` in the other, and the National Park of American
   *   Samoa is "American Samoa Park" against a mintage breakdown that calls it
   *   "National Park". Requiring the names to agree dropped several hundred
   *   perfectly good coins, and loosening it to shared words fails in the other
   *   direction, because the words they share are "national" and "park".
   *
   * So the names are not compared at all. `data/mintages.json` already records
   * how many reverses the Mint struck for every (year, mark, finish) -- it had
   * to, because a mintage there is a sum over exactly those designs and the
   * house rules make it check that the sum covers every one and no design
   * twice. A source listing MORE pages for an issue than the Mint struck
   * designs is a source whose extra page is a variety, and its whole list for
   * that issue is refused rather than guessed through. Fewer is allowed: that
   * is a source missing a design, which narrows the range and does not
   * falsify it.
   *
   * This is the same figure the coin page's `mintageNote` is built from, so the
   * two sections cannot disagree about how many designs a year had.
   */
  const MINTAGES = 'data/mintages.json';
  const designCount = new Map();
  if (existsSync(MINTAGES)) {
    const mintages = JSON.parse(readFileSync(MINTAGES, 'utf8'));
    for (const record of Object.values(mintages.series ?? {})) {
      for (const issue of record.issues ?? []) {
        designCount.set(
          issueKey(
            issue.year,
            issue.mark,
            issue.finish === 'circulation' ? undefined : issue.finish,
            issue.hub,
          ),
          issue.designs ?? 1,
        );
      }
    }
  }
  const designsStruck = (coin) => designCount.get(coinKey(coin)) ?? 1;

  for (const source of SOURCES) {
    const index = indexes.get(source.id);

    // Several designs of one year all point at one coin page here, which is the
    // whole reason the design is carried this far: five figures from one source
    // are five observations and still one source, and the merge has to be able
    // to see that.
    const forCoin = new Map();
    const claim = (slug, entry) => {
      const list = forCoin.get(slug) ?? [];
      list.push(entry);
      forCoin.set(slug, list);
    };

    // Pass one: the year, the mark and the finish all agree. Everything from
    // 1999 on matches here, and so does every coin struck for circulation.
    const unmatched = [];
    for (const entry of index) {
      const coins = byKey.get(issueKey(entry.issue.year, entry.issue.mark, entry.issue.finish, entry.issue.hub));
      if (coins) claim(coins[0].slug, entry);
      else unmatched.push(entry);
    }

    // Pass two: the finish is missing from the source rather than different.
    //
    // San Francisco struck nothing but proofs from 1968 to 1991, so both
    // sources file those under a bare "1971-S" and this catalogue -- which
    // treats a finish as an axis of an issue -- calls the same coin a proof.
    // The two are the same coin and nothing else can be, WHICH IS THE
    // CONDITION: a bare entry is matched only where exactly one coin of that
    // year and mark is still unclaimed. From 1992 San Francisco strikes a clad
    // proof and a silver proof of every date, so two are unclaimed, and the
    // bare entry is refused rather than guessed at.
    for (const entry of unmatched) {
      if (entry.issue.finish) continue;
      const candidates = wanted.filter(
        (c) =>
          c.years.from === entry.issue.year &&
          markOf(c) === entry.issue.mark &&
          !forCoin.has(c.slug),
      );
      if (candidates.length === 1) claim(candidates[0].slug, entry);
    }

    // More pages than the Mint struck designs: one of them is a variety, and
    // there is no way to tell which from the outside. Refuse the source's whole
    // list for that issue -- the coin keeps whatever the other source gave it.
    for (const [slug, entries] of forCoin) {
      const struck = designsStruck(wanted.find((c) => c.slug === slug));
      if (entries.length > struck) {
        missing.push(
          `${slug}: ${source.name} lists ${entries.length} pages and the Mint struck ${struck} design(s), so one is a variety`,
        );
        forCoin.delete(slug);
      }
    }

    for (const coin of wanted) {
      const entries = forCoin.get(coin.slug) ?? [];
      if (entries.length === 0) {
        missing.push(`${coin.slug}: ${source.name} lists no page`);
        continue;
      }
      if (reportOnly) continue;

      const record = (out.coins[coin.slug] ??= { designs: 0, observations: {} });
      // Drop this source's previous observations before adding its new ones, so
      // a re-run replaces rather than accumulates and a figure a source has
      // withdrawn really does leave the file.
      for (const rung of Object.keys(record.observations)) {
        record.observations[rung] = record.observations[rung].filter((o) => o.source !== source.id);
        if (record.observations[rung].length === 0) delete record.observations[rung];
      }

      for (const entry of entries) {
        const html = await get(entry.url, refresh);
        fetched += 1;
        if (!html) {
          missing.push(`${coin.slug}: ${entry.url} did not answer`);
          continue;
        }
        const page = source.parse(html);
        if (!page) {
          missing.push(`${coin.slug}: ${source.name} page has no grade table (${entry.url})`);
          continue;
        }
        /*
         * The page says what it is. A source's ids are not contiguous and a
         * wrong one answers 200 with a different coin on it, which is the one
         * failure that would be invisible in the output.
         *
         * The FINISH is compared only where the page states one, which is the
         * same tolerance pass two above is built on: San Francisco struck
         * nothing but proofs from 1968 to 1991, both sources write those bare,
         * and this catalogue calls the same coin a proof. Comparing the full
         * key rejected all 109 of them -- every page fetched, parsed and then
         * thrown away for disagreeing about a word neither source had used.
         */
        if (
          page.issue &&
          (page.issue.year !== coin.years.from ||
            page.issue.mark !== markOf(coin) ||
            (page.issue.finish !== undefined && page.issue.finish !== finishOf(coin)))
        ) {
          missing.push(
            `${coin.slug}: ${entry.url} is really ${page.issue.year}-${page.issue.mark}` +
              `${page.issue.finish ? ` ${page.issue.finish}` : ''}`,
          );
          continue;
        }

        for (const row of page.rows) {
          const rungs = LABEL_RUNGS[row.label];
          if (rungs === undefined) {
            unknownLabels.set(
              `${source.id}: ${row.label}`,
              (unknownLabels.get(`${source.id}: ${row.label}`) ?? 0) + 1,
            );
            continue;
          }
          if (row.price === undefined) continue;
          for (const rung of rungs) {
            (record.observations[rung] ??= []).push({
              source: source.id,
              price: row.price,
              url: entry.url,
              ...(entry.issue.design ? { design: entry.issue.design } : {}),
              ...(rungs.length > 1 ? { band: row.label } : {}),
            });
          }
        }
      }

      // The Mint's figure, not the number of pages read. It is a fact about the
      // coin -- the page really does cover all of them -- and a source that
      // supplied four of five narrows the range without changing what the page
      // is for.
      record.designs = designsStruck(coin);
    }
  }

  line('=');
  if (unknownLabels.size > 0) {
    console.log('Labels no rung is registered for -- a new rung, or a parser gone blind:');
    for (const [label, n] of [...unknownLabels].sort()) console.log(`  ${label} (${n} pages)`);
    line();
  }
  if (missing.length > 0) {
    console.log(`${missing.length} issue(s) a source could not supply:`);
    for (const m of missing.slice(0, 40)) console.log(`  ${m}`);
    if (missing.length > 40) console.log(`  ... and ${missing.length - 40} more`);
    line();
  }

  if (reportOnly) {
    console.log('--report: nothing written.');
    return;
  }

  // Sorted, so the diff on a re-run is the figures that moved and nothing else.
  out.coins = Object.fromEntries(Object.entries(out.coins).sort(([a], [b]) => a.localeCompare(b)));
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(out, undefined, 1)}\n`);

  const priced = Object.values(out.coins).filter((c) => Object.keys(c.observations).length > 0).length;
  console.log(`Fetched ${fetched} page(s). Wrote ${OUT}: ${priced} coin(s) with at least one figure.`);

  // Only now, and only on a run that got as far as writing the feed. An
  // interrupted crawl keeps its cache, because that is the one time the cache
  // is the only copy of anything.
  if (keepCache) {
    console.log(`Kept ${CACHE} (--keep-cache). Delete it with: npm run prices -- --clean`);
  } else if (existsSync(CACHE)) {
    rmSync(CACHE, { recursive: true, force: true });
    console.log(`Deleted ${CACHE}: the figures are out of it. Use --keep-cache while fixing a parser.`);
  }

  console.log('Next: npm run grades');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
