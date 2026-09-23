/**
 * The mintage pipeline, and the ways a source can be wrong without looking it.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE AND NOT OTHERS
 * ---------------------------------------------------------------------------
 *
 * Every case below is a real defect that reached `data/mintages.json` while
 * this was being written, and every one of them produced a plausible number.
 * That is the whole reason the file needs a test: a mintage parsed wrongly does
 * not look broken, it looks like a mintage, and the page it lands on states it
 * with the same confidence as the two hundred that are right.
 *
 * The pairing cases are the sharpest. Two catalogues do not call one reverse
 * design by one name, so the merge matches them loosely -- and every time the
 * loose match failed, the same thing happened: the design looked absent from
 * one side, was added as a gap to fill, and the coin ended up with one design
 * more than the mint ever struck. The 2019-W page said six designs and ten
 * million became twelve.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  clean,
  parseTable,
  splitTables,
  narrowIssues,
  wideIssues,
  foldDesigns,
} from '../scripts/fetch-mintages.mjs';
import { normaliseDesign, sameDesign, pairDesigns } from '../scripts/numista.mjs';

/** A parser context that collects its complaints rather than throwing. */
const ctx = (over = {}) => ({
  problems: [],
  excluded: [],
  unpublished: [],
  malformed: [],
  where: 'test',
  group: 'clad',
  design: 'Eagle',
  ...over,
});

/* ---------------------------------------------------------------------------
   Reading a table
   --------------------------------------------------------------------------- */

test('a rowspanned mint is carried down, not read as a mintage', () => {
  // The America the Beautiful page's shape. Read as written, the "Silver proof"
  // row is two cells long and its first cell is a number, which a parser that
  // destructures by position reads as the name of a mint -- and the whole page
  // could not be read at all.
  const table = `|+Hot Springs reverse, 2010 (Nickel-clad copper unless otherwise noted)
! Year
! Mint
! Mintage
! Comments
|-
| rowspan="4" |2010
|P
|35,600,000
|
|-
|D
|34,000,000
|
|-
| rowspan="2" |S
|1,401,903
|Proof
|-
|859,435
|Silver proof
|}`;
  const { rows } = parseTable(table);
  assert.deepEqual(rows[2], ['2010', 'S', '1,401,903', 'Proof']);
  assert.deepEqual(rows[3], ['2010', 'S', '859,435', 'Silver proof']);

  const c = ctx({ design: 'Hot Springs' });
  const issues = narrowIssues(rows, c);
  assert.deepEqual(c.problems, []);
  assert.deepEqual(
    issues.map((i) => [i.mark, i.finish, i.mintage]),
    [
      ['P', 'circulation', 35600000],
      ['D', 'circulation', 34000000],
      ['S', 'proof', 1401903],
      ['S', 'silver-proof', 859435],
    ],
  );
});

test('a cell value containing a pipe is not cut at it', () => {
  // `[[Georgia (U.S. state)|Georgia]]` -- splitting a cell at the last pipe it
  // contains, which is what this script used to do, reads the display half of a
  // link as the whole cell. Survivable while every cell held a number.
  const { rows } = parseTable(`! Year
! State
|-
|1999
|[[Georgia (U.S. state)|Georgia]]
|}`);
  assert.equal(rows[0][1], 'Georgia');
});

test('a mint in brackets means the coin carries no mark, and "^" joins the coin above', () => {
  const c = ctx();
  const issues = narrowIssues(
    [
      ['1977', '(P)', '468,556,000', ''],
      ['1977', '(W)', '^', 'First time West Point produced the quarter'],
    ],
    c,
  );
  assert.deepEqual(c.problems, []);
  assert.equal(issues.length, 1, 'a "^" figure is the same coin, not another one');
  assert.equal(issues[0].mark, '', 'a bracketed mint means no mint mark');
  assert.deepEqual(issues[0].struckAt, ['Philadelphia', 'West Point']);
});

test('a marked coin may not share another coin’s figure', () => {
  const c = ctx();
  narrowIssues([['1977', 'D', '^', '']], c);
  assert.match(c.problems.join(' '), /cannot share/);
});

test('a mint nobody has registered is refused, not guessed at', () => {
  const c = ctx();
  narrowIssues([['1879', 'CCX', '100,000', '']], c);
  assert.match(c.problems.join(' '), /not a mint this script knows/);
});

/* ---------------------------------------------------------------------------
   Finishes
   --------------------------------------------------------------------------- */

test('the finishes are told apart, longest pattern first', () => {
  const c = ctx();
  const issues = narrowIssues(
    [
      ['2018', 'S', '946,617', 'Uncirculated'],
      ['2018', 'S', '637,779', 'Proof'],
      ['2018', 'S', '461,053', 'Silver proof'],
      ['2018', 'S', '199,177', 'Silver reverse proof'],
      ['2018', '(P)', '30,000', 'Silver bullion'],
      ['2018', 'P', '17,598', 'Silver bullion, uncirculated'],
      ['2017', 'S', '210,419', 'Enhanced uncirculated'],
      ['1966', '(S)', '2,261,583', 'Satin finish, Special Mint Set'],
    ],
    c,
  );
  assert.deepEqual(c.problems, []);
  assert.deepEqual(
    issues.map((i) => i.finish),
    ['uncirculated', 'proof', 'silver-proof'],
    'the three kept finishes, and nothing else',
  );
  // "Silver bullion, uncirculated" is a five-ounce round and not the
  // uncirculated quarter; "Silver reverse proof" is not the silver proof.
  // Testing the short patterns first files fifty-six rounds as quarters and
  // gives two coins one page.
  assert.equal(c.excluded.length, 5);
});

test('a figure the source has not published is not a parse failure and not a zero', () => {
  const c = ctx();
  const issues = narrowIssues([['2020', 'P', 'TBA', '']], c);
  assert.deepEqual(issues, []);
  assert.deepEqual(c.problems, [], 'the table said it does not know; that is not a failure');
  assert.equal(c.unpublished.length, 1);
});

/* ---------------------------------------------------------------------------
   Wide tables
   --------------------------------------------------------------------------- */

const womenColumns = {
  year: { index: 0, header: 'Year' },
  design: { index: 2, header: 'Woman' },
  mints: [
    { index: 8, header: 'Denver', mark: 'D', city: 'Denver' },
    { index: 9, header: 'Philadelphia', mark: 'P', city: 'Philadelphia' },
    { index: 10, header: 'San Francisco', mark: 'S', city: 'San Francisco', finish: 'uncirculated' },
  ],
  total: { index: 11, header: 'Total' },
};
const womenHeaders = [
  'Year', 'No.', 'Woman', 'Design', 'Elements depicted', 'Artist(s)', 'Release date',
  'Mintage', 'Sculptor', 'Designer', 'Denver', 'Philadelphia', 'San Francisco', 'Total',
];
const womenRow = [
  '2022', '1', 'Maya Angelou', '', 'Angelou with her arms outstretched', 'Craig Campbell',
  'Emily Damstra', 'January 3, 2022', '258,200,000', '237,600,000', '303,520', '496,103,520',
];

test('a wide table’s mints are checked against the headers, not assumed', () => {
  const c = ctx({ columns: womenColumns });
  const issues = wideIssues([womenRow], womenHeaders, c);
  assert.deepEqual(c.problems, []);
  assert.deepEqual(
    issues.map((i) => [i.mark, i.mintage, i.finish]),
    [
      ['D', 258200000, 'circulation'],
      ['P', 237600000, 'circulation'],
      ['S', 303520, 'uncirculated'],
    ],
    'Denver comes first on this page, which is why the columns are declared',
  );
});

test('the table’s own total is re-added, so a mislabelled column fails the build', () => {
  const c = ctx({ columns: womenColumns });
  const wrong = [...womenRow];
  wrong[11] = '496,103,521';
  wideIssues([wrong], womenHeaders, c);
  assert.match(c.problems.join(' '), /the table's own total/);
});

test('reordered mint columns are refused rather than filed under the wrong mint', () => {
  const c = ctx({ columns: womenColumns });
  const swapped = [...womenHeaders];
  swapped[10] = 'Philadelphia';
  swapped[11] = 'Denver';
  wideIssues([womenRow], swapped, c);
  assert.match(c.problems.join(' '), /reordered/);
});

test('a row missing a cell is refused whole, because which cell went missing is unknowable', () => {
  // Three rows of the American Women table are like this. Every figure after
  // the gap shifts one column left: Philadelphia's mintage lands under Denver
  // and the uncirculated coin's under Philadelphia. Nothing about the row looks
  // wrong -- every number in it is a plausible mintage.
  const c = ctx({ columns: womenColumns });
  const short = womenRow.filter((_, i) => i !== 9);
  const issues = wideIssues([short], womenHeaders, c);
  assert.deepEqual(issues, []);
  assert.deepEqual(c.problems, []);
  assert.equal(c.malformed.length, 1);
  assert.match(c.malformed[0], /one is missing/);
});

/* ---------------------------------------------------------------------------
   Summing the designs
   --------------------------------------------------------------------------- */

test('designs are summed, and a per-design figure is kept only when they agree', () => {
  const problems = [];
  const rows = [
    { year: 2019, mark: 'W', finish: 'circulation', group: 'clad', struckAt: ['West Point'], design: 'Lowell', mintage: 2000000 },
    { year: 2019, mark: 'W', finish: 'circulation', group: 'clad', struckAt: ['West Point'], design: 'American Memorial Park', mintage: 2000000 },
    { year: 2012, mark: 'S', finish: 'uncirculated', group: 'clad', struckAt: ['San Francisco'], design: 'El Yunque', mintage: 1679240 },
    { year: 2012, mark: 'S', finish: 'uncirculated', group: 'clad', struckAt: ['San Francisco'], design: 'Acadia', mintage: 1409120 },
  ];
  const [unc, w] = foldDesigns(rows, problems, 'test');
  assert.deepEqual(problems, []);
  assert.equal(w.mintage, 4000000);
  assert.equal(w.perDesign, 2000000, 'every design carries the same figure, so the reader’s own is known');
  assert.equal(unc.mintage, 3088360);
  assert.equal(unc.perDesign, undefined, 'the designs differ, so no single figure is the reader’s');
});

test('one design counted twice is refused', () => {
  const problems = [];
  foldDesigns(
    [
      { year: 2017, mark: 'S', finish: 'proof', group: 'clad', struckAt: ['San Francisco'], design: 'Ozark', mintage: 1 },
      { year: 2017, mark: 'S', finish: 'proof', group: 'clad', struckAt: ['San Francisco'], design: 'Ozark', mintage: 1 },
    ],
    problems,
    'test',
  );
  assert.match(problems.join(' '), /priced twice/);
});

/* ---------------------------------------------------------------------------
   Pairing one design across two catalogues
   --------------------------------------------------------------------------- */

test('two catalogues’ names for one design are paired', () => {
  // Each of these failed at some point, and each failure added a design that
  // does not exist to a coin that does.
  const pairs = [
    ['River Of No Return', 'Frank Church River of No Return Wilderness, Idaho'],
    ['US Virgin Islands', 'U.S. Virgin Islands'],
    ['Ozark Riverways', 'Ozark National Scenic Riverways, Missouri'],
    ['National Park', 'National Park of American Samoa'],
    ['Effigy Mounds', 'Effigy Mounds National Monument, Iowa'],
    ['Ellis Island', 'Ellis Island (Statue of Liberty National Monument), New Jersey'],
    ['Dr. Mary Edwards Walker', 'Mary Edwards Walker'],
    ['Hot Springs', 'Hot Springs, Arkansas'],
  ];
  for (const [a, b] of pairs) {
    assert.ok(
      sameDesign(normaliseDesign(a), normaliseDesign(b)),
      `"${a}" and "${b}" are one design and were not paired`,
    );
  }
});

test('different designs of one year are not paired', () => {
  const apart = [
    ['Weir Farm', 'Salt River Bay'],
    ['Tallgrass Prairie', 'Marsh-Billings-Rockefeller'],
    ['North Carolina', 'South Carolina'],
    ['Maryland', 'Maine'],
  ];
  for (const [a, b] of apart) {
    assert.ok(
      !sameDesign(normaliseDesign(a), normaliseDesign(b)),
      `"${a}" and "${b}" are different designs and were paired`,
    );
  }
});

test('the 2020 caption "National Park" pairs with exactly one of that year\u2019s designs', () => {
  // The real case, and the reason the subsequence match is anchored on its
  // first word: "national park" is an ordered subsequence of THREE of 2020's
  // five designs. Unanchored, this pairs with all three and `pairDesigns`
  // refuses the coin; anchored, it pairs with the one that is actually called
  // that.
  const problems = [];
  const { pairs, unpairedPrimary } = pairDesigns(
    [{ design: 'National Park' }],
    [
      { design: 'Salt River Bay National Historical Park and Ecological Preserve, U.S. Virgin Islands' },
      { design: 'National Park of American Samoa' },
      { design: 'Marsh-Billings-Rockefeller National Historical Park, Vermont' },
    ],
    problems,
    'test',
  );
  assert.deepEqual(problems, [], 'the caption must not be ambiguous');
  assert.deepEqual(unpairedPrimary, []);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0][1].design, 'National Park of American Samoa');
});

test('a name matching two designs of one coin is refused, not chosen between', () => {
  const problems = [];
  pairDesigns(
    [{ design: 'Park Road' }],
    [{ design: 'Park Loop Road' }, { design: 'Park Access Road' }],
    problems,
    'test',
  );
  assert.match(problems.join(' '), /matches 2 designs/);
});

/* ---------------------------------------------------------------------------
   The committed file
   --------------------------------------------------------------------------- */

test('the committed mintages say where every figure came from', () => {
  const data = JSON.parse(readFileSync('data/mintages.json', 'utf8'));
  const series = data.series['washington-quarter'];
  assert.ok(series.pages.length > 1, 'the figures come from more than one page and it says so');
  for (const page of series.pages) {
    assert.ok(page.url, `${page.page} has no url`);
    assert.ok(page.cites, `${page.page} does not say what it cites`);
  }
  assert.ok(series.sources.names.length >= 3, 'two sources can only agree or disagree; three can vote');

  for (const issue of series.issues) {
    const where = `${issue.year}-${issue.mark || 'P'} ${issue.finish}`;
    // A coin may have no total -- see `coverage` -- but it may not have a
    // figure of zero, which would read as "none were struck".
    if (issue.coverage) {
      assert.equal(issue.mintage, undefined, `${where}: a partial count published as a total`);
      assert.ok(issue.coverage.designsPriced < issue.coverage.designsStruck);
    } else {
      assert.ok(issue.mintage > 0, `${where} has no mintage`);
    }
    assert.ok(issue.sources >= 1, `${where} records no source count`);
    if (issue.breakdown && !issue.coverage) {
      const summed = issue.breakdown.reduce((a, b) => a + b.mintage, 0);
      assert.equal(summed, issue.mintage, `${where}: the breakdown does not add up to the total`);
      assert.equal(issue.designs, issue.breakdown.length);
    }
    if (issue.perDesign !== undefined) {
      assert.equal(
        issue.perDesign * issue.designs,
        issue.mintage,
        `${where}: a per-design figure that does not multiply out`,
      );
    }
  }
});

test('a disputed figure is published as the highest, and says so', () => {
  // Completeness first, correctness a very close second: a coin the sources
  // cannot settle still gets a page, with the best figure AND the disagreement.
  // The tie goes to the HIGHEST, because the worst thing this site can do to
  // somebody holding an ordinary coin is tell them it is scarce.
  const data = JSON.parse(readFileSync('data/mintages.json', 'utf8'));
  const series = data.series['washington-quarter'];
  const disputed = series.issues.filter((i) => i.disputed);
  assert.ok(disputed.length > 0, 'nothing disputed at all is a sign the merge stopped voting');
  for (const issue of disputed) {
    const where = `${issue.year}-${issue.mark || 'P'} ${issue.finish}`;
    for (const design of issue.disputed) {
      assert.ok(design.figures.length > 1, `${where}: a dispute with one figure in it`);
      const highest = Math.max(...design.figures.map((f) => f.mintage));
      const row = (issue.breakdown ?? []).find((b) => b.design === design.design);
      if (row) {
        assert.equal(row.mintage, highest, `${where} ${design.design}: took something other than the highest`);
      }
      for (const figure of design.figures) {
        assert.ok(figure.sources.length > 0, `${where}: a figure with no source behind it`);
      }
    }
  }
});

test('nothing is withheld for a disagreement any more', () => {
  const data = JSON.parse(readFileSync('data/mintages.json', 'utf8'));
  for (const series of Object.values(data.series)) {
    for (const held of series.withheld ?? []) {
      assert.fail(`${held.coin} is withheld: ${held.why}`);
    }
  }
});

test('every adjudication names a third source and a finish', () => {
  // Judgement in the list, mechanics in the merge. An entry with nobody behind
  // it is a preference, and a preference is what the list exists instead of --
  // and an entry with no finish silently settled the 2018-S proofs on the
  // strength of a circulation figure.
  const source = readFileSync('scripts/fetch-mintages.mjs', 'utf8');
  const block = source.slice(source.indexOf('const ADJUDICATED = ['), source.indexOf('/** The adjudication covering'));
  const entries = block.split(/\n  \{/).slice(1);
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    assert.match(entry, /finish:/, 'an adjudication with no finish');
    assert.match(entry, /checked:/, 'an adjudication with no third source');
    /*
     * A source to prefer, or a FIGURE. The third form arrived with the 1878
     * reverse hubs, where both sources are secondary and "take the primary"
     * names nothing -- the primary has no row for the coin at all, which is
     * why it is a gap coin. A bare figure is still a decision with a third
     * source behind it, because `checked:` is required either way.
     */
    assert.match(entry, /take: ('(primary|second)'|\d+)/);
  }
});

test('a declared gap is not the same thing as an exclusion', () => {
  /*
   * The merge refuses to invent a coin the primary source does not carry, and
   * that rule is load-bearing: it is what keeps the 1976 Bicentennial, which
   * the primary is told to ignore and every other catalogue carries, from
   * walking back in through the second source. `gaps` is the exception and it
   * has to stay narrow, so every one of them is declared on the SOURCE beside
   * the prose sentence saying the same thing to a reader.
   */
  const source = readFileSync('scripts/fetch-mintages.mjs', 'utf8');
  for (const [, block] of source.matchAll(/gaps: \[([\s\S]*?)\n        \],/g)) {
    assert.match(block, /match: \(row\) =>/, 'a gap with nothing to match on');
    assert.match(block, /why: '/, 'a gap that does not say what it is');
  }
  // And a source that declares one says so in prose as well, because the file
  // is read by people before it is read by the merge.
  assert.ok(source.includes('missing:'), 'no source states what it does not cover');
});

test('the 1878 reverse hubs add up to the year the primary source states', () => {
  /*
   * The whole case for splitting them. The primary states one figure for the
   * 1878 Philadelphia dollar and does not split it; the two hub pages state
   * their own figures, from sources the primary does not read. If those two do
   * not come to the primary's total, three pages disagree with each other in
   * front of the reader -- and it is the year page, the one almost everybody
   * lands on, that would be wrong.
   */
  const data = JSON.parse(readFileSync('data/mintages.json', 'utf8'));
  const issues = data.series['morgan-dollar'].issues.filter((i) => i.year === 1878 && i.mark === '');
  for (const finish of ['circulation', 'proof']) {
    const whole = issues.find((i) => i.finish === finish && !i.hub);
    const hubs = issues.filter((i) => i.finish === finish && i.hub);
    assert.ok(whole, `no 1878 ${finish} coin for the year itself`);
    assert.equal(hubs.length, 2, `expected two 1878 ${finish} reverse hubs`);
    assert.equal(
      hubs.reduce((total, i) => total + i.mintage, 0),
      whole.mintage,
      `the 1878 ${finish} hubs do not add up to the year`,
    );
  }
});

test('a hub is not an attestation of its own', () => {
  /*
   * `attested` answers "did this mint strike this date", which the checklist
   * reads to say "there is no 1878-D". A hub is the same (year, mark, finish)
   * as the coin it hangs under, so listing it separately would put one coin in
   * that list three times -- harmless today and exactly the kind of thing that
   * is not harmless the day something counts the list.
   */
  const data = JSON.parse(readFileSync('data/mintages.json', 'utf8'));
  const attested = data.series['morgan-dollar'].attested;
  const keys = attested.map((a) => `${a.year}|${a.mark}|${a.finish}`);
  assert.equal(new Set(keys).size, keys.length, 'attested holds a duplicate');
  assert.equal(keys.filter((k) => k.startsWith('1878||')).length, 2);
});

test('every hub in the data has an entry in the taxonomy', () => {
  // A slug with no entry is a coin with a token in its URL and nothing on the
  // page explaining it. The importer refuses; this is the same check where a
  // reader of the tests will see it.
  const data = JSON.parse(readFileSync('data/mintages.json', 'utf8'));
  const source = readFileSync('src/data/coin-taxonomy.ts', 'utf8');
  for (const series of Object.values(data.series)) {
    for (const issue of series.issues) {
      if (!issue.hub) continue;
      assert.ok(source.includes(`slug: '${issue.hub}'`), `no taxonomy entry for hub "${issue.hub}"`);
    }
  }
});

test('the cached wikitext is what the figures were read out of', () => {
  // Committed, so the exact text behind every figure is in the repository and a
  // re-run of the import spends nothing. A missing cache means the next run
  // silently goes to the network instead.
  const data = JSON.parse(readFileSync('data/mintages.json', 'utf8'));
  for (const page of data.series['washington-quarter'].pages) {
    const path = `data/wikitext/${page.page.replace(/[^\w.-]/g, '_')}.wiki`;
    const text = readFileSync(path, 'utf8');
    assert.ok(text.length > 1000, `${path} is empty`);
    assert.ok(splitTables(text).length > 0, `${path} holds no tables`);
  }
});

test('clean() leaves the value a reader sees', () => {
  assert.equal(clean("'''The Palmetto State'''"), 'The Palmetto State');
  assert.equal(clean('35,600,000<ref name=":0" />'), '35,600,000');
  // A third parameter of `sortname` is the sort key and not part of the name;
  // joining every parameter gave "Nina Otero-Warren Adelina Otero-Warren".
  assert.equal(clean('{{sortname|Nina|Otero-Warren|Adelina Otero-Warren}}'), 'Nina Otero-Warren');
});

/* ---------------------------------------------------------------------------
   The generated coins
   --------------------------------------------------------------------------- */

test('a proper noun in a series name survives every recasing', async () => {
  // This has now shipped twice. `seriesName.toLowerCase()` turned "Washington"
  // into "washington" the first time, and the second time a helper meant to
  // lowercase the word "Proof" lowercased the whole stem with it -- so every
  // proof page, and every melt page beside one, read "2021-S silver proof
  // washington quarter". A series noun is stored in sentence form WITH its
  // proper nouns intact, for the same reason `PROPER_SERIES_WORDS` exists, and
  // nothing downstream may flatten it.
  const { SEEDED_COINS } = await import('../src/data/coin-seed.ts');
  const { GENERATED_COINS } = await import('../src/data/coin-generated.ts');
  for (const coin of [...SEEDED_COINS, ...GENERATED_COINS]) {
    for (const [field, value] of Object.entries({
      name: coin.name,
      shortName: coin.shortName ?? '',
      bluf: coin.bluf,
      description: coin.description,
      seoTitle: coin.seoTitle,
    })) {
      assert.ok(
        !/\bwashington\b/.test(value),
        `${coin.slug}: ${field} lowercases a proper noun: "${value}"`,
      );
    }
  }
});

test('a coin that never circulated carries a finish and no misleading verdict', async () => {
  const { GENERATED_COINS } = await import('../src/data/coin-generated.ts');
  const finished = GENERATED_COINS.filter((c) => c.finish);
  assert.ok(finished.length > 50, 'the proofs and the Mint-roll coins should all carry one');
  for (const coin of finished) {
    assert.ok(coin.finish.note.length > 80, `${coin.slug}: a finish with no sentence behind it`);
  }
});

test('a mintage that is a sum across designs always says so', async () => {
  const { GENERATED_COINS } = await import('../src/data/coin-generated.ts');
  const data = JSON.parse(readFileSync('data/mintages.json', 'utf8'));
  const designs = new Map(
    data.series['washington-quarter'].issues.map((i) => [
      `${i.year}|${i.mark}|${i.finish}`,
      i.designs,
    ]),
  );
  for (const coin of GENERATED_COINS) {
    const mark = coin.mintMark ?? '';
    const kind = coin.finish?.kind ?? 'circulation';
    const count = designs.get(`${coin.years.from}|${mark}|${kind}`);
    if (count === undefined) continue;
    if (count > 1) {
      assert.ok(
        coin.mintageNote,
        `${coin.slug}: ${coin.mintage.toLocaleString()} is a sum over ${count} designs and the page does not say so`,
      );
    } else {
      assert.ok(!coin.mintageNote, `${coin.slug}: one design, so there is nothing to explain`);
    }
  }
});
