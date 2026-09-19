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

export const FAQ_UPDATED = '2026-01-01';
export const PRIVACY_UPDATED = '2026-01-01';

/** The real last-edit date for a path, or null to leave `<lastmod>` out. */
export function lastmodFor(path: string): string | null {
  if (path === '/faq') return FAQ_UPDATED;
  if (path === '/privacy') return PRIVACY_UPDATED;
  if (path.startsWith('/answers/')) {
    return ANSWERS.find((a) => `/answers/${a.slug}` === path)?.updated ?? null;
  }
  return null;
}
