/**
 * When each dated page last really changed -- one source for the page's own
 * `dateModified` / `article:modified_time` and for the sitemap's `<lastmod>`.
 *
 * The sitemap used to fall back to the build date for every page without an
 * entry of its own, so each deploy told Google that every page on the site had
 * changed while the pages' own schema said otherwise. Google only uses lastmod
 * on a site where it is consistently right, and a site-wide false date costs
 * the answer pages their honest ones too.
 *
 * So: bump a date here only when that page's text changes, and a page with no
 * date here gets no `<lastmod>` at all rather than an invented one.
 * tests/build-smoke.test.mjs fails if a sitemap date disagrees with the
 * `dateModified` its page declares.
 *
 * RENAME: set both dates to the day the rewritten page first ships. A new page
 * that declares a `dateModified` gets a constant here and a line in
 * `lastmodFor`, or that check fails.
 */
import { ANSWERS } from '../data/answers';
import {
  COINS,
  coinPath,
  groupPath,
  typePath,
  tagPath,
  populatedGroups,
  populatedPairs,
  populatedTags,
  coinsInGroup,
  coinsInGroupType,
  coinsWithTag,
  latestUpdated,
} from '../data/coins';

export const FAQ_UPDATED = '2026-01-01';
export const PRIVACY_UPDATED = '2026-01-01';

/**
 * The floor for the catalogue hub pages: the day /coin-value itself was
 * written. An archive's real date is the later of this and the most recent
 * edit among the coins it lists, which is an honest claim -- a collection did
 * change on the day one of its members changed -- and it is the same date the
 * page puts in its own `dateModified`, which is what build-smoke checks.
 */
export const COIN_VALUE_UPDATED = '2026-09-19';

/**
 * lastmod for anything under /coin-value, derived rather than listed.
 *
 * Listing thousands of generated pages by hand in `lastmodFor` is not an
 * option once the catalogue comes out of a database, so the dates come from
 * the same registry the pages do. Returns null for an unrecognised path, which
 * leaves the `<lastmod>` out rather than inventing one.
 */
function coinValueLastmod(path: string): string | null {
  if (path === '/coin-value' || path === '/coin-value/tagged') {
    return latestUpdated(COINS, COIN_VALUE_UPDATED);
  }

  const coin = COINS.find((c) => coinPath(c) === path);
  if (coin) return coin.updated;

  const tag = populatedTags().find((t) => tagPath(t.slug) === path);
  if (tag) return latestUpdated(coinsWithTag(tag.slug), tag.updated);

  const pair = populatedPairs().find(({ group, type }) => typePath(group.slug, type.slug) === path);
  if (pair) {
    const floor = pair.type.updated > pair.group.updated ? pair.type.updated : pair.group.updated;
    return latestUpdated(coinsInGroupType(pair.group.slug, pair.type.slug), floor);
  }

  const group = populatedGroups().find((g) => groupPath(g.slug) === path);
  if (group) return latestUpdated(coinsInGroup(group.slug), group.updated);

  return null;
}

/** The real last-edit date for a path, or null to leave `<lastmod>` out. */
export function lastmodFor(path: string): string | null {
  if (path === '/faq') return FAQ_UPDATED;
  if (path === '/privacy') return PRIVACY_UPDATED;
  if (path === '/coin-value' || path.startsWith('/coin-value/')) {
    return coinValueLastmod(path);
  }
  if (path.startsWith('/answers/')) {
    return ANSWERS.find((a) => `/answers/${a.slug}` === path)?.updated ?? null;
  }
  return null;
}
