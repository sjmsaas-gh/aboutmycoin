# Keyword map

One page per intent. Fill this in before writing the pages, not after — it is
the difference between a site with a plan and a pile of articles.

## How to fill this in

For each row, you must be able to name **who types this and what they want**. If
you cannot, delete the row. A page that exists to hold a keyword is the thing
search engines have spent twenty years learning to discount, and it drags the
pages that deserve to rank down with it.

One primary phrase per page. Not three, not "and related variants" — one. The
secondary column is for the phrasings that belong in H2s and body copy on that
same page, never for a second page.

## The map

### Fixed pages

| Page | Primary phrase | Who types it | Secondary phrases |
|---|---|---|---|
| `/` | coin value | Someone holding one coin with no vocabulary for it. Wants a number and a reason to believe it. | what is my coin worth, coin identifier, how much is my coin worth |
| `/coin-value` | coin values | Same person, one step in: they know the site can answer and want the index. | coin value chart, coin price guide, coin values by year |
| `/coin-value/tagged` | coin categories | A browser rather than a searcher. Low volume, high internal-linking value. | coin series list, coin types by country |
| `/pricing` | *(none yet)* | Nobody, until SPEC.md decides anything is sold. | |
| `/answers/<slug>` | one question each | See `src/data/answers.ts`. Still the two starter examples. | |

### Catalogue pages

Every phrase below lives in the registry as `primaryKeyword`, not in this
table, and the page is generated from it. This section records the **pattern**
each level follows so a new entry does not have to re-derive it.

| Level | Pattern | Example | Who types it |
|---|---|---|---|
| Group | `<metal> coin values` | silver coin values | Someone who knows they have silver and wants the whole picture. |
| Group/type | `<metal> <denomination> value` | silver quarter value | Narrower and much higher intent — they have identified the metal and the denomination and are one step from a number. |
| Coin (issue) | `<year> <denomination> value` | 1964 quarter value | The largest group by volume on the whole site. One specific coin in hand, read off the date. |
| Coin (series) | `<series> value` | mercury dime value | Slightly more knowledgeable; knows the series name. |
| Tag (series) | varies, hand-written | which washington quarters are silver | The disambiguating question, which is why series tag pages carry a different question from the coin pages under them. |
| Tag (country) | `<country> coin values` | canadian coin values | Foreign coin, no idea where to start. |
| Tag (topic) | the phrase the trade uses | junk silver value | Knows the jargon. Smaller, but converts. |

### The three phrases the whole site is arranged around

Ranked by how much traffic they represent and how badly the existing SERP
serves them:

1. **`<year> <denomination> value`** — the workhorse. Every coin page targets
   one of these, and the answer must be in the first sentence because the
   searcher will not scroll.
2. **`is my <coin> silver`** — the disambiguation query, and the one where
   competing pages are worst. It is answered in the `identify` checklist on
   every coin page and in the BLUF of every clad and silver group page.
3. **`how much silver is in a <coin>`** — the melt query. Answered by the
   `silverOzt` field, stated as arithmetic the reader can complete rather than
   as a number that would need a live spot price to be true.

## Rules

- **Headings read like the question**, not like a category. People search in
  sentences; a page whose H2s are the questions is a page a model can quote.
- **The answer comes first.** BLUF, in the first sentence, before any context.
- **No stuffing.** If the phrase does not fit the sentence, the sentence wins.
- **Numbers in prose, not only in tables.** A model quoting a chart loses the
  chart; a model quoting a sentence keeps the number.
- **Cluster deliberately.** Every long-tail page links up to its hub and across
  to a sibling. Orphan pages do not rank and do not get read.

## Rules specific to the catalogue

- **The date is the query.** For a coin someone found, the year is the only
  thing they can read off it with confidence. Titles lead with it.
- **Answer the negative honestly.** `1965 quarter value` and `is a 1965 quarter
  silver` are large queries whose true answer is "twenty-five cents, and no".
  Pages that hedge on this lose the reader and deserve to; the page that says
  it plainly in the first sentence is the one worth linking to.
- **One question per page, registry-enforced.** Each page's FAQPage question is
  unique across the whole catalogue, checked in `validateTaxonomy()` and again
  in the built HTML by `tests/build-smoke.test.mjs`. Two pages claiming one
  question is the site competing with itself for a rich result it then loses.
- **A generated page still needs a searcher.** The registry makes it trivial to
  emit ten thousand pages. The rule in the house rules did not change: name the
  person who types the phrase, or the entry does not go in.

## Where the keywords end up in code

- `SITE.description` — the site-wide default meta description.
- `webApplicationSchema({ keywords })` — must be backed by `featureList`.
  Answer engines cross-check the two, and a keyword the feature list cannot
  support is spam.
- `src/data/answers.ts` — `primaryKeyword`, one per generated page.
- `src/data/coin-taxonomy.ts` — `primaryKeyword` and `secondaryKeywords` per
  group and per tag; `faqQuestion` is the hand-written question the page owns.
- `src/data/coin-catalog.ts` — `primaryKeyword`, `secondaryKeywords`,
  `seoTitle` and `description` per coin. `bluf` is both the opening sentence
  and the schema answer, so it has to be true read on its own.
