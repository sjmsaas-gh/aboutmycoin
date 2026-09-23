/**
 * Who owns which FAQ question, across the whole site.
 *
 * The house rule is that each question carries FAQPage markup on exactly one
 * page, because Google wants a question marked up once and two pages claiming
 * one question is the site competing with itself for a rich result it then
 * loses. `catalog-copy.ts` already enforces that inside the catalogue. This is the
 * module that can see the catalogue, the melt section and the common-questions
 * registry at the same time, which is where the collisions that matter now
 * live:
 *
 *   /coin-info/silver/quarter/1964-washington-quarter
 *                          "How much is a 1964 Washington Quarter worth?"
 *   /melt-value/1964-washington-quarter
 *                          "What is the melt value of a 1964 Washington quarter?"
 *   /common-questions/what-is-spot-price
 *                          "What is spot price?"
 *   /coin-info/silver/quarter/1932-d-washington-quarter/g4
 *                          "How much is a 1932-D Washington quarter worth in
 *                          Good (G-4)?"
 *
 * The grade pages are the closest collision on the site: their question is the
 * coin page's question with a grade clause on the end, and `normaliseQuestion()`
 * strips the parenthetical the grade label carries. "Good (G-4)" normalises to
 * "good", which still separates it from the bare coin question and from every
 * other grade -- but it is the pair to check first when this throws.
 *
 * Three pages, three questions, three readers. The day somebody writes a
 * common question called "How much is my coin worth?" that normalises onto a
 * catalogue question, this throws instead of shipping.
 *
 * It runs on every build because astro.config.mjs imports it for the side
 * effect, so there is no route it can be skipped by.
 * Importing `grade-copy.ts` and `catalog-copy.ts` here is load-bearing for the
 * same reason:
 * `validateCatalogCopy()` runs at its module scope, so the copy checks -- a
 * duplicate <title>, a truncated description, a paragraph used on two pages --
 * cannot be skipped either.
 */
import { normaliseQuestion } from './coins';
import { allFaqQuestions } from '../lib/catalog-copy';
import { allGradeFaqQuestions } from '../lib/grade-copy';
import { allQuestionFaqs } from './questions';
import { allMeltFaqQuestions } from '../lib/melt';

/** A question, the page that asks it, and whether that page marks it up. */
export interface SiteFaq {
  question: string;
  path: string;
  /**
   * Whether this page carries FAQPage markup for the question, as opposed to
   * merely printing it as a heading with an answer under it.
   *
   * THE TWO ARE NOT THE SAME THING AND STOPPED BEING THE SAME THING ON
   * 2026-09-23, when the grade pages kept their question and lost their
   * markup. Before that every question on the site was marked up, so one list
   * did both jobs: it proved no two pages claimed a question, and it was the
   * list the build check walked to prove every registered question really
   * rendered as a `Question` node.
   *
   * Those are different obligations. Uniqueness is about the READER -- two
   * pages answering one question is the site competing with itself whether or
   * not a crawler is told about it, so the 21,123 grade questions still have
   * to be unique and are still in this list. Rendering is about the MARKUP,
   * and a page with no FAQPage node has no `Question` for a check to find.
   *
   * Collapsing them again -- by dropping the grade questions out of the list
   * to make the render check pass -- would silently give up the uniqueness
   * guarantee on 93% of the site's pages.
   */
  markedUp: boolean;
}

/**
 * Every question the built site ASKS, with the page that owns it.
 *
 * Marked up or not: see `markedUp`. Use this for uniqueness, and filter on
 * `markedUp` for anything that is really about structured data.
 */
export function allSiteFaqQuestions(): SiteFaq[] {
  return [
    ...allFaqQuestions().map((q) => ({ ...q, markedUp: true })),
    // The grade pages: rendered as a question, deliberately not marked up.
    ...allGradeFaqQuestions().map((q) => ({ ...q, markedUp: false })),
    ...allMeltFaqQuestions().map((q) => ({ ...q, markedUp: true })),
    ...allQuestionFaqs().map((q) => ({ ...q, markedUp: true })),
  ];
}

/** Only the questions a page really emits a `Question` node for. */
export const markedUpFaqQuestions = (): SiteFaq[] =>
  allSiteFaqQuestions().filter((q) => q.markedUp);

export function validateFaqOwnership(): void {
  const problems: string[] = [];
  const askedBy = new Map<string, string>();

  for (const { question, path } of allSiteFaqQuestions()) {
    const key = normaliseQuestion(question);
    const owner = askedBy.get(key);
    if (owner) problems.push(`FAQ question "${question}" is claimed by both ${owner} and ${path}`);
    else askedBy.set(key, path);
  }

  if (problems.length > 0) {
    throw new Error(`Two pages claim one FAQ question:\n  - ${problems.join('\n  - ')}`);
  }
}

validateFaqOwnership();
