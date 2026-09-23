/**
 * The coin taxonomy: the one module every /coin-info page is generated from.
 *
 * Import this, not the files behind it. It re-exports the catalogue, adds the
 * path helpers and the filters the routes need, and validates the whole thing
 * at build time.
 *
 * ---------------------------------------------------------------------------
 * THE URL CONTRACT
 * ---------------------------------------------------------------------------
 *
 *   /coin-info                                  every populated group
 *   /coin-info/<group>                          e.g. /coin-info/silver
 *   /coin-info/<group>/<type>                   e.g. /coin-info/silver/quarter
 *   /coin-info/<group>/<type>/<coin>            the coin itself
 *   /coin-info/tagged/<tag>                     the cross-cutting view
 *
 * `group` is COMPOSITION (silver, gold, copper, clad, steel...). `type` is
 * DENOMINATION OR FORMAT (quarter, dime, cent, dollar, half-crown, bullion).
 * Those two axes are the tree. Everything else -- country, series, key dates,
 * junk silver, errors, wartime issues -- is a TAG, and tags are what let a
 * coin appear on many pages while existing at exactly one URL.
 *
 * Why only two axes in the path: a URL is a promise not to change. Composition
 * and denomination are facts about the metal disc that cannot be revised
 * later. Country grouping, series popularity and "is this a key date" are all
 * things we will change our minds about, and a URL is the wrong place for
 * anything we will change our minds about.
 *
 * Why composition first and not country: it makes the tree work for world
 * coins with no extra machinery. A 1967 Canadian silver dollar is silver and
 * it is a dollar, so it files itself; `canada` is a tag, and
 * /coin-info/tagged/canada assembles the country view for free. The
 * alternative -- /coin-info/canada/... -- needs a second parallel tree the
 * day somebody wants "all silver coins", and then every coin has two URLs.
 *
 * ---------------------------------------------------------------------------
 * THE TRAP IN THE OBVIOUS VERSION, WRITTEN DOWN SO IT IS NOT REDISCOVERED
 * ---------------------------------------------------------------------------
 *
 * Composition is a property of the ISSUE, never of the series. A 1964
 * Washington quarter is 90% silver; a 1965 Washington quarter is copper-nickel
 * clad. Same designer, same denomination, same portrait, different metal and
 * therefore a different group:
 *
 *   /coin-info/silver/quarter/1964-washington-quarter
 *   /coin-info/clad/quarter/1965-washington-quarter
 *
 * That is correct, not a bug -- the metal is the entire answer to "what is it
 * worth" for that pair -- but it splits a series across two branches. The
 * `washington-quarter` tag is what puts it back together, and every coin
 * therefore carries its series as a tag. Do not "fix" this by hoisting the
 * group up to the series; the fix would make the URL of a coin depend on a
 * fact about a different coin.
 *
 * ---------------------------------------------------------------------------
 * GRANULARITY: WHEN IS A COIN A PAGE
 * ---------------------------------------------------------------------------
 *
 * A `Coin` is one page, and it may be either:
 *
 *   - a single issue -- one year, optionally one mint mark, when people search
 *     the year ("1909 s vdb penny value", "1965 quarter value"); or
 *   - a whole run of identical years, when they search the series and the year
 *     does not change the answer ("mercury dime value", "morgan dollar value").
 *
 * The test is the house rule, unchanged: name the person who types the phrase.
 * Expanding a 30-year series into 30 pages that say the same thing is the
 * failure mode a generated catalogue is one careless loop away from, and it
 * drags the pages that deserve to rank down with it. The generator is not
 * exempt from the rule; it is the reason the rule needs writing down.
 */
export * from './coin-schema';
export * from './grades';
export { GROUPS, TYPES, TAGS } from './coin-taxonomy';
export { COINS } from './coin-catalog';
export { GRADED_LADDERS, ladderFor } from './graded-values';

import {
  RESERVED_SEGMENTS,
  type Coin,
  type Group,
  type CoinType,
  type KeyDate,
  type Tag,
} from './coin-schema';
/**
 * The one import this module takes from `src/lib/`, and it is structural
 * rather than financial: `coinMetal()` reads three fields off a coin and
 * `Metal` names the three metals the catalogue can weigh. Neither touches a
 * price. The alternative was a second copy of "which metals are in this set"
 * on the catalogue side of the site, which is the sort of duplication that
 * ends with two archives disagreeing about what a coin is made of.
 */
import { article } from '../lib/meta';
import { coinMetal, type Metal } from '../lib/spot';
import { GROUPS, TYPES, TAGS } from './coin-taxonomy';
import { COINS } from './coin-catalog';
import { gradeBySlug, type Grade } from './grades';
import { GRADED_LADDERS, ladderFor } from './graded-values';

/* ===========================================================================
   Lookups
   =========================================================================== */

export const COIN_INFO_ROOT = '/coin-info';

export const groupBySlug = (slug: string) => GROUPS.find((g) => g.slug === slug);
export const typeBySlug = (slug: string) => TYPES.find((t) => t.slug === slug);
export const tagBySlug = (slug: string) => TAGS.find((t) => t.slug === slug);
export const coinBySlug = (slug: string) => COINS.find((c) => c.slug === slug);

export const groupPath = (group: string) => `${COIN_INFO_ROOT}/${group}`;
export const typePath = (group: string, type: string) => `${COIN_INFO_ROOT}/${group}/${type}`;
export const tagPath = (tag: string) => `${COIN_INFO_ROOT}/tagged/${tag}`;
export const coinPath = (coin: Coin) => `${COIN_INFO_ROOT}/${coin.group}/${coin.type}/${coin.slug}`;

/** Coins in a group, in registry order. */
export const coinsInGroup = (group: string) => COINS.filter((c) => c.group === group);

/** Coins at one (group, type) pair -- the set a type archive page lists. */
export const coinsInGroupType = (group: string, type: string) =>
  COINS.filter((c) => c.group === group && c.type === type);

export const coinsWithTag = (tag: string) => COINS.filter((c) => c.tags.includes(tag));

export type { Metal };

/**
 * The precious metals actually present in a set of coins, in spot-table order.
 *
 * A composition GROUP is not a metal -- a 40% silver clad half is clad by
 * construction and silver by content -- so every page that needs to say what a
 * set is made of reads it off the coins through here. `metalsIn()` in melt.ts
 * is this function, and the catalogue's generated copy is its other caller.
 */
export const metalsInCoins = (coins: Coin[]): Metal[] => {
  const order: Metal[] = ['silver', 'gold', 'platinum'];
  const present = new Set(coins.map((c) => coinMetal(c)?.metal).filter(Boolean) as Metal[]);
  return order.filter((m) => present.has(m));
};

/**
 * Only groups that actually have coins.
 *
 * An archive page with nothing on it is thin content with a breadcrumb trail,
 * so an unpopulated group is registered but not built. Add a coin and the page
 * appears; that is the whole extensibility story.
 */
export const populatedGroups = () => GROUPS.filter((g) => coinsInGroup(g.slug).length > 0);

/** Types present within one group, in TYPES registry order. */
export const populatedTypes = (group: string) =>
  TYPES.filter((t) => coinsInGroupType(group, t.slug).length > 0);

/** Every (group, type) pair that has at least one coin. */
export const populatedPairs = () =>
  populatedGroups().flatMap((g) => populatedTypes(g.slug).map((t) => ({ group: g, type: t })));

export const populatedTags = () => TAGS.filter((t) => coinsWithTag(t.slug).length > 0);

/** The groups a tag's coins span. A tag crossing groups is the point of tags. */
export const groupsForTag = (tag: string) => {
  const slugs = new Set(coinsWithTag(tag).map((c) => c.group));
  return GROUPS.filter((g) => slugs.has(g.slug));
};

/**
 * The series tag a coin belongs to, when that tag carries structured facts.
 *
 * A coin may hold several tags; only one of them is the series it was struck
 * as part of, and only that one has mint and composition data worth a table.
 * Returns undefined when nobody has researched the series yet, which is the
 * signal to render no series block rather than a table of blanks.
 */
export const seriesForCoin = (coin: Coin) =>
  coin.tags.map(tagBySlug).find((t) => t?.kind === 'series' && t.series);

/**
 * Other coins in the same series, for the "Other years" block.
 *
 * Driven by the series tag rather than by a hand-kept list, so a new year
 * added to the catalogue appears on its siblings' pages with no edit to them.
 * Returns empty until there is a second year, and the block renders nothing
 * rather than a heading over an empty row.
 */
export const otherYearsInSeries = (coin: Coin): Coin[] => {
  const series = seriesForCoin(coin);
  if (!series) return [];
  return coinsWithTag(series.slug).filter((c) => c.slug !== coin.slug);
};

/* ---------------------------------------------------------------------------
   Date rows, and the coin page each one is about.

   Two tables on this site print dates the way the trade writes them --
   "1932-S", "1909-S VDB" -- and both want to link to the catalogue page for
   that issue the day it exists: a series page's key dates, and a cheat
   sheet's ranked dates. So the link is WORKED OUT FROM THE LABEL rather than
   typed beside it, and ONE resolver does it for both.

   That matters twice over. A slug typed next to a row is a second place for
   one fact to live and nothing fails when it goes missing -- what the reader
   gets is a scarce coin the site has a page for, printed as plain text next
   to one that links, which is the bug the 1932-S sat in. And a second
   resolver with its own idea of what "1909-S VDB" means is a matching rule
   that gets fixed once: this one lives here, in the module that holds the
   catalogue, because everything that needs it already imports it and it
   cannot import them back.

   Unlinked is a correct answer and stays silent. Ambiguity is not: two pages
   answering one label is a registry fault, so the validators read the matches
   rather than the link.
   --------------------------------------------------------------------------- */

/** "1909", "1909-S", "1909-S VDB". A year, an optional mark, an optional qualifier. */
const DATE_LABEL = /^(\d{4})(?:-([A-Z]{1,2}))?(?:\s+(\S.*))?$/;

/**
 * What a coin's name says about the issue beyond its year and mint mark:
 * "VDB" out of "1909-S VDB Wheat Penny", "" out of "1960 Washington Quarter".
 *
 * Undefined when the name does not contain the series at all, and then the row
 * does not link: a name this cannot read is a name this cannot compare, and
 * the failure to prefer is silence rather than a guess.
 */
const coinQualifier = (coin: Coin, series: string): string | undefined => {
  const at = coin.name.toLowerCase().indexOf(series.toLowerCase());
  if (at < 0) return undefined;
  return coin.name.slice(0, at).replace(/^\d{4}(?:-[A-Z]{1,2})?\s*/, '').trim();
};

/** The mint marks a coin's page covers. No list at all means Philadelphia. */
const coinMarks = (c: Coin): string[] => c.struckAt?.map((m) => m.mark) ?? [''];

/**
 * Every catalogue coin a date label could be about, best first: the pages
 * struck at this one mint, then the pages covering it among others. More than
 * one in whichever of those two the row settles on is a registry fault rather
 * than a rendering decision, so the validators read this too.
 *
 * `seriesName` is the series as it appears inside a coin's name, which is what
 * separates a 1909-S VDB from a 1909-S. An undefined `seriesTag` -- a sheet
 * with no registered series -- matches nothing.
 */
export const dateRowCoins = (
  seriesTag: string | undefined,
  seriesName: string,
  label: string,
): Coin[] => {
  if (seriesTag === undefined) return [];
  const parts = DATE_LABEL.exec(label.trim());
  if (!parts) return [];
  const year = Number(parts[1]);
  const mark = parts[2] ?? '';
  const qualifier = (parts[3] ?? '').trim().toLowerCase();

  const covers = coinsWithTag(seriesTag).filter((c) => {
    if (year < c.years.from || year > (c.years.to ?? c.years.from)) return false;
    if (!coinMarks(c).includes(mark)) return false;
    const q = coinQualifier(c, seriesName);
    if (q === undefined) return false;
    /*
     * A REVERSE HUB IS CARRIED AS A FIELD, not inside the qualifier, because
     * the hub phrase sits AFTER the series name in a coin's own name --
     * "1909-S Wheat Penny with VDB". `coinQualifier` reads what comes BEFORE
     * the series, so it returns "" for the VDB coin and "" for the plain one,
     * and a label of "1909-S" matched both. `validateTaxonomy()` caught it as
     * a key date resolving to two pages, which is exactly what that check is
     * for, and the fix belongs here rather than in an override on the row:
     * every other row naming that date would have had the same problem.
     *
     * So the effective qualifier is what the name says plus the hub. A label
     * with no hub phrase resolves to the coin with no hub, which is the same
     * rule that gives the bare slug to the plain coin.
     */
    const hub = (c.hub ?? '').toLowerCase();
    const own = hub ? [q, hub].filter(Boolean).join(' ') : q;
    return own.toLowerCase() === qualifier;
  });

  /* This mint's own page, if it has one. A page naming several mints is the
     generic one and answers only while the specific one is unwritten. */
  const own = covers.filter((c) => coinMarks(c).length === 1);
  return own.length > 0 ? own : covers;
};

/** The one coin a date label names, or undefined while the catalogue has none. */
export const dateRowCoin = (
  seriesTag: string | undefined,
  seriesName: string,
  label: string,
): Coin | undefined => {
  const hits = dateRowCoins(seriesTag, seriesName, label);
  return hits.length === 1 ? hits[0] : undefined;
};

/** Every coin a key date's label could be about. See `dateRowCoins()`. */
export const keyDateCoins = (series: Tag, k: KeyDate): Coin[] =>
  dateRowCoins(series.slug, series.name, k.label);

/**
 * The page a key date links to, or undefined while the catalogue has none.
 *
 * `coin` is an override for a label this cannot read, and setting it to what
 * the label already derives fails the build -- see `KeyDate.coin`.
 */
export const keyDateCoin = (series: Tag, k: KeyDate): Coin | undefined =>
  k.coin ? coinBySlug(k.coin) : dateRowCoin(series.slug, series.name, k.label);

/**
 * Series tags that have researched facts behind them.
 *
 * The filter is `series` rather than `kind`, because a series tag with only
 * prose renders as an ordinary tag page and should: the extra sections exist
 * to hold mint marks, metal eras, key dates and varieties, and a page of
 * empty ones is the table of blanks the schema comment warns about.
 */
export const documentedSeries = () => TAGS.filter((t) => t.kind === 'series' && t.series);

/**
 * Whether the per-grade pages exist yet.
 *
 * False, and the coin page renders no "graded" block at all. The same pattern
 * as the `*_AVAILABLE` flags behind pricing, and for the same reason: a link
 * to a page that is not built is a 404 in a static site, and a heading
 * promising a page that does not exist is the house rule against claiming what
 * is not built. Flip this in the same change that adds the route.
 */
export const GRADED_PAGES_AVAILABLE = false;

/** Where a series' graded breakdown will live once GRADED_PAGES_AVAILABLE is true. */
export const gradedPath = (seriesSlug: string) => `${COIN_INFO_ROOT}/graded/${seriesSlug}`;

/* ===========================================================================
   Grades
   ===========================================================================

   A coin fans out by grade when the spread across its ladder is large relative
   to its melt floor -- a 1961-D quarter is worth its metal in AG3 and in EF40,
   so twenty grade pages would be twenty copies of one page, while a 1932-D is
   worth eight times as much in Extremely Fine as in Good and the grade is the
   entire answer.

   That test is not evaluated here, because it cannot be: it needs the priced
   ladder, and the priced ladder is the research. So the gate is the research
   itself. A grade earns a URL when the catalogue holds a `GradedValue` row for
   it -- measured, dated and sourced, like every other figure on this site --
   and when the series has the wear points a grade description is generated
   from. Both are refusals to publish a page the site cannot fill: the first is
   "we do not know what this fetches", the second is "we cannot say what this
   grade looks like on this coin", and either one alone produces the template
   with a coin's name dropped into it that drags the good pages down.

   `commonality` deliberately gates nothing. It is a hint and it is wrong at the
   top of the ladder: a 1961-D quarter is common in every sense and worth melt
   in every circulated grade, and in MS67 it is worth hundreds, because almost
   none survived that well. A rule keyed to `commonality` would refuse to build
   the one page on that coin worth having.
   =========================================================================== */

/** The priced rows for a coin, in ladder order. Empty where none is researched. */
export const gradedValues = (coin: Coin) =>
  [...(ladderFor(coin.slug)?.values ?? [])].sort((a, b) => rungOrder(a.grade) - rungOrder(b.grade));

/**
 * Sheldon number first, colour within it.
 *
 * One key rather than two comparisons, so that every list of rungs on the site
 * -- the ladder table, the sheet, prev/next, the validators -- orders them the
 * same way. Brown, then Red-Brown, then Red at each number.
 */
const rungOrder = (slug: string) => {
  const g = gradeBySlug(slug);
  return g ? g.number * 10 + g.rank : 0;
};

/** The date this coin's figures were read, for `valueBasis()`. */
export const gradedAsOf = (coin: Coin) => ladderFor(coin.slug)?.asOf;

/** Where this coin's figures came from. Printed at the foot of every grade page. */
export const gradedSources = (coin: Coin) => ladderFor(coin.slug)?.sources ?? [];

/**
 * The grades this coin gets a page for, in ladder order.
 *
 * Empty for every coin in the catalogue that has no researched values, and for
 * every coin whose series has no wear points -- which is all of them but one
 * today, and is why `/coin-info/<group>/<type>/<coin>/<grade>` is a route that
 * builds four pages rather than a route that builds thousands.
 */
export const gradedGrades = (coin: Coin): Grade[] => {
  if (!seriesForCoin(coin)?.series?.wear) return [];
  return gradedValues(coin)
    .map((v) => gradeBySlug(v.grade))
    .filter(Boolean) as Grade[];
};

/** Every (coin, grade) pair the build produces. The one list the route reads. */
export const gradedPairs = (): { coin: Coin; grade: Grade }[] =>
  COINS.flatMap((coin) => gradedGrades(coin).map((grade) => ({ coin, grade })));

/** The priced row for one (coin, grade), or undefined if this coin has none. */
export const gradedValue = (coin: Coin, grade: Grade) =>
  (ladderFor(coin.slug)?.values ?? []).find((v) => v.grade === grade.slug);

/**
 * `/coin-info/silver/quarter/1932-d-washington-quarter/g4`.
 *
 * The coin's own path with one segment on the end, which is the same promise
 * the melt tree makes one level up: a reader who has learned to read one URL
 * on this site has learned this one. There is no melt page per grade and there
 * must not be -- grade does not change metal content, so the mirror stops at
 * the coin and the grade page links to the coin's melt page.
 */
export const gradePath = (coin: Coin, grade: Grade) => `${coinPath(coin)}/${grade.slug}`;

/**
 * The grade below and the grade above, stepping over the ones with no page.
 *
 * Not the next Sheldon number. A grade with nothing known about it is absent
 * from the ladder rather than listed at zero -- a row saying "MS69: none"
 * invites the reader to wonder whether one might turn up -- so prev/next step
 * to the next grade that EXISTS, and on a coin with four researched grades
 * that is what the reader is offered.
 */
export const gradeNeighbours = (coin: Coin, grade: Grade) => {
  // Within the same chain. A cent in MS64 Red is routinely worth more than the
  // same cent in MS65 Brown, so stepping from a Red rung to a Brown one is not
  // a step up the ladder -- it is a step sideways onto a different one, and a
  // prev/next that did it would tell the reader their coin got worse.
  const ladder = gradedGrades(coin).filter((g) => g.chain === grade.chain);
  const i = ladder.findIndex((g) => g.slug === grade.slug);
  return { below: i > 0 ? ladder[i - 1] : undefined, above: i < ladder.length - 1 ? ladder[i + 1] : undefined };
};

/**
 * "How much is a 1932-D Washington quarter worth in MS63?", or -- where this
 * site has no researched figure for the rung -- "What does MS63 mean on a
 * 1932-D Washington quarter?".
 *
 * The question a page is marked up as answering has to be a question the page
 * ANSWERS. Marking six and a half thousand pages up as answering "how much is
 * it worth" when the body states no figure is the schema-does-not-match-the-
 * page mismatch Google issues manual actions for, and it is the same mistake
 * the `<title>` was making one file over. The unpriced page answers a narrower
 * question completely, so it claims the narrower question.
 *
 * The check is inlined rather than taken from `isPriced()` in grade-copy.ts,
 * which imports this module: the dependency runs one way and must keep to it.
 *
 * The code rather than the label, for the reason `gradeH1()` gives: the
 * uniqueness key strips parentheticals, so every mint state question would
 * normalise onto one and `faq-registry.ts` would be unable to tell them apart.
 */
export const gradeQuestion = (coin: Coin, grade: Grade) => {
  const name = coin.shortName ?? coin.name;
  const value = gradedValue(coin, grade);
  const priced = value?.low !== undefined && value?.high !== undefined;
  return priced
    ? `How much is ${article(name)} ${name} worth in ${grade.code}?`
    : `What does ${grade.code} mean on ${article(name)} ${name}?`;
};



/**
 * "1932-present", "1932-1964", or "1943" for a run of one year.
 *
 * The single-year case is not cosmetic. A one-year composition era is a real
 * thing -- the 1943 steel cent, the 1921-D Morgan dollar -- and "1943-1943"
 * in a Years column reads as a data error to anyone who notices it and as
 * nothing at all to anyone who does not, which is the worse half.
 */
export const runLabel = (years: { from: number; to?: number }) =>
  years.to === undefined
    ? `${years.from}\u2013present`
    : years.to === years.from
      ? `${years.from}`
      : `${years.from}\u2013${years.to}`;

/** "1964" or "1916-1945", for headings and spec tables. */
export const yearLabel = (coin: Coin) =>
  coin.years.to && coin.years.to !== coin.years.from
    ? `${coin.years.from}–${coin.years.to}`
    : String(coin.years.from);

/**
 * The coin's name as it goes in a `<title>`: "1878 8 Tail Feathers Proof
 * Morgan Dollar".
 *
 * Two edits to `coin.name`, and both of them are the same two `issueSeoTitle()`
 * makes one module over -- this is that rule applied to a `Coin`, for the
 * sections that hold one and never saw the `Issue` it was generated from.
 *
 *   - The "(No Mint Mark)" parenthetical comes off. It earns its place in an
 *     H1, where the reader is holding the coin and looking for a letter that
 *     is not there. It earns nothing in a result list, where it costs fifteen
 *     characters of a sixty-five character budget and nobody types it.
 *   - The hub moves to the front, so the title reads in the order somebody
 *     types it: "1878 8 Tail Feathers Proof Morgan Dollar", not "1878 Proof
 *     Morgan Dollar with 8 Tail Feathers".
 *
 * No fact is restated here. The year, the mark, the hub, the finish and the
 * series all still come from the generated name and `coin.hub`; this reorders
 * what is already in them. Without it the melt section had twenty-seven titles
 * over the limit -- every proof of a two-word series, and all four 1878 hubs --
 * because its ladder bottomed out at the full name and had nowhere left to go.
 */
export const coinTitleName = (coin: Coin): string => {
  const bare = coin.name.replace(/ \(No Mint Mark\)$/, '');
  if (!coin.hub) return bare;
  return bare
    .replace(` with ${coin.hub}`, '')
    /*
     * The leading token is the year and its mint mark, which is what every
     * generated name opens with. Anchored, so a hub that happened to contain a
     * year could not match halfway along.
     */
    .replace(/^(\d{4}(?:-[A-Z]{1,2})?) /, `$1 ${coin.hub} `);
};


/* ---------------------------------------------------------------------------
   Naming a set of coins in a sentence
   ---------------------------------------------------------------------------

   Both halves of the site generate sentences about a tag, and both hit the same
   two problems: a tag name is stored in sentence case with its proper nouns
   intact -- "Junk silver", "United States", "Washington quarter", "Clad
   coinage" -- and some of those names are mass nouns. Lowercasing all of them
   gives "the united states coins"; lowercasing none of them gives "What are
   Junk silver coins worth?"; ignoring the mass nouns gives "What are Clad
   coinage worth?".

   `kind` settles the first: a series or a country is named after a person or a
   place and keeps its capital, everything else is a common noun and loses it.
   The phrase itself settles the second.
   --------------------------------------------------------------------------- */

/** A tag's name as it reads inside a sentence. Proper nouns keep their capital. */
export const tagNoun = (tag: Tag): string =>
  tag.kind === 'series' || tag.kind === 'country'
    ? tag.name
    : tag.name.charAt(0).toLowerCase() + tag.name.slice(1);

/** "junk silver coins", "United States coins", "clad coinage" -- a tag as a noun phrase. */
export const tagCoinsPhrase = (tag: Tag): string => {
  const noun = tagNoun(tag);
  return /coins?$|coinage$/i.test(noun) ? noun : `${noun} coins`;
};

/** Whether that phrase takes a plural verb. "Clad coinage is", "junk silver coins are". */
export const tagIsPlural = (tag: Tag): boolean => {
  const phrase = tagCoinsPhrase(tag);
  return /s$/.test(phrase) && !/coinage$/i.test(phrase);
};

/* ---------------------------------------------------------------------------
   FAQ questions
   ---------------------------------------------------------------------------

   Every /coin-info page carries exactly one FAQPage question, and no two
   pages carry the same one. Google wants a question marked up once; two pages
   claiming the same question is the site competing with itself for a rich
   result it then loses. `validateTaxonomy()` throws on a collision.

   Groups and tags declare theirs by hand. Coins and (group, type) pairs derive
   theirs, because they are mechanical -- "how much is X worth" is genuinely
   how the phrase is typed, and the subject is already unique.
   --------------------------------------------------------------------------- */

/**
 * "What is a 1964 Washington quarter with no mint mark?"
 *
 * It asked how much one was worth until 2026-09-22, and that was the schema
 * disagreeing with the page rather than a matter of emphasis. Every `bluf` in
 * this catalogue, generated and hand-written alike, answers what the coin IS
 * -- "was struck at Philadelphia, is 90% silver, and contains 0.1808 troy
 * ounces of silver" -- and none of them states a price, because the only
 * figure a coin page carries is the melt arithmetic in a block of its own.
 * A page marked up as answering a question its answer does not address is the
 * mismatch Google issues manual actions for, and four hundred and fifty of
 * them was the site's largest single claim about itself.
 *
 * The subject is the short name, which carries the year and the mint mark, so
 * no two coins produce one question. `normaliseQuestion()` strips
 * parentheticals before the uniqueness check, which is why the markless
 * issues carry "with no mint mark" in the name rather than in brackets.
 */
export const coinQuestion = (coin: Coin) =>
  `What is ${article(coin.shortName ?? coin.name)} ${coin.shortName ?? coin.name}?`;

/** "What are silver quarters worth?" */
export const pairQuestion = (group: Group, type: CoinType) =>
  `What are ${group.name.toLowerCase()} ${type.namePlural.toLowerCase()} worth?`;

/**
 * Two questions collide when they are the same QUESTION, not when they are the
 * same string. Casing, punctuation and a parenthetical year range are not
 * differences a searcher or a crawler cares about, so they are normalised away
 * before comparison -- otherwise "How much is a Mercury Dime (1916-1945)
 * worth?" and "How much is a Mercury dime worth?" both ship, on two pages, and
 * the site competes with itself.
 */
export const normaliseQuestion = (q: string) =>
  q.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/*
 * `allFaqQuestions()` used to live here and now lives in
 * `src/lib/catalog-copy.ts`, beside the generator that produces half of the
 * questions in it. A list of every question the section emits has to be
 * assembled where the questions are written, or it is a list that can disagree
 * with the pages. The collision check moved with it, and
 * `src/data/faq-registry.ts` runs the site-wide version on every build.
 */

/* ===========================================================================
   Build-time validation
   ===========================================================================

   These throw rather than warn, and they run at build because every route
   module imports this file. The failures they catch -- a coin pointing at a
   group that does not exist, two coins claiming one URL, a tag nobody wrote
   copy for -- all produce a site that builds cleanly and is quietly broken.
   =========================================================================== */

export function validateTaxonomy(): void {
  const problems: string[] = [];

  const seen = <T extends { slug: string }>(items: T[], what: string) => {
    const counts = new Map<string, number>();
    for (const i of items) counts.set(i.slug, (counts.get(i.slug) ?? 0) + 1);
    for (const [slug, n] of counts) if (n > 1) problems.push(`${what} slug "${slug}" is declared ${n} times`);
  };

  seen(GROUPS, 'group');
  seen(TYPES, 'type');
  seen(TAGS, 'tag');
  seen(COINS, 'coin');

  for (const g of GROUPS) {
    if (RESERVED_SEGMENTS.includes(g.slug)) {
      problems.push(`group "${g.slug}" collides with a reserved path segment`);
    }
  }

  // A coin's `sections` hold the one fact that is true of that coin and of no
  // other, which is why the field is optional: an issue with nothing of its own
  // to say omits it rather than padding. These two maps are what make omitting
  // the only alternative to a real fact -- with no check, the cheapest way to
  // fill the field is to copy the section from the coin next door, and a
  // catalogue meant to reach thousands of pages cannot afford that to be
  // cheap. `validateCatalogCopy()` has enforced this on the archives since
  // they were generated; the coin pages are the hand-written half, which is
  // where duplication actually comes from.
  const sectionHeading = new Map<string, string>();
  const sectionParagraph = new Map<string, string>();

  for (const c of COINS) {
    if (!groupBySlug(c.group)) problems.push(`coin "${c.slug}" has unknown group "${c.group}"`);
    if (!typeBySlug(c.type)) problems.push(`coin "${c.slug}" has unknown type "${c.type}"`);
    for (const t of c.tags) {
      if (!tagBySlug(t)) problems.push(`coin "${c.slug}" uses unregistered tag "${t}"`);
    }
    if (c.tags.length === 0) problems.push(`coin "${c.slug}" has no tags; at least its series or country belongs here`);
    for (const r of c.related ?? []) {
      if (!coinBySlug(r)) problems.push(`coin "${c.slug}" links to unknown related coin "${r}"`);
      if (r === c.slug) problems.push(`coin "${c.slug}" lists itself as related`);
    }
    // Normalised before comparison, for the same reason questions are: two
    // paragraphs differing by a comma or a capital are one paragraph to a
    // reader and to a crawler.
    for (const s of c.sections ?? []) {
      if (s.paragraphs.length === 0) {
        problems.push(`coin "${c.slug}" section "${s.heading}" is a heading over nothing`);
      }
      const h = normaliseQuestion(s.heading);
      const headingOwner = sectionHeading.get(h);
      if (headingOwner) {
        problems.push(`coins "${headingOwner}" and "${c.slug}" share the section heading "${s.heading}"`);
      } else sectionHeading.set(h, c.slug);
      for (const p of s.paragraphs) {
        const k = normaliseQuestion(p);
        const paragraphOwner = sectionParagraph.get(k);
        if (paragraphOwner) {
          problems.push(
            `coins "${paragraphOwner}" and "${c.slug}" share a section paragraph: "${p.slice(0, 70)}\u2026"`,
          );
        } else sectionParagraph.set(k, c.slug);
      }
    }

  }

  /*
   * The priced ladders, re-checked here at build time.
   *
   * `scripts/import-grades.mjs` has already run every one of these against the
   * research sheet, and this is the second pass for one reason: the file it
   * writes is committed, so it can be hand-edited, and a hand-edited generated
   * file is the one nobody re-reads. SPEC.md -- every valuation shows its
   * working -- and a priced table with no date and no source is the exact thing
   * this site exists not to be.
   */
  for (const ladder of GRADED_LADDERS) {
    const where = `ladder "${ladder.coin}"`;
    if (!coinBySlug(ladder.coin)) problems.push(`${where} prices a coin that is not in the catalogue`);
    if (!ladder.asOf) problems.push(`${where} has no date, so its figures cannot be printed`);
    // A ladder with no figure on it cites nothing, because it read nothing, and
    // a source named on a page it supplied no number to is a citation that does
    // not check out. A ladder with even one figure must still say where it came
    // from -- that is the rule this branch exists to keep, not weaken.
    const anyPriced = ladder.values.some((v) => v.low !== undefined);
    if (anyPriced && ladder.sources.length === 0) problems.push(`${where} states a price and names no source`);
    if (!anyPriced && ladder.sources.length > 0) {
      problems.push(`${where} names a source and states no price`);
    }

    const graded = new Set<string>();
    for (const v of ladder.values) {
      if (!gradeBySlug(v.grade)) problems.push(`${where} prices an unregistered grade "${v.grade}"`);
      if (graded.has(v.grade)) problems.push(`${where} prices grade "${v.grade}" twice`);
      graded.add(v.grade);
      // An unpriced rung is a page that states no range, not an error. What IS an
      // error is half a range: a low with no high is a point wearing a range's
      // clothes, and every caller here would print it as one.
      if ((v.low === undefined) !== (v.high === undefined)) {
        problems.push(`${where} grade "${v.grade}" has one end of a range and not the other`);
      }
      if (v.low !== undefined && v.low <= 0) problems.push(`${where} grade "${v.grade}" has no floor under it`);
      if (v.low !== undefined && v.high !== undefined && v.low > v.high) {
        problems.push(`${where} grade "${v.grade}" has low above high`);
      }
      if (v.low === undefined && (v.sales?.length || v.population)) {
        problems.push(`${where} grade "${v.grade}" has evidence behind it and states no range`);
      }
      for (const sale of v.sales ?? []) {
        if (!sale.house || !sale.when || sale.price <= 0) {
          problems.push(`${where} grade "${v.grade}" records a sale with no price, house or date`);
        }
        // A range has to contain its own evidence: the page prints the range as
        // the answer and the sales under it as the working.
        if (v.low !== undefined && v.high !== undefined && (sale.price < v.low || sale.price > v.high)) {
          problems.push(
            `${where} grade "${v.grade}" states ${v.low}-${v.high} and records a sale at ${sale.price}`,
          );
        }
      }
      if (v.population && !v.population.service) {
        problems.push(`${where} grade "${v.grade}" states a population and no census behind it`);
      }
    }

    // Validated, never sorted -- sorting would hide a figure typed an order of
    // magnitude wrong or a row filed under the wrong grade. Per CHAIN, because
    // colour makes the ladder three parallel ones and a Red rung is not
    // comparable with the Brown rung a point above it.
    const chains = new Set(ladder.values.map((v) => gradeBySlug(v.grade)?.chain ?? ''));
    for (const chain of chains) {
      const rungs = ladder.values
        .filter((v) => (gradeBySlug(v.grade)?.chain ?? '') === chain)
        .sort(
          (a, b) =>
            (gradeBySlug(a.grade)?.number ?? 0) - (gradeBySlug(b.grade)?.number ?? 0),
        );
      // Priced rungs only. An unpriced rung says nothing about the direction of
      // the ladder, so it must not break the chain between the two priced rungs
      // either side of it -- comparing against it, or stopping at it, would
      // silence the check that catches a figure typed an order of magnitude
      // wrong, which is the one thing this loop is for.
      const priced = rungs.filter((v) => v.high !== undefined);
      for (let i = 1; i < priced.length; i += 1) {
        if (priced[i].high! < priced[i - 1].high!) {
          problems.push(
            `${where} tops out lower in ${priced[i].grade} than in ${priced[i - 1].grade}; one row is wrong`,
          );
        }
      }
    }

    // A colour on a coin that is not made of copper. The designation is a fact
    // about how an alloy ages, so a silver quarter graded MS65RD is a row that
    // describes a coin nobody has ever struck.
    for (const v of ladder.values) {
      const g = gradeBySlug(v.grade);
      const coinHere = coinBySlug(ladder.coin);
      if (g && coinHere && g.groups.length > 0 && !g.groups.includes(coinHere.group)) {
        problems.push(
          `${where} grades a ${coinHere.group} coin ${g.code}, and that designation is only used on ${g.groups.join(', ')}`,
        );
      }
    }

    // The research happened and no page came out of it: either the series has
    // no wear points, or nothing here reached the ladder.
    const coin = coinBySlug(ladder.coin);
    if (coin && ladder.values.length > 0 && !seriesForCoin(coin)?.series?.wear) {
      problems.push(`${where} has rows but its series has no wear points, so no grade page is built`);
    }
  }

  // Series facts, wherever a tag carries them.
  //
  // Every failure here renders as a plausible-looking row that is quietly
  // wrong -- an era pointing at a group that has no archive, a mint mark
  // listed twice, a key date linking to a coin that is not built. None of it
  // shows up in a clean build, which is why it throws.
  for (const t of TAGS) {
    const series = t.series;
    if (!series) continue;
    if (t.kind !== 'series') {
      problems.push(`tag "${t.slug}" carries series facts but its kind is "${t.kind}"`);
    }

    const run = series.years;
    const runEnd = run.to ?? Number.MAX_SAFE_INTEGER;
    if (run.to !== undefined && run.to < run.from) {
      problems.push(`series "${t.slug}" ends (${run.to}) before it begins (${run.from})`);
    }

    if (series.mints.length === 0) {
      problems.push(`series "${t.slug}" lists no mints; at least one struck it`);
    }
    const marks = new Set<string>();
    for (const m of series.mints) {
      const label = m.mark === '' ? '(no mark)' : m.mark;
      if (marks.has(m.mark)) problems.push(`series "${t.slug}" lists mint mark ${label} twice`);
      marks.add(m.mark);
      for (const span of m.years ?? []) {
        if (span.from < run.from || (span.to ?? span.from) > runEnd) {
          problems.push(`series "${t.slug}" has mint ${m.city} striking outside the series run`);
        }
        if (span.to !== undefined && span.to < span.from) {
          problems.push(`series "${t.slug}" has mint ${m.city} with a span ending before it begins`);
        }
      }
    }

    // Eras are read top to bottom as a timeline, so they must be ordered, must
    // cover the whole run, and must file under a group that has an archive.
    // A shared boundary year is allowed and is a real thing: 1982 cents were
    // struck in both bronze and zinc.
    if (series.compositions.length === 0) {
      problems.push(`series "${t.slug}" lists no compositions; it was made of something`);
    }
    let previousEnd = run.from - 1;
    for (const [i, c] of series.compositions.entries()) {
      if (!groupBySlug(c.group)) {
        problems.push(`series "${t.slug}" era from ${c.years.from} files under unknown group "${c.group}"`);
      }
      if (i === 0 && c.years.from !== run.from) {
        problems.push(`series "${t.slug}" runs from ${run.from} but its first era starts at ${c.years.from}`);
      }
      if (c.years.from < previousEnd) {
        problems.push(`series "${t.slug}" composition eras overlap or are out of order at ${c.years.from}`);
      }
      if (c.years.to !== undefined && c.years.to < c.years.from) {
        problems.push(`series "${t.slug}" era at ${c.years.from} ends before it begins`);
      }
      if (c.years.from < run.from || (c.years.to ?? c.years.from) > runEnd) {
        problems.push(`series "${t.slug}" has a composition era outside the series run`);
      }
      previousEnd = c.years.to ?? runEnd;
    }
    if (series.compositions.length > 0 && previousEnd !== runEnd) {
      problems.push(`series "${t.slug}" runs to ${run.to ?? 'present'} but its eras stop at ${previousEnd}`);
    }

    /*
     * The finish-only compositions are NOT a timeline and are deliberately not
     * checked for order, contiguity or coverage -- see `finishCompositions` in
     * the schema. What they must not do is duplicate a (group, year) the
     * timeline already covers, because the importer looks there first and an
     * entry it can never reach is an entry somebody will edit expecting a
     * change.
     */
    for (const c of series.finishCompositions ?? []) {
      if (!groupBySlug(c.group)) {
        problems.push(`series "${t.slug}" finish composition from ${c.years.from} files under unknown group "${c.group}"`);
      }
      if (c.years.to !== undefined && c.years.to < c.years.from) {
        problems.push(`series "${t.slug}" finish composition at ${c.years.from} ends before it begins`);
      }
      const shadowed = series.compositions.find(
        (e) =>
          e.group === c.group &&
          c.years.from <= (e.years.to ?? runEnd) &&
          (c.years.to ?? runEnd) >= e.years.from,
      );
      if (shadowed) {
        problems.push(
          `series "${t.slug}" finish composition ${c.years.from}-${c.years.to ?? 'present'} (${c.group}) is already covered by the ${shadowed.years.from} era, so nothing would ever read it`,
        );
      }
    }

    // Every row of the cheat sheet, across all three lists, has to be a
    // distinct label: the cheat sheet is one scan and a label appearing twice
    // in it reads as two things to check that are really one.
    const labels = new Set<string>();
    for (const k of [
      ...(series.keyDates ?? []),
      ...(series.varieties ?? []),
      ...(series.errors ?? []),
    ]) {
      if (labels.has(k.label)) problems.push(`series "${t.slug}" lists "${k.label}" twice`);
      labels.add(k.label);
    }

    // Key dates link out the day their page is built and read as plain text
    // until then -- the same contract as `Coin.related`, and the same failure
    // if a slug is typed ahead of the coin. Only key dates: a key date is an
    // ordinary issue of the series that happens to be scarce, so it is a
    // catalogue coin like any other, whereas varieties and errors are
    // specialties this site lists and does not follow. See `MintError`.
    for (const k of series.keyDates ?? []) {
      if (k.coin && !coinBySlug(k.coin)) {
        problems.push(`series "${t.slug}" key date "${k.label}" links to unknown coin "${k.coin}"`);
      }
      // The override is for a label this cannot read. Set to what the label
      // already says, it is a second copy of one fact that stops being checked
      // the moment the two disagree -- the same rule `validateCatalogCopy()`
      // applies to a written string identical to the generated one.
      const derived = keyDateCoins(t, k);
      if (k.coin && derived.length === 1 && derived[0].slug === k.coin) {
        problems.push(
          `series "${t.slug}" key date "${k.label}" sets coin "${k.coin}", which its label already derives -- remove the field`,
        );
      }
      // Two catalogue pages for one date and mint mark of one series. The row
      // cannot choose between them and would silently stop linking, so it is
      // caught here rather than read as "no page yet".
      if (derived.length > 1) {
        problems.push(
          `series "${t.slug}" key date "${k.label}" matches ${derived.length} coins: ${derived.map((c) => c.slug).join(', ')}`,
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Coin taxonomy is invalid:\n  - ${problems.join('\n  - ')}`);
  }
}

validateTaxonomy();
