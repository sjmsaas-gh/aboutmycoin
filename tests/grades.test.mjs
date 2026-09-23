/**
 * The grade ladder, the research sheets and the importer that joins them.
 *
 * The importer is the only thing standing between a research sheet and a page
 * that states a price, so every check it makes is tested by breaking a sheet
 * and asserting it refuses. A checker that has quietly stopped checking looks
 * exactly like a checker that has nothing to complain about.
 *
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  GRADES,
  eligibleRungs,
  DESIGNATIONS,
  gradeBySlug,
  gradeLadder,
  gradeDefinition,
  gradeForms,
} from '../src/data/grades.ts';
import { GRADED_LADDERS } from '../src/data/graded-values.ts';
import { COINS } from '../src/data/coin-catalog.ts';
import { TAGS } from '../src/data/coin-taxonomy.ts';
import { parseSheet, checkSheet } from '../scripts/import-grades.mjs';
import { ladderFor as gateLadder } from '../scripts/merge-grade-prices.mjs';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const SHEETS = 'data/grades';
const coins = COINS.map((c) => c.slug);

/** A minimal valid sheet, for the failure cases to spoil one field at a time. */
const GOOD = [
  'coin: 1932-d-washington-quarter',
  'asof: 2026-09-21',
  'source: PCGS Auction Prices | https://example.invalid | realized prices',
  'grade\tlow\thigh\tpop\tfiner\tservice\tsales',
  'g4\t70\t125',
  'f12\t84\t150\t171\t5545\tPCGS\t84|April 2019|Heritage Auctions',
].join('\n');

const parse = (text) => {
  const problems = [];
  const sheet = parseSheet(text, 'test.tsv', problems);
  checkSheet(sheet, 'test.tsv', { grades: GRADES, coins }, problems);
  return problems;
};

test('a well-formed sheet parses with nothing to complain about', () => {
  assert.deepEqual(parse(GOOD), []);
});

test('a sale outside its own range is refused', () => {
  // The page prints the range as the answer and the sales beneath it as the
  // working. A sale outside the range is the page arguing with itself in front
  // of a reader who can see both numbers, and the reader is right.
  const broken = GOOD.replace('f12\t84\t150', 'f12\t100\t150');
  const problems = parse(broken);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /range is 100-150 and a recorded sale is 84/);
});

test('a ladder that falls as the grade rises is refused', () => {
  // Either a row is filed under the wrong grade or a figure was typed an order
  // of magnitude wrong. Sorting the sheet would hide both, which is why the
  // order is validated rather than sorted -- the same rule the cheat sheets'
  // date order follows.
  const broken = GOOD.replace('f12\t84\t150', 'f12\t84\t100');
  const problems = parse(broken);
  assert.ok(
    problems.some((p) => /f12 tops out below g4/.test(p)),
    `expected a falling-ladder complaint, got: ${problems.join('; ')}`,
  );
});

test('a grade nobody registered is refused', () => {
  // Not "ms70" any more: the top mint state rungs and the whole proof ladder
  // were registered on 2026-09-22, and a test whose fake slug quietly becomes
  // real is a test that passes for the wrong reason.
  const problems = parse(`${GOOD}\nvf37\t1\t2`);
  assert.ok(problems.some((p) => /no grade with that slug is registered/.test(p)));
});

test('a rung priced twice is refused', () => {
  const problems = parse(`${GOOD}\ng4\t70\t125`);
  assert.ok(problems.some((p) => /priced twice/.test(p)));
});

test('a population with nobody behind it is refused', () => {
  // A census is a count by somebody. An unattributed one is the scrape the
  // house rules refuse, wearing a number.
  const problems = parse(GOOD.replace('\t171\t5545\tPCGS\t', '\t171\t5545\t\t'));
  assert.ok(problems.some((p) => /needs the census that counted it/.test(p)));
});

test('a sheet with no date and no source is refused', () => {
  // Every figure on this site is dated at the figure, and this is where a
  // grade page's date comes from. A ladder with neither cannot be printed.
  const problems = parse(GOOD.split('\n').filter((l) => !/^(asof|source):/.test(l)).join('\n'));
  assert.ok(problems.some((p) => /no "asof:" line/.test(p)));
  assert.ok(problems.some((p) => /no "source:" line/.test(p)));
});

test('a sheet pricing a coin that is not in the catalogue is refused', () => {
  const problems = parse(GOOD.replace('1932-d-washington-quarter', '1804-dollar'));
  assert.ok(problems.some((p) => /is not a coin in the catalogue/.test(p)));
});

test('a malformed sale is refused rather than half-read', () => {
  // `price|when|house`. A two-field entry would otherwise import with an
  // undefined house and render a sale nobody can attribute.
  const problems = parse(GOOD.replace('84|April 2019|Heritage Auctions', '84|April 2019'));
  assert.ok(problems.some((p) => /must be price\|month year\|house/.test(p)));
});

test('the committed sheets are exactly what the committed ladders say', () => {
  // The generated file is committed, so it can be hand-edited, and a
  // hand-edited generated file is the one nobody re-reads. This is the check
  // that somebody ran `npm run grades` after editing a sheet.
  const files = readdirSync(SHEETS).filter((f) => f.endsWith('.tsv'));
  assert.ok(files.length > 0, 'no research sheets, so there is nothing to import');

  for (const file of files) {
    const problems = [];
    const sheet = parseSheet(readFileSync(join(SHEETS, file), 'utf8'), file, problems);
    const rungs = checkSheet(sheet, file, { grades: GRADES, coins }, problems);
    assert.deepEqual(problems, [], `${file}:\n  - ${problems.join('\n  - ')}`);

    const built = GRADED_LADDERS.find((l) => l.coin === sheet.coin);
    assert.ok(built, `${file} prices ${sheet.coin} and no ladder was generated for it`);
    assert.equal(built.asOf, sheet.asOf, `${file}: the generated ladder has a different date`);
    // PRICED ROWS ONLY. Since 2026-09-22 the generated ladder is every rung the
    // coin can be graded on, so it is longer than the sheet by design: the
    // rungs the sheet does not mention are there with no figure and render as
    // TBD. What this check is for is unchanged -- that every row the sheet DOES
    // price came through the importer untouched.
    assert.deepEqual(
      built.values.filter((v) => v.low !== undefined),
      rungs,
      `${file}: the generated ladder does not match the sheet -- run npm run grades`,
    );
  }
});

test('every rung has a definition that names its own coin and grade', () => {
  // Without `{coin}` the same paragraph ships on every coin of a series that
  // shares a grade, which is the duplication the whole scheme exists to avoid
  // and which does not appear until the second coin is added.
  for (const grade of GRADES) {
    assert.ok(grade.definition.includes('{coin}'), `${grade.code} does not name its coin`);
    assert.ok(grade.definition.includes('{label}'), `${grade.code} does not name its grade`);
  }
});

test('the ladder sorts by Sheldon number, then by colour within it', () => {
  // Brown, Red-Brown, Red at each mint state number. A rung is ordered by the
  // pair, never by its position in the array -- a grade inserted in the wrong
  // place would otherwise still sort correctly, which is the one failure mode
  // a hand-kept order has.
  const ladder = gradeLadder();
  for (let i = 1; i < ladder.length; i += 1) {
    const here = ladder[i];
    const before = ladder[i - 1];
    assert.ok(
      here.number > before.number || (here.number === before.number && here.rank > before.rank),
      `${here.code} does not come after ${before.code}`,
    );
  }
  // And the registry itself comes out in that order, because a reader of the
  // file should not have to sort it in their head.
  assert.deepEqual(GRADES.map((g) => g.slug), ladder.map((g) => g.slug));
});

test('a colour is composed over a mint state rung, never over a circulated one', () => {
  // Below mint state every surviving copper coin is brown, so the letters
  // carry no information a buyer pays for. A rung exists to hold a price that
  // separates, and BN on a Fine cent separates nothing.
  for (const grade of GRADES.filter((g) => g.designation)) {
    assert.equal(grade.tier, 'mint-state', `${grade.code} carries a colour on a circulated rung`);
    assert.ok(grade.groups.length > 0, `${grade.code} applies to no composition group`);
    assert.equal(grade.chain, grade.designation.slug);
  }
  // Every mint state rung has all three, or the ladder has a hole in it that
  // only shows up on the coin that needed the missing one.
  for (const base of GRADES.filter((g) => g.tier === 'mint-state' && !g.designation)) {
    for (const d of DESIGNATIONS) {
      assert.ok(
        GRADES.some((g) => g.slug === `${base.slug}${d.slug}`),
        `${base.code} has no ${d.code} rung`,
      );
    }
  }
});

test('a coin graded with a colour is not also graded without one', () => {
  // No service slabs a wheat penny as plain MS65 -- it comes back MS65BN,
  // MS65RB or MS65RD -- so the undesignated rung describes a holder nobody has
  // ever seen. The filter is by composition group, which is what puts the 1943
  // cent on the other side of it: zinc-coated steel, no colour designated, and
  // the plain mint state rungs it keeps are the ones every other wheat penny
  // loses.
  const rungs = (slug) => {
    const coin = COINS.find((c) => c.slug === slug);
    assert.ok(coin, `${slug} is not in the catalogue`);
    return eligibleRungs(coin).map((g) => g.slug);
  };

  const copper = rungs('1944-wheat-penny');
  assert.ok(copper.includes('ms65rd'), 'a copper cent is graded in colour');
  assert.ok(!copper.includes('ms65'), 'a copper cent is graded ONLY in colour');
  assert.ok(copper.includes('vf20'), 'the circulated rungs are untouched');

  const steel = rungs('1943-wheat-penny');
  assert.ok(steel.includes('ms65'), 'the steel cent keeps the plain mint state ladder');
  assert.ok(!steel.some((g) => g.endsWith('rd')), 'colour is not designated on steel');

  // And the rule is derived from the designations rather than from a list of
  // series, so it holds for every coin in the catalogue at once.
  for (const coin of COINS) {
    const slugs = eligibleRungs(coin).map((g) => gradeBySlug(g.slug));
    const colour = slugs.some((g) => g.designation);
    const plain = slugs.some((g) => g.tier === 'mint-state' && !g.designation);
    assert.ok(!(colour && plain), `${coin.slug} offers mint state both with a colour and without`);
  }
});

test('every spelling of a grade reaches exactly one rung', () => {
  // The forms note prints these, so a spelling owned by two rungs sends a
  // reader to the wrong page, and one owned by none is a phrase the site never
  // contains.
  const owner = new Map();
  for (const grade of GRADES) {
    const forms = gradeForms(grade);
    assert.ok(forms.includes(grade.code), `${grade.code} is not among its own spellings`);
    for (const form of forms) {
      assert.ok(!owner.has(form) || owner.get(form) === grade.slug, `"${form}" is claimed twice`);
      owner.set(form, grade.slug);
    }
  }
  // The one alias that matters: the British convention for Extremely Fine.
  assert.deepEqual(
    gradeForms(gradeBySlug('xf40')),
    ['XF40', 'XF-40', 'EF40', 'EF-40'],
    'the EF spellings are how a British reader types this grade',
  );
  // And a designated rung carries the spaced and unspaced slab forms.
  assert.ok(gradeForms(gradeBySlug('ms65rd')).includes('MS65 RD'));
  assert.ok(gradeForms(gradeBySlug('ms65rd')).includes('MS-65RD'));
});

test('a composed definition fills its coin name everywhere, not just once', () => {
  // A designated rung names its coin twice -- once in the Sheldon clause and
  // once in the colour clause. `replace` fills the first and prints `{coin}`
  // to the reader for the second.
  const wear = TAGS.find((t) => t.series?.wear)?.series.wear;
  const filled = gradeDefinition(gradeBySlug('ms65rd'), wear, 'test coin');
  assert.doesNotMatch(filled, /{\w+}/);
  assert.ok(filled.split('test coin').length - 1 >= 2, 'the colour clause did not name the coin');
});

test('a filled definition has no slot left in it', () => {
  // A slot nobody filled renders the word `{obverse}` to a reader on every
  // page of a series at once.
  const wear = TAGS.find((t) => t.series?.wear)?.series.wear;
  assert.ok(wear, 'no series carries wear points, so no grade page can be built');
  for (const grade of GRADES) {
    const filled = gradeDefinition(grade, wear, 'test coin');
    assert.doesNotMatch(filled, /{\w+}/, `${grade.code} has an unfilled slot`);
  }
});

test('a mint state definition never describes wear', () => {
  // An uncirculated coin has none, so a definition naming the places it wears
  // is a definition that contradicts the grade it defines.
  for (const grade of GRADES.filter((g) => g.tier === 'mint-state')) {
    assert.doesNotMatch(
      grade.definition,
      /{obverse}|{reverse}|{legend}|{detail}/,
      `${grade.code} is uncirculated and its definition describes wear points`,
    );
  }
});

test('every ladder prices a coin that exists, at grades that exist', () => {
  for (const ladder of GRADED_LADDERS) {
    assert.ok(coins.includes(ladder.coin), `ladder for unknown coin "${ladder.coin}"`);
    // A ladder with no figure on it cites nobody, because it read nobody: a
    // source named on a page that states no price is a citation that does not
    // check out. The rule that matters is the other half, and it is the one
    // asserted here -- a price with no provenance is the thing this site
    // exists not to print.
    const anyPriced = ladder.values.some((v) => v.low !== undefined);
    assert.equal(
      ladder.sources.length > 0,
      anyPriced,
      `ladder for ${ladder.coin} ${anyPriced ? 'states a price and names no source' : 'names a source and states no price'}`,
    );
    for (const v of ladder.values) {
      assert.ok(gradeBySlug(v.grade), `${ladder.coin} prices unregistered grade "${v.grade}"`);
      // An unpriced rung is a page that says TBD, not a broken row. Half a
      // range is still an error, and that is what the first clause catches.
      assert.equal(
        v.low === undefined,
        v.high === undefined,
        `${ladder.coin} ${v.grade} has one end of a range and not the other`,
      );
      if (v.low === undefined) continue;
      assert.ok(v.low > 0 && v.low <= v.high, `${ladder.coin} ${v.grade} has an impossible range`);
    }
  }
});

/* ===========================================================================
   The feed's gates
   ===========================================================================

   Every one of these is a page that would otherwise ship looking finished, and
   three of them have already been shipped by a version of this pipeline that
   was missing the gate. They are tested by building the observation shape the
   fetcher writes and asserting what comes back out, with no network and no
   catalogue -- which is the whole reason the gates live in a module of their
   own rather than inside the importer.
*/

const RUNGS = ['g4', 'vg8', 'f12', 'vf20', 'xf40', 'au50', 'ms60', 'ms63', 'ms65'];
const order = (slug) => (RUNGS.includes(slug) ? RUNGS.indexOf(slug) * 10 : undefined);
const chain = () => '';
const build = (observations) => gateLadder('test-coin', observations, { order, chain });

/** Two sources at these prices, which separate comfortably. */
const two = (a, b) => [
  { source: 'alpha', price: a },
  { source: 'beta', price: b },
];

test('a rung with one source behind it is refused', () => {
  const built = build({
    g4: [{ source: 'alpha', price: 10 }],
    vg8: two(20, 24),
    f12: two(40, 48),
  });
  assert.ok(!built.values.some((v) => v.grade === 'g4'));
  assert.ok(built.refusals.some((r) => r.includes('g4') && r.includes('one source')));
});

test('five figures from one source are still one source', () => {
  // The 1999-on case: one page here covers five reverses, so a single guide
  // supplies five figures for one rung. Counting figures would pass this; the
  // gate counts sources, because five prices from one methodology are one
  // opinion and the whole point of the gate is a second one.
  const built = build({
    g4: [1, 2, 3, 4, 5].map((n) => ({ source: 'alpha', price: n, design: `d${n}` })),
    vg8: two(20, 24),
    f12: two(40, 48),
  });
  assert.ok(!built.values.some((v) => v.grade === 'g4'));
});

test('sources an order of magnitude apart are a disagreement, not a market', () => {
  const built = build({
    g4: two(5, 9),
    vg8: two(10, 4000),
    f12: two(40, 48),
  });
  assert.ok(!built.values.some((v) => v.grade === 'vg8'));
  assert.ok(built.refusals.some((r) => r.includes('vg8') && r.includes('apart')));
  // The coin keeps its other rungs: the failure is per figure, not per coin.
  assert.deepEqual(built.values.map((v) => v.grade), ['g4', 'f12']);
});

test('a rung that does not separate from the one below it is reported and still printed', () => {
  // Reversed on 2026-09-22, when every rung became a page. Separation has
  // nothing left to gate: the only choice it could make now is between printing
  // a figure the site HAS and printing TBD in its place, and throwing away a
  // known price for a placeholder helps nobody. The measurement is still worth
  // having -- a run of rungs that do not separate is a coin where grade does
  // not move the price -- so it reports and removes nothing.
  const built = build({
    g4: two(10, 12),
    vg8: two(10, 12.5),
    f12: two(40, 48),
  });
  assert.deepEqual(built.values.map((v) => v.grade), ['g4', 'vg8', 'f12']);
  assert.ok(built.refusals.some((r) => r.includes('vg8') && r.includes('separate')));
});

test('a flat ladder keeps every figure it has', () => {
  // The case that used to lose rungs to the separation gate: three rungs inside
  // one band, which is what the bottom of an ordinary clad ladder looks like.
  // All three are printed now, because all three are true.
  const built = build({
    g4: two(9, 11),
    vg8: two(10, 12),
    f12: two(11.4, 13.4),
  });
  assert.deepEqual(built.values.map((v) => v.grade), ['g4', 'vg8', 'f12']);
});

test('a rung whose ceiling falls is dropped here rather than failing the import', () => {
  // A higher midpoint with a lower top: one source quotes a wide band below and
  // a tight one here. The importer refuses a ladder whose high falls -- on a
  // hand-written sheet that is a row under the wrong grade -- so catching it in
  // the merge costs one rung instead of the whole run.
  const built = build({
    g4: two(5, 30),
    vg8: two(24, 28),
    f12: two(40, 60),
  });
  assert.deepEqual(built.values.map((v) => v.grade), ['g4', 'f12']);
  assert.ok(built.refusals.some((r) => r.includes('vg8') && r.includes('tops out')));
});

test('one priced rung is kept, and the rest of the ladder is filled in later', () => {
  // This used to refuse the coin outright: a ladder of one had nothing for
  // prev, next or the step sentence to point at. Since every eligible rung is
  // now a page, those comparisons always have a neighbour -- a TBD, which is
  // itself a true statement about what this site knows -- so the merge keeps
  // the figure it has and `import-grades.mjs` fills the rest.
  const built = build({ g4: two(10, 12), vg8: [{ source: 'alpha', price: 40 }] });
  assert.deepEqual(built.values.map((v) => v.grade), ['g4']);
  assert.ok(built.refusals.some((r) => r.includes('vg8') && r.includes('one source')));
});

test('a rung no grade registry knows is refused rather than written out', () => {
  const built = build({ pr65: two(10, 12), g4: two(20, 24), vg8: two(50, 60) });
  assert.ok(!built.values.some((v) => v.grade === 'pr65'));
  assert.ok(built.refusals.some((r) => r.includes('pr65') && r.includes('registered')));
});

test('the range is the weakest figure to the strongest, across every source', () => {
  const built = build({
    g4: [
      { source: 'alpha', price: 12 },
      { source: 'alpha', price: 9 },
      { source: 'beta', price: 15 },
    ],
    vg8: two(40, 48),
  });
  const g4 = built.values.find((v) => v.grade === 'g4');
  assert.equal(g4.low, 9);
  assert.equal(g4.high, 15);
});

test('every committed ladder is the full set of rungs its coin can be graded on', () => {
  // The importer builds the ladder from `eligibleRungs()`, so this is the check
  // that it ran and that nothing was hand-edited out. It also pins the three
  // eligibility rules, each of which is a fact about how the coin was made: a
  // proof takes the PR ladder and nothing else, a Mint-set uncirculated issue
  // takes mint state and nothing below it, and a circulation strike takes the
  // whole Sheldon run and no proof rung.
  for (const ladder of GRADED_LADDERS) {
    const coin = COINS.find((c) => c.slug === ladder.coin);
    assert.ok(coin, `ladder for unknown coin "${ladder.coin}"`);
    assert.deepEqual(
      ladder.values.map((v) => v.grade),
      eligibleRungs(coin).map((g) => g.slug),
      `${ladder.coin} does not ship its full ladder -- run npm run grades`,
    );
  }
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n     ${error.message}`);
  }
}
if (failed > 0) {
  console.error(`\n${failed} grade check${failed === 1 ? '' : 's'} failed.`);
  process.exit(1);
}
console.log('\nAll grade checks passed.');
