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

| Page | Primary phrase | Who types it | Secondary phrases |
|---|---|---|---|
| `/` | | | |
| `/pricing` | | | |
| `/answers/<slug>` | | | |

## Rules

- **Headings read like the question**, not like a category. People search in
  sentences; a page whose H2s are the questions is a page a model can quote.
- **The answer comes first.** BLUF, in the first sentence, before any context.
- **No stuffing.** If the phrase does not fit the sentence, the sentence wins.
- **Numbers in prose, not only in tables.** A model quoting a chart loses the
  chart; a model quoting a sentence keeps the number.
- **Cluster deliberately.** Every long-tail page links up to its hub and across
  to a sibling. Orphan pages do not rank and do not get read.

## Where the keywords end up in code

- `SITE.description` — the site-wide default meta description.
- `webApplicationSchema({ keywords })` — must be backed by `featureList`.
  Answer engines cross-check the two, and a keyword the feature list cannot
  support is spam.
- `src/data/answers.ts` — `primaryKeyword`, one per generated page.
