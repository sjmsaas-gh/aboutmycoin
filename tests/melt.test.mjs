/**
 * The melt section's arithmetic and its URL contract.
 *
 * The figures on /melt-value are generated, which means a mistake here is a
 * mistake on every page in the section at once and there is no hand-written
 * copy to notice it. These are the invariants:
 *
 *   - a quantity row is the per-coin figure times the count, exactly;
 *   - the spot ladder always contains the price the page was worked at, or
 *     the "<- the price used above" marker points at nothing;
 *   - a melt question is never the same question as a coin page's.
 *
 * Run: node --experimental-strip-types --no-warnings --import ./tests/ts-resolve.mjs tests/melt.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  GRAMS_PER_TROY_OUNCE,
  SPOT,
  SPOT_AS_OF,
  formatUsd,
  markedUsd,
  meltValue,
} from '../src/lib/spot.ts';
import { SILVER_COINS } from '../src/data/silver-coins.ts';
import { GOLD_COINS } from '../src/data/gold-coins.ts';
import {
  rowOzt,
  rowsOzt,
  rowsSumAttr,
  validateMeltRows,
} from '../src/data/melt-rows.ts';
import {
  COINS,
  GROUPS,
  TYPES,
  TAGS,
  coinPath,
  coinQuestion,
  groupPath,
  typePath,
  tagPath,
  pairQuestion,
  normaliseQuestion,
} from '../src/data/coins.ts';
import { allSiteFaqQuestions } from '../src/data/faq-registry.ts';
import { groupQuestion, tagQuestion } from '../src/lib/catalog-copy.ts';
import {
  MELT_ROOT,
  MELT_RESERVED_SEGMENTS,
  MELT_PAGE_FOR_EVERY_COIN,
  MELT_TAGGED_ROOT,
  validateMeltPaths,
  meltCoins,
  meltPath,
  meltOf,
  meltAnswer,
  MELT_HUB_ANSWER,
  meltQuestion,
  mintRoll,
  formatOzt,
  spotLadder,
  pricedMeltCoins,
  unpricedMeltCoins,
  METAL_SLUGS,
  meltGroups,
  meltGroupPath,
  meltGroupAnswer,
  meltGroupQuestion,
  meltGroupMetals,
  meltCoinsInGroup,
  meltPairs,
  meltTypePath,
  meltPairAnswer,
  meltPairQuestion,
  meltCoinsInGroupType,
  meltTags,
  meltTagPath,
  meltTagAnswer,
  meltTagQuestion,
  meltCoinsWithTag,
  meltTotal,
  meltSumAttr,
  meltPathOfCoinPath,
} from '../src/lib/melt.ts';

test('every coin in the catalogue gets a melt page', () => {
  // The flag is the whole decision; assert the behaviour it claims either way,
  // so flipping it is a one-line change that does not leave a stale test.
  if (MELT_PAGE_FOR_EVERY_COIN) {
    assert.equal(meltCoins().length, COINS.length);
  } else {
    assert.deepEqual(
      meltCoins().map((c) => c.slug),
      pricedMeltCoins().map((c) => c.slug),
    );
  }
  assert.equal(
    pricedMeltCoins().length + unpricedMeltCoins().length,
    COINS.length,
    'a coin is either priced or unpriced, never both and never neither',
  );
});

test('every melt path is its catalogue path with the root swapped', () => {
  // The contract the whole section rests on. A reader who edits one segment
  // of a URL to cross between the two halves of the answer must land on a
  // page, and every archive level has to mirror as well as the coin level.
  validateMeltPaths();

  const paths = meltCoins().map(meltPath);
  for (const coin of meltCoins()) {
    assert.equal(meltPath(coin), `${MELT_ROOT}/${coin.group}/${coin.type}/${coin.slug}`);
    assert.equal(meltPath(coin), meltPathOfCoinPath(coinPath(coin)));
  }
  assert.equal(new Set(paths).size, paths.length, 'two coins claim one melt URL');

  for (const group of meltGroups()) {
    assert.equal(meltGroupPath(group.slug), meltPathOfCoinPath(groupPath(group.slug)));
  }
  for (const { group, type } of meltPairs()) {
    assert.equal(
      meltTypePath(group.slug, type.slug),
      meltPathOfCoinPath(typePath(group.slug, type.slug)),
    );
  }
  for (const tag of meltTags()) {
    assert.equal(meltTagPath(tag.slug), meltPathOfCoinPath(tagPath(tag.slug)));
  }
  assert.equal(MELT_TAGGED_ROOT, `${MELT_ROOT}/tagged`);
});

test('no slug in the taxonomy shadows a reserved segment in either tree', () => {
  // The two trees share a shape, so they share their reserved words: a group
  // slugged `tagged` would shadow the cross-cutting views under /coin-info
  // and /melt-value at once, and both builds would be clean.
  for (const item of [...GROUPS, ...TYPES, ...TAGS, ...COINS]) {
    assert.ok(
      !MELT_RESERVED_SEGMENTS.includes(item.slug),
      `"${item.slug}" shadows a reserved segment`,
    );
  }
});

test('a coin is priced or it is not, and meltOf agrees either way', () => {
  for (const coin of pricedMeltCoins()) {
    assert.ok(meltOf(coin), `${coin.slug} is in the priced list with no metal`);
  }
  for (const coin of unpricedMeltCoins()) {
    assert.equal(meltOf(coin), undefined, `${coin.slug} is in the unpriced list but has metal`);
  }
});

test('the priced listing is sorted by melt value, richest first', () => {
  const values = pricedMeltCoins().map((c) => meltOf(c).value);
  const sorted = [...values].sort((a, b) => b - a);
  assert.deepEqual(values, sorted);
});

test('a mint roll is only claimed where it is a real fact', () => {
  // It is a fact about American packaging, not about the denomination. A
  // British half crown has no roll of forty, and the copy under the
  // calculator states the number as fact, so a wrong one is a wrong fact.
  for (const coin of COINS) {
    const roll = mintRoll(coin);
    if (coin.country !== 'United States') {
      assert.equal(roll, undefined, `${coin.slug} claims a US mint roll`);
      continue;
    }
    if (roll !== undefined) {
      assert.ok(Number.isInteger(roll) && roll > 1, `${coin.slug} has a nonsense roll of ${roll}`);
    }
  }
});

test('the spot ladder contains the price the page was worked at', () => {
  // The page marks one row "the price used above". A ladder that has rounded
  // the real price away leaves that marker pointing at nothing.
  for (const metal of Object.keys(SPOT)) {
    const ladder = spotLadder(metal);
    assert.ok(ladder.includes(SPOT[metal]), `${metal} ladder omits ${SPOT[metal]}`);
    assert.deepEqual(ladder, [...ladder].sort((a, b) => a - b), `${metal} ladder is not sorted`);
    assert.equal(new Set(ladder).size, ladder.length, `${metal} ladder repeats a price`);
    assert.ok(ladder.every((p) => p > 0), `${metal} ladder contains a price of zero or less`);
    assert.ok(ladder.length >= 3, `${metal} ladder is too short to be worth a table`);
  }
});

test('the ladder brackets the price on both sides', () => {
  for (const metal of Object.keys(SPOT)) {
    const ladder = spotLadder(metal);
    assert.ok(ladder[0] < SPOT[metal], `${metal} ladder has nothing below spot`);
    assert.ok(ladder[ladder.length - 1] > SPOT[metal], `${metal} ladder has nothing above spot`);
  }
});

test('troy ounces are printed to the precision the number deserves', () => {
  assert.equal(formatOzt(0.1808), '0.1808');
  assert.equal(formatOzt(7.232), '7.2320');
  assert.equal(formatOzt(18.08), '18.08');
});

test('the only date in this section is the price\'s own', () => {
  // No melt page carries a modified date and none appears in the sitemap:
  // what a coin weighs and what it is made of do not change, so a page-level
  // date would be a claim about the wrong thing. The spot price DOES move, and
  // it is dated where it is printed rather than at the top of the page.
  assert.match(SPOT_AS_OF, /^\d{4}-\d{2}-\d{2}T/);
  for (const coin of meltCoins()) {
    assert.ok(
      !Object.hasOwn(coin, 'updated') && !Object.hasOwn(coin, 'published'),
      `${coin.slug} carries a page date; coin facts are not dated`,
    );
  }
});

test('a melt question is never the question a coin page already owns', () => {
  for (const coin of COINS) {
    assert.notEqual(
      normaliseQuestion(meltQuestion(coin)),
      normaliseQuestion(coinQuestion(coin)),
      `"${coin.slug}" asks the same question on its coin page and its melt page`,
    );
  }
});

test('no two pages on the site claim one FAQ question', () => {
  // faq-registry.ts throws on import, so reaching this line is most of the
  // check. The assertion states the invariant anyway, so a future refactor
  // that softens the throw to a warning still fails here.
  const seen = new Set();
  for (const { question, path } of allSiteFaqQuestions()) {
    const key = normaliseQuestion(question);
    assert.ok(!seen.has(key), `"${question}" is claimed twice, second time by ${path}`);
    seen.add(key);
  }
});

test('the melt answer quotes the same figure the page prints', () => {
  for (const coin of pricedMeltCoins()) {
    const melt = meltOf(coin);
    assert.ok(meltAnswer(coin).includes(formatUsd(melt.value)));
  }
});


test('the melt page has no arithmetic of its own left in it', () => {
  // This page used to carry an inline script with hand-written copies of
  // formatUsd() and formatOzt() in it, and a test that lifted them back out
  // with a regex to check the two still agreed. They had to: the script
  // rewrote a figure the server had rendered, so a rounding difference showed
  // up as the number changing the instant the page became interactive.
  //
  // The duplication is gone. The quantity box and the spot price are both
  // wired by src/lib/spot-dom.ts, which IMPORTS the real functions, so there
  // is nothing left to disagree. What is checked now is that nobody puts a
  // formatter back: a second implementation is the bug, not a mismatch
  // between two of them.
  const src = readFileSync('src/pages/melt-value/[group]/[type]/[coin].astro', 'utf8');
  assert.ok(!/<script/.test(src), 'the melt page has grown a script again');
  assert.ok(
    !/toFixed\(2\)|toFixed\(4\)|toLocaleString/.test(src),
    'the melt page is formatting a number itself -- that belongs in src/lib/spot.ts',
  );

  // And that the figure it renders is marked for the browser to recompute. An
  // unmarked figure is a figure frozen at the price of the last deploy, inside
  // HTML the edge caches for a day.
  for (const attr of ['data-spot="value"', 'data-spot-qty', 'data-spot="stamp"']) {
    assert.ok(src.includes(attr), `the melt page figure block is missing ${attr}`);
  }
});


test('a generated sentence renders the same figures marked and plain', () => {
  // Every sentence with a price in it is produced once and rendered twice:
  // plain, for the FAQPage schema and the meta description, and marked, for
  // the reader, with each figure in a span the browser can recompute. The two
  // must be the same sentence -- strip the spans out of the marked one and it
  // has to be the plain one, character for character, or a page and its own
  // structured data are stating two different things.
  const strip = (html) => html.replace(/<\/?span[^>]*>/g, '');

  // The hub's answer is the exception and is asserted as one: it states the
  // method and names no figure, so it is a constant with no marked form. A
  // price appearing in it again is a string that needs the pair back.
  assert.ok(!/\$/.test(MELT_HUB_ANSWER));

  for (const group of meltGroups()) {
    assert.equal(strip(meltGroupAnswer(group, markedUsd)), meltGroupAnswer(group));
  }
  for (const { group, type } of meltPairs()) {
    assert.equal(strip(meltPairAnswer(group, type, markedUsd)), meltPairAnswer(group, type));
  }
  for (const tag of meltTags()) {
    assert.equal(strip(meltTagAnswer(tag, markedUsd)), meltTagAnswer(tag));
  }
  for (const coin of meltCoins()) {
    assert.equal(strip(meltAnswer(coin, markedUsd)), meltAnswer(coin));
  }
});


test('a marked figure carries everything needed to recompute it', () => {
  // The browser is given a new price and nothing else. A figure it cannot
  // rebuild from its own attributes is a figure that silently keeps the
  // build's number while everything around it moves.
  for (const coin of meltCoins()) {
    if (!meltOf(coin)) continue;
    const html = meltAnswer(coin, markedUsd);
    for (const span of html.match(/<span[^>]*data-spot="[^"]*"[^>]*>/g) ?? []) {
      const kind = /data-spot="([^"]*)"/.exec(span)[1];
      assert.match(span, /data-spot-metal="(silver|gold|platinum)"/, `${span} names no metal`);
      if (kind === 'value') {
        assert.match(span, /data-spot-ozt="[0-9.]+"/, `${span} is a value with no weight`);
      }
    }
  }
});


test('a mixed total carries the weights behind it, not one metal', () => {
  // A group's total is one metal and could have been a plain value; the hub's
  // is silver and gold together, and rescaling that at the silver price would
  // be wrong by whatever gold has done since.
  const all = meltCoins();
  const weights = Object.fromEntries(
    meltSumAttr(all)
      .split(';')
      .filter(Boolean)
      .map((part) => {
        const [metal, ozt] = part.split('=');
        return [metal, Number(ozt)];
      }),
  );
  const rebuilt = Object.entries(weights).reduce((t, [metal, ozt]) => t + ozt * SPOT[metal], 0);
  assert.ok(
    Math.abs(rebuilt - meltTotal(all)) < 1e-9,
    'the weights on a total do not multiply back up to the total',
  );
});


test('every archive lists exactly the coins that belong on it', () => {
  // The partition check, at all three archive levels at once. A coin missing
  // from its own archive has no route into the section; a coin on an archive
  // it does not belong to is a row that reads as data rather than as a bug.
  for (const group of GROUPS) {
    const coins = meltCoinsInGroup(group.slug);
    for (const c of coins) assert.equal(c.group, group.slug, `${c.slug} is listed under ${group.slug}`);
    assert.equal(
      meltGroups().some((g) => g.slug === group.slug),
      coins.length > 0,
      `${meltGroupPath(group.slug)} is built with ${coins.length} coins on it`,
    );
  }

  const seen = [];
  for (const { group, type } of meltPairs()) {
    const coins = meltCoinsInGroupType(group.slug, type.slug);
    assert.ok(coins.length > 0, `${meltTypePath(group.slug, type.slug)} is built with nothing on it`);
    for (const c of coins) {
      assert.equal(c.group, group.slug);
      assert.equal(c.type, type.slug);
      seen.push(c.slug);
    }
  }
  assert.deepEqual(
    new Set(seen),
    new Set(meltCoins().map((c) => c.slug)),
    'a coin is missing from the denomination archive it belongs on',
  );
  assert.equal(seen.length, new Set(seen).size, 'a coin is on two denomination archives');

  for (const tag of meltTags()) {
    const coins = meltCoinsWithTag(tag.slug);
    assert.ok(coins.length > 0, `${meltTagPath(tag.slug)} is built with nothing on it`);
    for (const c of coins) assert.ok(c.tags.includes(tag.slug), `${c.slug} does not carry ${tag.slug}`);
  }
});

test('every listing is sorted richest first', () => {
  // The ordering is what makes these pages different from their catalogue
  // twins rather than a copy of them, so it is asserted rather than assumed.
  const descending = (coins, where) => {
    const values = coins.map((c) => meltOf(c)?.value ?? 0);
    assert.deepEqual(values, [...values].sort((a, b) => b - a), `${where} is out of order`);
  };
  descending(pricedMeltCoins(), 'the priced list');
  for (const g of meltGroups()) descending(meltCoinsInGroup(g.slug), meltGroupPath(g.slug));
  for (const { group, type } of meltPairs()) {
    descending(meltCoinsInGroupType(group.slug, type.slug), meltTypePath(group.slug, type.slug));
  }
  for (const t of meltTags()) descending(meltCoinsWithTag(t.slug), meltTagPath(t.slug));
});

test('an archive total is the sum of the figures it prints', () => {
  for (const group of meltGroups()) {
    const coins = meltCoinsInGroup(group.slug);
    const total = coins.reduce((sum, c) => sum + (meltOf(c)?.value ?? 0), 0);
    assert.ok(
      Math.abs(meltTotal(coins) - total) < 1e-9,
      `the ${group.slug} tile's total is not the sum of the rows on its page`,
    );
  }
});

test('a group archive quotes its own price and is dated no earlier than it', () => {
  for (const group of meltGroups()) {
    const metals = meltGroupMetals(group.slug);
    for (const m of metals) {
      assert.ok(
        meltGroupAnswer(group).includes(formatUsd(SPOT[m])),
        `${meltGroupPath(group.slug)} does not state the ${m} price it works at`,
      );
    }
  }
});

test('a metal is priced for every coin that carries one', () => {
  // A metal is not a URL any more -- the tree is filed by composition group,
  // like the catalogue -- but every metal a coin carries still has to have a
  // price behind it, or the figure on that coin's page is undefined.
  for (const coin of pricedMeltCoins()) {
    const melt = meltOf(coin);
    assert.ok(METAL_SLUGS.includes(melt.metal), `${coin.slug} carries unpriced metal ${melt.metal}`);
    assert.ok(SPOT[melt.metal] > 0, `${melt.metal} has no price`);
  }
});

test('no melt page asks a question its catalogue twin already owns', () => {
  // The two sections share every address but one segment, so they are exactly
  // the pages most likely to collide. Each pair is checked directly, and the
  // registry is checked for who owns which.
  const owners = new Map(allSiteFaqQuestions().map((q) => [normaliseQuestion(q.question), q.path]));

  for (const group of meltGroups()) {
    assert.notEqual(
      normaliseQuestion(meltGroupQuestion(group)),
      normaliseQuestion(groupQuestion(group)),
      `${group.slug} asks one question on both of its archives`,
    );
    assert.equal(
      owners.get(normaliseQuestion(meltGroupQuestion(group))),
      meltGroupPath(group.slug),
      `${meltGroupPath(group.slug)} does not own its own question`,
    );
  }

  for (const { group, type } of meltPairs()) {
    assert.notEqual(
      normaliseQuestion(meltPairQuestion(group, type)),
      normaliseQuestion(pairQuestion(group, type)),
      `${group.slug}/${type.slug} asks one question on both of its archives`,
    );
    assert.equal(
      owners.get(normaliseQuestion(meltPairQuestion(group, type))),
      meltTypePath(group.slug, type.slug),
      `${meltTypePath(group.slug, type.slug)} does not own its own question`,
    );
  }

  for (const tag of meltTags()) {
    assert.notEqual(
      normaliseQuestion(meltTagQuestion(tag)),
      normaliseQuestion(tagQuestion(tag)),
      `${tag.slug} asks one question on both of its pages`,
    );
    assert.equal(
      owners.get(normaliseQuestion(meltTagQuestion(tag))),
      meltTagPath(tag.slug),
      `${meltTagPath(tag.slug)} does not own its own question`,
    );
  }
});


/* ---------------------------------------------------------------------------
   The coin lists behind /tools/coin-calculators
   --------------------------------------------------------------------------- */

/** Both calculators, so no check below can be true of one list only. */
const LISTS = [
  ['SILVER_COINS', SILVER_COINS, 'silver'],
  ['GOLD_COINS', GOLD_COINS, 'gold'],
];

test('every row derives its metal content from a weight and a fineness', () => {
  // The rows state grams and fineness, both off the Mint's specifications, and
  // the troy-ounce figure is arithmetic. That is what lets a page show its
  // working instead of printing a content figure nobody can trace.
  for (const [name, rows] of LISTS) {
    for (const row of rows) {
      const derived = (row.grams * row.fineness) / GRAMS_PER_TROY_OUNCE;
      if (row.troyOunces === undefined) {
        assert.equal(rowOzt(row), derived, `${name}/${row.slug} does not use its own weight`);
      } else {
        // A stated content is the bullion case: the Mint states the metal, not
        // the alloy. It still has to agree with the weight printed beside it.
        assert.ok(
          Math.abs(row.troyOunces - derived) / derived < 0.01,
          `${name}/${row.slug} states ${row.troyOunces} troy oz beside ${row.grams} g at ${row.fineness}`,
        );
      }
      assert.ok(rowOzt(row) > 0, `${name}/${row.slug} has no metal in it`);
    }
  }
});

test('the calculators and the catalogue state the same metal weights', () => {
  // Two kinds of file, two jobs -- issues and compositions -- and one set of
  // facts. A reader who works a figure out on a calculator and then reads a
  // different one on the quarter's own page has caught the site contradicting
  // itself.
  for (const [name, rows, metal] of LISTS) {
    validateMeltRows(rows, name);

    for (const coin of COINS) {
      const weight = metal === 'silver' ? coin.silverOzt : coin.goldOzt;
      if (!weight || coin.country !== 'United States') continue;
      const row = rows.find(
        (r) =>
          (r.type === undefined || r.type === coin.type) &&
          Math.abs(rowOzt(r) - weight) < 0.0005,
      );
      assert.ok(row, `${coin.slug} has no matching row in ${name}`);
    }
  }

  // And the check really is a check: a row whose weight disagrees with the
  // catalogue's quarters fails it.
  const wrong = SILVER_COINS.map((r) =>
    r.type === 'quarter' && r.fineness === 0.9 ? { ...r, grams: 5.67 } : r,
  );
  assert.throws(() => validateMeltRows(wrong, 'SILVER_COINS'), /no row in SILVER_COINS matches it/);
});

test('the rows are in the order the page renders, and it is validated', () => {
  // Circulating coins before bullion, then denomination, then the richest
  // composition first, so a 90% coin sits above the 40% coin it is mistaken
  // for. Declared, not sorted: a sort would file a weight typed an order of
  // magnitude wrong into a plausible-looking position.
  for (const [name, rows] of LISTS) {
    assert.throws(
      () => validateMeltRows([...rows].reverse(), name),
      /is declared after/,
      `${name} accepts its own rows backwards`,
    );
  }

  // A list orders by denomination or by content and not by both, because the
  // two rank different things and a list that mixed them would order neither.
  const mixed = GOLD_COINS.map((r, i) => (i === 0 ? { ...r, type: 'dollar' } : r));
  assert.throws(() => validateMeltRows(mixed, 'GOLD_COINS'), /declare a denomination/);
});

test('the total a calculator ships is the sum of its rows', () => {
  // `data-spot-sum` is the contract between the build and spot-dom.ts: the
  // build writes the total at the quantity the boxes ship at, and the browser
  // rewrites it from what is typed. If the format or the arithmetic differ, the
  // total jumps the moment the page becomes interactive.
  for (const [name, rows, metal] of LISTS) {
    const [key, ozt] = rowsSumAttr(rows).split('=');
    assert.equal(key, metal, `${name} sums under the wrong metal`);
    assert.equal(Number(ozt), rowsOzt(rows));
    assert.equal(
      rowsOzt(rows),
      rows.reduce((t, r) => t + rowOzt(r), 0),
    );
    // Shipped at none, which is what the pages render.
    assert.equal(rowsSumAttr(rows, 0), `${metal}=0`);

    // And the figure a page prints for one row is the site's own melt
    // arithmetic, not a second copy of it.
    for (const row of rows) {
      assert.equal(
        formatUsd(meltValue(rowOzt(row), metal)),
        formatUsd(rowOzt(row) * SPOT[metal]),
        `${name}/${row.slug} does not use meltValue()`,
      );
    }
  }
});

test('no coin is in two rows of one calculator, and no slug is in both', () => {
  // A slug is an input id on the page it renders, and it is the stem of the
  // quantity box the row's own figure reads. Two rows sharing one would be two
  // figures driven by one box.
  const seen = new Set();
  for (const [name, rows] of LISTS) {
    for (const row of rows) {
      assert.ok(!seen.has(row.slug), `${name}/${row.slug} is a slug used twice`);
      seen.add(row.slug);
    }
  }
});
