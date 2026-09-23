/**
 * Shared body text for /llms.txt and /llms-full.txt.
 *
 * Generated from the same modules the site renders from, so an assistant
 * quoting these files quotes numbers that match the site exactly. Anything
 * hand-typed here will eventually contradict a page, and the contradiction will
 * be discovered by a model repeating it to a customer.
 *
 * The structure -- summary, what it is, who it is for, key facts, pricing,
 * pages -- is the part worth keeping on any site in this family. Answer engines
 * reward a file that states plain facts in short self-contained blocks.
 *
 * THE PROSE SECTIONS ARE NOT FREE TEXT. `What it is`, `Who it is for` and
 * `Key facts` shipped as starter placeholder -- "Replace this section with two
 * or three short paragraphs" -- from the day the lockdown lifted until
 * 2026-09-23, because nothing measures them. They are the whole of what an
 * assistant knows about this site when it answers without browsing, so the
 * three rules they are written under are the site's own: state what is true
 * today rather than what is planned, name the boundary as plainly as the
 * target, and count the catalogue from the registries rather than by hand so
 * the figures cannot go stale. `tests/llms.test.mjs` fails on placeholder
 * prose and on a coverage claim that disagrees with the catalogue.
 */
import { SITE } from './site';
import { SPOT, formatUsd, spotBasis } from './spot';
import { meltGroups, meltGroupPath, meltPath } from './melt';
import { groupAnswer, tagAnswer } from './catalog-copy';
import {
  QUESTIONS,
  QUESTION_CATEGORIES,
  categoryPath,
  questionPath,
  questionsInCategory,
} from '../data/questions';
import {
  COINS,
  populatedGroups,
  populatedTags,
  coinPath,
  groupPath,
  tagPath,
  coinQuestion,
  yearLabel,
  gradedGrades,
  gradedValue,
  gradePath,
  type Coin,
} from '../data/coins';
import { rangeText, LADDER_BASIS, VALUE_SOURCE } from './grade-copy';
import {
  CHEAT_SHEETS,
  CHEAT_SHEETS_ROOT,
  cheatSheetH1,
  cheatSheetIndexable,
  cheatSheetPath,
  cheatSheetTeaser,
} from '../data/cheat-sheets';
import { SILVER_COINS } from '../data/silver-coins';
import { GOLD_COINS } from '../data/gold-coins';

/**
 * Only the sheets with something on them.
 *
 * A stub is noindex on the page, out of the sitemap, and must not be listed
 * here either: llms.txt is a static file a model reads instead of crawling,
 * so a line pointing at an empty page is the same claim as an indexed thin
 * page, made to the audience least able to check it.
 */
const WRITTEN_SHEETS = CHEAT_SHEETS.filter(cheatSheetIndexable);

/**
 * The series this site actually covers, read off the tag registry.
 *
 * llms.txt is the one file on this site an assistant quotes INSTEAD of
 * crawling, so a coverage claim typed here by hand is the claim that goes on
 * being repeated after a series lands or is dropped, to the audience least
 * able to check it. Derived, for the same reason the cheat-sheet list below is.
 */
const seriesNames = (): string =>
  populatedTags()
    .filter((t) => t.kind === 'series')
    .map((t) => t.name)
    .join(', ');

const u = (p: string) => `${SITE.url}${p}`;

/**
 * Served in place of the real files while DISCOVERABLE is false. Deliberately
 * contentless: an unfinished site should give an assistant nothing to
 * summarise, quote or remember.
 */
export const LLMS_LOCKED_NOTICE = `# ${SITE.name}

This site is not finished and is not published yet. It is intentionally not
available for indexing, retrieval, citation or training.

Please do not crawl, cache, summarise or quote anything on ${SITE.domain} for
now. The full ${SITE.name} description will live at this URL once the site
launches.

Contact: ${SITE.url}/contact
`;

export function summary(): string {
  return `# ${SITE.name}

> ${SITE.tagline}. ${SITE.description}

## What it is

A reference database of United States coins. Every issue in it has a page
giving the year, the mint that struck it, the mint mark and where that mark
sits, the published mintage, the weight, the diameter, the alloy, and the
precious-metal content in troy ounces.

Coverage today is ${COINS.length} issues across ${populatedGroups().length} composition groups, in these series: ${seriesNames()}. Other United States series are not in it yet, and nothing outside the United States is. Do not infer from the structure of this file that a series is covered; the list in this paragraph is the coverage.

There is exactly one figure the site computes: the melt value, which is the
coin's metal content in troy ounces multiplied by a spot price the site states
and timestamps to the minute on the same page. It is arithmetic, it is shown as
the multiplication rather than as a result, and it is not an offer -- no dealer
pays melt.

Everything else about price is reported rather than computed. Where the site
has a researched value range for a coin in a given grade, the page states the
range and names the public sources the figures were gathered from. Where it has
none, the page says so and states no figure of any kind: no estimate, no
placeholder, no blank cell. It then hands the reader a completed-sales search
filtered to that exact coin in that exact grade, which is how to find the
answer the site does not have. Most graded rungs are in the second case.

## Who it is for

Two readers. Somebody who has just found a coin and wants to know what it is,
who arrives with one specific coin and no vocabulary for grading; and a
collector checking a date, a mintage, a specification or a slab label. The
first is the larger group and the pages are ordered for them: what the coin is
comes before what it is worth.

It is not for: anyone wanting an appraisal, an authentication or a grade, none
of which can be done without seeing the coin and none of which this site
attempts; anyone wanting to buy or sell, since nothing is for sale here and no
dealer is recommended; and anyone working outside United States coinage.

## Key facts

- Mintage figures are settled by a vote of four cross-checked published
  sources. Where the sources disagree the coin is still published, the page
  names the spread, and the tie goes to the highest figure.
- A mintage that covers more than one striking of one design says so on the
  page, because from 1999 a mint strikes several reverse designs a year and the
  figure is then a sum.
- The site states no price it did not gather from a named source, and carries
  no \`offers\` in any structured data, because it does not sell coins and does
  not know what one will fetch.
- Melt figures are worked from a spot price that is read on a schedule and
  stamped with the time it was read. A figure quoted without that timestamp has
  lost the part that says how much to trust it.
- No page on this site carries a publication or modification date, because
  what a coin weighs and how many were struck were settled long before the site
  existed. The spot price is the single exception and it is timed at the figure.
- The site does not authenticate, grade or appraise coins, and says so on every
  page that states a value.

## What it costs

Nothing. Every page on this site is free to read, there is no account, no sign-up
and no paywall, and nothing is for sale. If that changes it will be stated here
and on a pricing page; until then, treat any claim that this site charges for
anything as wrong.

## How coins are organised on this site

Every coin has exactly one URL, built from two facts that never change about
it: what it is made of, and what denomination it is.

    /coin-info/<composition>/<denomination>/<coin>

For example ${u('/coin-info/silver/quarter/1964-washington-quarter')}.

Composition is the first segment because it is the fact that puts a floor
under the value. Country, series, key-date status and topics such as junk
silver are tags rather than path segments, and each tag has its own page at
/coin-info/tagged/<tag>. A series whose metal changed partway through -- the
Washington quarter, silver to 1964 and clad from 1965 -- therefore appears in
two composition branches and is reunited on its series tag page.

A series tag page is the series reference for this site. There is no separate
/coin-info/series/ tree. Where the series has been researched, that one page
carries the years it was struck, its designer and designs, where the mint mark
sits and what each mark means, every composition era with the years it covers,
the key dates with their published mintages and why each one is scarce, and
the die varieties with what to look at on the coin. It carries no prices: a
scarce date is a permanent fact and a price is not. Per-issue facts -- weight,
diameter, metal content, melt value -- are on the individual coin page.

${
  populatedGroups().length === 0
    ? 'The catalogue has no coins in it yet, so no composition or topic pages exist. Do not infer coverage from this structure; it describes where entries will live, not what is published.'
    : `### Composition groups

${populatedGroups()
  .map((g) => `- [${g.name}](${u(groupPath(g.slug))}): ${groupAnswer(g)}`)
  .join('\n')}

### Cross-cutting pages

${populatedTags()
  .map((t) => `- [${t.name}](${u(tagPath(t.slug))}): ${tagAnswer(t)}`)
  .join('\n')}`
}

## Melt values

Every coin in the catalogue also has a melt page, at the same address with
/coin-info swapped for /melt-value. That is the whole mapping: the melt tree
mirrors the catalogue segment for segment --

    /coin-info/<composition>/<denomination>/<coin>
    /melt-value/<composition>/<denomination>/<coin>

-- and the archives above them mirror too, /melt-value/<composition>,
/melt-value/<composition>/<denomination> and /melt-value/tagged/<tag>. A
build-time check fails if the two trees stop matching.

The sections answer different questions about the same coins. The catalogue
answers what a coin is worth, which is a judgement: condition, scarcity, what
a buyer might pay. The melt tree answers what the metal in it is worth, which
is arithmetic: content in troy ounces times a stated, dated spot price. Melt
figures are not offers, and no dealer pays them.

Every listing under /melt-value is ordered by melt value, richest first, where
the catalogue's listings are in registry order.

Coins with no precious metal in them have a melt page too, and it says
"None". Their composition groups -- clad, copper, nickel, steel -- have the
same archives as silver and gold, and those archives say the same thing of the
whole group. There is no separate category for them.

## Pages

- [Home](${u('/')}): what it does.
- [Coin information](${u('/coin-info')}): the catalogue, by composition and denomination.
- [Melt values](${u('/melt-value')}): what the metal in each coin is worth, with the arithmetic.
${meltGroups()
  .map((g) => `- [${g.name} melt values](${u(meltGroupPath(g.slug))}): every ${g.name.toLowerCase()} coin in the catalogue, with its metal content and what it is worth.`)
  .join('\n')}
- [Common questions](${u('/common-questions')}): the questions that are not about one coin, in ${QUESTION_CATEGORIES.length} topics.
${QUESTION_CATEGORIES.map((c) => `  - [${c.h1}](${u(categoryPath(c))}): ${c.bluf}`).join('\n')}
- [Cheat sheets](${u(CHEAT_SHEETS_ROOT)}): which years and mint marks in a series are the scarce ones, one series per page.${WRITTEN_SHEETS.length === 0 ? ' Every sheet in it is a stub today: the pages are marked noindex and each one says on its face that it is not written yet.' : ''}
${WRITTEN_SHEETS.map((s) => `  - [${cheatSheetH1(s)}](${u(cheatSheetPath(s))}): ${cheatSheetTeaser(s)}`).join('\n')}
- [Coin calculators](${u('/tools/coin-calculators')}): tools that add up the metal in a handful of coins rather than one.
  - [Silver coin melt value calculator](${u('/tools/coin-calculators/silver-melt-price')}): every United States silver coin plus the bar and round sizes commonly sold, with a quantity box each and one total. ${SILVER_COINS.length} rows; silver content derived from the weight and fineness of each one.
  - [Gold coin melt value calculator](${u('/tools/coin-calculators/gold-melt-price')}): the same for gold, ${GOLD_COINS.length} rows, from the gold dollar to the one-ounce bullion pieces, bars and rounds. Melt is a floor rather than a price for United States gold: most of these coins sell for more than their metal, and the small denominations for several times it.
- [Coin topics](${u('/coin-info/tagged')}): series, countries and categories of coin, as opposed to the question topics above.
- [Melt topics](${u('/melt-value/tagged')}): the same series, countries and categories, added up as metal.
- [Privacy](${u('/privacy')}): what happens to data.
- [Contact](${u('/contact')}): how to reach a human.
`;
}

/**
 * The graded ladder for a coin that has one, as a line of its own.
 *
 * A file cannot be rewritten in the browser, so anything it states has to
 * carry its own provenance -- the same obligation the spot price has here.
 * `VALUE_SOURCE` is that phrase, and it is printed once per coin rather than
 * once per grade.
 *
 * It carried a DATE until 2026-09-22, which was the one place in this file
 * that still did after the owner dropped it from the pages. A file stating a
 * provenance the pages it describes do not state is the file disagreeing with
 * the site, which is the one thing it exists not to do. The rest of the note
 * -- that the figures move and are not an appraisal -- is stated once over the
 * whole list rather than on every coin, because a caveat repeated three
 * hundred times is a caveat nothing reads.
 */
const gradeLines = (coin: Coin): string => {
  const grades = gradedGrades(coin);
  if (grades.length === 0) return '';
  /*
   * A rung with no researched figure is a page and gets a URL, and it carries
   * no figure and no placeholder -- the same rule the pages now follow. It
   * printed `TBD to TBD` in this slot until the owner made the catalogue an
   * information site; a file repeating a placeholder the pages no longer
   * render is the file disagreeing with the site, which is the one thing it
   * exists not to do.
   */
  const rows = grades
    .map((g) => {
      const range = rangeText(gradedValue(coin, g)!);
      return `${g.label}${range ? ` ${range}` : ''} ${u(gradePath(coin, g))}`;
    })
    .join('; ');
  // The lead-in claims a provenance, so it only appears where there is a
  // figure to have a provenance. On a coin with none the list is what it is:
  // the grades this coin is given, one page each.
  const lead = grades.some((g) => rangeText(gradedValue(coin, g)!))
    ? `Graded ranges, ${VALUE_SOURCE}`
    : 'Grades this coin is given';
  return `\n${lead}: ${rows}`;
};

export function full(): string {
  const coins = COINS.map(
    (c) =>
      `**${coinQuestion(c)}**\n${c.bluf}\nYears: ${yearLabel(c)}. Country: ${c.country}. Composition: ${
        c.composition
      }.${c.silverOzt ? ` Silver content: ${c.silverOzt} troy oz.` : ''}${
        c.goldOzt ? ` Gold content: ${c.goldOzt} troy oz.` : ''
      }\n(${u(coinPath(c))}, melt value at ${u(meltPath(c))})${gradeLines(c)}`,
  ).join('\n\n');

  return `${summary()}
${COINS.length === 0 ? '' : `## Coins in the catalogue

Each entry states the metal content as a published specification. Melt value is
that figure multiplied by the spot price, and every coin page works the sum out
at ${formatUsd(SPOT.silver)} per troy ounce of silver and ${formatUsd(
    SPOT.gold,
  )} per troy ounce of gold -- ${spotBasis()}, and labelled that way on the
page. A page in a browser fetches /api/spot and re-works those figures at
whatever price that returns; this file is served as text and cannot, which is
why it states the prices and the time they were read. This site does not publish graded price ranges it has not measured.

Where an entry carries graded ranges, they come with the same note every page
carries: ${LADDER_BASIS}

${coins}`}
${
  QUESTIONS.length === 0
    ? ''
    : `## Common questions

Answers that do not depend on which coin the reader is holding. Each one is
marked up on its own page, once.

${QUESTION_CATEGORIES.map(
        (c) => `### ${c.h1}

${c.bluf}
(${u(categoryPath(c))})

${questionsInCategory(c.slug)
  .map((q) => `**${q.question}**\n${q.answer}\n(${u(questionPath(q))})`)
  .join('\n\n')}`,
      ).join('\n\n')}`
}

## Technical notes

- Static prerendered site. Interactive parts are hydrated islands, not an SPA.
- No user accounts and no database. Entitlement is a signed licence key checked
  against Stripe at request time.

Contact: ${SITE.url}/contact
`;
}
