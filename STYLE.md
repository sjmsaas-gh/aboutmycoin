# House style

How every page on this site is written. `COIN-ARTICLE-GUIDE.md` covers the
shape of a coin entry; this covers the sentences, everywhere.

Enforced where it can be: `tests/style.test.mjs` fails the build on the
spellings below appearing in catalogue copy.

---

## The rule

**Short and factual. State the fact, then stop.**

The reader has a coin in their hand and a question. Every sentence either
answers it or is in the way.

> A 1964 Washington quarter is 90% silver and contains 0.1808 troy ounces of
> silver.

That is a complete answer. An earlier draft added "That metal is worth many
times its twenty-five cent face value, even worn smooth" — true, and cut,
because the melt figure directly beneath it says the same thing in dollars. If
a sentence restates a number the page already shows, delete it.

**Do not:**

- **Hedge.** No "roughly", "approximately", "generally speaking", "it depends".
  Where a figure genuinely varies, the page says what it varies with, once, in
  the block that owns it.
- **Sell.** No "stunning", "iconic", "highly sought after", "a piece of
  history". The facts are interesting enough; adjectives spend credibility to
  sell something whose real pitch needed no help.
- **Warm up.** No "Have you ever wondered", no "In this article we will".
  First sentence, first fact.
- **Repeat.** One fact, one place. If it is in a field, it is not also in a
  paragraph.
- **Argue with the reader.** Say what makes a coin worth more, not what does
  not. Somebody whose coin is not on the list has their answer already.

## Never write about the site

The reader came for their coin. A sentence whose subject is this website is a
sentence about somebody else's work, and it is always in the way. Write about
the coin, the metal and the arithmetic; never about the page, the catalogue or
what has been built.

**Do not:**

- **Name the site as the actor.** Not "this site works at", "this site does
  that sum for every coin it lists", "every melt figure on this site states the
  price it used", "the simplest coins on this site to value". The fact is about
  the coin; say it about the coin.

  > This site works at $65.00 a troy ounce, a reference price rather than a
  > live quote, so a coin holding a tenth of a troy ounce of silver has $6.50
  > of metal in it.

  becomes

  > A coin holding a tenth of a troy ounce of silver has $6.50 of metal in it,
  > at $65.00 a troy ounce.

- **Explain the method in a sentence when a clause will do.** The caveat hangs
  off the figure; it is not a paragraph of its own, and it never turns into an
  instruction to the reader.

  > Worked at $66.30 per troy ounce, a price read from a feed on the morning of
  > 20 September 2026 rather than a live quote. Silver moves daily, so check the
  > spot price and redo the multiplication before you buy or sell.

  becomes

  > $66.30/ozt, based on spot prices at 20 September 2026 23:27 UTC.

  "Set by hand", "redo the multiplication", "before you buy or sell": the first
  is how the site is built, the second is the reader doing the site's job, and
  the third is advice nobody asked for.

- **Describe the page the reader is looking at.** "Most metal first" is a
  caption for an order that is visible in the order. A heading, a column and a
  sort are self-evident; saying what they are adds a line and tells the reader
  nothing they cannot see.

- **Add the catalogue up.** "One of each comes to $58.76" is a sum of whatever
  happens to have been written so far. It answers nobody's question, it changes
  every time a coin is added, and it is the counting rule in `CLAUDE.md` wearing
  a dollar sign. No totals, no counts, no "so far".

**The three pages that are about the site** are `/privacy`, `/contact` and
`llms.txt`. Their subject really is this website, so "there are no accounts on
this site" belongs on the privacy page and nowhere else. Every other page is
about a coin.

## Coverage is shown, never announced

Melt values are published for coins with precious metal in them. Everything
else gets what it deserves — history, mintages, key dates, what makes one worth
more than another — and no figure.

That is a working rule, not a sentence. **Never write the boundary down.** Not
"we do not give values for non-precious-metal coins", not "no value is shown
for this coin", not "this site does not cover modern clad issues". A page that
announces what it is not doing has spent its first line on an apology, and the
reader holding a 1974 quarter did not ask what the site's policy is.

What is allowed is the positive half: what this coin is, why collectors look at
it, which dates are the ones to check. Write that, and the absence of a price
never needs mentioning.

## Spelling: English

**British spellings everywhere, with no exceptions.** Colour, grey, catalogue,
recognise, analyse, metre, licence (noun) / license (verb), jewellery, practise
(verb) / practice (noun), travelled, labelled, modelling, defence, off-centre.

Everywhere means everywhere: body copy, headings, meta descriptions, alt text,
error messages, and the keyword fields. An earlier draft carved out two
exceptions and both are gone.

- **Numismatic terms of art are not exempt.** A grading label reads "Off
  Center"; this site writes "off-centre" anyway. Consistency across ten
  thousand pages is worth more than matching a label.
- **Keyword fields are not exempt.** A keyword that only works in American
  spelling is a keyword to rephrase, not a hole to put in the rule. When
  `silver colored penny` hit this rule it became `1943 silver penny`, which is
  a bigger query in any case. If a phrase cannot be rewritten without an
  American spelling, it is the wrong phrase.

**What is not copy, and is therefore untouched:** CSS property names (`color`),
API field names (Stripe's `license`), HTML attributes, and code identifiers.
These are not English, they are interfaces, and respelling them breaks things.

Proper nouns are never changed: the United States Mint, the Denver Mint, the
Coinage Act.

### How it is enforced

Two checks, because the copy lives in two places:

- `tests/style.test.mjs` scans the catalogue registries — every coin, tag,
  group, type and question, keyword fields included. Runs in `npm test`.
- `tests/build-smoke.test.mjs` scans the **visible text of every built page**,
  with `<script>` and `<style>` stripped first. This is the one that catches
  copy written straight into an `.astro` file, which never passes through a
  registry. Runs in `npm run test:build`.

Adding a word to either list is cheap. Do that rather than letting one through.

## Punctuation and numbers

- **Em dashes**, spaced or unspaced, are fine. Avoid more than one per
  paragraph.
- **Serial comma: no**, except where dropping it changes the meaning.
- **Figures for measurements and money**: 6.25 g, 24.3 mm, 0.1808 troy oz,
  $11.75. Words for small counts in prose: "three cases", not "3 cases".
- **Large numbers** carry thousands separators: 1,273,646,000.
- **Dates in copy** are written out: 19 September 2026. Dates in data are ISO:
  `2026-09-19`.
- **Percentages** use the sign: 90% silver.

## Headings

Sentence case, not title case, except where a heading is a proper noun or a
deliberate keyword match. A heading is a question or a label, never a tease:
"Is it worth more than melt?" rather than "The surprising truth about melt".

## What a page may claim

The hard rules live in `CLAUDE.md` and are not negotiable here. In short: never
print a value the site did not measure, never promise a feature that is not
built, never mention refunds, and never state a number without the working or
the source behind it.
