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
| `/melt-value` | coin melt value | Someone with a jar who knows the word "melt". Sent on to whatever their coins are made of. | melt value calculator, what is melt value |
| `/melt-value/<group>` | silver coin melt value | Someone who knows their coins are silver and wants the whole branch in one place. Its clad twin answers "which coins have no silver". | gold coin melt value, how much silver is in a coin, silver content of coins, coins with no melt value |
| `/melt-value/<group>/<type>` | silver quarter melt value | Knows the metal and the denomination and wants the figure for that pair. The level the flat namespace had no page for. | how much silver is in a quarter, silver dime melt value |
| `/melt-value/tagged` | *(none yet)* | A browser rather than a searcher. Low volume, high internal-linking value. | |
| `/melt-value/tagged/<tag>` | junk silver melt value | Knows the jargon and wants what a set adds up to as metal. | what is a bag of junk silver worth, 90% silver melt value |
| `/common-questions` | coin questions | A browser rather than a searcher. Low volume, high internal-linking value. | common coin questions |
| `/common-questions/topic/<slug>` | four topics, hand-written | Somebody browsing a subject rather than asking one question: "coin grading and condition", "selling coins". Its real job is internal linking — it is what puts every question about one subject one click from the others. | what a coin is worth, silver gold and spot prices |
| `/common-questions/<slug>` | one question each | See `src/data/questions.ts`. Written one at a time, never generated. | |

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
| Series (key dates) | `<series> key dates` | morgan dollar key dates | Reading a list, not holding a coin. Owned by the series tag page, never by a coin page. |
| Series (varieties) | `<series> <variety>` | 1955 doubled die penny | Has a specific suspicion about a specific coin. High intent, and the one phrase where the honest answer is usually "no". |
| Series (mint marks) | `<series> mint mark` | where is the mint mark on a morgan dollar | Cannot find the letter. Answered in one sentence on the series page, above the table that needs it. |
| Tag (country) | `<country> coin values` | canadian coin values | Foreign coin, no idea where to start. |
| Tag (topic) | the phrase the trade uses | junk silver value | Knows the jargon. Smaller, but converts. |
| Melt (coin) | `<coin> melt value` | 1964 quarter melt value | Has several of one coin and wants the metal figure, not the coin's story. Generated for every catalogue entry from `src/lib/melt.ts`, at the coin's own address with `/coin-value` swapped for `/melt-value`. |
| Melt (archive) | `<group> <type> melt value` | silver quarter melt value | The melt tree mirrors the catalogue, so every archive has a twin asking the metal question instead of the price question. |

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
   as a number that would need a live spot price to be true. This is the phrase
   the melt tree exists for: at every level, the coin page answers "what is it
   worth" and its twin under `/melt-value` answers "how much metal is in it",
   and neither page carries the other's question in its FAQ markup.

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
