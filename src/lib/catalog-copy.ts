/**
 * Every sentence on a /coin-info archive page, generated from the catalogue.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 *
 * There are four archive levels above a coin -- the hub, a composition group,
 * a (group, denomination) pair and a tag -- and the last of those is unbounded.
 * Every series, every country, every topic anyone files coins under is a tag,
 * and a catalogue of ten thousand coins carries hundreds of them. Each one is a
 * page that needs an H1, section headings, a <title>, a meta description, an
 * opening answer and body copy, and hand-writing those is hand-writing the
 * same six things several hundred times. That work does not get done; what
 * gets done is a heading over a list, which is the thin archive the house rules
 * exist to prevent.
 *
 * So the copy is a formula over facts the catalogue already holds: how many
 * coins are in the set, what years they span, what they are made of, which
 * denominations they reach, how many of them are scarce. Every sentence in here
 * is assembled from those, which means it cannot contradict the tables
 * underneath it -- the same contract `src/lib/melt.ts` has on the other side of
 * the site, for the same reason.
 *
 * ---------------------------------------------------------------------------
 * THE OVERRIDE CONTRACT
 * ---------------------------------------------------------------------------
 *
 * Generated is the default, not the ceiling. Every field a `Group` or a `Tag`
 * declares by hand wins over its generated form, field by field, so a page
 * that has earned real writing gets it without opting out of the rest:
 *
 *     groupH1(g)           g.h1 ?? "Silver Coins"
 *     groupAnswer(g)       g.bluf ?? the generated answer
 *
 * A coin page's copy IS generated, in `coin-copy.ts`, and has been since the
 * Washington quarter went from eleven issues to eighty-three -- see the header
 * of that module for the argument. What stays hand-written there is `sections`,
 * the one fact true of that coin and of no other, which a generator cannot
 * know. This module still owns the coin page's FAQ question and the checks
 * that no two coin pages share a title, a description or a question.
 *
 * `validateCatalogCopy()` throws when an override is character-for-character
 * what the generator would have produced, because that is retyped copy: a
 * second place to drift from, with no reason to exist.
 *
 * Body copy has a second, better seam. `intro` REPLACES the generated
 * paragraphs and is rarely what anyone wants; `notes` is appended to them, and
 * that is where a hand-written fact goes -- the 1964 cut-off, the weight of a
 * Gold Eagle, that melting United States cents is illegal. The page keeps its
 * counts and its year span and gains the specifics, so adding one sentence
 * costs nothing the formula was providing.
 *
 * ---------------------------------------------------------------------------
 * WHAT MAY NOT GO IN HERE
 * ---------------------------------------------------------------------------
 *
 * - **No price, no spot figure, no currency symbol.** The melt side owns the
 *   arithmetic; a figure typed on this side is a figure with no date on it.
 *   `validateCatalogCopy()` throws on one.
 * - **No claim the catalogue cannot prove.** A count is a count of what is in
 *   the catalogue and not of what exists in the world, and every generated
 *   sentence that quotes one says so.
 * - **Nothing that reads like the melt section with a word changed.** The two
 *   sections share a shape and nothing else. A sentence that would work on a
 *   /melt-value page is the wrong sentence here.
 * - **No paragraph that is true of every page.** Boilerplate is what turns a
 *   generated archive into a doorway page, so every generated paragraph names
 *   its own subject and the validator fails a paragraph used twice.
 */
import {
  COINS,
  coinsInGroup,
  coinsInGroupType,
  coinsWithTag,
  coinPath,
  coinQuestion,
  groupPath,
  groupsForTag,
  metalsInCoins,
  normaliseQuestion,
  pairQuestion,
  populatedGroups,
  populatedPairs,
  populatedTags,
  populatedTypes,
  runLabel,
  tagCoinsPhrase,
  tagIsPlural,
  tagNoun,
  tagPath,
  typePath,
  type Coin,
  type CoinType,
  type Group,
  type Metal,
  type Tag,
} from '../data/coins';
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
  article,
  fit,
  renderedTitle,
  titleBudget,
  titleCase,
} from './meta';

/* ===========================================================================
   What a search result has room for
   ===========================================================================

   `src/lib/meta.ts` owns the numbers, because /melt-value generates titles and
   descriptions by the hundred too and the rule cannot differ between the two
   halves of the site. The limits are on the string that SHIPS -- ` | AboutMyCoin`
   included -- which is the thirteen characters a check on the source misses.
   =========================================================================== */

const SEO_TITLE_MIN = 18;

/* ===========================================================================
   Words
   =========================================================================== */

const lower = (s: string) => s.toLowerCase();

/** First letter up, everything else left alone. For a phrase starting a sentence. */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "silver coins", "clad coinage" -- a composition group as a noun phrase. */
const groupCoins = (group: Group) => {
  const n = lower(group.name);
  return /coins?$|coinage$/.test(n) ? n : `${n} coins`;
};

/**
 * A tag as a noun phrase, and the verb that agrees with it.
 *
 * Both live in coins.ts, because /melt-value needs the same two answers and a
 * second implementation of "how is this tag named in a sentence" is how one
 * section ends up asking "What are Clad coinage worth?". The reasoning is in the
 * header of that block: `kind` decides whether the name is a proper noun, and
 * the phrase decides whether it is plural.
 */
const tagCoins = tagCoinsPhrase;

/**
 * Small counts as words, larger ones as figures, per STYLE.md.
 *
 * The cut-off is twelve because that is where "thirteen coins" stops reading
 * like prose and starts reading like a total.
 */
const WORDS = [
  'no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve',
];
const count = (n: number): string => (n < WORDS.length ? WORDS[n] : n.toLocaleString('en-GB'));

/** "quarters", "dimes and quarters", "cents, dimes and quarters". */
const list = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/* ===========================================================================
   Registry lookups, built once
   ===========================================================================

   `factsOf()` runs for every archive page and for every tile on one, and the
   registries are arrays. At ten thousand coins the linear scans are the build.
   =========================================================================== */

const TYPE_PLURAL: Record<string, string> = {};
const GROUP_BY_SLUG: Record<string, Group> = {};
for (const g of populatedGroups()) {
  GROUP_BY_SLUG[g.slug] = g;
  for (const t of populatedTypes(g.slug)) TYPE_PLURAL[t.slug] = lower(t.namePlural);
}

/* ===========================================================================
   What a set of coins states about itself
   ===========================================================================

   Everything the sentences below are built from, and nothing else. Each field
   is read off the catalogue, so a generated page cannot claim something its own
   listing contradicts -- and adding a coin rewrites the copy of every archive
   it appears on, with no edit anywhere.
   =========================================================================== */

export interface SetFacts {
  coins: Coin[];
  /** How many coins are in the set. Of the catalogue, never of the world. */
  total: number;
  /** "1932", "1932-1964". Undefined only for an empty set, which gets no page. */
  years?: string;
  /** Precious metals actually present, in spot-table order. */
  metals: Metal[];
  /** Denomination names, plural, in registry order. */
  denominations: string[];
  /** Countries of issue, in first-seen order. */
  countries: string[];
  /** Composition groups the set spans. More than one is the point of a tag. */
  groups: Group[];
  /** Issues flagged `key-date`. */
  keyDates: number;
  /** Issues flagged `scarce` or `key-date`. */
  notCommon: number;
}

/**
 * The year span of a set of coins.
 *
 * Not `runLabel()`, which is for a series: there, a missing `to` means "still
 * being struck", and on a coin it means "one year". Reusing the series helper
 * here would turn the 1964 quarter into "1964-present".
 */
const yearSpan = (coins: Coin[]): string | undefined => {
  if (coins.length === 0) return undefined;
  const from = Math.min(...coins.map((c) => c.years.from));
  const to = Math.max(...coins.map((c) => c.years.to ?? c.years.from));
  return from === to ? String(from) : `${from}–${to}`;
};

export const factsOf = (coins: Coin[]): SetFacts => ({
  coins,
  total: coins.length,
  years: yearSpan(coins),
  metals: metalsInCoins(coins),
  denominations: [...new Set(coins.map((c) => c.type))]
    .map((slug) => TYPE_PLURAL[slug])
    .filter((n): n is string => Boolean(n)),
  countries: [...new Set(coins.map((c) => c.country))],
  groups: [...new Set(coins.map((c) => c.group))]
    .map((slug) => GROUP_BY_SLUG[slug])
    .filter((g): g is Group => Boolean(g)),
  keyDates: coins.filter((c) => c.commonality === 'key-date').length,
  notCommon: coins.filter((c) => c.commonality === 'key-date' || c.commonality === 'scarce').length,
});

/* ---------------------------------------------------------------------------
   Memoised, because the copy asks the same question of the same set repeatedly
   ---------------------------------------------------------------------------

   One archive page calls for its facts from the H1, the title, the description,
   the answer, two paragraphs, two headings and every tile on it, and each of
   those calls filters the whole catalogue. At ten thousand coins and several
   hundred tags that is the build. The cache is keyed by what identifies the set
   and lives for one build, which is the lifetime of the data behind it.

   It assumes the registries do not change while a build runs, which is true of
   every build and of the tests: the ones that edit a registry to prove a check
   fires edit a name or a `kind`, never which coins exist.
   --------------------------------------------------------------------------- */

const FACTS = new Map<string, SetFacts>();
const cached = (key: string, coins: () => Coin[]): SetFacts => {
  const hit = FACTS.get(key);
  if (hit) return hit;
  const facts = factsOf(coins());
  FACTS.set(key, facts);
  return facts;
};

const groupFacts = (group: Group) => cached(`g:${group.slug}`, () => coinsInGroup(group.slug));
const pairFacts = (group: Group, type: CoinType) =>
  cached(`p:${group.slug}/${type.slug}`, () => coinsInGroupType(group.slug, type.slug));
const tagFacts = (tag: Tag) => cached(`t:${tag.slug}`, () => coinsWithTag(tag.slug));

/* ===========================================================================
   The hub: /coin-info
   ===========================================================================

   One page, so its copy is written rather than generated -- but it is written
   here and not in the template, because the same strings are the H1, the
   <title>, the CollectionPage name, the ItemList name and the FAQ answer, and
   five copies in one file drift as readily as five copies in five files.
   =========================================================================== */

/**
 * The H1 and the <title> are two strings here, alone among the archives.
 *
 * They were one, and the one said "Coin Values by Metal and Denomination" --
 * accurate, and an explanation of how the section is filed offered to a reader
 * who has not yet decided to browse it. The H1 is now what the page is; the
 * <title> keeps the axes, because that is the string competing in a result
 * list and the two words it adds are the two people type.
 */
/*
 * INFORMATION FIRST, VALUE SECOND. The owner's decision of 2026-09-22, and it
 * runs through every generated string from here to the bottom of the file.
 *
 * The section was built as a price guide with facts attached and it read like
 * one: "Coin Values", "Price Guide", "and What They Are Worth" on every
 * heading, title and question down the tree. What the site actually knows and
 * can stand behind is the other half -- what a coin is, when it was struck,
 * where, how many, what it is made of and how to tell it from the one next to
 * it -- plus one figure it computes rather than guesses, the melt value. So
 * the headings name the coins and the descriptions name the facts.
 *
 * THE <TITLE>S KEEP THE WORD, and that is the owner's correction the same
 * evening. "Silver coin values" is the phrase somebody types, and the pages
 * do answer it: a melt figure worked from a live spot price, a researched
 * graded range where one exists, a scarcity verdict, and a route to looking
 * one up where none does. An H1 is read by somebody who has already arrived
 * and can afford to name the subject; a <title> is competing in a result list
 * and has to name the question. So the H1s lost the word and the titles kept
 * it. What did NOT come back anywhere is "Price Guide": "value" is the
 * question this site answers, and "price" is an answer it cannot give,
 * because it never sees the coin.
 *
 * The questions did NOT all follow, and that is deliberate rather than an
 * oversight. A question a page is marked up as answering has to be a question
 * the page ANSWERS, which is why a melt-driven group still asks what its coins
 * are worth -- the metal floor is the answer and it is on the page -- and why
 * a coin page stopped asking, because its opening sentence states a mint, a
 * metal and a mintage and never a price.
 */
export const HUB_H1 = 'Coin Information & Values';

export const HUB_SEO_TITLE = 'Coins by Metal and Denomination';

export const HUB_DESCRIPTION =
  'Coins organised by metal and denomination. Find out what your coin is, when and where it was struck, how many there are, and what the metal in it is worth today.';

export const HUB_QUESTION = 'How do I find out what my coin is worth?';

export const HUB_ANSWER =
  'A coin is worth either face value, its melt value, or a collector value. Sometimes a mix. If a coin has precious metal content, it is worth at least its weight in precious metal. The simple answer is a coin is worth what someone is willing to pay for it.';

/**
 * The hub's opening paragraph.
 *
 * Here rather than in the template because it is prose with no markup in it, so
 * it can be checked for length, for a stray price and for being used twice like
 * every other paragraph in the section. The paragraph after it on that page
 * carries links and stays in the template, which is the line: markup in the
 * template, sentences in here.
 */
export const HUB_INTRO = [
  'Most coins are worth their face value — the purchasing power they hold, and nothing more. The ones that carry a premium contain a precious metal, such as silver, gold or platinum, or are scarce for another reason: a rare date or mint mark, or a coin in better condition than the ones that survived beside it.',
];

/* ===========================================================================
   A composition group: /coin-info/<group>
   =========================================================================== */

export const groupH1 = (group: Group): string =>
  group.h1 ?? titleCase(`${group.name} coins`);

/**
 * The `<title>`, fitted rather than trimmed.
 *
 * It said "Silver Coin Values: Melt Value and Price Guide" and "Clad Coin
 * Values: Price Guide". "Price Guide" is gone and is not coming back -- this
 * site does not have one and has decided not to build one. "Coin Values" is
 * gone from the H1 and stays here, because it is the phrase the page is
 * competing for and the page does answer it.
 */
export const groupSeoTitle = (group: Group): string => {
  if (group.seoTitle) return group.seoTitle;
  const keyword = titleCase(`${group.name} coin values`);
  return fit(
    group.meltDriven
      ? [
          `${keyword}: Dates, Mintages and Melt Value`,
          `${keyword}: Dates and Melt Value`,
          `${keyword} by Denomination`,
          keyword,
        ]
      : [
          `${keyword}: Dates, Mintages and Specifications`,
          `${keyword}: Dates and Mintages`,
          `${keyword} by Denomination`,
          keyword,
        ],
    TITLE_MAX,
  );
};

/**
 * The question the page is marked up as answering.
 *
 * Two shapes, chosen by whether the metal decides the answer, because "what
 * are silver coins worth" and "are clad coins worth anything" are what the two
 * kinds of reader actually type. Both contain the group's name, which is
 * unique, so generated questions cannot collide -- and `validateCatalogCopy()`
 * proves that rather than assuming it.
 */
export const groupQuestion = (group: Group): string =>
  group.faqQuestion ??
  (group.meltDriven
    ? `What are ${groupCoins(group)} worth?`
    : `Are ${groupCoins(group)} worth anything?`);

export const groupAnswer = (group: Group): string => {
  if (group.bluf) return group.bluf;
  const facts = groupFacts(group);
  if (group.meltDriven && facts.metals.length === 1) {
    const metal = facts.metals[0];
    return `A circulated ${lower(group.name)} coin is worth at least the ${metal} in it, which is its actual ${metal} weight in troy ounces multiplied by the current spot price — collector premium sits on top of that floor, and only becomes the larger number for a scarce date, a scarce mint mark or genuinely uncirculated condition.`;
  }
  if (group.meltDriven) {
    return `A circulated ${lower(group.name)} coin is worth at least the metal in it, and ${groupCoins(group)} carry ${list(facts.metals)}, stated in troy ounces on each page — collector premium sits on top of that floor and only decides the answer for a scarce date, a scarce mint mark or genuinely uncirculated condition.`;
  }
  return `A ${lower(group.name)} coin carries no precious metal worth recovering, so it is worth its face value unless the date, the mint mark or a striking error says otherwise — which makes the date and the mint mark the whole answer for ${groupCoins(group)}.`;
};

export const groupDescription = (group: Group): string => {
  if (group.description) return group.description;
  const facts = groupFacts(group);
  const what = group.meltDriven
    ? `the ${list(facts.metals)} weight of each issue in troy ounces`
    : 'what each issue is actually made of';
  const struck = `Struck ${facts.years}.`;
  return fit(
    [
      `${cap(groupCoins(group))} by denomination: ${what}, and which dates and mint marks beat face value. ${struck}`,
      `${cap(groupCoins(group))} by denomination: ${what}. ${struck}`,
      `${cap(groupCoins(group))} by denomination, with ${what}. ${struck}`,
    ],
    DESCRIPTION_MAX,
  );
};

export const groupIntro = (group: Group): string[] => {
  if (group.intro) return group.intro;
  const facts = groupFacts(group);

  const first = group.meltDriven
    ? `${cap(groupCoins(group))} have a floor under their value: the ${list(facts.metals)} they contain, stated in troy ounces on each coin's own page. That floor is most of the answer for a common date in worn condition. Dates run ${facts.years}, across ${list(facts.denominations)}.`
    : `There is no metal floor under a ${lower(group.name)} coin, so everything one is worth above its face value is collector demand. Dates run ${facts.years}, across ${list(facts.denominations)}.`;

  const second = group.meltDriven
    ? `Sort by date before anything else. What a ${lower(group.name)} coin is made of was fixed by the year it was struck and the country that struck it, not by how worn or how shiny it is, and the metal decides more of the value here than the condition does.`
    : `Assume face value and work upwards only on evidence. The metal is not the variable for ${groupCoins(group)}, which leaves the date, the mint mark and the condition.`;

  return [first, second];
};

/**
 * The hand-written paragraphs that follow the generated ones, if any.
 *
 * A pass-through, and deliberately still a function: every other string on an
 * archive page is reached through this module, and a template reading
 * `group.notes` directly would be the one place the copy came from elsewhere.
 */
export const groupNotes = (group: Group): string[] => group.notes ?? [];

export const groupSections = (group: Group) => {
  return {
    denominations: {
      heading: `${cap(lower(group.name))} coins by denomination`,
      intro: 'Pick the denomination you are holding.',
    },
    coins: {
      heading: `${cap(groupCoins(group))}`,
    },
    tags: { heading: 'Related series, countries and topics' },
  };
};

/* ===========================================================================
   A denomination within a composition: /coin-info/<group>/<type>
   ===========================================================================

   The deepest archive, and the one with the most URLs behind it: nine groups
   times eight denominations is seventy-two possible pages, and it grows by a
   column every time a denomination is registered. There is deliberately no
   hand-written field for a pair anywhere in the registries -- a pair that earns
   real writing earns a section on the coin pages under it, not a fourth
   registry to keep in step.
   =========================================================================== */

export const pairH1 = (group: Group, type: CoinType): string =>
  `${titleCase(group.name)} ${titleCase(type.namePlural)}`;

export const pairSeoTitle = (group: Group, type: CoinType): string => {
  // The singular, because "silver quarter values" is the phrase and "silver
  // quarters values" is not English.
  const keyword = `${titleCase(group.name)} ${titleCase(type.name)} Values`;
  return fit(
    pairFacts(group, type).metals.length > 0
      ? [`${keyword}: Dates, Mintages and Melt Value`, `${keyword}: Dates and Melt Value`, keyword]
      : [`${keyword}: Dates, Mintages and Specifications`, `${keyword}: Dates and Mintages`, keyword],
    TITLE_MAX,
  );
};

/** `pairQuestion()` lives in coins.ts, with the other derived questions. */
export { pairQuestion };

export const pairAnswer = (group: Group, type: CoinType): string => {
  const facts = pairFacts(group, type);
  const plural = lower(type.namePlural);
  if (facts.metals.length > 0) {
    return `${cap(lower(group.name))} ${plural} are worth at least the ${list(facts.metals)} in them, which is the weight stated on each page below multiplied by the current spot price. ${type.bluf}`;
  }
  return `${cap(lower(group.name))} ${plural} contain no precious metal, so one is worth its face value unless the date, the mint mark or a striking error says otherwise. ${type.bluf}`;
};

export const pairDescription = (group: Group, type: CoinType): string => {
  const facts = pairFacts(group, type);
  const what =
    facts.metals.length > 0
      ? `${list(facts.metals)} content in troy ounces`
      : 'what they are actually made of';
  const struck = `Struck ${facts.years}.`;
  return fit(
    [
      `${cap(lower(group.name))} ${lower(type.namePlural)}: ${what}, specifications, and what decides the value of each issue. ${struck}`,
      `${cap(lower(group.name))} ${lower(type.namePlural)}: ${what} and what decides the value of each issue. ${struck}`,
      `${cap(lower(group.name))} ${lower(type.namePlural)}: ${what}. ${struck}`,
    ],
    DESCRIPTION_MAX,
  );
};

export const pairIntro = (group: Group, type: CoinType): string[] => {
  const facts = pairFacts(group, type);
  const where =
    facts.countries.length === 1
      ? `, all of them ${facts.countries[0]} issues`
      : `, from ${list(facts.countries)}`;
  const first = `${cap(lower(group.name))} ${lower(type.namePlural)} were struck ${facts.years}${where}.`;
  const second =
    facts.metals.length > 0
      ? `The floor under a ${lower(group.name)} ${lower(type.name)} is its actual ${list(facts.metals)} weight in troy ounces. What sits above the floor is the date, the mint mark and the condition.`
      : `Metal content is not the variable for a ${lower(group.name)} ${lower(type.name)}. The date, the mint mark and what the coin was struck wrong with are what decide whether it beats the ${lower(type.name)} stamped on it.`;
  return [first, second];
};

/** The tile on the group archive: the question and the answer, no figures. */
export const pairTeaser = (group: Group, type: CoinType): string =>
  `${pairQuestion(group, type)} ${type.bluf}`;

/** The stat line under that tile. The years struck, not a count of entries. */
export const pairStat = (group: Group, type: CoinType): string =>
  pairFacts(group, type).years ?? '';

export const pairSections = (group: Group, type: CoinType) => ({
  coins: {
    heading: `${cap(lower(group.name))} ${lower(type.namePlural)}`,
  },
});

/* ===========================================================================
   The tag index: /coin-info/tagged
   =========================================================================== */

export const TAGGED_H1 = 'Coin Topics, Series and Countries';

export const TAGGED_SEO_TITLE = 'Coin Topics, Series and Countries';

export const TAGGED_DESCRIPTION =
  'Every cross-cutting view of the catalogue: by series, by country, by composition and by topic. Coins are filed by metal and denomination; these pages cut across it.';

/** The eyebrow over a tag page's H1. */
export const TAG_KIND_LABEL: Record<Tag['kind'], string> = {
  series: 'Series',
  country: 'Country',
  format: 'Format',
  theme: 'Topic',
  composition: 'Composition',
};

/**
 * The sections of the tag index, in reading order.
 *
 * Grouped by kind because "series", "country" and "topic" are different
 * questions, and a flat alphabetical list of thirty pills answers none of them.
 * Filtered to the kinds that have a populated tag, like everything else in the
 * catalogue.
 */
export const TAG_KIND_SECTIONS: { kind: Tag['kind']; title: string; blurb: string }[] = [
  {
    kind: 'series',
    title: 'By series',
    blurb:
      'A series whose composition changed partway through is split across the catalogue by metal. These pages put it back together.',
  },
  {
    kind: 'country',
    title: 'By country',
    blurb:
      'Coins are filed by what they are made of, not by where they were struck, so the country view is assembled from tags.',
  },
  {
    kind: 'composition',
    title: 'By composition detail',
    blurb: 'Finer than the top-level metal groups: a specific fineness or construction.',
  },
  {
    kind: 'format',
    title: 'By format',
    blurb: 'How the coin was made and sold, rather than what it is.',
  },
  {
    kind: 'theme',
    title: 'By topic',
    blurb: 'The categories collectors and dealers actually use in conversation.',
  },
];

/* ===========================================================================
   A tag: /coin-info/tagged/<tag>
   ===========================================================================

   The unbounded level, and therefore the one the formula matters most on. The
   shape of the copy is chosen by `kind`, because the five kinds are five
   different questions:

     series       which years, which mint marks, and did the metal change
     country      what is a coin from here worth
     composition  what is this specific alloy worth
     format       what is a coin sold like this worth
     theme        what is this category of coin worth

   A `kind: 'series'` tag carrying `SeriesInfo` has more to work with than any
   other: the run, the mints and the metal eras are published facts with no
   expiry date, so its generated answer names them instead of counting coins.
   =========================================================================== */

/** The metal eras of a series whose metal changed mid-run. The fact the page turns on. */
const seriesSplit = (tag: Tag) => {
  const eras = tag.series?.compositions ?? [];
  return eras.length > 1 ? eras : undefined;
};

/** Which precious metal a composition string names, if any. */
const metalNamed = (composition: string): Metal | undefined =>
  /gold/i.test(composition)
    ? 'gold'
    : /platinum/i.test(composition)
      ? 'platinum'
      : /silver/i.test(composition)
        ? 'silver'
        : undefined;

/**
 * "Junk Silver Coin Values" -- the singular subject, for a <title> only.
 *
 * "Junk Silver Coins Values" is not English, so the phrase somebody types is
 * built on the singular and the heading on the plural. Two forms because the
 * two render sites want different things, not because one is a copy of the
 * other.
 */
const tagSubject = (tag: Tag) =>
  /coins?$|coinage$/i.test(tag.name) ? titleCase(tag.name) : `${titleCase(tag.name)} Coin`;

/**
 * "Junk Silver Coins", "Key Date Coins", "Clad Coinage".
 *
 * The singular form of this stood here until the headings stopped ending in
 * "Values": "Junk Silver Coin Values" was a noun phrase with a job for its
 * last word, and taking the last word away leaves one that has to stand as a
 * heading on its own. A name that already says coins, or that is a mass noun
 * like "clad coinage", is left alone. The singular form went with the
 * headings that used it -- a generator with no render site is deleted rather
 * than kept warm.
 */
const tagSubjectPlural = (tag: Tag) =>
  /coins$|coinage$/i.test(tag.name)
    ? titleCase(tag.name)
    : /coin$/i.test(tag.name)
      ? `${titleCase(tag.name)}s`
      : `${titleCase(tag.name)} Coins`;

/** "are" or "is", for a phrase that may be a mass noun. */
const areIs = (tag: Tag) => (tagIsPlural(tag) ? 'are' : 'is');

export const tagH1 = (tag: Tag): string => {
  if (tag.h1) return tag.h1;
  if (tag.kind === 'series') return `${titleCase(tag.name)} Dates and Mint Marks`;
  return tagSubjectPlural(tag);
};

export const tagSeoTitle = (tag: Tag): string => {
  if (tag.seoTitle) return tag.seoTitle;
  return fit(
    tag.kind === 'series'
      ? [
          `${titleCase(tag.name)} Value: Dates, Mint Marks and Mintages`,
          `${titleCase(tag.name)} Value: Dates and Mint Marks`,
          `${titleCase(tag.name)} Value by Date`,
        ]
      : [
          `${tagSubject(tag)} Values: Dates, Mintages and Melt Value`,
          `${tagSubject(tag)} Values: Dates and Mintages`,
          `${tagSubject(tag)} Values`,
        ],
    TITLE_MAX,
  );
};

/**
 * The question the tag page is marked up as answering.
 *
 * A series whose metal changed gets "which of these are silver", because that
 * is the question somebody holding one has, and the answer is a date rather
 * than a price. Everything else gets the value question in the phrasing its own
 * kind is searched in. None of these can collide with a coin page's "how much
 * is a X worth" -- different words -- and `validateCatalogCopy()` checks rather
 * than trusting that.
 */
export const tagQuestion = (tag: Tag): string => {
  if (tag.faqQuestion) return tag.faqQuestion;
  const split = seriesSplit(tag);
  if (tag.kind === 'series' && split) {
    const precious = split.map((era) => metalNamed(era.composition)).find(Boolean);
    if (precious) return `Which ${tag.name}s are ${precious}?`;
  }
  /*
   * A series with no metal change is answered by its own facts -- the run, the
   * mints, the designer -- and never by a figure, so the question it claims is
   * the one it answers. `tagAnswer()` for such a tag opens "struck 1878 to
   * 1921 at five mints", which is not an answer to "what is it worth".
   */
  if (tag.kind === 'series') return `What is a ${tag.name}?`;
  return `What ${areIs(tag)} ${tagCoins(tag)} worth?`;
};

export const tagAnswer = (tag: Tag): string => {
  if (tag.bluf) return tag.bluf;
  const facts = tagFacts(tag);
  const split = seriesSplit(tag);

  // A series with documented metal eras answers with the eras, because the
  // year is the whole answer and a year does not go stale.
  if (split) {
    const eras = split.map((era) => `${runLabel(era.years)} issues are ${lower(era.composition)}`);
    return `The metal changed partway through the run: the ${list(eras)}. The date decides which of them you are holding, and the metal decides most of what it is worth.`;
  }

  /*
   * A SERIES ANSWERS WITH ITS OWN FACTS, and this branch is why.
   *
   * `tagQuestion()` asks "what is a Morgan dollar?" of a series whose metal
   * never changed, because that is the question the page answers -- the run,
   * the mints, the designer and the metal are all on it and no price is. This
   * used to fall through to the value answer below, which put "Morgan dollars
   * are worth at least the silver in them" under a question that did not ask.
   * Schema matching the visible page is the rule; this is the same rule one
   * level up from a coin.
   */
  const series = tag.series;
  if (tag.kind === 'series' && series) {
    const mints = series.mints.length;
    const metal =
      facts.metals.length > 0
        ? `Every one of them carries ${list(facts.metals)}, stated in troy ounces on each coin's own page`
        : `None of them carries a precious metal worth recovering`;
    // The country is read off the coins rather than assumed: this catalogue
    // already holds Canadian issues, and "United States series" typed in here
    // would be false on the first one that got a series tag.
    const subject = facts.countries.length === 1 ? `${facts.countries[0]} series` : 'series';
    return `The ${tag.name} is ${article(subject)} ${subject} struck ${runLabel(series.years)} at ${count(mints)} ${mints === 1 ? 'mint' : 'mints'}${series.designer ? `, to a design by ${series.designer}` : ''}. ${metal}, and the date and the mint mark are what separate one issue from the next.`;
  }

  if (facts.metals.length > 0) {
    return `${cap(tagCoins(tag))} ${areIs(tag)} worth at least the ${list(facts.metals)} in them, which is the weight on each page below multiplied by the current spot price; the date, the mint mark and the condition decide what sits on top of that floor.`;
  }
  return `${cap(tagCoins(tag))} ${tagIsPlural(tag) ? 'carry' : 'carries'} no precious metal, so one is worth its face value unless the date, the mint mark or a striking error says otherwise.`;
};

export const tagDescription = (tag: Tag): string => {
  if (tag.description) return tag.description;
  const facts = tagFacts(tag);
  const lead =
    tag.kind === 'series'
      ? `${tag.name} values by year and mint mark`
      : `${tagCoins(tag)} and what they are worth`;
  const struck = `Struck ${facts.years}.`;
  const metal =
    facts.metals.length > 0
      ? `${list(facts.metals).replace(/^./, (c) => c.toUpperCase())} content in troy ounces on every issue, with what decides the premium over it.`
      : 'What each issue is actually made of, and what decides its value.';
  return fit([`${cap(lead)}: ${struck} ${metal}`, `${cap(lead)}: ${struck}`], DESCRIPTION_MAX);
};

export const tagIntro = (tag: Tag): string[] => {
  if (tag.intro) return tag.intro;
  const facts = tagFacts(tag);
  const paragraphs: string[] = [];

  const series = tag.series;
  if (tag.kind === 'series' && series) {
    const mints = series.mints.length;
    paragraphs.push(
      `The ${tag.name} was struck ${runLabel(series.years)} at ${count(mints)} ${mints === 1 ? 'mint' : 'mints'}${series.designer ? `, to a design by ${series.designer}` : ''}.`,
    );
  } else {
    paragraphs.push(
      `${cap(tagCoins(tag))} ${areIs(tag)} struck ${facts.years}${facts.denominations.length ? ` and reach ${list(facts.denominations)}` : ''}.`,
    );
  }

  // What the reader needs to know about this kind of label, in the terms of
  // its own kind, and nothing about the page it is on. Each branch names its
  // own tag, because a paragraph that would fit any tag of the kind is
  // boilerplate and the validator rejects it.
  switch (tag.kind) {
    case 'series':
      paragraphs.push(
        `Which ${tag.name} dates are scarce was settled a long time ago; what any of them fetches was not, because that is true for a week and a mintage is true for a century.`,
      );
      break;
    case 'country':
      paragraphs.push(
        `The metal decides most of what a ${tag.name} coin is worth, and the date and the mint mark decide the rest — so the denomination stamped on it is the last thing to go by.`,
      );
      break;
    case 'composition':
      paragraphs.push(
        `${cap(tagNoun(tag))} names a specific alloy or construction rather than a broad metal, and it is the fineness that sets how much precious metal a coin actually contains.`,
      );
      break;
    case 'format':
      paragraphs.push(
        `${cap(tagNoun(tag))} is how a coin was made and sold rather than what it is made of, and it moves the premium over metal more than the metal itself does.`,
      );
      break;
    default:
      paragraphs.push(
        `${cap(tagNoun(tag))} is a category collectors and dealers use in conversation rather than a fact stamped on a coin.`,
      );
  }

  return paragraphs;
};

/** The hand-written paragraphs that follow the generated ones, if any. */
export const tagNotes = (tag: Tag): string[] => tag.notes ?? [];

export const tagSections = (tag: Tag) => ({
  coins: {
    heading: tag.kind === 'series' ? `${cap(tag.name)} issues` : `${cap(tagCoins(tag))}`,
  },
});

/* ===========================================================================
   Cross-cutting facts the templates need
   =========================================================================== */

/** The tags reachable from a group, so a silver page offers "junk silver". */
export const tagsInGroup = (group: Group): Tag[] => {
  const slugs = new Set(coinsInGroup(group.slug).flatMap((c) => c.tags));
  return populatedTags().filter((t) => slugs.has(t.slug));
};

/** The groups a tag spans. More than one is the reason the tag exists. */
export const tagGroups = (tag: Tag): Group[] => groupsForTag(tag.slug);

/* ===========================================================================
   FAQ questions
   ===========================================================================

   Every /coin-info page carries exactly one FAQPage question and no two pages
   carry the same one: Google wants a question marked up once, and two pages
   claiming one question is the site competing with itself for a rich result it
   then loses.

   This lives here rather than in coins.ts because half of these questions are
   generated in this module, and a list of them assembled anywhere else would be
   a list that can disagree with the pages.
   =========================================================================== */

/** Every FAQ question the /coin-info tree will emit, with the page that owns it. */
export function allFaqQuestions(): { question: string; path: string }[] {
  return [
    ...populatedGroups().map((g) => ({ question: groupQuestion(g), path: groupPath(g.slug) })),
    ...populatedPairs().map(({ group, type }) => ({
      question: pairQuestion(group, type),
      path: typePath(group.slug, type.slug),
    })),
    ...COINS.map((c) => ({ question: coinQuestion(c), path: coinPath(c) })),
    ...populatedTags().map((t) => ({ question: tagQuestion(t), path: tagPath(t.slug) })),
  ];
}

/* ===========================================================================
   Build-time validation
   ===========================================================================

   A generated page is a page nobody proofreads before it ships, so the checks a
   hand-written page gets from its writer have to be written down instead. All
   of these throw: every one of them is invisible in a clean build and visible
   in a search result.
   =========================================================================== */

/** One page's copy, flattened for checking and for /dev. */
export interface CopyRow {
  path: string;
  what: string;
  h1: string;
  seoTitle: string;
  description: string;
  /** Empty on the two index pages, which carry no FAQ markup. */
  question: string;
  answer: string;
  intro: string[];
  /** Hand-written paragraphs after the generated ones. Checked like the rest. */
  notes: string[];
  headings: string[];
  /** Fields this page overrides by hand, beside the generated form. */
  overrides: { field: string; written: string; generated: string }[];
}

/** The same object without one key, for asking the generator what it would say. */
const without = <T extends object, K extends keyof T>(obj: T, key: K): T => {
  const copy = { ...obj };
  delete copy[key];
  return copy;
};

const groupRow = (group: Group): CopyRow => {
  const sections = groupSections(group);
  return {
    path: groupPath(group.slug),
    what: `group "${group.slug}"`,
    h1: groupH1(group),
    seoTitle: groupSeoTitle(group),
    description: groupDescription(group),
    question: groupQuestion(group),
    answer: groupAnswer(group),
    intro: groupIntro(group),
    notes: groupNotes(group),
    headings: [sections.denominations.heading, sections.coins.heading, sections.tags.heading],
    overrides: [
      { field: 'h1', written: group.h1 ?? '', generated: groupH1(without(group, 'h1')) },
      {
        field: 'seoTitle',
        written: group.seoTitle ?? '',
        generated: groupSeoTitle(without(group, 'seoTitle')),
      },
      {
        field: 'description',
        written: group.description ?? '',
        generated: groupDescription(without(group, 'description')),
      },
      {
        field: 'faqQuestion',
        written: group.faqQuestion ?? '',
        generated: groupQuestion(without(group, 'faqQuestion')),
      },
      { field: 'bluf', written: group.bluf ?? '', generated: groupAnswer(without(group, 'bluf')) },
      {
        field: 'intro',
        written: (group.intro ?? []).join('\n'),
        generated: groupIntro(without(group, 'intro')).join('\n'),
      },
    ],
  };
};

const tagRow = (tag: Tag): CopyRow => ({
  path: tagPath(tag.slug),
  what: `tag "${tag.slug}"`,
  h1: tagH1(tag),
  seoTitle: tagSeoTitle(tag),
  description: tagDescription(tag),
  question: tagQuestion(tag),
  answer: tagAnswer(tag),
  intro: tagIntro(tag),
  notes: tagNotes(tag),
  headings: [tagSections(tag).coins.heading],
  overrides: [
    { field: 'h1', written: tag.h1 ?? '', generated: tagH1(without(tag, 'h1')) },
    {
      field: 'seoTitle',
      written: tag.seoTitle ?? '',
      generated: tagSeoTitle(without(tag, 'seoTitle')),
    },
    {
      field: 'description',
      written: tag.description ?? '',
      generated: tagDescription(without(tag, 'description')),
    },
    {
      field: 'faqQuestion',
      written: tag.faqQuestion ?? '',
      generated: tagQuestion(without(tag, 'faqQuestion')),
    },
    { field: 'bluf', written: tag.bluf ?? '', generated: tagAnswer(without(tag, 'bluf')) },
    {
      field: 'intro',
      written: (tag.intro ?? []).join('\n'),
      generated: tagIntro(without(tag, 'intro')).join('\n'),
    },
  ],
});

const pairRow = (group: Group, type: CoinType): CopyRow => ({
  path: typePath(group.slug, type.slug),
  what: `pair "${group.slug}/${type.slug}"`,
  h1: pairH1(group, type),
  seoTitle: pairSeoTitle(group, type),
  description: pairDescription(group, type),
  question: pairQuestion(group, type),
  answer: pairAnswer(group, type),
  intro: pairIntro(group, type),
  notes: [],
  headings: [pairSections(group, type).coins.heading],
  overrides: [],
});

/** Every archive page's copy: the checks below, and the /dev workbench, read this. */
export function allArchiveCopy(): CopyRow[] {
  return [
    {
      path: '/coin-info',
      what: 'the catalogue hub',
      h1: HUB_H1,
      seoTitle: HUB_SEO_TITLE,
      description: HUB_DESCRIPTION,
      question: HUB_QUESTION,
      answer: HUB_ANSWER,
      intro: HUB_INTRO,
      notes: [],
      headings: [],
      overrides: [],
    },
    {
      path: '/coin-info/tagged',
      what: 'the tag index',
      h1: TAGGED_H1,
      seoTitle: TAGGED_SEO_TITLE,
      description: TAGGED_DESCRIPTION,
      question: '',
      answer: '',
      intro: [],
      notes: [],
      // Only the kinds with a populated tag, because only those render -- the
      // same filter the page itself applies, and the reason it is here is that
      // a build check compares this list against the HTML.
      headings: TAG_KIND_SECTIONS.filter((section) =>
        populatedTags().some((t) => t.kind === section.kind),
      ).map((section) => section.title),
      overrides: [],
    },
    ...populatedGroups().map(groupRow),
    ...populatedPairs().map(({ group, type }) => pairRow(group, type)),
    ...populatedTags().map(tagRow),
  ];
}

export function validateCatalogCopy(): void {
  const problems: string[] = [];
  const rows = allArchiveCopy();

  // Uniqueness across every page the catalogue builds, archives and coins
  // together. Two pages under one <title> is the definition of the thin
  // archive, and at this scale it happens through a naming collision rather
  // than through anybody's decision.
  const firstSeen = new Map<string, string>();
  const unique = (kind: string, value: string, where: string) => {
    if (!value) return;
    const key = `${kind}:${normaliseQuestion(value)}`;
    const owner = firstSeen.get(key);
    if (owner) problems.push(`${kind} "${value}" is used by both ${owner} and ${where}`);
    else firstSeen.set(key, where);
  };

  for (const row of rows) {
    if (!row.h1) problems.push(`${row.what} has no H1`);
    if (!row.seoTitle) problems.push(`${row.what} has no <title>`);
    if (!row.description) problems.push(`${row.what} has no meta description`);
    if (row.intro.length === 0 && row.question) {
      problems.push(`${row.what} has a question and no body copy under it`);
    }

    // Measured on the string that ships, suffix included -- see meta.ts.
    if (row.seoTitle.length > titleBudget(row.seoTitle)) {
      problems.push(
        `${row.what} <title> ships as ${renderedTitle(row.seoTitle).length} characters and has room for ${titleBudget(row.seoTitle)}: "${renderedTitle(row.seoTitle)}"`,
      );
    }
    if (row.seoTitle && row.seoTitle.length < SEO_TITLE_MIN) {
      problems.push(`${row.what} <title> is too short to say anything: "${row.seoTitle}"`);
    }
    if (row.description.length > DESCRIPTION_MAX || row.description.length < DESCRIPTION_MIN) {
      problems.push(
        `${row.what} meta description is ${row.description.length} characters; ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} is the usable range: "${row.description}"`,
      );
    }

    // The hub and the tag index carry no FAQ markup, so no question there is
    // correct. Everywhere else, a page that asks nothing answers nothing.
    if (row.question && !row.question.endsWith('?')) {
      problems.push(`${row.what} FAQ question is not a question: "${row.question}"`);
    }
    if (row.question && !row.answer) {
      problems.push(`${row.what} asks "${row.question}" and answers nothing`);
    }

    const strings: Record<string, string> = {
      h1: row.h1,
      seoTitle: row.seoTitle,
      description: row.description,
      answer: row.answer,
      ...Object.fromEntries(row.intro.map((p, i) => [`intro[${i}]`, p])),
      ...Object.fromEntries(row.notes.map((p, i) => [`notes[${i}]`, p])),
      ...Object.fromEntries(row.headings.map((h, i) => [`heading[${i}]`, h])),
    };
    for (const [field, text] of Object.entries(strings)) {
      // No figure the site has not dated. The melt side owns the arithmetic; a
      // currency figure on this side has no spot price behind it.
      if (/[$£€]\s?\d/.test(text)) problems.push(`${row.what} ${field} states a price: "${text}"`);
      // The three ways a template string fails: a hole where a fact was
      // missing, a double space where a clause rendered empty, and a stray
      // space before punctuation.
      if (/\bundefined\b|\bNaN\b|\bnull\b/.test(text)) {
        problems.push(`${row.what} ${field} has a hole in it: "${text}"`);
      }
      if (/\s{2,}|\s[,.;:?]/.test(text)) {
        problems.push(`${row.what} ${field} has a gap in it: "${text}"`);
      }
    }

    unique('H1', row.h1, row.path);
    unique('<title>', row.seoTitle, row.path);
    unique('meta description', row.description, row.path);
    unique('FAQ question', row.question, row.path);
    // A paragraph appearing on two pages is boilerplate, and boilerplate on a
    // generated archive is what makes it a doorway page.
    for (const p of [...row.intro, ...row.notes]) unique('paragraph', p, row.path);
  }

  for (const row of rows) {
    for (const o of row.overrides) {
      if (o.written && o.written === o.generated) {
        problems.push(
          `${row.what} writes \`${o.field}\` by hand and the generator produces the same string; delete the field`,
        );
      }
    }
  }

  // Coin pages share the namespace the archives compete in, and their copy is
  // hand-written, which is exactly where a duplicate <title> comes from.
  for (const coin of COINS) {
    unique('<title>', coin.seoTitle, coinPath(coin));
    unique('meta description', coin.description, coinPath(coin));
    if (coin.seoTitle.length > titleBudget(coin.seoTitle)) {
      problems.push(
        `coin "${coin.slug}" <title> ships as ${renderedTitle(coin.seoTitle).length} characters and has room for ${titleBudget(coin.seoTitle)}: "${renderedTitle(coin.seoTitle)}"`,
      );
    }
    if (coin.description.length > DESCRIPTION_MAX || coin.description.length < DESCRIPTION_MIN) {
      problems.push(
        `coin "${coin.slug}" meta description is ${coin.description.length} characters; ${DESCRIPTION_MIN}\u2013${DESCRIPTION_MAX} is the usable range: "${coin.description}"`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(`Catalogue copy is invalid:\n  - ${problems.join('\n  - ')}`);
  }
}

validateCatalogCopy();
