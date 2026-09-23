/**
 * The archive copy generator.
 *
 * `src/lib/catalog-copy.ts` writes the H1, the <title>, the meta description,
 * the FAQ question, the opening answer, the section headings and the body copy
 * of every page under /coin-info except the coins themselves. There are four
 * archive levels and the tag level is unbounded, so a mistake in here is a
 * mistake on hundreds of pages at once with no hand-written sentence anywhere to
 * notice it. These are the invariants:
 *
 *   - a page with nothing hand-written still gets complete copy;
 *   - a hand-written field wins, one field at a time;
 *   - a hand-written field that matches the generator fails the build;
 *   - no two pages ship the same title, description or paragraph;
 *   - no generated sentence states a price, and none has a hole in it.
 *
 * `validateCatalogCopy()` enforces most of that on the real registries at build
 * time. What this file adds is the cases the registries do not currently
 * contain: a group with no copy at all, a tag of every kind, an override that
 * agrees with the generator.
 *
 * Run: node --experimental-strip-types --no-warnings --import ./tests/ts-resolve.mjs tests/catalog-copy.test.mjs
 */
import assert from 'node:assert/strict';
import {
  GROUPS,
  TAGS,
  TYPES,
  COINS,
  coinsInGroup,
  coinsWithTag,
  metalsInCoins,
  normaliseQuestion,
  populatedGroups,
  populatedPairs,
  populatedTags,
} from '../src/data/coins.ts';
import { metalsIn } from '../src/lib/melt.ts';
import { RENDERED_TITLE_MAX, renderedTitle } from '../src/lib/meta.ts';
import {
  allArchiveCopy,
  factsOf,
  groupAnswer,
  groupDescription,
  groupH1,
  groupIntro,
  groupQuestion,
  groupSections,
  groupSeoTitle,
  pairAnswer,
  pairDescription,
  pairH1,
  pairIntro,
  pairSeoTitle,
  tagAnswer,
  tagDescription,
  tagH1,
  tagIntro,
  tagQuestion,
  tagSections,
  tagSeoTitle,
  validateCatalogCopy,
} from '../src/lib/catalog-copy.ts';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

/** A group entry with every copy field removed: what a new group looks like. */
const bare = (entry) => {
  const copy = { ...entry };
  for (const field of [
    'h1', 'seoTitle', 'bluf', 'description', 'faqQuestion', 'intro',
    'primaryKeyword', 'secondaryKeywords',
  ]) {
    delete copy[field];
  }
  return copy;
};

test('the registries as they stand produce valid copy', () => {
  // The build-time check, run again here so a failure names this file rather
  // than an import deep inside an Astro page.
  validateCatalogCopy();
  assert.ok(allArchiveCopy().length > 0, 'no archive pages, so nothing was checked');
});

test('a group with no copy written at all still gets a complete page', () => {
  // The whole reason the module exists: registering a group is a structural
  // act, not a writing assignment. Anything missing here is a page that would
  // ship with a hole in it.
  for (const group of populatedGroups().map(bare)) {
    const where = `group "${group.slug}"`;
    const strings = {
      h1: groupH1(group),
      seoTitle: groupSeoTitle(group),
      description: groupDescription(group),
      question: groupQuestion(group),
      answer: groupAnswer(group),
      denominationsHeading: groupSections(group).denominations.heading,
      denominationsIntro: groupSections(group).denominations.intro,
      coinsHeading: groupSections(group).coins.heading,
      tagsHeading: groupSections(group).tags.heading,
    };
    for (const [field, text] of Object.entries(strings)) {
      // The floor is a stub detector, not a style rule. It was `> 10` until the
      // clad group got its first coins and generated "Clad coins" -- a correct
      // ten-character heading that the old number rejected for being made of a
      // short word. What this is actually guarding against is an empty string
      // or a fragment, and the hole check below does the rest of the work.
      assert.ok(text && text.length > 5, `${where} generated no ${field}`);
      assert.doesNotMatch(text, /undefined|NaN|\s{2,}/, `${where} ${field} has a hole: "${text}"`);
    }
    assert.ok(groupIntro(group).length >= 2, `${where} generated less than two paragraphs`);
    assert.ok(
      renderedTitle(strings.seoTitle).length <= RENDERED_TITLE_MAX,
      `${where} generated a title that ships as ${renderedTitle(strings.seoTitle).length} characters: "${renderedTitle(strings.seoTitle)}"`,
    );
    assert.match(strings.question, /\?$/, `${where} generated a question with no question mark`);
  }
});

test('a tag with no copy written at all still gets a complete page, whatever its kind', () => {
  // The unbounded level. Every kind is exercised, because the generator branches
  // on `kind` and an unwritten branch is a blank page rather than a wrong one.
  const kinds = new Set();
  for (const tag of populatedTags().map(bare)) {
    kinds.add(tag.kind);
    const where = `tag "${tag.slug}"`;
    const strings = {
      h1: tagH1(tag),
      seoTitle: tagSeoTitle(tag),
      description: tagDescription(tag),
      question: tagQuestion(tag),
      answer: tagAnswer(tag),
      coinsHeading: tagSections(tag).coins.heading,
    };
    for (const [field, text] of Object.entries(strings)) {
      assert.ok(text && text.length > 10, `${where} generated no ${field}`);
      assert.doesNotMatch(text, /undefined|NaN|\s{2,}/, `${where} ${field} has a hole: "${text}"`);
    }
    assert.ok(tagIntro(tag).length >= 2, `${where} generated less than two paragraphs`);
    assert.ok(
      renderedTitle(strings.seoTitle).length <= RENDERED_TITLE_MAX,
      `${where} generated a title that ships as ${renderedTitle(strings.seoTitle).length} characters: "${renderedTitle(strings.seoTitle)}"`,
    );
  }
  // Not an assertion about coverage of all five kinds -- the catalogue does not
  // hold one of each yet -- but the kinds that ARE populated must all be here.
  assert.deepEqual(
    [...kinds].sort(),
    [...new Set(populatedTags().map((t) => t.kind))].sort(),
    'a populated tag kind was skipped',
  );
});

test('a pair gets its copy from the group and the denomination, with nothing written', () => {
  // There is no registry of pair copy and no field for one, so every string on
  // a pair archive is generated by definition.
  for (const { group, type } of populatedPairs()) {
    const where = `pair "${group.slug}/${type.slug}"`;
    for (const [field, text] of Object.entries({
      h1: pairH1(group, type),
      seoTitle: pairSeoTitle(group, type),
      description: pairDescription(group, type),
      answer: pairAnswer(group, type),
    })) {
      assert.ok(text && text.length > 10, `${where} generated no ${field}`);
      assert.doesNotMatch(text, /undefined|NaN|\s{2,}/, `${where} ${field} has a hole: "${text}"`);
    }
    assert.ok(pairIntro(group, type).length >= 2, `${where} generated less than two paragraphs`);
  }
});

test('a hand-written field wins, one field at a time', () => {
  const group = bare(populatedGroups()[0]);
  const written = 'Silver Coin Values, Written by Hand';
  assert.equal(groupH1({ ...group, h1: written }), written, 'a written h1 did not win');
  assert.equal(
    groupSeoTitle({ ...group, h1: written }),
    groupSeoTitle(group),
    'overriding the h1 changed the title, so the fields are not independent',
  );

  const tag = bare(populatedTags()[0]);
  assert.equal(tagAnswer({ ...tag, bluf: 'Written.' }), 'Written.', 'a written bluf did not win');
  assert.equal(
    tagQuestion({ ...tag, bluf: 'Written.' }),
    tagQuestion(tag),
    'overriding the bluf changed the question',
  );
});

test('an override that matches the generator fails the build', () => {
  // The rule that keeps the registries from filling back up with retyped copy.
  // Checked by proving the real check fires, not by re-implementing it: the
  // group is handed back its own generated H1 as a hand-written one.
  const group = populatedGroups()[0];
  const generated = groupH1(bare(group));
  const index = GROUPS.indexOf(group);
  const original = GROUPS[index];
  try {
    GROUPS[index] = { ...bare(group), h1: generated };
    assert.throws(
      () => validateCatalogCopy(),
      /produces the same string/,
      'a hand-written field identical to the generated one was allowed',
    );
  } finally {
    GROUPS[index] = original;
  }
  validateCatalogCopy();
});

test('two pages never ship one title, description or paragraph', () => {
  // The check inside validateCatalogCopy() covers the real registries. This
  // proves the check works, by giving two tags the same name and therefore the
  // same generated copy.
  const [first, second] = populatedTags();
  if (!second) return; // one tag, nothing to collide with
  const index = TAGS.indexOf(second);
  const original = TAGS[index];
  try {
    TAGS[index] = { ...bare(second), name: first.name, kind: first.kind };
    assert.throws(
      () => validateCatalogCopy(),
      /is used by both/,
      'two pages with identical copy were allowed',
    );
  } finally {
    TAGS[index] = original;
  }
  validateCatalogCopy();
});

test('no archive page states a price', () => {
  // The melt section owns the arithmetic. A figure on this side has no spot
  // price behind it and no date on it, which is the one thing the house rules
  // will not have -- and a generated sentence cannot be corrected by hand.
  for (const row of allArchiveCopy()) {
    for (const text of [row.h1, row.seoTitle, row.description, row.answer, ...row.intro]) {
      assert.doesNotMatch(text, /[$£€]\s?\d/, `${row.what} states a price: "${text}"`);
    }
  }
});

test('the copy states the years, and never counts what the site happens to hold', () => {
  // The year span is a fact about the coins and it stays true as coins are
  // added, so every archive states its own. A count of entries is a fact about
  // this website and no use to a reader holding a coin -- "five coins in the
  // catalogue" told them how much work has been done here, which is not what
  // they came to find out. It was cut from the prose and from the tile stats,
  // and this is what stops it coming back one generated sentence at a time.
  const COUNTS = /\b(no|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d[\d,]*) (coins?|entries|entry) \b/i;
  for (const group of populatedGroups().map(bare)) {
    const facts = factsOf(coinsInGroup(group.slug));
    const intro = groupIntro(group).join(' ');
    assert.ok(intro.includes(facts.years), `group "${group.slug}" intro omits the year span`);
  }
  for (const row of allArchiveCopy()) {
    for (const text of [row.h1, row.description, row.answer, ...row.intro, ...row.headings]) {
      assert.doesNotMatch(text, COUNTS, `${row.what} counts the catalogue: "${text}"`);
      assert.doesNotMatch(
        text,
        /\bcatalogue holds\b|\bin (this|the) catalogue\b/i,
        `${row.what} describes the site rather than the coins: "${text}"`,
      );
    }
  }
  for (const tag of populatedTags().map(bare)) {
    const facts = factsOf(coinsWithTag(tag.slug));
    assert.ok(
      tagDescription(tag).includes(facts.years) || tagIntro(tag).join(' ').includes(facts.years),
      `tag "${tag.slug}" never states which years it covers`,
    );
  }
});

test('a year span is the coins, not a series run', () => {
  // A coin with no `years.to` is a single year; a SERIES with no `to` is still
  // being struck. Reusing the series helper here would turn the 1964 quarter
  // into "1964-present", on every archive it appears on.
  const single = COINS.find((c) => c.years.to === undefined);
  if (single) {
    assert.equal(
      factsOf([single]).years,
      String(single.years.from),
      `a single-year coin produced a range: ${factsOf([single]).years}`,
    );
  }
  const span = factsOf(COINS).years;
  assert.doesNotMatch(span ?? '', /present/, `the catalogue's span claims it runs to the present`);
});

test('what a set is made of has one implementation', () => {
  // melt.ts's `metalsIn` is coins.ts's `metalsInCoins`. Two of them is two
  // archives that can disagree about what a coin contains.
  assert.equal(metalsIn, metalsInCoins, 'the melt section has its own copy again');
  for (const group of populatedGroups()) {
    assert.deepEqual(
      metalsInCoins(coinsInGroup(group.slug)),
      metalsIn(coinsInGroup(group.slug)),
      `the two answers differ for ${group.slug}`,
    );
  }
});

test('every FAQ question in the section is owned by exactly one page', () => {
  const seen = new Map();
  for (const row of allArchiveCopy()) {
    if (!row.question) continue;
    const key = normaliseQuestion(row.question);
    assert.ok(!seen.has(key), `"${row.question}" is claimed by ${seen.get(key)} and ${row.path}`);
    seen.set(key, row.path);
  }
});

test('the registries still hold only what a page can be built from', () => {
  // A sanity check on the shape rather than the copy: a coin cannot point at a
  // group, type or tag that is not registered, and the copy generator trusts
  // that. validateTaxonomy() enforces it at build time; this is the reminder
  // that the generated copy depends on it.
  const slugs = {
    group: new Set(GROUPS.map((g) => g.slug)),
    type: new Set(TYPES.map((t) => t.slug)),
    tag: new Set(TAGS.map((t) => t.slug)),
  };
  for (const coin of COINS) {
    assert.ok(slugs.group.has(coin.group), `coin "${coin.slug}" has an unknown group`);
    assert.ok(slugs.type.has(coin.type), `coin "${coin.slug}" has an unknown type`);
    for (const tag of coin.tags) {
      assert.ok(slugs.tag.has(tag), `coin "${coin.slug}" has an unknown tag "${tag}"`);
    }
  }
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(`     ${error.message.split('\n').join('\n     ')}`);
  }
}
if (failed > 0) {
  console.error(`\n${failed} catalogue copy check${failed === 1 ? '' : 's'} failed.`);
  process.exit(1);
}
console.log('\nAll catalogue copy checks passed.');
