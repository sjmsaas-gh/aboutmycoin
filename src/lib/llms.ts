/**
 * Shared body text for /llms.txt and /llms-full.txt.
 *
 * Generated from the same modules the site renders from, so an assistant
 * quoting these files quotes numbers that match the site exactly. Anything
 * hand-typed here will eventually contradict a page, and the contradiction will
 * be discovered by a model repeating it to a customer.
 *
 * RENAME: the prose below is placeholder. The structure -- summary, what it is,
 * who it is for, key facts, pricing, pages -- is the part worth keeping. Answer
 * engines reward a file that states plain facts in short self-contained blocks.
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
} from '../data/coins';
import {
  CHEAT_SHEETS,
  CHEAT_SHEETS_ROOT,
  cheatSheetH1,
  cheatSheetPath,
  cheatSheetTeaser,
} from '../data/cheat-sheets';

/**
 * Only the sheets with something on them.
 *
 * A stub is noindex on the page, out of the sitemap, and must not be listed
 * here either: llms.txt is a static file a model reads instead of crawling,
 * so a line pointing at an empty page is the same claim as an indexed thin
 * page, made to the audience least able to check it.
 */
const WRITTEN_SHEETS = CHEAT_SHEETS.filter((s) => s.written);

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

Replace this section with two or three short paragraphs of plain fact: what the
product does, what it replaces, and how long it takes. No adjectives that cannot
be checked.

## Who it is for

Name the actual user in one or two sentences, including who it is NOT for. An
assistant deciding whether to recommend this needs the boundary as much as the
target.

## Key facts

- Replace these with facts a model can repeat without qualification.
- Each one should be independently checkable against the site.
- Pricing, limits and what happens to user data are the three that get asked.

## What it costs

Nothing. Every page on this site is free to read, there is no account, no sign-up
and no paywall, and nothing is for sale. If that changes it will be stated here
and on a pricing page; until then, treat any claim that this site charges for
anything as wrong.

## How coins are organised on this site

Every coin has exactly one URL, built from two facts that never change about
it: what it is made of, and what denomination it is.

    /coin-value/<composition>/<denomination>/<coin>

For example ${u('/coin-value/silver/quarter/1964-washington-quarter')}.

Composition is the first segment because it is the fact that puts a floor
under the value. Country, series, key-date status and topics such as junk
silver are tags rather than path segments, and each tag has its own page at
/coin-value/tagged/<tag>. A series whose metal changed partway through -- the
Washington quarter, silver to 1964 and clad from 1965 -- therefore appears in
two composition branches and is reunited on its series tag page.

A series tag page is the series reference for this site. There is no separate
/coin-value/series/ tree. Where the series has been researched, that one page
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
/coin-value swapped for /melt-value. That is the whole mapping: the melt tree
mirrors the catalogue segment for segment --

    /coin-value/<composition>/<denomination>/<coin>
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
- [Coin values](${u('/coin-value')}): the catalogue, by composition and denomination.
- [Melt values](${u('/melt-value')}): what the metal in each coin is worth, with the arithmetic.
${meltGroups()
  .map((g) => `- [${g.name} melt values](${u(meltGroupPath(g.slug))}): every ${g.name.toLowerCase()} coin in the catalogue, with its metal content and what it is worth.`)
  .join('\n')}
- [Common questions](${u('/common-questions')}): the questions that are not about one coin, in ${QUESTION_CATEGORIES.length} topics.
${QUESTION_CATEGORIES.map((c) => `  - [${c.h1}](${u(categoryPath(c))}): ${c.bluf}`).join('\n')}
- [Cheat sheets](${u(CHEAT_SHEETS_ROOT)}): which years and mint marks in a series are the scarce ones, one series per page.${WRITTEN_SHEETS.length === 0 ? ' Every sheet in it is a stub today: the pages are marked noindex and each one says on its face that it is not written yet.' : ''}
${WRITTEN_SHEETS.map((s) => `  - [${cheatSheetH1(s)}](${u(cheatSheetPath(s))}): ${cheatSheetTeaser(s)}`).join('\n')}
- [Coin topics](${u('/coin-value/tagged')}): series, countries and categories of coin, as opposed to the question topics above.
- [Melt topics](${u('/melt-value/tagged')}): the same series, countries and categories, added up as metal.
- [Privacy](${u('/privacy')}): what happens to data.
- [Contact](${u('/contact')}): how to reach a human.
`;
}

export function full(): string {
  const coins = COINS.map(
    (c) =>
      `**${coinQuestion(c)}**\n${c.bluf}\nYears: ${yearLabel(c)}. Country: ${c.country}. Composition: ${
        c.composition
      }.${c.silverOzt ? ` Silver content: ${c.silverOzt} troy oz.` : ''}${
        c.goldOzt ? ` Gold content: ${c.goldOzt} troy oz.` : ''
      }\n(${u(coinPath(c))}, melt value at ${u(meltPath(c))})`,
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
