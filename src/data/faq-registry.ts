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
 *   /coin-value/silver/quarter/1964-washington-quarter
 *                          "How much is a 1964 Washington Quarter worth?"
 *   /melt-value/1964-washington-quarter
 *                          "What is the melt value of a 1964 Washington quarter?"
 *   /common-questions/what-is-spot-price
 *                          "What is spot price?"
 *
 * Three pages, three questions, three readers. The day somebody writes a
 * common question called "How much is my coin worth?" that normalises onto a
 * catalogue question, this throws instead of shipping.
 *
 * It runs on every build because astro.config.mjs imports it for the side
 * effect, so there is no route it can be skipped by.
 * Importing `catalog-copy.ts` here is load-bearing for the same reason:
 * `validateCatalogCopy()` runs at its module scope, so the copy checks -- a
 * duplicate <title>, a truncated description, a paragraph used on two pages --
 * cannot be skipped either.
 */
import { normaliseQuestion } from './coins';
import { allFaqQuestions } from '../lib/catalog-copy';
import { allQuestionFaqs } from './questions';
import { allMeltFaqQuestions } from '../lib/melt';

/** Every FAQ question the built site will emit, with the page that owns it. */
export function allSiteFaqQuestions(): { question: string; path: string }[] {
  return [...allFaqQuestions(), ...allMeltFaqQuestions(), ...allQuestionFaqs()];
}

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
