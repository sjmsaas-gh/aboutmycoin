/**
 * The coin taxonomy: the one module every /coin-value page is generated from.
 *
 * Import this, not the files behind it. It re-exports the catalogue, adds the
 * path helpers and the filters the routes need, and validates the whole thing
 * at build time.
 *
 * ---------------------------------------------------------------------------
 * THE URL CONTRACT
 * ---------------------------------------------------------------------------
 *
 *   /coin-value                                  every populated group
 *   /coin-value/<group>                          e.g. /coin-value/silver
 *   /coin-value/<group>/<type>                   e.g. /coin-value/silver/quarter
 *   /coin-value/<group>/<type>/<coin>            the coin itself
 *   /coin-value/tagged/<tag>                     the cross-cutting view
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
 * /coin-value/tagged/canada assembles the country view for free. The
 * alternative -- /coin-value/canada/... -- needs a second parallel tree the
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
 *   /coin-value/silver/quarter/1964-washington-quarter
 *   /coin-value/clad/quarter/1965-washington-quarter
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
export { GROUPS, TYPES, TAGS } from './coin-taxonomy';
export { COINS } from './coin-catalog';

import { RESERVED_SEGMENTS, type Coin, type Group, type CoinType, type Tag } from './coin-schema';
/**
 * The one import this module takes from `src/lib/`, and it is structural
 * rather than financial: `coinMetal()` reads three fields off a coin and
 * `Metal` names the three metals the catalogue can weigh. Neither touches a
 * price. The alternative was a second copy of "which metals are in this set"
 * on the catalogue side of the site, which is the sort of duplication that
 * ends with two archives disagreeing about what a coin is made of.
 */
import { coinMetal, type Metal } from '../lib/spot';
import { GROUPS, TYPES, TAGS } from './coin-taxonomy';
import { COINS } from './coin-catalog';

/* ===========================================================================
   Lookups
   =========================================================================== */

export const COIN_VALUE_ROOT = '/coin-value';

export const groupBySlug = (slug: string) => GROUPS.find((g) => g.slug === slug);
export const typeBySlug = (slug: string) => TYPES.find((t) => t.slug === slug);
export const tagBySlug = (slug: string) => TAGS.find((t) => t.slug === slug);
export const coinBySlug = (slug: string) => COINS.find((c) => c.slug === slug);

export const groupPath = (group: string) => `${COIN_VALUE_ROOT}/${group}`;
export const typePath = (group: string, type: string) => `${COIN_VALUE_ROOT}/${group}/${type}`;
export const tagPath = (tag: string) => `${COIN_VALUE_ROOT}/tagged/${tag}`;
export const coinPath = (coin: Coin) => `${COIN_VALUE_ROOT}/${coin.group}/${coin.type}/${coin.slug}`;

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
export const gradedPath = (seriesSlug: string) => `${COIN_VALUE_ROOT}/graded/${seriesSlug}`;

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

   Every /coin-value page carries exactly one FAQPage question, and no two
   pages carry the same one. Google wants a question marked up once; two pages
   claiming the same question is the site competing with itself for a rich
   result it then loses. `validateTaxonomy()` throws on a collision.

   Groups and tags declare theirs by hand. Coins and (group, type) pairs derive
   theirs, because they are mechanical -- "how much is X worth" is genuinely
   how the phrase is typed, and the subject is already unique.
   --------------------------------------------------------------------------- */

/** "How much is a 1964 Washington Quarter worth?" */
export const coinQuestion = (coin: Coin) => `How much is a ${coin.shortName ?? coin.name} worth?`;

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
    // SPEC.md: every valuation shows its working. A priced table with no date
    // and no source is the exact thing the site exists not to be.
    if (c.values && c.values.length > 0) {
      if (!c.valueAsOf) problems.push(`coin "${c.slug}" has values but no valueAsOf date`);
      if (!c.sources || c.sources.length === 0) problems.push(`coin "${c.slug}" has values but no sources`);
      for (const v of c.values) {
        if (v.low > v.high) problems.push(`coin "${c.slug}" grade "${v.grade}" has low above high`);
      }
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
      if (m.years && (m.years.from < run.from || (m.years.to ?? m.years.from) > runEnd)) {
        problems.push(`series "${t.slug}" has mint ${m.city} striking outside the series run`);
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
    }
  }

  if (problems.length > 0) {
    throw new Error(`Coin taxonomy is invalid:\n  - ${problems.join('\n  - ')}`);
  }
}

validateTaxonomy();
