# Adding a coin

The procedure, in order. `COIN-ARTICLE-GUIDE.md` is the other half — how to
*write* each field once you know which fields you need.

Run `npm run dev` and open **`/dev/add-a-coin`** while you work: it renders this
procedure alongside the live state of the taxonomy, so the lists of groups,
denominations and tags you are choosing from are the real ones rather than a
copy of them that has gone stale. `/dev/coins` then shows what the finished
entry created and what it is still missing.

---

## The whole routine, in order

0. Decide whether it is a page at all, or a year inside one.
1. Pick the group and the denomination — they become the URL and are final.
2. Register any missing group, denomination or tag in `coin-taxonomy.ts`.
3. **Fact-check the mints, the mintages and the metal**, from two sources.
4. Write the `Coin` in `coin-catalog.ts`.
5. Know which URLs you just created, and which FAQ questions you claimed.
6. Change nothing else — everything else is derived.
7. Run `npm run check`, `npm test`, `npm run test:build`.
8. Look at the pages in `npm run dev`.
9. Optionally, give it a priced ladder — a page per grade. That is its own
   procedure and it is three commands:

   ```bash
   npm run grades:sheet <coin-slug>   # a sheet with every registered rung in it
   # fill it from the auction archives, and say in the header what you left out
   npm run grades                     # validates, then writes the generated file
   ```

   Both files are committed. A rung with fewer than two published figures
   behind it gets no row and therefore no page, which is the gate rather than a
   gap: see the header of `data/grades/1932-d-washington-quarter.tsv` for a
   worked example, and the grade-page rules in `CLAUDE.md`.

---

## 0. Decide whether it is a page at all

One `Coin` is one page, and it may be a single issue (`1964 Washington
Quarter`) or a whole run of identical years (`Mercury Dime (1916–1945)`).

The test is the house rule: **name the person who types the phrase.** If
nobody searches the year because the year does not change the answer, the run
is one page. Expanding a thirty-year series into thirty pages that say the same
thing is the failure a generated catalogue is one careless loop away from, and
it drags down the pages that deserve to rank.

A mint mark splits a date into two pages only when it passes the same test
three times over: the mintages differ by enough to be worth stating, the
identification step genuinely differs, and both phrases are typed. The 1960 to
1964 Washington quarters are the worked precedent -- the header of
`coin-catalog.ts` says what the merged pages got wrong and why the split fixes
it. A mint mark that changes none of those is a row in the spec table, not a
URL. Do not fan a series out by its mints on the strength of the precedent
alone.

## 1. Pick the two axes — these become the URL and can never change

```
/coin-info/<group>/<type>/<coin>
```

- **`group` is the composition of *this issue*.** Not of its series. A 1964
  quarter is silver and a 1965 quarter is clad, and they live in different
  branches. That looks like a bug and is the design.
- **`type` is the denomination or format.** quarter, dime, cent, dollar,
  half-crown, bullion.
- **`slug` is final.** Not changed to fix a typo, not changed to improve a
  keyword. There are no redirects in a static build.

Both must already exist in `src/data/coin-taxonomy.ts`. If the group or
denomination you need is not there, that is step 2 — and it is a writing job,
not a config job.

## 2. If the group, denomination or tag does not exist yet

Add it to `src/data/coin-taxonomy.ts` with its `slug`, its `name` and its
`kind` or `meltDriven`. **That is the whole entry.**
`src/lib/catalog-copy.ts` generates the H1, the `<title>`, the meta
description, the FAQ question, the opening answer, the section headings and the
body copy from the facts the catalogue already holds — what years the coins
span, what they are made of, which denominations they reach. Not how many
there are: the generated copy never counts the catalogue, because a count is a
fact about this website rather than about the coin in the reader's hand.

Write a copy field only where the generated one is genuinely worse for that
subject. It then wins for that field alone and the rest of the page stays
generated. Writing one that matches the generator **fails the build**: retyped
copy is a second place for the same sentence to drift from.

Prose goes in `notes`, which is **appended** to the generated paragraphs rather
than replacing them — the page keeps its count, its year span and its
denominations, and gains the fact you have that the formula cannot derive. Cut
any sentence in a note that the generated body already says. (`intro` does
replace the generated paragraphs; it is there for the rare page that needs to,
and it throws away everything above.)

    // enough for a page
    { slug: 'canada', name: 'Canada', kind: 'country' }

The scale is the reason. Nine groups could be hand-written; hundreds of tags
cannot be, and a section where half the pages were written by hand and half
were left as a heading over a list is worse than one where every page says the
same well-chosen things about its own coins. Read the header of
`src/lib/catalog-copy.ts` before changing any of it.

An entry with no coins in it is registered and **not built**: it becomes a URL
the day a coin references it. That is deliberate.

Series tags carry `SeriesInfo` — years, mints, mint-mark location,
compositions, key dates, varieties, mint errors. Without it the coin page's
series block renders nothing at all, which is correct but poorer.

The last three are the **cheat sheet** at the top of the series page, and they
are the part to be careful with: every row is a claim about a coin somebody is
holding. Sort them by how the reader settles it — a key date is read off
the date and the mint mark, a variety is looked at under a loupe and judged, an
error is weighed or held to a magnet — and check each row against the
mint's own figures or a grading service's census before it is printed.
`COIN-ARTICLE-GUIDE.md` has the rules for each list. Varieties and errors are
listed and never linked; neither gets a page of its own.

## 3. Fact-check the mints, the mintages and the metal

Do this before writing a sentence, because every sentence depends on it. Three
facts decide the page, all three are published, and all three are checkable:
**who struck it**, **how many**, and **what it is made of**. Take each from two
independent sources that agree, and record those sources in a comment above the
entry — the next person to touch the number should not have to re-find it.

- **A mint that struck nothing that year is a fact, not a gap.** `struckAt` is
  the mints that struck *this issue*, never the series list: San Francisco
  struck no quarter at all between 1955 and 1967, so a reader hunting an S on a
  1962 quarter is looking for something that cannot be there. Say it in
  `identify`. A missing mark the page does not explain sends somebody to a
  dealer with a common coin and a theory.
- **`mintage` is the circulation strike.** Proofs are a separate figure struck
  for collectors, and folding them in produces a number that reconciles with no
  published source. Where the figure is a two-mint total, say so, and the
  arithmetic must come out.
- **Prefer the mint's own annual figures.** A price-guide site restating them
  is a second source, not a first one, and two sites copying one another is one
  source.
- **A figure nobody can source does not go on the page.** Leave `mintage` off.
  An absent row reads as "not stated"; a wrong one reads as a fact, and it is
  the kind of wrong a reader checks.

## 4. Write the entry in `src/data/coin-catalog.ts`

Append a `Coin`. `COIN-ARTICLE-GUIDE.md` covers the editorial rules; the
mechanical ones:

- `tags` must include the **series tag** — that is what reunites a series
  split across two composition branches.
- `silverOzt` / `goldOzt` / `platinumOzt` is the **actual metal weight**, not
  the gross weight. Every melt figure on the site is this number times a spot
  price. Leave all three off for a base-metal coin: the melt page then says so,
  which is a real answer to a real search.
- `identify` is both the visible checklist and the HowTo schema. An entry with
  none renders a heading over nothing.
- `values` stays empty unless a source can be named on the page. The moment it
  is filled, `valueAsOf` and `sources` are required and the build enforces it.
- No dates on the entry. There is no `published` and no `updated` field:
  nothing about a coin changes with the calendar, so no page here carries a
  `dateModified` and the sitemap carries no `lastmod`. `valueAsOf` is the
  exception and dates the priced rows, which are a measurement.

## 5. Know what you just created

The two sections mirror each other, so every URL below comes in a pair: the
same address under `/coin-info` and under `/melt-value`, one asking what the
coin is worth and one asking what the metal in it is worth.

| URL (and its `/melt-value` twin) | When it is new |
|---|---|
| `/<group>/<type>/<coin>` | always — including base-metal coins, whose melt page says "None" |
| `/<group>` | if it is the first coin in that composition |
| `/<group>/<type>` | if it is the first at that composition and denomination |
| `/tagged/<tag>` | one per tag, if it is the first coin carrying it |

and it re-dates four hubs it does not create: `/coin-info`,
`/coin-info/tagged`, `/melt-value` and `/melt-value/tagged`.

`/dev/coins` shows this per coin, with the load-bearing URLs marked: an
archive with one coin on it is that coin's page in everything but name, and
removing the coin 404s the URL.

It also claims **two FAQ questions** — "How much is a `<coin>` worth?" on the
catalogue page and "What is the melt value of a `<coin>`?" on the melt page —
and any archive it creates claims two more, one per twin.
`src/data/faq-registry.ts` throws if any of them collides with a question
another page already owns, which is the check that keeps the mirrored sections
from competing with each other.

## 6. Nothing else needs editing

No route file, no sitemap entry, no navigation link, no date to bump.
Every one of those is derived. If adding a coin seems to need a hand edit
somewhere, that is a bug in the derivation — fix it there rather than in the
entry.

The exceptions, all of which are *content* decisions rather than plumbing:

- a new **group, denomination or tag** (step 2);
- a new **metal**, which is a price in `src/lib/spot.ts`, a weight field on
  the schema and a ladder step in `src/lib/melt.ts`;
- a **common question** the coin raises that is not about one coin, which goes
  in `src/data/questions.ts`, written by hand.

## 7. Run the gates

```bash
npm run check        # types, 0 errors
npm test             # arithmetic, registries, server logic
npm run test:build   # builds, then reads dist/ and checks the HTML
```

Three of these fail loudly rather than warning, and each one catches something
that is silent in the output:

- `validateTaxonomy()` — unknown group, unregistered tag, duplicate slug,
  reserved segment, two pages claiming one FAQ question;
- `validateMeltPaths()` — a melt path that is no longer its catalogue path
  with the root swapped, or a group, type or tag slug colliding with a
  reserved segment;
- `validateQuestions()` — a published question slug with no answer behind it;
- `validateCatalogCopy()` — two archive pages sharing a `<title>`, a meta
  description, an FAQ question or a paragraph; a title or description outside
  the length a search result has room for; a generated sentence with a hole in
  it or a price in it; and a hand-written field the generator already
  produces.

Do not relax one to get a build through.

## 8. Look at it

`npm run dev`, then:

- the coin page, the melt page, and each archive it just created — both
  halves of each pair, and the link between them in each direction;
- `/dev/pages` — check every page’s title, description, H1 and JSON-LD in one
  pass, and let it flag the ones with no canonical, two H1s or no schema;
- `/dev/coins` — the field table for the new entry, to see what the format
  expects that you have not supplied.

None of the `/dev` URLs are built. `astro dev` serves them; `npm run build`
emits nothing under `/dev`, and `tests/build-smoke.test.mjs` fails if one ever
appears in `dist/`.
