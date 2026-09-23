/**
 * Everything needed to register a new series, gathered in one command.
 *
 *   npm run discover -- morgan-dollar
 *   npm run discover -- morgan-dollar --refresh
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS FOR
 * ---------------------------------------------------------------------------
 *
 * Adding a series is two jobs. One is editorial and irreducible -- what the coin
 * weighs, where its mint mark sits, which mints struck which years -- and the
 * house rules are clear that a person types it, because no feed knows where a
 * mint mark sits.
 *
 * The other is reconnaissance: which pages hold the figures, what shape their
 * tables are in, what the other catalogues call the series, whether the
 * one-page-per-coin sources have pages for it and at what URL. That half is
 * mechanical, it is the same four questions every time, and answering it by
 * hand costs a dozen exploratory fetches.
 *
 * So this answers it and prints the result. It writes nothing, changes nothing
 * and fetches only what it needs to look. Run it, read the report, and the
 * registry entry can be written from what it says.
 *
 * It also states what the taxonomy is ALREADY missing for that series, because
 * the two failures look identical from the outside: `npm run coins` generates
 * nothing for a series with no `denomination` and nothing for a series with no
 * source, and only one of those is fixed by finding a page.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseTable } from './fetch-mintages.mjs';

const WIKI = 'https://en.wikipedia.org/w/api.php';
const CACHE = 'data/verify/.cache';
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

const line = (char = '-') => console.log(char.repeat(78));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cachePath = (url) =>
  `${CACHE}/${url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_').slice(0, 180)}.txt`;

const get = async (url, refresh, headers = {}) => {
  const path = cachePath(url);
  if (!refresh && existsSync(path)) {
    const held = readFileSync(path, 'utf8');
    return held === '' ? null : held;
  }
  await sleep(300);
  try {
    const response = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
    const body = response.ok ? await response.text() : '';
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
    return response.ok ? body : null;
  } catch {
    return null;
  }
};

const head = async (url) => {
  await sleep(250);
  try {
    const response = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } });
    return response.status;
  } catch {
    return 0;
  }
};

/* ---------------------------------------------------------------------------
   What the taxonomy already has, and what it is missing
   --------------------------------------------------------------------------- */

/**
 * The fields `npm run coins` refuses to generate without, and the ones whose
 * absence costs a sentence rather than the whole series.
 *
 * Split deliberately. A missing `denomination` produces no coins at all and a
 * missing `markPositions` produces coins whose identification checklist cannot
 * tell a reader where to look -- and the second is the one that ships quietly.
 */
const required = (series) => [
  ['denomination', series.denomination],
  ['country', series.country],
  ['compositions[].specs', series.compositions?.every((c) => c.specs)],
];

const expected = (series) => [
  ['markPositions', series.markPositions?.length],
  ['compositions[].obverse', series.compositions?.every((c) => c.obverse)],
  ['compositions[].reverse', series.compositions?.every((c) => c.reverse)],
  ['compositions[].edgeLooks', series.compositions?.every((c) => c.edgeLooks)],
  ['designer', series.designer],
  ['wear (needed for grade pages)', series.wear],
  ['mints[].years', series.mints?.every((m) => m.years)],
];

/* ---------------------------------------------------------------------------
   Probes
   --------------------------------------------------------------------------- */

const clean = (text) =>
  text
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The pages whose titles suggest they hold this series' figures. */
const wikiCandidates = async (name, refresh) => {
  const url = `${WIKI}?action=query&list=search&srsearch=${encodeURIComponent(`${name} mintage figures`)}&format=json&formatversion=2&srlimit=8`;
  const body = await get(url, refresh);
  if (!body) return [];
  return (JSON.parse(body).query?.search ?? []).map((row) => row.title);
};

/**
 * A page's tables, classified.
 *
 * The shape is what decides which parser reads it, and it can be read off the
 * headers: a `narrow` table is Year / Mint / Mintage / Comments and holds one
 * row per mint, a `wide` one has a column per mint and a row per design. Both
 * exist for the quarter, on different pages, which is why this reports per
 * table rather than per page.
 */
const describeTables = (wikitext) => {
  const out = [];
  for (const part of wikitext.split('{|').slice(1)) {
    const body = part.split('|}')[0];
    const caption = /^\s*\|\+(.*)$/m.exec(body);
    /*
     * The headers come from the REAL parser, not from a regex of this file's
     * own. They were read here by taking the text after the last `|` in the
     * header line, which is right for `[[Philadelphia Mint|Philadelphia]]` and
     * wrong the moment a footnote follows it: the Peace dollar page writes
     * `[[Denver Mint|Denver]]{{sfn|Breen|1988|pp=461-462}}`, the last pipe is
     * inside the citation, and every mint heading read as `pp=461-462}}`. The
     * table was classified unknown and reported as unreadable -- a table the
     * merge parses perfectly, whose figures are the ones this site publishes.
     *
     * A reconnaissance tool that says NO SOURCE about a good source is worse
     * than one that says nothing, because the next move is to go looking for a
     * page that does not exist. So this asks the parser that will actually
     * read it, which is the one-source-per-fact rule pointed at a parser.
     */
    const { headers } = parseTable(`{|${part}`);
    if (headers.length === 0) continue;
    const isNarrow = /^year$/i.test(headers[0] ?? '') && /^mint$/i.test(headers[1] ?? '');
    const isWide = /^year$/i.test(headers[0] ?? '') && headers.some((h) => /Philadelphia|Denver|San Francisco/i.test(h));
    const rows = body.split(/^\|-/m).length - 1;
    out.push({
      caption: caption ? clean(caption[1]) : '(none)',
      shape: isNarrow ? 'narrow' : isWide ? 'wide' : 'unknown',
      headers: headers.slice(0, 14),
      rows,
    });
  }
  return out;
};

/* ---------------------------------------------------------------------------
   Running
   --------------------------------------------------------------------------- */

async function main() {
  const refresh = process.argv.includes('--refresh');
  const slug = process.argv.slice(2).find((a) => !a.startsWith('-'));
  if (!slug) throw new Error('Usage: npm run discover -- <series-slug>   e.g. morgan-dollar');

  const { TAGS } = await import('../src/data/coin-taxonomy.ts');
  const tag = TAGS.find((t) => t.slug === slug);
  if (!tag) {
    throw new Error(
      `No tag "${slug}" in coin-taxonomy.ts. Register the tag first: it is the editorial half and nothing here can write it.`,
    );
  }
  const series = tag.series ?? {};

  line('=');
  console.log(`${tag.name}  (${slug})`);
  line('=');

  /* ---------------------------------------------------------------- taxonomy */
  console.log('\nTAXONOMY');
  console.log(`  run: ${series.years?.from ?? '?'}–${series.years?.to ?? 'present'}`);
  console.log(`  mints: ${(series.mints ?? []).map((m) => m.mark || '(none)').join(', ') || 'NONE'}`);
  console.log(`  eras: ${(series.compositions ?? []).length}`);
  const missingRequired = required(series).filter(([, value]) => !value);
  const missingExpected = expected(series).filter(([, value]) => !value);
  if (missingRequired.length > 0) {
    console.log(`  BLOCKING — no coins generate until these are filled:`);
    for (const [field] of missingRequired) console.log(`    - ${field}`);
  } else {
    console.log('  nothing blocking; this series would generate coins today');
  }
  if (missingExpected.length > 0) {
    console.log('  missing, and each costs a generated sentence rather than the series:');
    for (const [field] of missingExpected) console.log(`    - ${field}`);
  }

  /* ------------------------------------------------------------- source one */
  console.log('\nSOURCE 1 — Wikipedia mintage tables');
  const candidates = await wikiCandidates(tag.name, refresh);
  console.log(`  search "${tag.name} mintage figures" returns: ${candidates.slice(0, 6).join(' | ') || 'nothing'}`);
  for (const title of candidates.slice(0, 3)) {
    const body = await get(
      `${WIKI}?action=parse&page=${encodeURIComponent(title.replace(/ /g, '_'))}&prop=wikitext&format=json&formatversion=2`,
      refresh,
    );
    if (!body) continue;
    const parsed = JSON.parse(body);
    const wikitext = parsed.parse?.wikitext;
    if (typeof wikitext !== 'string') continue;
    const tables = describeTables(wikitext);
    const useful = tables.filter((t) => t.shape !== 'unknown');
    console.log(`\n  ${title}  — ${tables.length} tables, ${useful.length} readable`);
    for (const table of useful.slice(0, 8)) {
      console.log(`    [${table.shape}] ${table.caption.slice(0, 64)}  (${table.rows} rows)`);
    }
    if (useful.length > 0 && useful.length < tables.length) {
      const unknown = tables.filter((t) => t.shape === 'unknown').slice(0, 3);
      for (const table of unknown) {
        console.log(`    [?]      ${table.caption.slice(0, 44)} — headers: ${table.headers.slice(0, 6).join(' / ')}`);
      }
    }
  }

  /* ------------------------------------------------------------- source two */
  console.log('\nSOURCE 2 — Numista');
  const key = process.env.NUMISTA_API_KEY;
  if (!key) {
    console.log('  NUMISTA_API_KEY not set, so this could not be checked.');
  } else {
    const body = await get(
      // Quoted: the catalogue's search is fuzzy, and an unquoted "Morgan
      // dollar" ranks every half dollar it holds above the Morgan itself.
      `https://api.numista.com/api/v3/types?issuer=etats-unis&category=coin&q=${encodeURIComponent(`"${tag.name}"`)}&count=12`,
      refresh,
      { 'Numista-API-Key': key },
    );
    if (!body) console.log('  no answer');
    else {
      const found = JSON.parse(body);
      console.log(`  query "${tag.name}" matches ${found.count} types. First few:`);
      for (const type of (found.types ?? []).slice(0, 6)) {
        console.log(`    ${type.id}  ${type.title}  (${type.min_year}–${type.max_year})`);
      }
      /*
       * The type whose own run covers the series' run is the one to register:
       * a series may be one type holding every issue, as the Morgan is, or one
       * type per design, as the modern quarter is, and which it is decides
       * whether `designOf` has anything to read.
       */
      const spanning = (found.types ?? []).filter(
        (t) => t.min_year <= (series.years?.from ?? 0) && (t.max_year ?? 9999) >= (series.years?.to ?? 9999),
      );
      if (spanning.length > 0) {
        console.log(`  -> one type spans the whole run: ${spanning[0].id} "${spanning[0].title}"`);
        console.log('     so every issue is an ISSUE of that type and there is one design.');
      } else {
        console.log('  -> no single type spans the run, so this series is one type per design.');
      }
      const prefixes = [...new Set((found.types ?? []).map((t) => (t.title ?? '').split('"')[0].trim()))].filter(Boolean);
      console.log(`  -> titleMatch candidates: ${prefixes.slice(0, 4).map((p) => `"${p}"`).join(', ')}`);
    }
  }

  /* ---------------------------------------------------- sources three, four */
  console.log('\nSOURCES 3 AND 4 — one page per coin');
  const denom = series.denomination ?? tag.name.split(' ').pop().toLowerCase();
  const stem = tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  /* The distinguishing word: "morgan" out of "Morgan dollar", "washington" out
   * of "Washington quarter". These sites file a series under it. */
  const word = stem.split('-')[0];
  const metal = /silver/i.test(series.compositions?.[0]?.composition ?? '') ? 'silver' : null;

  /*
   * Several years, not one. A one-page-per-coin site does not have a page for
   * every year of every series -- the Morgan's 1878 is missing and its 1921 is
   * there -- so probing a single year reports "no coverage" for a source that
   * covers almost everything.
   */
  const from = series.years?.from ?? 1900;
  const to = series.years?.to ?? new Date().getFullYear() - 1;
  const samples = [...new Set([from, Math.round((from + to) / 2), to])];

  const shapes = (year) => [
    `${year}-${stem}`,
    ...(metal ? [`${year}-${word}-${metal}-${denom}`, `${year}-${stem.replace(word, `${word}-${metal}`)}`] : []),
    `${year}-${denom}`,
    `${year}-${word}-${denom}`,
  ];
  const hits = new Map();
  for (const year of samples) {
    for (const tail of [...new Set(shapes(year))]) {
      const url = `https://www.silverrecyclers.com/coins/${tail}.aspx`;
      if ((await head(url)) !== 200) continue;
      hits.set(tail.replace(String(year), '<year>'), url);
      break;
    }
  }
  if (hits.size === 0) {
    console.log(`  silverrecyclers.com: no page found for ${samples.join(', ')}`);
  } else {
    for (const [pattern, url] of hits) console.log(`  silverrecyclers.com  OK  ${pattern}  e.g. ${url}`);
  }

  const indexes = [
    `https://www.usacoinbook.com/coins/${denom}s/${word}/`,
    `https://www.usacoinbook.com/coins/${denom}s/${stem}/`,
    `https://www.usacoinbook.com/coins/${denom}s/`,
  ];
  let listed = false;
  for (const url of indexes) {
    const body = await get(url, refresh);
    if (!body) continue;
    const links = new Set([...body.matchAll(/\/coins\/\d+\/[a-z0-9/-]+/g)].map((m) => m[0])).size;
    if (links === 0) continue;
    console.log(`  usacoinbook.com      OK  ${url}  \u2014 ${links} coin pages listed`);
    listed = true;
    break;
  }
  if (!listed) console.log('  usacoinbook.com: no programme index found; try the site and add the path');

  line('=');
  console.log('Next: fill anything BLOCKING above in coin-taxonomy.ts, then register the');
  console.log('readable pages in SERIES (fetch-mintages.mjs) and NUMISTA_SERIES');
  console.log('(numista.mjs). ADDING-A-SERIES.md is the procedure.');
  line('=');
}

if (process.argv[1] && process.argv[1].endsWith('discover-series.mjs')) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
