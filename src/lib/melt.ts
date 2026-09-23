/**
 * The melt-value section: a mirror of /coin-info, one question to the left.
 *
 * Every number on every page under /melt-value is derived here rather than in
 * a template, for the usual reason: the H1, the opening answer, the FAQPage
 * `acceptedAnswer`, the big figure, the archive tables and the price ladder
 * are all the same arithmetic, and the moment two of them are computed in two
 * places they start disagreeing.
 *
 * ---------------------------------------------------------------------------
 * THE URL CONTRACT, AND WHY IT IS THE CATALOGUE'S
 * ---------------------------------------------------------------------------
 *
 *   /melt-value                                  every populated group
 *   /melt-value/<group>                          e.g. /melt-value/silver
 *   /melt-value/<group>/<type>                   e.g. /melt-value/silver/quarter
 *   /melt-value/<group>/<type>/<coin>            the coin's melt page
 *   /melt-value/tagged/<tag>                     the cross-cutting view
 *
 * Segment for segment, that is `/coin-info` with a different root, and
 * `validateMeltPaths()` throws if the two trees ever stop matching. One tree
 * shape, two questions: `/coin-info/silver/quarter/1964-washington-quarter`
 * answers "what is this coin worth", the same path under `/melt-value`
 * answers "what is the metal in it worth". A reader who has learned to browse
 * either one has learned to browse both, and a reader who is on the wrong one
 * changes a single segment to get to the other -- which is what the link at
 * the bottom of every page does for them.
 *
 * This was a flat namespace, `/melt-value/<coin>`, on the argument that the
 * section is landed on from search rather than browsed. That was wrong twice
 * over. It is browsed -- somebody with a jar of coins is doing nothing else
 * -- and the flat version had no page at all for "what are silver quarters
 * worth as metal", which is a phrase people type. The two axes are also the
 * only two facts about a coin that can never be revised, so they are as safe
 * in this tree as in the other one.
 *
 * ---------------------------------------------------------------------------
 * WHAT MAKES IT A SEPARATE SECTION AND NOT A DUPLICATE
 * ---------------------------------------------------------------------------
 *
 * The structure is the same; nothing else is. The catalogue is a judgement --
 * condition, scarcity, what a buyer might pay -- and it hedges, because it
 * has to. This section is a multiplication, and it does not hedge: a weight
 * in troy ounces times a stated price. So:
 *
 *   - every listing here is ordered by melt value, richest first, where the
 *     catalogue's listings are in registry order. The orderings answer
 *     different questions and neither page is the other one sorted;
 *   - every figure here carries the price and the date it was worked at;
 *   - nothing here restates a specification, a scarcity or a grade. If it can
 *     be read off the coin page, it belongs on the coin page.
 *
 * ---------------------------------------------------------------------------
 * A COIN WITH NO PRECIOUS METAL STILL GETS A PAGE
 * ---------------------------------------------------------------------------
 *
 * `MELT_PAGE_FOR_EVERY_COIN` is true, so a clad quarter has a melt page that
 * says it has no melt value, and the clad group has an archive that says it
 * of the whole group. That is a deliberate exception to the house rule about
 * empty archives, and the argument is that these pages are not empty: "is
 * there any silver in a 1965 quarter" is a real, high-volume search whose
 * correct answer is "no", and the page that says so plainly is more use than
 * a 404.
 *
 * There is no separate "no melt value" category any more. It was a fifth
 * bucket beside the metals, and under a mirrored tree it does not need to be
 * one: clad, copper, nickel and steel are groups like silver and gold, they
 * get the same three levels of archive, and the answer their pages give
 * happens to be "none". A special case removed is a special case that cannot
 * drift.
 *
 * It is a flag rather than an assumption because it is the one decision here
 * that might need reversing. If these pages turn out to be thin in practice,
 * set it to false: the hub, the archives, the sitemap, the coin-page link and
 * the build checks all read it, and nothing else has to change.
 */
import {
  COIN_INFO_ROOT,
  COINS,
  GROUPS,
  TYPES,
  TAGS,
  coinPath,
  coinTitleName,
  coinsInGroup,
  coinsInGroupType,
  coinsWithTag,
  metalsInCoins,
  tagCoinsPhrase,
  tagIsPlural,
  populatedGroups,
  populatedTypes,
  populatedPairs,
  populatedTags,
  RESERVED_SEGMENTS,
  type Coin,
  type Group,
  type CoinType,
  type Tag,
} from '../data/coins';
/**
 * The length a title and a description have to fit, shared with the catalogue
 * side. The limits are on the string that SHIPS -- ` | AboutMyCoin` included --
 * which is the thirteen characters that let five melt pages reach 74.
 */
import { DESCRIPTION_MAX, TITLE_MAX, article, fit, titleCase } from './meta';
import {
  SPOT,
  METAL_LABEL,
  coinMetal,
  meltValue,
  spotPrice,
  formatUsd,
  formatOzt,
  spotStamp,
  spotCaveat,
  meltBaselineNote,
  plainUsd,
  referenceClause,
  type Mark,
  type Metal,
} from './spot';

/**
 * Re-exported so the pages and the tests that have always imported these from
 * here still resolve. They LIVE in spot.ts now, because the browser calls them
 * too -- see the header of spot-dom.ts -- and a module the browser loads cannot
 * be the one that pulls in the whole coin catalogue.
 */
export { formatOzt, spotLadder } from './spot';

export const MELT_ROOT = '/melt-value';

/**
 * Whether a coin with no silver or gold in it gets a page of its own.
 *
 * See the header. Flip to false and the section narrows to the coins that
 * have a figure, with no other edit.
 */
export const MELT_PAGE_FOR_EVERY_COIN = true;


/* ===========================================================================
   Paths: /coin-info's tree with a different root
   =========================================================================== */

export const meltGroupPath = (group: string) => `${MELT_ROOT}/${group}`;
export const meltTypePath = (group: string, type: string) => `${MELT_ROOT}/${group}/${type}`;
export const MELT_TAGGED_ROOT = `${MELT_ROOT}/tagged`;
export const meltTagPath = (tag: string) => `${MELT_TAGGED_ROOT}/${tag}`;
export const meltPath = (coin: Coin) => `${MELT_ROOT}/${coin.group}/${coin.type}/${coin.slug}`;

/**
 * The segments under /melt-value that are pages rather than parts of the
 * tree. The catalogue's list, unchanged, because the tree is the catalogue's:
 * a group slugged `tagged` would shadow the cross-cutting views in both
 * sections at once.
 */
export const MELT_RESERVED_SEGMENTS = RESERVED_SEGMENTS;

/** The melt page of a coin, given its catalogue path. The one-segment swap. */
export const meltPathOfCoinPath = (path: string) =>
  `${MELT_ROOT}${path.slice(COIN_INFO_ROOT.length)}`;

/* ===========================================================================
   The sets each page lists
   ===========================================================================

   Every one of these is sorted richest first, which is the ordering this
   section exists to provide. The catalogue lists in registry order because it
   is a reference; this lists by figure because a reader sorting a jar wants
   to know what to pull out of it first.
   =========================================================================== */

/** Melt value first, and catalogue order among coins that have none. */
export const byMeltValue = (coins: Coin[]): Coin[] =>
  [...coins].sort((a, b) => (meltOf(b)?.value ?? 0) - (meltOf(a)?.value ?? 0));

/** Every coin that gets a melt page. */
export const meltCoins = (): Coin[] =>
  MELT_PAGE_FOR_EVERY_COIN ? COINS : COINS.filter((c) => coinMetal(c));

/** The coins with a figure, richest first. */
export const pricedMeltCoins = (): Coin[] => byMeltValue(COINS.filter((c) => coinMetal(c)));

/** The coins with no precious metal in them at all. */
export const unpricedMeltCoins = (): Coin[] => COINS.filter((c) => !coinMetal(c));

/** Whether a coin appears in this section. False only if the flag is off. */
export const hasMeltPage = (coin: Coin): boolean =>
  MELT_PAGE_FOR_EVERY_COIN || Boolean(coinMetal(coin));

export const meltCoinsInGroup = (group: string): Coin[] =>
  byMeltValue(coinsInGroup(group).filter(hasMeltPage));

export const meltCoinsInGroupType = (group: string, type: string): Coin[] =>
  byMeltValue(coinsInGroupType(group, type).filter(hasMeltPage));

export const meltCoinsWithTag = (tag: string): Coin[] =>
  byMeltValue(coinsWithTag(tag).filter(hasMeltPage));

/**
 * The archives this section builds.
 *
 * Filtered to the populated ones, like every archive on the site, and
 * filtered again through `hasMeltPage` so that turning the flag off empties
 * the clad branch rather than leaving a heading over nothing.
 */
export const meltGroups = (): Group[] =>
  populatedGroups().filter((g) => meltCoinsInGroup(g.slug).length > 0);

export const meltTypes = (group: string): CoinType[] =>
  populatedTypes(group).filter((t) => meltCoinsInGroupType(group, t.slug).length > 0);

export const meltPairs = (): { group: Group; type: CoinType }[] =>
  populatedPairs().filter(
    ({ group, type }) => meltCoinsInGroupType(group.slug, type.slug).length > 0,
  );

export const meltTags = (): Tag[] =>
  populatedTags().filter((t) => meltCoinsWithTag(t.slug).length > 0);

/* ===========================================================================
   Metals within a group
   ===========================================================================

   A composition group is not a metal. Nine times out of ten it is -- silver
   coins contain silver -- but the catalogue's groups describe how a coin was
   made and the spot table prices what is in it, and those come apart: a
   40% silver clad half is clad by construction and silver by content. So the
   metals on a group's page are read off its coins, never off its slug, and a
   group with two of them gets two price cards and two ladders rather than a
   wrong single one.
   =========================================================================== */

export const METAL_SLUGS = Object.keys(SPOT) as Metal[];

/**
 * The metals actually present in a set of coins, in spot-table order.
 *
 * `metalsInCoins()` in coins.ts, re-exported under the name this section has
 * always used. It moved there when the catalogue's generated copy needed the
 * same answer: two implementations of "what is this set made of" is two
 * archives that can disagree about a coin.
 */
export const metalsIn = metalsInCoins;

export const meltGroupMetals = (group: string): Metal[] => metalsIn(coinsInGroup(group));

/** What the metal in a set of coins comes to, one of each. */
export const meltTotal = (coins: Coin[]): number =>
  coins.reduce((sum, c) => sum + (meltOf(c)?.value ?? 0), 0);

/**
 * The weights behind that total, metal by metal.
 *
 * A total is the one figure on the site the browser cannot rescale from a
 * single weight and a single price: a group's total is one metal, but the
 * hub's is silver and gold together, and rescaling that at the silver price
 * would be wrong by whatever gold has done since. So the total is rendered
 * with its breakdown attached -- `meltSumAttr()` writes it, `spot-dom.ts`
 * reads it back -- and every figure in a listing scales correctly whichever
 * metals are in it.
 */
export const meltWeights = (coins: Coin[]): Partial<Record<Metal, number>> => {
  const weights: Partial<Record<Metal, number>> = {};
  for (const coin of coins) {
    const melt = meltOf(coin);
    if (melt) weights[melt.metal] = (weights[melt.metal] ?? 0) + melt.troyOunces;
  }
  return weights;
};

/**
 * That breakdown as the attribute value: "silver=1.8080;gold=0.2419".
 *
 * A compact string rather than JSON because it goes in an HTML attribute and
 * JSON in an attribute is quotes inside quotes. The keys are metal slugs and
 * the values are numbers, so nothing in it needs escaping.
 */
export const meltSumAttr = (coins: Coin[]): string =>
  Object.entries(meltWeights(coins))
    .map(([metal, ozt]) => `${metal}=${ozt}`)
    .join(';');

/* ===========================================================================
   The arithmetic
   =========================================================================== */

export interface CoinMelt {
  metal: Metal;
  /** Capitalised, for headings and schema. */
  metalLabel: string;
  troyOunces: number;
  perOunce: number;
  value: number;
  /** "$66.30/ozt, based on spot prices at 20 September 2026 23:27 UTC". */
  stamp: string;
  /** The full sentence, for the block that is about the number itself. */
  caveat: string;
  /** The one sentence printed under every melt figure on the site. */
  note: string;
}

/**
 * The melt figure for one coin, or undefined when it carries no precious
 * metal -- which is the signal to render "None" rather than a zero.
 */
export const meltOf = (coin: Coin): CoinMelt | undefined => {
  const metal = coinMetal(coin);
  if (!metal) return undefined;
  return {
    metal: metal.metal,
    metalLabel: METAL_LABEL[metal.metal],
    troyOunces: metal.troyOunces,
    perOunce: spotPrice(metal.metal),
    value: meltValue(metal.troyOunces, metal.metal)!,
    stamp: spotStamp(metal.metal),
    caveat: spotCaveat(metal.metal),
    note: meltBaselineNote(metal.metal),
  };
};

/* ---------------------------------------------------------------------------
   Mint rolls
   --------------------------------------------------------------------------- */

/**
 * Standard United States mint roll sizes.
 *
 * Kept here rather than on `CoinType` because it is a fact about American
 * packaging, not about the denomination: a British half crown has no roll of
 * forty, and putting the number on the type would quietly claim it did.
 *
 * It exists for one line of copy under the calculator -- "a mint roll of
 * quarters is 40" -- which is the quantity a reader is most likely to be
 * holding and the one they would otherwise have to go and look up.
 */
const US_ROLL: Record<string, number> = {
  cent: 50,
  nickel: 40,
  dime: 50,
  quarter: 40,
  'half-dollar': 20,
  dollar: 20,
};

/** How many of this coin come in a mint roll, when that is a fact about it. */
export const mintRoll = (coin: Coin): number | undefined =>
  coin.country === 'United States' ? US_ROLL[coin.type] : undefined;

/* ===========================================================================
   Copy generated from the data
   ===========================================================================

   Generated rather than written per page, because there are going to be
   thousands of these and a hand-written opening sentence on each one is a
   thousand chances to state a number that the table below contradicts. The
   house rule against a generated page with nobody behind it is satisfied by
   the section as a whole having a reader -- see the header -- not by each
   sentence being retyped.

   Every sentence in here is the melt question. Where one of these reads like
   the catalogue's copy with a word changed, that is a bug: the two sections
   share a shape and nothing else.

   Every generator that contains a price takes a `Mark` from spot.ts, and
   defaults to the plain one, so the string it returns is exactly what it
   always returned. A page passes `markedUsd` for the copy the READER sees,
   which wraps each figure in a span the browser can recompute when the spot
   endpoint answers, and the plain default for the copy that goes into JSON-LD,
   a <title> or llms.txt. One sentence, one generator, two renderings -- the
   alternative is a regex hunting for dollar signs in a generator's output,
   which is the same sentence written twice with extra steps.
   =========================================================================== */

const shortNameOf = (coin: Coin) => coin.shortName ?? coin.name;

const lower = (s: string) => s.toLowerCase();

/** First letter up, everything else left alone. For a phrase starting a sentence. */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "silver coins", "clad coinage" -- a composition group as a noun phrase. */
const asCoins = (name: string) => {
  const n = lower(name);
  return /coins?$|coinage$/.test(n) ? n : `${n} coins`;
};

/**
 * The same for a tag, from the one implementation in coins.ts.
 *
 * Tag names are sentence case with their proper nouns intact -- "Junk silver",
 * "United States", "Washington quarter", "Clad coinage" -- so neither
 * lowercasing all of them nor lowercasing none of them is right, and some of
 * them are mass nouns. `kind` decides the capital and the phrase decides the
 * verb; the reasoning is in coins.ts, and this section reads the answer rather
 * than keeping a second one. It used to lowercase nothing, which is how
 * "Junk silver Melt Value" shipped.
 */
const tagCoins = tagCoinsPhrase;


/** A tag's name for a <title>, which is title case on both sides of the site. */
const titleCaseTag = (tag: Tag) => titleCase(tag.name);

/* --------------------------------- The hub -------------------------------- */

/** As on the catalogue hub: the H1 is the subject, the <title> below keeps
 * the axes it is searched by. */
export const MELT_HUB_H1 = 'Coin Melt Values';

export const MELT_HUB_SEO_TITLE = 'Coin Melt Values: What the Metal in a Coin Is Worth';

export const MELT_HUB_DESCRIPTION =
  'What the metal in a coin is worth, by composition and denomination: silver, gold and platinum content in troy ounces, multiplied out at a stated spot price.';

/** The question the hub owns. */
export const MELT_HUB_QUESTION = 'How do I work out the melt value of a coin?';

/**
 * The hub's answer: the method, and no worked example.
 *
 * It used to carry one -- a tenth of an ounce of silver, multiplied out at the
 * reference price -- which is why this was a function of a `Mark` rather than
 * a string. The example restated the sentence in front of it with numbers in
 * it, and the figures it needed made the one page in the section whose answer
 * is a method into another page the browser had to rewrite. The arithmetic is
 * on every page below, against a real coin. This is the only generated string
 * in the section with no price in it, which is why it is a constant.
 */
export const MELT_HUB_ANSWER =
  'Multiply the coin’s precious-metal content in troy ounces by the spot price of that metal.';

/* ------------------------------ Group archives ---------------------------- */

/**
 * A group's melt archive states what the coins in it are made of and what
 * that comes to. Three shapes, chosen by how many metals its coins carry,
 * because "the silver in a silver coin" and "the metal in a bi-metallic coin"
 * are not the same sentence and neither is "there is none".
 */
export const meltGroupH1 = (group: Group): string => {
  const metals = meltGroupMetals(group.slug);
  if (metals.length === 0) return `${group.name} Coins Have No Melt Value`;
  if (metals.length === 1) return `${METAL_LABEL[metals[0]]} Coin Melt Values by Denomination`;
  return `${group.name} Coin Melt Values by Denomination`;
};

export const meltGroupSeoTitle = (group: Group): string => {
  const metals = meltGroupMetals(group.slug);
  if (metals.length === 0) {
    return fit(
      [`${group.name} Coins: No Silver, Gold or Melt Value`, `${group.name} Coins: No Melt Value`],
      TITLE_MAX,
    );
  }
  if (metals.length === 1) {
    const label = METAL_LABEL[metals[0]];
    return fit(
      [`${label} Coin Melt Value: ${label} Content by Coin`, `${label} Coin Melt Value by Coin`],
      TITLE_MAX,
    );
  }
  return fit(
    [`${group.name} Coin Melt Value: Metal Content by Coin`, `${group.name} Coin Melt Value`],
    TITLE_MAX,
  );
};

/** The question the archive owns. Not the catalogue group's, which is about price. */
export const meltGroupQuestion = (group: Group): string => {
  const metals = meltGroupMetals(group.slug);
  if (metals.length === 0) return `Do ${asCoins(group.name)} have any melt value?`;
  if (metals.length === 1) return `How much is the ${metals[0]} in a coin worth?`;
  return `How much is the metal in ${asCoins(group.name)} worth?`;
};

export const meltGroupAnswer = (group: Group, mark: Mark = plainUsd): string => {
  const metals = meltGroupMetals(group.slug);
  if (metals.length === 0) {
    return `None. ${group.name} coins contain no silver, gold or platinum, so there is no metal in them worth more than the coin itself — they are worth their face value unless the date, the mint mark or a striking error says otherwise. The pages below say what each one is actually made of.`;
  }
  if (metals.length === 1) {
    const m = metals[0];
    const clause =
      mark === plainUsd
        ? referenceClause()
        : `<span data-spot="reference-clause">${referenceClause()}</span>`;
    return `Multiply the coin’s actual ${m} weight in troy ounces by the ${m} price. At ${mark(SPOT[m], { kind: 'price', metal: m })} a troy ounce${clause}, a coin holding a tenth of a troy ounce of ${m} has ${mark(SPOT[m] * 0.1, { kind: 'value', metal: m, ozt: 0.1 })} of metal in it.`;
  }
  return `Multiply the coin’s precious-metal content in troy ounces by the price of that metal. ${group.name} coins carry ${metals.join(' and ')}, priced below.`;
};

export const meltGroupDescription = (group: Group): string => {
  const metals = meltGroupMetals(group.slug);
  if (metals.length === 0) {
    /*
     * Fitted, like every other branch. It was a bare `return` of one sentence
     * for as long as there was one no-metal group with a short name, and
     * "Copper and Bronze" ended that: the same sentence came to 179 characters
     * there, 167 on steel and 166 on clad, over a ceiling of 165. A branch
     * that returns a string instead of a ladder is a branch that is correct
     * until the longest subject arrives, which is the thing `fit()` exists
     * for.
     */
    return fit(
      [
        `${group.name} coins contain no silver, gold or platinum: what each one is actually made of, what it is worth instead, and what to check before assuming it is worth face value.`,
        `${group.name} coins contain no silver, gold or platinum: what each one is actually made of, and what it is worth instead.`,
        `${group.name} coins contain no silver, gold or platinum: what each one is made of, and what it is worth instead.`,
      ],
      DESCRIPTION_MAX,
    );
  }
  const m = metals.join(' and ');
  return fit(
    [
      `The ${m} content of a ${lower(group.name)} coin, in troy ounces, and what that metal is worth at a stated, dated price. By denomination.`,
      `The ${m} content of a ${lower(group.name)} coin, in troy ounces, and what it is worth at a stated, dated price.`,
    ],
    DESCRIPTION_MAX,
  );
};

/* ------------------------------ Pair archives ----------------------------- */

/** "What is the melt value of silver quarters?" */
export const meltPairQuestion = (group: Group, type: CoinType): string =>
  `What is the melt value of ${lower(group.name)} ${lower(type.namePlural)}?`;

/**
 * "Silver Quarter Value". Singular and bare, because it is the phrase somebody
 * types, and the page under it is now the figure and the list of issues with
 * nothing else on it. The H1 and the <title> are the same string on purpose:
 * two wordings of one subject is two things to keep in step.
 */
export const meltPairH1 = (group: Group, type: CoinType): string =>
  `${group.name} ${type.name} Value`;

export const meltPairSeoTitle = (group: Group, type: CoinType): string =>
  meltPairH1(group, type);

export const meltPairAnswer = (group: Group, type: CoinType, mark: Mark = plainUsd): string => {
  const priced = meltCoinsInGroupType(group.slug, type.slug).filter((c) => meltOf(c));
  const plural = lower(type.namePlural);
  if (priced.length === 0) {
    return `Nothing. ${group.name} ${plural} contain no silver, gold or platinum, so there is no metal value in them at all — they are worth their face value unless the date, the mint mark or a striking error says otherwise.`;
  }
  const high = meltOf(priced[0])!;
  const low = meltOf(priced[priced.length - 1])!;
  const same = formatUsd(high.value) === formatUsd(low.value);
  const figure = same
    ? `${mark(high.value, { kind: 'value', metal: high.metal, ozt: high.troyOunces })} of metal each`
    : `between ${mark(low.value, { kind: 'value', metal: low.metal, ozt: low.troyOunces })} and ${mark(high.value, { kind: 'value', metal: high.metal, ozt: high.troyOunces })} of metal each`;
  const content = same
    ? `${formatOzt(high.troyOunces)} troy ounces of ${high.metal}`
    : `${formatOzt(low.troyOunces)} to ${formatOzt(high.troyOunces)} troy ounces of ${high.metal}`;
  return `${group.name} ${plural} are worth ${figure}. Each one holds ${content}, worked at ${mark(high.perOunce, { kind: 'price', metal: high.metal })} a troy ounce.`;
};

/**
 * The description, and it promises what THIS page has rather than what the
 * section has.
 *
 * It used to end "and the figure for each issue", on every denomination
 * archive, and this is the one listing in the melt tree that deliberately
 * carries no figure per issue: the tiles here are rendered `showFigure={false}`
 * because the page is a route to the issue rather than a column of figures.
 * See the note in MeltTile.astro, which is right -- the description was the
 * half that had not been told.
 *
 * And it had no no-metal branch, where `meltPairAnswer()` above it does. So
 * /melt-value/clad/quarter promised "metal content in troy ounces, what it is
 * worth at a stated and dated spot price" over a page whose first word is
 * "Nothing." Three archives said it: clad quarters, copper cents, steel cents.
 * A description that advertises a figure the page opens by denying is the
 * mismatch that costs a click and earns a bounce.
 */
export const meltPairDescription = (group: Group, type: CoinType): string => {
  const priced = meltCoinsInGroupType(group.slug, type.slug).filter((c) => meltOf(c));
  const subject = `${lower(group.name)} ${lower(type.namePlural)}`;
  if (priced.length === 0) {
    return fit(
      [
        `${titleCase(group.name)} ${lower(type.namePlural)} contain no silver, gold or platinum, so there is no metal value in them: what they are made of, and every issue there is.`,
        `${titleCase(group.name)} ${lower(type.namePlural)} contain no silver, gold or platinum: what they are made of, and every issue there is.`,
        `${titleCase(group.name)} ${lower(type.namePlural)} hold no precious metal: what they are made of, and every issue there is.`,
      ],
      DESCRIPTION_MAX,
    );
  }
  return fit(
    [
      `The melt value of ${subject}: how much metal is in one, in troy ounces, what that is worth at a stated and dated spot price, and every issue that carries it.`,
      `The melt value of ${subject}: the metal in one, in troy ounces, what it is worth at a stated and dated price, and every issue that carries it.`,
      `The melt value of ${subject}: the metal in one, in troy ounces, at a stated and dated spot price.`,
    ],
    DESCRIPTION_MAX,
  );
};

/* ------------------------------- Tag archives ----------------------------- */

export const MELT_TAGGED_H1 = 'Coin Melt Values by Series, Country and Topic';

export const MELT_TAGGED_DESCRIPTION =
  'Coin melt values by series, by country, by composition and by topic, each adding up the metal in the coins it holds.';

/** "What is the melt value of junk silver coins?" */
export const meltTagQuestion = (tag: Tag): string =>
  `What is the melt value of ${tagCoins(tag)}?`;

export const meltTagH1 = (tag: Tag): string => `Melt value of ${tagCoins(tag)}`;

export const meltTagSeoTitle = (tag: Tag): string =>
  fit(
    [
      `${titleCaseTag(tag)} Melt Value: Metal Content Coin by Coin`,
      `${titleCaseTag(tag)} Melt Value: Metal Content`,
      `${titleCaseTag(tag)} Melt Value`,
    ],
    TITLE_MAX,
  );

export const meltTagAnswer = (tag: Tag, mark: Mark = plainUsd): string => {
  const coins = meltCoinsWithTag(tag.slug);
  const priced = coins.filter((c) => meltOf(c));
  if (priced.length === 0) {
    return `Nothing. No ${tagCoins(tag)} contain silver, gold or platinum, so there is no metal value in any of them — each is worth its face value unless the date, the mint mark or a striking error says otherwise.`;
  }
  const high = meltOf(priced[0])!;
  const low = meltOf(priced[priced.length - 1])!;
  const spread =
    formatUsd(high.value) === formatUsd(low.value)
      ? `${mark(high.value, { kind: 'value', metal: high.metal, ozt: high.troyOunces })} of metal each`
      : `between ${mark(low.value, { kind: 'value', metal: low.metal, ozt: low.troyOunces })} and ${mark(high.value, { kind: 'value', metal: high.metal, ozt: high.troyOunces })} of metal each`;
  return `${cap(tagCoins(tag))} ${tagIsPlural(tag) ? 'hold' : 'holds'} ${spread}, worked at ${mark(high.perOunce, { kind: 'price', metal: high.metal })} a troy ounce${priced.length === coins.length ? '' : `; the rest contain no precious metal at all`}.`;
};

/**
 * The description, with the same no-metal branch `meltTagAnswer()` above it
 * has -- and for the third time in this file, which is why it is worth saying
 * once: every generator in this section comes in a pair, an answer and a
 * description, and it is the description that keeps being written as though
 * every subject holds metal.
 *
 * /melt-value/tagged/clad-coinage and /melt-value/tagged/wheat-penny promised
 * "precious-metal content in troy ounces and what it is worth at a stated,
 * dated spot price" over a page whose answer opens "Nothing." A description
 * that advertises a figure the page opens by denying costs a click and earns
 * a bounce, and it is the half of the page a reader sees first.
 */
export const meltTagDescription = (tag: Tag): string => {
  const priced = meltCoinsWithTag(tag.slug).filter((c) => meltOf(c));
  if (priced.length === 0) {
    return fit(
      [
        `No ${tagCoins(tag)} contain silver, gold or platinum, so there is no metal value in any of them: what they are made of, and every issue there is.`,
        `No ${tagCoins(tag)} contain silver, gold or platinum: what they are made of, and every issue there is.`,
        `No ${tagCoins(tag)} hold precious metal: what they are made of, and every issue there is.`,
      ],
      DESCRIPTION_MAX,
    );
  }
  return fit(
    [
      `The melt value of ${tagCoins(tag)}: precious-metal content in troy ounces and what it is worth at a stated, dated spot price.`,
      `The melt value of ${tagCoins(tag)}: metal content in troy ounces, at a stated and dated spot price.`,
    ],
    DESCRIPTION_MAX,
  );
};

/* -------------------------------- Coin pages ------------------------------ */

/** "Melt value of 1964 Washington Quarter" -- the H1. */
export const meltH1 = (coin: Coin) => `Melt value of ${coin.name}`;

/**
 * The <title>. Keyword-led, and the keyword is the phrase people type.
 *
 * THE BOTTOM TWO RUNGS ARE THE POINT. The ladder used to end at
 * `${coin.name} Melt Value`, and a ladder whose barest rung is the full name
 * cannot fit a name that is itself too long -- so twenty-seven pages shipped
 * over the limit while `fit()` picked the shortest form it had and every
 * source check passed. Every one was a proof of a two-word series ("1964 Proof
 * Washington Quarter (No Mint Mark) Melt Value") or one of the four 1878 hubs,
 * which is to say: the names that carry the most axes, which are exactly the
 * pages a longer ladder was needed for.
 *
 * `coinTitleName()` drops the mint-mark parenthetical and fronts the hub, the
 * same two edits the catalogue's own title makes. It is a rung rather than the
 * subject throughout, because the full name is better where it fits and the
 * H1 keeps it either way.
 */
export const meltSeoTitle = (coin: Coin) => {
  const melt = meltOf(coin);
  const short = coinTitleName(coin);
  return melt
    ? fit(
        [
          `${coin.name} Melt Value: ${melt.metalLabel} Content and Price`,
          `${coin.name} Melt Value: ${melt.metalLabel} Content`,
          `${coin.name} Melt Value`,
          `${short} Melt Value: ${melt.metalLabel} Content`,
          `${short} Melt Value`,
        ],
        TITLE_MAX,
      )
    : fit(
        [
          `${coin.name} Melt Value: No Silver or Gold Content`,
          `${coin.name} Melt Value: No Silver or Gold`,
          `${coin.name} Melt Value`,
          `${short} Melt Value: No Silver or Gold`,
          `${short} Melt Value`,
        ],
        TITLE_MAX,
      );
};

/**
 * The question this page is marked up as answering.
 *
 * Distinct from the coin page's "How much is a 1964 Washington Quarter
 * worth?", which is the point: two questions, two readers, two pages, and
 * neither page competing with the other for the same rich result.
 */
export const meltQuestion = (coin: Coin) =>
  `What is the melt value of ${article(shortNameOf(coin))} ${shortNameOf(coin)}?`;

/**
 * The opening answer, and the FAQPage `acceptedAnswer` with it.
 *
 * It quotes a dollar figure, which the coin BLUF is forbidden to do. The
 * reason the rule differs here is that this sentence is computed from
 * `spot.ts` at build time rather than typed, so it cannot go stale against
 * the rest of the page -- and a melt page whose opening sentence refuses to
 * state the melt value is not answering the question it was asked.
 */
export const meltAnswer = (coin: Coin, mark: Mark = plainUsd): string => {
  const melt = meltOf(coin);
  if (!melt) {
    return `${article(shortNameOf(coin), true)} ${shortNameOf(coin)} contains no silver or gold, so it has no melt value. It is ${lower(coin.composition)} and worth its face value of ${coin.faceValue}.`;
  }
  return `${article(shortNameOf(coin), true)} ${shortNameOf(coin)} contains ${melt.troyOunces} troy ounces of ${melt.metal}, so its melt value is ${mark(melt.value, { kind: 'value', metal: melt.metal, ozt: melt.troyOunces })} at a ${melt.metal} price of ${mark(melt.perOunce, { kind: 'price', metal: melt.metal })} per troy ounce.`;
};

export const meltDescription = (coin: Coin): string => {
  const melt = meltOf(coin);
  return melt
    ? fit(
        [
          `The melt value of ${article(shortNameOf(coin))} ${shortNameOf(coin)}: ${melt.troyOunces} troy ounces of ${melt.metal}, what that is worth now, what a roll or a hundred of them come to.`,
          `The melt value of ${article(shortNameOf(coin))} ${shortNameOf(coin)}: ${melt.troyOunces} troy ounces of ${melt.metal}, and what that is worth now.`,
        ],
        DESCRIPTION_MAX,
      )
    : fit(
        [
          `Whether ${article(shortNameOf(coin))} ${shortNameOf(coin)} contains any silver or gold, what it is actually made of, and why it is worth its face value of ${coin.faceValue}.`,
          `Whether ${article(shortNameOf(coin))} ${shortNameOf(coin)} contains any silver or gold, and what it is worth instead.`,
        ],
        DESCRIPTION_MAX,
      );
};

/** Where the coin's own page is, for the link every melt page carries. */
export const meltCoinLink = (coin: Coin) => coinPath(coin);

/* ===========================================================================
   No page dates in this section
   ===========================================================================

   A melt page carries no `dateModified` and gets no sitemap `lastmod`. The
   only thing on one that moves is the spot price, and it is dated where it is
   printed -- `spotBasis()`, next to the figure, on every page that states one.
   A page-level date would say the same thing less precisely and would be read
   as a claim about the coin facts, which do not move at all.
   =========================================================================== */

/* ===========================================================================
   FAQ ownership
   ===========================================================================

   One question per page, and not one of them is a question /coin-info
   claims. The catalogue asks what a coin is worth; this section asks what the
   metal in it is worth. faq-registry.ts throws if those ever normalise onto
   each other.
   =========================================================================== */

export const allMeltFaqQuestions = (): { question: string; path: string }[] => [
  { question: MELT_HUB_QUESTION, path: MELT_ROOT },
  ...meltGroups().map((g) => ({ question: meltGroupQuestion(g), path: meltGroupPath(g.slug) })),
  ...meltPairs().map(({ group, type }) => ({
    question: meltPairQuestion(group, type),
    path: meltTypePath(group.slug, type.slug),
  })),
  ...meltTags().map((t) => ({ question: meltTagQuestion(t), path: meltTagPath(t.slug) })),
  ...meltCoins().map((c) => ({ question: meltQuestion(c), path: meltPath(c) })),
];

/* ===========================================================================
   Build-time validation
   ===========================================================================

   Throws rather than warns, like validateTaxonomy(). The failures it catches
   are all silent in the output: a melt tree that has quietly stopped
   mirroring the catalogue still builds, and the reader who edits one segment
   of a URL to cross between the sections lands on a 404 that no test noticed.
   =========================================================================== */

export function validateMeltPaths(): void {
  const problems: string[] = [];

  // The mirror, asserted rather than assumed. Both halves of the site are
  // generated from the same registries, so the only way these come apart is
  // an edit to one path helper and not the other -- which is exactly the edit
  // somebody makes at four in the afternoon.
  for (const coin of meltCoins()) {
    const expected = meltPathOfCoinPath(coinPath(coin));
    if (meltPath(coin) !== expected) {
      problems.push(`coin "${coin.slug}" sits at ${meltPath(coin)} but its catalogue path says ${expected}`);
    }
  }

  for (const g of GROUPS) {
    if (MELT_RESERVED_SEGMENTS.includes(g.slug)) {
      problems.push(`group "${g.slug}" collides with a reserved /melt-value segment`);
    }
  }
  for (const t of TYPES) {
    if (MELT_RESERVED_SEGMENTS.includes(t.slug)) {
      problems.push(`type "${t.slug}" collides with a reserved /melt-value segment`);
    }
  }
  for (const t of TAGS) {
    if (MELT_RESERVED_SEGMENTS.includes(t.slug)) {
      problems.push(`tag "${t.slug}" collides with a reserved /melt-value segment`);
    }
  }

  const paths = new Map<string, number>();
  for (const coin of meltCoins()) {
    const p = meltPath(coin);
    paths.set(p, (paths.get(p) ?? 0) + 1);
  }
  for (const [p, n] of paths) {
    if (n > 1) problems.push(`melt URL ${p} is claimed by ${n} coins`);
  }

  if (problems.length > 0) {
    throw new Error(`The melt section is invalid:\n  - ${problems.join('\n  - ')}`);
  }
}

validateMeltPaths();
