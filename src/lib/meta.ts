/**
 * How long a title and a description may be, and the rule that fits one.
 *
 * Both halves of the catalogue generate these by the hundred -- `catalog-copy.ts`
 * for /coin-value, `melt.ts` for /melt-value -- so "somebody will shorten it if
 * it is too long" is not available as a plan. The limits live here, in one
 * module both sections and the SEO component read, and a build check measures
 * the HTML that actually shipped.
 *
 * ---------------------------------------------------------------------------
 * WHY THE BUDGET IS NOT THE LIMIT
 * ---------------------------------------------------------------------------
 *
 * The `<title>` that ships is not the title a page declares: `Seo.astro` appends
 * " | AboutMyCoin" to anything that does not already name the site. So a page
 * that declares 58 characters ships 71, and every measurement taken against the
 * declared string is thirteen characters wrong. That is exactly how five melt
 * pages ended up with 74-character titles while a check on the source said they
 * were fine.
 *
 * `titleBudget()` is therefore what a page may declare, and `RENDERED_TITLE_MAX`
 * is what the result must come to. `renderedTitle()` is the one implementation
 * of the suffix rule, and `Seo.astro` uses it, so the two cannot drift.
 */
import { SITE } from './site';

/**
 * What a search result has room for.
 *
 * Google truncates on pixel width rather than characters, at around 600px, which
 * lands between 55 and 65 characters depending on the letters. 65 is the far end
 * of that: a title at the limit is at risk of losing its last word, and one over
 * it is losing a word for certain.
 */
export const RENDERED_TITLE_MAX = 65;

/** The suffix `Seo.astro` adds to a title that does not already name the site. */
export const TITLE_SUFFIX = ` | ${SITE.name}`;

/** The title as it will ship. The rule lives here; `Seo.astro` calls it. */
export const renderedTitle = (title: string): string =>
  title.includes(SITE.name) ? title : `${title}${TITLE_SUFFIX}`;

/** How many characters a page may declare, given what will be appended to it. */
export const titleBudget = (title: string): number =>
  title.includes(SITE.name) ? RENDERED_TITLE_MAX : RENDERED_TITLE_MAX - TITLE_SUFFIX.length;

/**
 * What a page may declare when it does not name the site, which is all of them
 * except the home page. The number generated titles are fitted to.
 */
export const TITLE_MAX = RENDERED_TITLE_MAX - TITLE_SUFFIX.length;

/**
 * Meta description bounds.
 *
 * The ceiling is where Google starts cutting a description mid-clause; the floor
 * is where one has stopped saying enough to be worth reading. A page under the
 * floor is usually a page whose description was never written.
 */
export const DESCRIPTION_MAX = 165;
export const DESCRIPTION_MIN = 80;

/**
 * The first candidate that fits, or the shortest one when none does.
 *
 * Generated copy cannot be shortened by hand afterwards, so every generated
 * title and description is a list of forms from fullest to barest and the
 * formula picks. The validators still throw when even the barest form is too
 * long, because that is a subject whose name will not fit rather than a sentence
 * that needs cutting.
 */
export const fit = (candidates: string[], max: number): string =>
  candidates.find((c) => c.length <= max) ??
  candidates.reduce((a, b) => (a.length <= b.length ? a : b));

/* ===========================================================================
   Casing
   =========================================================================== */

/**
 * Small words that stay lowercase inside a heading.
 *
 * Archive H1s and titles are title case rather than the sentence case STYLE.md
 * asks for elsewhere, and that is the "deliberate keyword match" exception in
 * the same rule: "Silver Coin Values" is the phrase, and the page is competing
 * for it.
 */
const lower = (s: string) => s.toLowerCase();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'per',
  'the', 'to', 'with',
]);

/** Title case that leaves an already-capitalised word alone: "Copper and Bronze". */
export const titleCase = (s: string): string =>
  s
    .split(' ')
    .map((word, i) =>
      i > 0 && MINOR_WORDS.has(lower(word)) ? lower(word) : cap(word),
    )
    .join(' ');

