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

import { RESERVED_SEGMENTS, type Coin, type Group, type CoinType } from './coin-schema';
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

/** "1964" or "1916-1945", for headings and spec tables. */
export const yearLabel = (coin: Coin) =>
  coin.years.to && coin.years.to !== coin.years.from
    ? `${coin.years.from}–${coin.years.to}`
    : String(coin.years.from);

/** The most recent real edit among a set of coins. Drives hub lastmod. */
export const latestUpdated = (coins: Coin[], floor: string): string =>
  coins.reduce((max, c) => (c.updated > max ? c.updated : max), floor);


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

/** Every FAQ question the /coin-value tree will emit, with the page that owns it. */
export function allFaqQuestions(): { question: string; path: string }[] {
  return [
    ...populatedGroups().map((g) => ({ question: g.faqQuestion, path: groupPath(g.slug) })),
    ...populatedPairs().map(({ group, type }) => ({
      question: pairQuestion(group, type),
      path: typePath(group.slug, type.slug),
    })),
    ...COINS.map((c) => ({ question: coinQuestion(c), path: coinPath(c) })),
    ...populatedTags().map((t) => ({ question: t.faqQuestion, path: tagPath(t.slug) })),
  ];
}

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
    if (c.updated < c.published) problems.push(`coin "${c.slug}" was updated before it was published`);
  }

  // The house rule, enforced: each FAQ question is marked up on one page only.
  const askedBy = new Map<string, string>();
  for (const { question, path } of allFaqQuestions()) {
    const key = normaliseQuestion(question);
    const owner = askedBy.get(key);
    if (owner) problems.push(`FAQ question "${question}" is claimed by both ${owner} and ${path}`);
    else askedBy.set(key, path);
  }

  if (problems.length > 0) {
    throw new Error(`Coin taxonomy is invalid:\n  - ${problems.join('\n  - ')}`);
  }
}

validateTaxonomy();
