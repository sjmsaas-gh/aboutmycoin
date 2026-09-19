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
import { TIERS, PRO_MONTHLY, PRO_YEARLY, GATE_EXPLAINER, ONE_TIME_OFFER } from './pricing';
import { ANSWERS } from '../data/answers';
import {
  COINS,
  populatedGroups,
  populatedTags,
  coinsInGroup,
  coinPath,
  groupPath,
  tagPath,
  coinQuestion,
  yearLabel,
} from '../data/coins';

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

## Pricing

${GATE_EXPLAINER}

${TIERS.map(
  (t) =>
    `### ${t.name} — ${t.priceLabel}${t.period ? `/${t.period}` : ''}\n${t.tagline}\n${t.features
      .map((f) => `- ${f}`)
      .join('\n')}${t.caveats.length ? `\n${t.caveats.map((c) => `- NOTE: ${c}`).join('\n')}` : ''}`,
).join('\n\n')}

### ${ONE_TIME_OFFER.name} — ${ONE_TIME_OFFER.priceLabel} once
${ONE_TIME_OFFER.tagline}
${ONE_TIME_OFFER.includes.map((f) => `- ${f}`).join('\n')}
- NOTE: ${ONE_TIME_OFFER.limit}

Pro is $${PRO_MONTHLY}/month or $${PRO_YEARLY}/year.

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

### Composition groups

${populatedGroups()
  .map((g) => `- [${g.name}](${u(groupPath(g.slug))}): ${g.bluf} (${coinsInGroup(g.slug).length} in catalogue)`)
  .join('\n')}

### Cross-cutting pages

${populatedTags()
  .map((t) => `- [${t.name}](${u(tagPath(t.slug))}): ${t.bluf}`)
  .join('\n')}

## Pages

- [Home](${u('/')}): what it does.
- [Coin values](${u('/coin-value')}): the catalogue, by composition and denomination.
- [Topics](${u('/coin-value/tagged')}): series, countries and categories.
- [Pricing](${u('/pricing')}): the gate, explained.
- [Answers](${u('/answers')}): direct answers to specific questions.
- [FAQ](${u('/faq')}): troubleshooting, grouped by stage.
- [About](${u('/about')}): who makes this and why.
- [Privacy](${u('/privacy')}): what happens to data.
- [Contact](${u('/contact')}): how to reach a human.
`;
}

export function full(): string {
  const answers = ANSWERS.map(
    (a) => `**${a.question}**\n${a.answer}\n(${u(`/answers/${a.slug}`)})`,
  ).join('\n\n');

  const coins = COINS.map(
    (c) =>
      `**${coinQuestion(c)}**\n${c.bluf}\nYears: ${yearLabel(c)}. Country: ${c.country}. Composition: ${
        c.composition
      }.${c.silverOzt ? ` Silver content: ${c.silverOzt} troy oz.` : ''}${
        c.goldOzt ? ` Gold content: ${c.goldOzt} troy oz.` : ''
      }\n(${u(coinPath(c))})`,
  ).join('\n\n');

  return `${summary()}
## Coins in the catalogue

Each entry states the metal content as a published specification. Melt value is
that figure multiplied by the current spot price; this site does not publish
spot prices or graded price ranges, and says so on every coin page rather than
printing a number it has not measured.

${coins}

## Common questions and direct answers

${answers}

## Technical notes

- Static prerendered site. Interactive parts are hydrated islands, not an SPA.
- No user accounts and no database. Entitlement is a signed licence key checked
  against Stripe at request time.

Contact: ${SITE.url}/contact
`;
}
