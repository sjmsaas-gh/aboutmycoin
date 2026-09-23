/**
 * The header search, checked where it is decided: the index and the ranking.
 *
 * Two jobs here and they fail in different ways. An index with a path in it
 * that the build does not produce is a suggestion that 404s, and a static site
 * has no 404 report to find it in -- so every entry is held against the routes
 * the registries say exist. A ranking that puts the wrong page first is worse
 * than no search box, because the reader believes it: the queries below are
 * the phrases this site is for, and each one names the page it must answer
 * with rather than merely asserting that something came back.
 *
 * Run: npm test
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SEARCH_KINDS,
  SEARCH_LIMIT,
  normalise,
  search,
  searchEntries,
  scoreEntry,
  queryWords,
} from '../src/lib/search.ts';
import { sitePaths } from '../src/data/questions.ts';
import { CHEAT_SHEETS, cheatSheetPath } from '../src/data/cheat-sheets.ts';
import { TOOLS_ROOT } from '../src/lib/tools.ts';

const ENTRIES = searchEntries();

/** The paths the registries produce, plus the hand-written pages sitePaths()
 *  does not cover: it exists to check links inside answers, and no answer
 *  links to a calculator. tests/search-dom.test.mjs holds every entry against
 *  the pages the build really wrote, which is the check with no list in it. */
const KNOWN = new Set([
  ...sitePaths(),
  TOOLS_ROOT,
  `${TOOLS_ROOT}/coin-calculators`,
  `${TOOLS_ROOT}/coin-calculators/silver-melt-price`,
  `${TOOLS_ROOT}/coin-calculators/gold-melt-price`,
]);

test('every entry points at a page the registries produce', () => {
  for (const e of ENTRIES) {
    assert.ok(KNOWN.has(e.p), `${e.t}: ${e.p} is not a route`);
  }
});

test('no page is offered twice', () => {
  const seen = new Map();
  for (const e of ENTRIES) {
    assert.ok(!seen.has(e.p), `${e.p} is indexed twice: "${seen.get(e.p)}" and "${e.t}"`);
    seen.set(e.p, e.t);
  }
});

test('every entry has a title, a path and a registered kind', () => {
  for (const e of ENTRIES) {
    assert.ok(e.t.trim().length > 0, `${e.p} has no title`);
    assert.ok(e.p.startsWith('/'), `${e.t} has a path that is not site-relative`);
    assert.ok(SEARCH_KINDS[e.k], `${e.t} has an unregistered kind: ${e.k}`);
  }
});

test('the sheets offered are the written ones, which is what the hub lists', () => {
  /* Written-and-unchecked is noindex and out of the sitemap, and is still
     linked from /tools/cheat-sheets -- so the box may offer it. An UNWRITTEN
     sheet has nothing on it and is offered nowhere. Today every sheet is
     written, so the second half of this passes vacuously and is here for the
     day somebody adds a stub. */
  const offered = new Set(ENTRIES.filter((e) => e.k === 'sheet').map((e) => e.p));
  for (const s of CHEAT_SHEETS) {
    assert.equal(
      offered.has(cheatSheetPath(s)),
      s.written,
      `${s.slug}: written is ${s.written} and it is ${offered.has(cheatSheetPath(s)) ? '' : 'not '}offered`,
    );
  }
});

test('the per-coin melt pages and the grade pages are out of the index', () => {
  for (const e of ENTRIES) {
    assert.ok(
      !/^\/melt-value\/[^/]+\/[^/]+\/[^/]+$/.test(e.p),
      `${e.p}: a coin's melt page answers the same query as its coin page`,
    );
    assert.ok(
      !/^\/coin-info\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(e.p),
      `${e.p}: a grade page is reached from the coin, not from the box`,
    );
  }
});

/** The first suggestion for a query, which is the one a reader presses Enter on. */
const top = (q) => search(ENTRIES, q)[0];

test('a query names the page it is for', () => {
  const cases = [
    ['1964 quarter', /^\/coin-info\/silver\/quarter\/1964/],
    ['washington quarter', '/coin-info/tagged/washington-quarter'],
    ['wheat penny', '/coin-info/tagged/wheat-penny'],
    ['morgan dollar', '/coin-info/tagged/morgan-dollar'],
    ['silver coins', '/coin-info/silver'],
    ['silver quarters', '/coin-info/silver/quarter'],
    ['what is spot price', '/common-questions/what-is-spot-price'],
    ['gold melt price calculator', '/tools/coin-calculators/gold-melt-price'],
    ['wheat penny cheat sheet', '/tools/cheat-sheets/wheat-penny'],
  ];
  for (const [q, want] of cases) {
    const got = top(q);
    assert.ok(got, `"${q}" found nothing`);
    if (want instanceof RegExp) assert.match(got.p, want, `"${q}" -> ${got.p}`);
    else assert.equal(got.p, want, `"${q}" -> ${got.t}`);
  }
});

test('a melt archive is found by the word melt, which is not in its heading', () => {
  const got = top('silver quarter melt');
  assert.equal(got.p, '/melt-value/silver/quarter');
  assert.ok(!normalise(got.t).includes('melt'), 'the heading now says melt -- the alias may be removable');
});

test('a word has to begin a word', () => {
  /* "uarter" is inside "quarter" and matches nothing: a substring search over
     eight hundred titles answers half the queries with a page that merely
     contains the letters somebody typed. */
  assert.deepEqual(search(ENTRIES, 'uarter'), []);
  assert.ok(search(ENTRIES, 'quart').length > 0, 'a prefix of a word must still match');
});

test('every word typed has to match', () => {
  assert.deepEqual(search(ENTRIES, 'washington quarter zeppelin'), []);
});

test('an empty query offers nothing', () => {
  for (const q of ['', '   ', '  %  ']) assert.deepEqual(search(ENTRIES, q), []);
});

test('the list is capped and is stable between identical queries', () => {
  const a = search(ENTRIES, 'silver');
  const b = search(ENTRIES, 'silver');
  assert.ok(a.length <= SEARCH_LIMIT);
  assert.deepEqual(a.map((e) => e.p), b.map((e) => e.p));
});

test('scoring a miss is negative, whatever the kind is worth', () => {
  const words = queryWords('zeppelin');
  for (const e of ENTRIES) assert.equal(scoreEntry(e, words), -1);
});
