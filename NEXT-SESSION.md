# Where the build stopped

Last updated 2026-09-22.

## The pivot: information first, value second (2026-09-22, that evening)

**The owner's decision, and it reshapes every section below it.** The site was
being built as a price guide with facts attached and it had started to read
like one. Three changes, all shipped and all green:

1. **`/coin-value` is now `/coin-info`.** `COIN_INFO_ROOT` in `coins.ts` is the
   one place the segment is written; `src/pages/coin-value/` was `git mv`d and
   every literal, breadcrumb, nav label and doc reference followed.
   `/melt-value` is unchanged and still mirrors the tree segment for segment.
   This broke "a slug is never changed once published" knowingly -- the
   pre-launch lockdown means nothing is indexed, so the rename cost a `sed`
   today and would have cost the whole catalogue after launch.
2. **`TBD to TBD` is gone, and the string `TBD` no longer appears anywhere in
   the built HTML.** 6,543 of 7,543 grade rungs had no researched figure and
   printed a placeholder in the largest type on the page. Those pages still
   exist -- the owner kept them -- but a rung with no figure now renders no
   range block, no provenance, no "Value" in its `<title>` and no "how much is
   it worth" FAQ question. It asks and answers what the grade MEANS on that
   coin. A value column renders only where the ladder has figures
   (`ladderHasFigures()`), a certified column only where it has a census
   (`ladderHasPopulations()`), and one sentence under the table explains a
   blank cell rather than a mark in every row.
3. **The generated copy is info-led throughout, except the `<title>`s.** Coin
   pages ask "What is a 1980-P Washington quarter?" rather than "How much is
   one worth?", which is what their `bluf` has always actually answered -- that
   was a schema/page mismatch on 450 pages, not a matter of tone. H1s name the
   subject: "Silver Coins", "Silver Quarters", "Morgan Dollar Dates and Mint
   Marks". "Price Guide" and "and What They Are Worth" are gone.
   **The `<title>`s keep "Value"** -- the owner's correction the same evening,
   and it is right: the pages do answer the value question, with a melt figure,
   a graded range where one exists, or a sold-comps search filtered to that
   exact coin and grade where none does. "1980-P Quarter Value: Mintage and
   Specifications", "Silver Coin Values: Dates, Mintages and Melt Value",
   "1878 Dollar VF30 Value" on every grade page, priced or not. The split is
   deliberate: an H1 is read by somebody who has already arrived, a `<title>`
   is competing in a result list.

**Nothing about gathering prices changed.** `npm run prices`, `npm run grades`
and the PCGS ledger are untouched, and a researched figure is printed with its
provenance exactly as before. What changed is what happens where there is no
figure.

The trade-off that was raised and then resolved: dropping "value" from the
`<title>`s would have cost the phrase people actually type. It was dropped for
a few hours and put back the same evening, which is why `issueSeoTitle()` in
`coin-copy.ts` and `gradeSeoTitle()` in `grade-copy.ts` both carry a long
comment about what "Value" may promise and what "Price" may not.

## Done

**The Washington quarter is complete to 2025, on four cross-checked sources
(2026-09-21).** 307 generated coins, up from 133; the site builds 715 pages, up
from 367. Every year from 1999 to 2025 has a P and a D page, and nothing is
withheld.

```
npm run verify -- --all   # crawl sources 3 and 4 -> data/mintage-consensus.json
npm run mintages          # parse 1 and 2, vote   -> data/mintages.json
npm run coins             # + coin-taxonomy.ts    -> coin-generated.ts
npm run report            # ONLY what is still undecided
npm run catalogue         # the four above, plus check and test
```

The procedure is written up in **`ADDING-A-SERIES.md`**, which is the reusable
half: the machinery is series-agnostic and the narrow table shape is the standard
`<X> mintage figures` page, so the Lincoln cent, the Roosevelt dime, the Kennedy
half and the nickel are about ten lines of registry each.

- **A second source is no longer optional, and it earned its keep in both
  directions on the first run.** `scripts/numista.mjs` is a build-time
  credential, cached and committed. A figure two sources disagree about is not
  printed; 352 figures are confirmed by two, 250 stand on the primary alone and
  say so, 6 came from the second alone, 7 were settled by hand. What it caught:
  - **Wikipedia's 2000 South Carolina row repeats the 1999 Delaware figures.**
    PCGS gives 742,576,000 and 566,208,000; the page gives 373,400,000 and
    401,424,000. A 534-million understatement on two pages, and both numbers
    look like mintages.
  - **Numista's 2010 Hot Springs figures are the May 2010 announcement**, not
    the audited total — 30.6M/29.0M against 35.6M/34.0M.
  - **Numista is low by a third** on 2018-D Apostle Islands and 2009 DC.
  - **Three American Women rows are missing a mint cell**, so every figure after
    the gap reads one column to the left. Refused whole and filled from the
    second source.
  - **Numista titles the 2024 issues `25 Cents`** and everything else
    `¼ Dollar`, so a prefix filter dropped a whole year in silence.
  Neither source may be preferred by rule, which is what `ADJUDICATED` is for:
  each entry names a THIRD source and a finish.
- **Two bugs that had already shipped, on 61 pages each.** Every generated
  `<title>` said "90% Silver" — "1980-P Quarter Value: 90% Silver and Price" —
  and `secondaryKeywords` put "1980-P silver quarter" on clad coins. The metal
  is read off the era now.
- **Four design-pairing bugs, each of which invented a reverse design.** Two
  catalogues do not call one design by one name, so they pair loosely, and every
  failure looked like a gap to fill: "River of No Return" against "Frank Church
  River of No Return Wilderness" put SIX designs and twelve million on the
  2019-W page, where the answer is five and ten. Also "US Virgin Islands" vs
  "U.S. Virgin Islands" (seven designs on 2009), "Ozark Riverways" vs "Ozark
  National Scenic Riverways" (six on 2017), and an unanchored subsequence match
  that made "National Park" fit three of 2020's five. All in
  `tests/mintages.test.mjs`, which is 22 cases and is wired into `npm test`.
- **The brief had two facts wrong and both would have shipped at scale.** The
  2022 obverse is the **Laura Gardin Fraser** portrait, not Crawford, and
  Washington faces right on it (confirmed against the Mint's own announcement
  and Numista). And the example total quoted for 1999-P, 1,594,616,000, is
  actually Virginia's single-design mintage from the article's prose.
- **A withheld coin was making its neighbours deny it exists.** The 2012-S page
  said "There is no 2012-D. Denver struck none of these in 2012", because the
  2012-D figure is contested and the checklist read the catalogue. Existence and
  price are two questions now: `data/mintages.json` carries an `attested` list.
- **Finishes are a second axis.** 60 clad proofs, 14 silver proofs, 12
  uncirculated. A coin that was never in a till renders no verdict, no badge and
  no market note — `commonality` is about survival and every proof survived — and
  gets a generated sentence instead. The scarcity thresholds run on the
  per-design figure, which is why 2019-W comes out scarce on two million rather
  than common on ten.
- **The .999 silver proof needed a new era and a new melt row.** 6.343 g at .999
  is 0.2037 troy oz, and it is HEAVIER than the 90% coin it replaced: the
  dimensions did not change and pure silver is denser than the alloy. Verified
  three ways. Exactly one page uses it so far — 2021-S — because the other years'
  silver-proof figures are contested.

### Nothing is outstanding, and here is how that happened

The first pass withheld **33 coins** for want of a tiebreaker. Two more sources
and two rule changes brought that to zero:

- **`npm run verify` crawls a third and fourth source.** silverrecyclers.com has
  one page per design at a derivable URL; usacoinbook.com enumerates ~830 coin
  pages from four programme indexes. 648 and 792 figures respectively, cached in
  `data/mintage-consensus.json`.
- **The merge votes instead of comparing.** 465 figures agreed by every source
  that holds one, 141 taken on a majority, 9 on a revised sales figure, 68 on a
  single source, 78 still evenly split.
- **An even split is published, not withheld.** The page states the highest
  figure and `mintageCaveat` says the sources disagree and gives the spread.
  Highest, because the worst thing this site can do to somebody holding an
  ordinary coin is tell them it is scarce. 24 pages carry that sentence.
- **The one coin with no total (2021-S uncirculated, one of two designs
  unpublished) is published with no mintage** and a sentence saying why.
- **The 22 markless Philadelphia proofs are in**, at
  `1936-proof-washington-quarter`. The slug rule is stated on the MARK -- a proof
  with no mint mark takes the token, a proof with one keeps the bare form -- so
  it is decided by the coin rather than by what else is in the catalogue. The
  1936, at a mintage of 3,837, is one of the scarcest Washington quarters there
  is.
- **`LAST_YEAR` stays 2025**, at the owner's instruction. 2025 is published on
  the figures that exist; where they disagree the caveat sentence says so.
- **1976 is still out** with the rest of the Bicentennial, so the S proof run has
  a one-year hole. No page claims otherwise.
- **2019-W and 2020-W are NOT in `series.keyDates`**, deliberately. They come out
  `scarce` from the per-design figure, which is the right verdict; calling them
  key dates would put them beside the 1932-D.

**The sheets are gone: mintages are fetched and parsed (2026-09-21).** Two
commands, nothing typed in between.

```
npm run mintages   # fetch + parse the source -> data/mintages.json (committed)
npm run coins      # that + coin-taxonomy.ts  -> coin-generated.ts (offline)
```

- **It was not a preference, it was a correctness bug.** The hand-typed sheet
  shipped nineteen pages calling a P-marked quarter "(No Mint Mark)". From
  1980 the Philadelphia quarter carries a P, and the source says so in a
  Comments column a parser reads and an eye skims.
- **And the cross-check I reported had not happened.** Wikipedia's mintage
  column cites washingtonquarters.org. The two "independent sources" that
  agreed on ninety rows were a table and its own footnote.
  `data/mintages.json` now records that its source is single. PCGS is the real
  second opinion, via `--verify` in `fetch-mintages.mjs` once there is a key.
- **The parser derives four things that were hand-decided before**, all of
  which the source encodes: parentheses round a mint mean the coin carries no
  mark; a `^` mintage means that mint's output is inside the figure above, so
  it is the same coin rather than another one; the Comments column separates
  circulation strikes from proofs and Special Mint Sets; and a caption names
  the composition era. 1965-1967 no longer need excluding -- they generate
  correctly, as one markless issue struck at three mints -- and West Point's
  1977-1979 strikes now appear.
- **Series facts moved into `coin-taxonomy.ts`, which is where they belong.**
  `CompositionEra` gained `specs`, `obverse`, `reverse`, `edgeLooks` and
  `tags`; `SeriesInfo` gained `denomination`, `country`, `tags`,
  `markPositions`, `proofOnly` and `mintSetsFrom`. The edge and weight tests
  are now derived by comparing two eras rather than written once per era in
  each direction.
- **Three more bugs the regeneration exposed**, all of which had shipped:
  "There is no 1965-D. Denver struck none of these" (Denver struck eight
  hundred million and marked none of them); "a S on a coin of this date";
  and "any of Philadelphia and West Point".
- **144 coins, 367 pages.** The grades sheet in `data/grades/` is the one
  hand-typed file left. It stays until there is a PCGS key: the fetcher's
  parsing depends on the response shape, the documentation is behind a login I
  am 403'd from, and guessing field names would produce an integration that
  looks written and has never run.

**The clad Washington quarters, and what PCGS's API can and cannot do
(2026-09-21).** 58 more issues, 1968-1974 and 1977-1998, one page per year and
mint. The catalogue is 141 coins and the site builds 361 pages.

- **Three traps in the clad era, each of which would have shipped a false
  sentence at scale.** All three are written up in the head of
  `data/coins/washington-quarter-clad.tsv`:
  - **1965, 1966 and 1967 are excluded.** No mint marks at all -- the Mint
    dropped them nationwide during the coin shortage -- so the generated line
    "a blank space is Philadelphia" is false, and the published figures are
    combined totals rather than per-mint ones. Three issues needing a sentence
    the formula cannot derive are three issues for `coin-seed.ts`.
  - **San Francisco struck every year of this era, as proofs only.** The silver
    sheet's "San Francisco struck none of these" would tell a reader holding a
    1977-S proof that their coin does not exist, on fifty pages. `proofOnly` in
    the sheet header is the sentence it says instead.
  - **1776-1976 is excluded.** A dual date would wreck the year spans the
    archives compute off `years.from`, and it has a different reverse and a
    40% silver version in another group. Hand-write it.
- **Cross-checking was partial and the sheet says so.** 1977-1998 confirmed
  against a second source; 1968-1974 from Wikipedia alone, because the second
  source does not break those years out. A cross-check described as covering
  more than it does is worse than none.
- **Two test failures, both test bugs rather than product bugs, both caused by
  clad becoming populated for the first time.** A stub-detector in
  `tests/catalog-copy.test.mjs` demanded headings over ten characters and
  "Clad coins" is exactly ten. And `tests/spot-dom.test.mjs` picked whichever
  page the walk reached first; the clad melt archive answers "None" and a clad
  coin page states a face value of $0.25, so it began asserting that sentences
  with no spot price in them changed when the spot price did. Both predicates
  now say what they are for.
- **PCGS's public API is the right source for the grades, with two caveats.**
  `GetCoinFactsByGrade` returns the price-guide value, mintage and variety data
  by PCGS number and grade, there is an auction-prices endpoint beside it,
  bearer-token auth off a PCGS account, and reportedly about a thousand queries
  a day free -- a full Washington ladder is roughly 1,300 calls, which is two
  days of batch importing and fine for a build-time job. The caveats:
  **it returns a point, not a range**, so a rung with no recorded sale collapses
  to one figure and still wants a second opinion; and **the redistribution
  terms are unread**, which is the open question SPEC.md and this file already
  flag about grading-service data. Read them when the key is pulled. The
  importer to write is `scripts/fetch-pcgs.mjs`, filling the sheets directly.
- **1982 and 1983 deserve seed entries.** No mint sets were issued in either
  year, so uncirculated examples of four issues carry a premium that nothing on
  their generated pages explains. That is exactly the "one fact true of this
  coin and of no other" the seed exists for.

**The silver Washington quarters, all of them (2026-09-21).** The catalogue
went from eleven coins to eighty-three: every circulation strike from 1932 to
1964, every mint. The site builds 239 pages, up from 95.

- **The mintages were cross-checked and it immediately earned its keep.**
  Wikipedia's mintage table against washingtonquarters.org, all ninety rows,
  agreeing everywhere. 1947-D is 15,388,000; a single source had 15,338,400,
  which is what would have shipped.
- **A house rule reversed, deliberately: coin copy is now generated.** The old
  rule held at eleven coins and breaks at eighty-three, and the failure mode
  is that nothing gets added at all. `src/lib/coin-copy.ts` carries the full
  argument. The split is `coin-seed.ts` (written by a person, keeps its
  `sections`) plus `coin-generated.ts` (written by `npm run coins`), merged in
  date order by `coin-catalog.ts`.
- **Two bugs the existing tests caught on the first run**, both of which would
  have shipped on seventy-two pages at once: a two-sentence BLUF where
  STYLE.md allows one, and `seriesName.toLowerCase()` turning "Washington"
  into "washington". The sheet now states the sentence form of the name
  explicitly, for the same reason `PROPER_SERIES_WORDS` exists.
- **`identify` is generated and still unrendered.** The checklist came off the
  coin template when the HowTo schema did, so the best line the generator
  writes -- "There is no 1938-D. Denver struck none of these in 1938, so a D on
  a coin of this date is not something to go looking for." -- reaches nobody.
  That is a decision to revisit: it is the single most useful sentence on the
  page for a reader turning a coin over looking for a letter, and there are now
  seventy-two pages carrying one.
- **The clad era is not done and is the next scope decision.** 1965 to 1998 is
  another hundred-odd issues where the answer is twenty-five cents every time.
  A run page for the era beats a hundred pages saying one thing; the schema
  already supports a run via `years: {from, to}`.

**Grade spellings, and colour as a second axis (2026-09-21).** Two additions
on top of the ladder work below.

- **Every spelling of a rung is printed on its own page**, from
  `gradeForms()`: XF40, XF-40, EF40, EF-40, and for a designated rung the
  spaced and unspaced slab forms. A reader who learned the British convention
  types EF45 and the page now contains it. One generated sentence, which names
  its coin like every other paragraph in that module.
- **RD, RB and BN are composed over the mint state rungs**, not declared
  beside them: three designations with one clause each, crossed with seven
  mint state grades, is twenty-one rungs out of ten definitions. Mint state
  only and copper only, both enforced. The important consequence is that the
  ladder is now three parallel chains that do NOT compare -- a cent in MS64
  Red beats the same cent in MS65 Brown -- so monotonicity and prev/next both
  run within a chain.
- **It is dark, and that is the thing to fix next.** No copper coin is in the
  catalogue, so not one designated rung renders. The house rule is that a
  generator with no render site is deleted rather than kept warm, and this is
  a deliberate exception with a short fuse: the 1944 Lincoln cent is the coin
  that lights it, and the same coin turns on the dark `lincoln-cent` series
  page listed as item 0 under "Next". If that coin is not added, take the
  designations out again.
- **`lincoln-cent` needs `wear` points before any of it builds.** Only
  `washington-quarter` carries them today, and `gradedGrades()` refuses a
  ladder without them.

**The 1932-D's full ladder, and the pipeline that fills one (2026-09-21).**
Sixteen grade pages, AG3 to MS66, and a three-step process for every coin after
it:

```
npm run grades:sheet <coin-slug>   # scaffold a sheet with every rung in it
# fill it from the archives -- the only slow step, and the only human one
npm run grades                     # validate, then write src/data/graded-values.ts
```

- **The sheet is the source and it is committed.** `data/grades/<coin>.tsv`:
  one line per rung, the sources named in its own header, and a comment saying
  which rungs were left out and why. `src/data/graded-values.ts` is generated
  from it and also committed, exactly as `coin-catalog.ts` is meant to be.
  `Coin.values`, `valueAsOf` and `sources` are gone -- a ladder moves and is
  imported, a coin's weight does not and is not, and the two had different
  lifecycles inside one record.
- **Judgement in the sheet, mechanics in the importer.** Eight checks throw,
  each of which otherwise ships a page that looks finished; the same checks run
  again at build time because the generated file can be hand-edited.
  `tests/grades.test.mjs` breaks a sheet eight ways and asserts every refusal,
  and fails when a sheet and its generated ladder disagree -- which is the
  check that somebody re-ran the import.
- **Eight rungs were refused for want of evidence**: G6, VG10, VF25, VF35,
  XF45, AU53 and AU55 have no published figure on this issue, and MS61 is only
  ever quoted inside an MS61-MS62 band. MS61 came back out of `GRADES`
  altogether, since a rung with a definition and no page is a row in a registry
  doing nothing. AU53 is the instructive one: a single eBay sale at $208 is on
  record, below the AU50 range from two guides, so it is one coin with a
  problem rather than a market.
- **The separation rule is now a research rule rather than a build rule**, at
  the owner's instruction, and CLAUDE.md records the argument that was put
  against it. The evidence rule is what holds the line instead: two figures
  behind a rung or it is not a page.
- **A real collision was found by the validators**: `normaliseQuestion()`
  strips parentheticals, so "in Mint State (MS-60)" and "in Mint State (MS-65)"
  were one string to every uniqueness check on the site, including the FAQ
  registry. H1s and questions now carry the bare code.
- **The figures still want checking by hand before launch.** Same caveat as
  below: the archives refuse automated fetches, so these came from published
  guides and from search-result summaries of PCGS auction pages. The MS65 row
  is the one to look at first -- two 2021 sales at $16,200 and $29,375 sit well
  above the $7,000-$15,000 the guides quote, and the range follows the sales.

**The first grade pages, as a sample to review (2026-09-21).** Four URLs:
`/coin-info/silver/quarter/1932-d-washington-quarter/{g4,f12,xf40,ms63}`.
The 1932-D itself had to go into the catalogue first -- it is the series key,
it was already named as a key date on the series page, and that `keyDate.coin`
link now resolves. The template is the one designed under "Grade pages, and how
the catalogue fans out" below, built in full apart from two blocks that depend
on work not done yet: there is no link to a "how to look a coin value up"
common question, because that question is not written and
`validateQuestions()` throws on a path the build does not produce.

- **The gate is `gradedGrades()` in `coins.ts`, and it is the research, not a
  flag.** A grade earns a URL when the coin has a `GradedValue` row for it and
  the series has `wear` points. `commonality` deliberately gates nothing. That
  is why this route builds four pages rather than thousands, and why adding a
  researched grade to any coin builds its page with no other edit.
- **`GradedValue.grade` is now a slug into `GRADES`, not a label.** It has to
  be: it is a URL segment. `Sale` and `Population` are new beside it, and
  `Coin.pcgsNumber` holds the number a reader needs to find the right row in
  somebody else's guide.
- **The grade definitions are parameterised by the series' wear points**
  (`src/data/grades.ts`), so "Good (G-4)" names Washington's hair above the ear
  rather than the Sheldon scale. Four rungs are registered, which is all four
  that have a page. Adding a rung is one entry.
- **Every sentence comes from `src/lib/grade-copy.ts`**, with its own
  validator: the archive-copy rule that a generated sentence states no price
  cannot apply here, so the rule it satisfies instead is the spot price's --
  date the figure, not the page -- and `valueBasis()` is this section's
  `spotBasis()`.
- **The verdict section is the verdict, the badge and the mintage, and nothing
  else (2026-09-22, the owner's instruction).** There was a `premiumIf` list
  under it rendering as "Worth more than melt only if it is uncirculated with
  full original lustre, certified by PCGS or NGC rather than raw, or a verified
  mint error". The field, its generator, its schema entry and its ten
  hand-written copies were all removed in the same commit, per the rule that a
  generator with no render site is deleted rather than kept warm. It had a
  second problem worth remembering if anybody reaches for it again: the "only
  if" wording was false on every key date -- a 1932-D beats its silver in every
  grade, certified or not -- so the field had to be suppressed there, and a
  field that has to be switched off for the coins people most want to read
  about was answering the wrong question.
- **The figures are the weakest part and are the thing to review.** The
  auction archives (PCGS, Heritage, GreatCollections, Greysheet) all refuse
  automated fetches, so the realized prices came from search-result summaries
  of PCGS Auction Prices pages, and the ranges are bounded by two published
  guides. Every figure is named in `sources` on the coin. They want checking
  against the archives by hand before this is published, and item 3 under
  "Next" -- the real import -- is what replaces them.


**The tools section, and the first calculator (2026-09-21).** The cheat sheets
moved from `/cheat-sheets` to `/tools/cheat-sheets` -- safe only because
nothing is published yet, and `CHEAT_SHEETS_ROOT` was the single place the path
was written. `/tools/coin-calculators` is the hub and
`/tools/coin-calculators/silver-melt-price` is the silver melt price calculator: every United
States silver coin as a row, a quantity box on each -- shipped at none, so the
form opens empty -- and one total over all of them. The Morgan, the Peace and
the 1983–2018 commemorative dollar are three rows holding one figure, at the
owner's instruction: they are the coins people ask for by name. Every other row
is a composition and leads with the names it covers. Four columns: the coin with its
weight, the melt value of one of them, the box, and the line total. The
per-coin column is what a reader checks their coin against and what a reader
with no JavaScript and a crawler read the page for when every box is zero.

- **No arithmetic on the page and no script.** The rows are
  `src/data/silver-coins.ts`, the figures are `meltValue()` and `formatUsd()`,
  and the boxes are wired by `src/lib/spot-dom.ts`, which grew two things: a
  quantity per input id rather than one per page (`data-spot-qty="<id>"`), and
  lot totals, where the rows of a lot are added up into the total's own
  `data-spot-sum` before it renders. That second part is what keeps the total
  inside the build check that re-derives every marked figure from its
  attributes.
- **The rows are compositions, not issues.** "90% silver quarter", not
  "1964 quarter" -- what somebody over a jar actually has. A weight and a
  fineness are stated and the silver content is derived, so no published ASW is
  typed anywhere. `validateSilverCoins()` throws when a United States coin in
  the catalogue states a silver weight no row for its denomination matches,
  which is what stops the two files drifting.
- **Both halves are verified by mutation.** Breaking the per-row wiring and
  breaking the total each fail `tests/spot-dom.test.mjs`; a wrong row weight and
  a wrong row order each fail `tests/melt.test.mjs`.
- **The gold calculator is the same page with a different list.**
  `/tools/coin-calculators/gold-melt-price`, eleven rows: the six classic
  denominations from the gold dollar to the double eagle, the four sizes of
  Gold Eagle and the Buffalo. The block moved into
  `src/components/MeltCalculator.astro` and the row shape, the arithmetic and
  the validator into `src/data/melt-rows.ts` at the same time, so the two lists
  share one check. Nothing in `spot-dom.ts` needed changing: the lot totals were
  already per metal.
- **Both lists carry bars and rounds under the coins.** 1 g, 5 g and 10 g bars
  and a one-ounce private round, in a third band with a source of its own:
  a bar is worth what its maker stamped on it, which the rows and the note under
  each table both say. The band is also what keeps the ordering rule working —
  typed-or-untyped is checked per band now, not per list.
- **Still to do here.** The header's `Coin Tools` link now points at `/tools`,
  which is a 404 on every page of the site until the hub is built. That is at
  the owner's instruction and reverses the "`/tools` has no page" rule in
  CLAUDE.md: the hub is coming. Build it over the sheets and the calculators,
  or drop the link.

**Every mintage cross-checked, seven errors found and fixed (2026-09-21).**
All 234 date rows across all ten sheets, wheat penny included, were compared
row by row against an independent second table (usacoinbook.com) by script,
not by eye. 15 differences and 2 unmatched rows came out; every one was
chased to a conclusion.

- **Four real errors of mine, all the same mistake.** The Jefferson nickel's
  1938, 1950, 1955 and 1958 Philadelphia figures were proof-inclusive.
  Wikipedia's nickel table folds the year's proofs into the P total where its
  dime and quarter tables list them as separate rows, and I did not notice
  the change of convention. Corrected to business strikes: 19,496,000,
  9,796,000, 7,888,000 and 17,088,000.
- **The other 11 differences were the second source's convention, and that
  is now proved rather than asserted.** `tests/` does not cover this, so the
  check was a script: every remaining gap had to equal that year's published
  proof mintage exactly, and all twelve did, to the coin. Anything that had
  not would have been a real error.
- **Three were the second source being wrong**, settled by a third: the
  1930-S and 1919-S Mercury dimes, the 1954-S quarter. The wheat penny's
  1921-S came out the same way — usacoinbook says 15,264,000, PCGS and
  Wikipedia say 15,274,000, and the sheet already had it right.
- **A source I had trusted turned out to be one source wearing four hats.**
  coinmintages.com, morgandollars.net, mercurydime.net and buffalonickel.org
  are all mycoinguides.com, so agreeing with each other proves nothing. It
  disagreed with Wikipedia on the 1913-S Type 2 and 1915-D buffalo nickels
  and the 1880-CC and 1885-CC Morgans, and it was wrong on all four. Do not
  count it twice.
- **The convention is now written down** in the `mintage` field's own
  comment, because it is what the `checked` pass will run into: business
  strikes, never the combined figure, and a source that differs by a small
  round number is quoting proofs. Mixing the two inside one table is the real
  fault, since the rows are ranked against each other.
- **Seven overstated claims went with it**, found by auditing every
  superlative in the file after the figures moved: the 1955 nickel is the
  lowest Philadelphia mintage of its series and the 1950-D the lowest struck
  for circulation, not what the old notes said; 1970-D is not the last 40 per
  cent silver half (the 1976-S bicentennial is); the 1894 Morgan is the
  lowest *Philadelphia* mintage, since the 1893-S is lower and circulated;
  the 1921 peace dollar is not the *only* high-relief year; and San Francisco
  never resumed striking dimes for circulation after 1955, so "until 1968"
  was wrong.

**A `notes` field, and the metal eras moved onto the sheet (2026-09-21).**
Up to three one-line standing facts per sheet, rendered as a `Notes` section
between the opening and Condition, and kept by the print stylesheet.

- **This reverses a house rule, deliberately, and CLAUDE.md now says so.**
  The old rule sent every composition to the series tag page. But "which of
  these are silver" is a *sorting* question: it decides what comes out of the
  jar, before condition and before the date table, and a reader holding a
  half dollar needs the 1964 cut-off in the first ten seconds. Sending them
  to another page for it defeats the sheet.
- **The cap is the rule, because this is the field that would quietly become
  the series page again.** `validateCheatSheets()` throws on a fourth note, a
  line over 170 characters, a price, a line naming the designer or where the
  mint mark sits, and two sheets sharing a line. All five were verified by
  mutation, and a build check confirms the lines really ship.
- **`identify` got its job back.** The silver years had been crammed into it
  on four sheets; they are notes now, and `identify` is once again only how
  you know you are holding one.

**The other nine cheat sheets written (2026-09-20).** All ten are now
`written: true, checked: false`, so all ten still render in full and all ten
are still noindex and out of the sitemap. 202 date rows in total.

- **Where the figures came from.** Mintages were read off compiled tables and
  cross-checked, not recalled: Wikipedia's per-denomination mintage pages
  (cent, nickel, quarter, half dollar, Roosevelt dime, Morgan dollar, Peace
  dollar, America the Beautiful quarter), which themselves cite the Mint's
  figures, the Red Book and Breen; and coinmintages.com for the Mercury dime,
  which has no Wikipedia table. Variety diagnostics — the three-legged
  buffalo's moth-eaten back leg, the 1864-L pointed bust, the 1942/1 "long R",
  the Micro O counterfeit ruling — came from PCGS, NGC, Stack's Bowers and
  CoinWeek. Each sheet's `sources` names what backs it.
- **Next job: `checked`.** Trace each sheet's mintages to the Mint's published
  figures one row at a time and flip `checked: true` per sheet. That single
  edit is what puts a page into the index and the sitemap, so it is the whole
  remaining cost of the section.
- **Three editorial calls worth knowing about**, because they look like gaps:
  - *Modern low mintages are left out of the Jefferson nickel and Roosevelt
    dime sheets.* 2009-P and 2024-D nickels are low for their era and are not
    scarce in absolute terms, and including them while omitting every classic
    issue between 20 and 47 million would have broken the scarcest-first
    promise the table makes.
  - *The Kennedy sheet carries one 2002-P row standing for the whole
    collector-only era*, whose note says so. Every half from 2002 on was
    struck for collectors rather than for circulation, several of them below
    two million, and listing forty near-identical rows would have buried the
    dates a reader can actually find in a jar.
  - *The Morgan sheet lists the 1895 Philadelphia at its proof mintage of
    880.* It is the most famous date in the series and omitting it would be a
    real hole; the note says no circulation strike is known.
- **Two series facts ride in `identify` rather than in a new field:** the
  wartime silver nickels' large mint mark over the dome, and the silver years
  of the Kennedy half, the Roosevelt dime and the Washington quarter. That
  clause is the only place on a sheet where a composition can be stated
  without growing the section the series page owns.
- **`checked` is now the only flag that moves,** so the registry header says
  what it means and warns against flipping the ten in a batch.

**The cheat-sheet template, and the wheat penny written (2026-09-20).**

- **The template:** the name; what the coin is; condition; the dates ranked
  scarcest first with mintages and no prices; common errors; rare errors;
  sources as a footnote. `CheatDate` and `CheatError` are the new types.
- **A sheet is short, and that is a house rule now** (CLAUDE.md, "The cheat
  sheets"). The first draft was an article with tables in it. The opening,
  the condition line and both error headings are generated from five short
  fields, two of them length-capped, because a hand-written opening is where
  the extra paragraph gets in.
- **Casing:** `name` is stored in sentence form ("wheat penny", "Washington
  quarter") and headings apply `titleCase()`. A capital not in
  `PROPER_SERIES_WORDS` fails the build.
- **`checked` is a second flag beside `written`;** a sheet is noindex until
  both are true. `cheatSheetIndexable()` is the one predicate the page, the
  sitemap filter and `llms.txt` read.
- **The wheat penny is `written: true, checked: false`.** 32 dates, 6 common
  errors, 5 rare errors. **Next job on it: trace every mintage to the Mint's
  published figures, then set `checked: true`** -- that one edit puts the
  page into the index and the sitemap.
- **The validator throws on** a written sheet missing sources, a short field
  or dates; a stub carrying content; dates out of mintage order; a duplicate
  label; an error row with no `check` or `caution`; a stray capital; a price.
  Order and caution checks verified by mutation.

**The cheat sheets, as ten stubs (2026-09-20), moved under `/tools`
(2026-09-21).** `/tools/cheat-sheets` and `/tools/cheat-sheets/<slug>`, ten
series in alphabetical order, none of them written. `/tools/coin-calculators`
holds the first calculator (below). `src/data/cheat-sheets.ts` is the registry and
`validateCheatSheets()` runs at its module scope.

- **It overlaps the series tag page, and the division is argued in the
  registry header rather than left to be discovered.** The tag page owns the
  series — run, designer, metal eras, where the mint mark sits; a sheet owns
  the sort — which dates and mint marks to set aside and nothing else. A
  build check fails if a sheet grows a Designer, Obverse, Reverse, Edge or
  "Metal eras" row, because that is the point at which it has become the tag
  page. `seriesTag` links the two where both exist; it is set for the three
  registered series and only renders when that tag archive is really built,
  which today is the Washington quarter alone.
- **A stub is noindex, out of the sitemap and says so on its face.** Three
  things, all driven by one field: `written: false`. The sitemap filter in
  `astro.config.mjs` reads the registry rather than a hand-kept pattern, so
  setting `written: true` reverses all three in one edit. This is the
  concession that lets ten empty URLs exist at all; without it the section is
  ten thin pages. `llms.txt` lists only written sheets for the same reason.
- **The title, the description, the H1 and the teaser are formulas**, fitted
  by `meta.ts` — ten of these becomes forty. The hub's own copy is
  hand-written, the way the question topics are: one page, bounded editorial
  act.
- **The fields for the lists themselves do not exist yet, on purpose.** When
  the first sheet is written, reuse `KeyDate`, `Variety` and `CoinError` from
  `coin-schema.ts` rather than inventing a second vocabulary for the three
  lists the series page already renders.
- Wired through: `Footer` (the header was left alone — its own comment says
  four labels is what a 1024px bar fits, and it already carries an unbuilt
  `/tools` link), `sitePaths()` in `questions.ts` so a question may link
  to a sheet, `llms.ts`, `astro.config.mjs` (priority and the sitemap
  filter), `src/dev/inventory.ts` (a fifth route section, plus a `note` field
  on `RouteEntry` that `/dev/pages` renders as a pill), and four new build
  checks.
- **Not done, deliberately: the series tag page does not link across to its
  sheet.** The link would point from an indexable page to a noindex stub.
  Add it — outside the derived cheat-sheet block, which a build check
  requires to link nothing out — on the day the first sheet is written.

**Every page date was removed, and the copy stopped describing the site
(2026-09-20).** Two changes, one decision behind both: this site answers
questions about objects that do not change, so anything on it about *itself*
is noise on a page somebody arrived at with a coin in their hand.

- **No dates.** No `<lastmod>` in the sitemap, no `dateModified` or
  `datePublished` in any JSON-LD, no `article:*_time`, no "Last updated" line,
  and no `published`/`updated` field on a `Coin`, a `Group`, a `CoinType`, a
  `Tag`, a `Question` or a `QuestionCategory`. `src/lib/page-dates.ts` is
  deleted; `astro.config.mjs` now imports `src/data/faq-registry.ts` directly
  for the side effect that file's collision check depends on. `SPOT_AS_OF`
  stays and is still printed beside every figure worked from it — the spot
  price is the one thing here with a shelf life.
- **No counts, and no captions about the page.** "The catalogue holds five
  coins filed as silver coins", "5 coins · 1960–1964 · quarters", "Each entry
  states the year, the mint mark and the composition", "Every silver coin in
  the catalogue" — all gone, from `catalog-copy.ts`, from `melt.ts` and from
  the templates. Year spans stayed: they are a fact about the coins. Headings
  are now the subject alone ("Silver coins", "Silver quarters").
- Checks: `tests/build-smoke.test.mjs` fails on any date in the built HTML or
  the sitemap, and `tests/catalog-copy.test.mjs` fails on a count or an "in
  the catalogue" in any generated string.

RENAME.md steps 1-3, plus the coin catalogue structure.

**Scaffolding** (unchanged from the previous session): copied from `starter/`,
fresh `git init`, no commit yet. `src/lib/site.ts` identity, `astro.config.mjs`
`SITE_URL`, `package.json` name, `KEY_PREFIX` -> `AMC`, `README.md` and
`CLAUDE.md` headers.

**The catalogue structure** — the URL scheme in SPEC.md, built and passing:

- `src/data/coin-schema.ts` — types only. The contract.
- `src/data/coin-taxonomy.ts` — `GROUPS`, `TYPES`, `TAGS`. Editorial, and
  permanently hand-written even once coins come from a database.
- `src/data/coin-catalog.ts` — `COINS`. One entry: the 1964 Washington
  quarter, added 2026-09-19 and not yet refined. The rest is populated in its
  own steps.
- `src/data/coin-catalog.example.ts` — the nine worked entries that were
  written to prove the structure. Nothing imports it and no page is generated
  from it; it is kept as the only filled-in example of every field. Delete it
  once it has stopped being useful.
- `src/data/coins.ts` — the module routes import. Re-exports the above, adds
  path helpers and filters, and runs `validateTaxonomy()` at build time.
- Routes: `/coin-info`, `/coin-info/<group>`, `/coin-info/<group>/<type>`,
  `/coin-info/<group>/<type>/<coin>`, `/coin-info/tagged`,
  `/coin-info/tagged/<tag>`.
- `src/components/Breadcrumbs.astro` and `CoinTile.astro`.
- `coinProductSchema()` in `src/lib/schema.ts`.
- Catalogue styling at the foot of `src/styles/global.css`.

Wired through: `astro.config.mjs` sitemap priority, `Header.astro`, `Footer.astro`,
`llms.ts`, `KEYWORDS.md`, and four new checks in `tests/build-smoke.test.mjs`.

**Nothing is sold** (SPEC.md, "Nothing is sold at launch"). `/pricing` and
`/checkout-complete` are no longer routes — the files are
`src/pages/_pricing.astro` and `src/pages/_checkout-complete.astro`, which
Astro skips. The Stripe plumbing behind them is untouched and still tested.
The header CTA, the footer, `llms.ts`, `/faq`, the home page and
`webApplicationSchema()` were all cleared of price claims in the same pass.

**Reskinned.** Warm paper neutrals, verdigris accent, two radius tokens,
heavier and tighter headings, and a reeded-edge hairline under catalogue H1s.
Contrast measured, not eyeballed. See SPEC.md, "Design direction".

**The melt-value section and the common questions** (SPEC.md, under "URL
structure and taxonomy"). Two new trees:

- `src/lib/melt.ts` — every figure and every generated sentence on
  `/melt-value`. Quantity ladder, spot-price ladder, dates, and the FAQ
  question each page owns. Nothing in the templates does arithmetic.
- `src/data/questions.ts` — the `/common-questions` registry. Fifteen
  questions as of 2026-09-20, ordered by how often each is asked and rendered
  in that order by the hub. The five still worth writing are listed in the
  file header rather than stubbed.
  Two things about it are new and are house rules now: the `<title>` and the
  meta description are **formulas** rather than fields (Title Case of the
  question plus `titleTail`; the `lede` plus the page's own H2s, both fitted
  by `meta.ts`), and a paragraph may carry an internal link written
  `[anchor text](/path)`, whose path is checked against the routes the site
  actually builds.
  The fifteen are filed into four topics — `QUESTION_CATEGORIES` in the same
  file — each with a page at `/common-questions/topic/<slug>`: what a coin is
  worth, grading and condition, silver gold and spot prices, selling coins.
  The hub is grouped by topic and its `ItemList` lists the topics; each topic
  page is a `CollectionPage` over its questions and carries no FAQPage markup;
  each question page carries the topic in its breadcrumb, in an eyebrow over
  the H1 and in a closing section. Adding a question means picking its topic —
  membership is required and validated — and adding a topic means two
  questions to put in it.
- `src/data/faq-registry.ts` — question ownership across all three sections,
  throwing on a collision. Imported by `astro.config.mjs` so it runs on every
  build.
- Routes: `/melt-value`, `/melt-value/<group>`,
  `/melt-value/<group>/<type>`, `/melt-value/<group>/<type>/<coin>`,
  `/melt-value/tagged`, `/melt-value/tagged/<tag>`, `/common-questions`,
  `/common-questions/<slug>`.
- **The melt tree mirrors the catalogue, segment for segment** (2026-09-19,
  replacing both the flat `/melt-value/<coin>` namespace and the metal-keyed
  hub that came before it). Same two axes, same tag views, same page
  furniture; different question, different copy, and every listing sorted
  richest first instead of in registry order. `validateMeltPaths()` throws if
  the trees stop matching, and a build check asserts both halves of every pair
  were written to `dist/`.
- `/melt-value/no-melt-value` is gone. Coins with no precious metal are
  ordinary members of their composition group, so clad, copper, nickel and
  steel get the same three archive levels as silver, and those pages answer
  "none". `spot.ts` still prices platinum and `platinumOzt` is still on the
  schema, but a metal is no longer a URL: a group's metals are read off its
  coins, because a 40% silver clad half is clad by construction and silver by
  content.
- The coin page carries a "Melt value of <coin>" link inside its melt block,
  and a second one outside it for the coins with no figure — every single page
  in either section links to its twin, both ways, and a build check fails on
  either direction missing. The catalogue archives link across too.
- `src/components/MeltTile.astro` is CoinTile's twin: same grid, same place on
  the page, figure and weight where the catalogue tile carries a sentence.
- The melt page was then stripped of everything the coin page already says
  (specification rows, eyebrow, "what melt value is not", the archive list).
  What is left is the figure, a "how many do you have" input that drives it,
  the spot-price ladder and one link back under the coin's own name.
- **That input is the first island on a content page.** Inline vanilla, no
  framework, `is:inline define:vars` like `SignupDock`. It reimplements
  `formatUsd()`/`formatOzt()`, and `tests/melt.test.mjs` lifts both formatters
  out of the `.astro` file and runs them against the real ones, so the two
  cannot drift silently. Verified that the check fails when they do.
- Wired through: `astro.config.mjs` priorities (one notch below the catalogue at every
  level), `Header`
  (a fourth nav link, "Melt values" — the only one there that is never
  conditional, because /melt-value is a real route rather than a generated
  archive), `Footer`,
  `llms.ts`, `KEYWORDS.md`, a new `tests/melt.test.mjs`, the style test, and
  four new build checks.

**Series pages.** The four `kind: 'series'` tags now carry `SeriesInfo`, and
`/coin-info/tagged/<series>` renders it. There is no `/coin-info/series/`
tree and there should not be one -- the reasoning is in CLAUDE.md and in the
header of the tag route.

- `SeriesInfo` gained `mintMarkLocation`, `varieties`, and structured
  `keyDates` (was `string[]`, now `KeyDate[]` with a mintage and a reason).
  The coin page's "Key dates" row maps to `.label` and is otherwise unchanged.
- Filled for all four: washington-quarter, mercury-dime, lincoln-cent,
  morgan-dollar. Only the Washington quarter builds today, because a tag page
  needs a coin. The other three appear the moment a Mercury dime, a Lincoln
  cent or a Morgan dollar enters the catalogue, with no further edit.
- Sections, in order: the run at a glance, the metal eras (only when there is
  more than one), the mints and their marks, the key dates, the varieties,
  then the existing tile grid. A non-series tag page is untouched.
- `KeyDate.coin` and `Variety.coin` are the link-out seam, and both are unset
  today. Set one the day that coin has a page and the row becomes a link;
  `validateTaxonomy()` throws on a slug with no coin behind it, same as
  `related`.
- `validateTaxonomy()` gained a whole series block: eras ordered, contiguous
  and covering the run, era groups registered, no duplicate mint mark, mints
  and eras inside the run, no duplicate label, key-date and variety coin
  slugs resolving. Verified by mutation that each throws.
- Two new build checks. One asserts every key date, variety, mint and era
  reaches the HTML; the other asserts no dollar figure appears in the series
  sections and that each coin links up to its series page. Both verified by
  mutation.
- **Two corrections made in passing**, both in `coin-taxonomy.ts`: the Morgan
  dollar `bluf` said "every Morgan dollar contains 0.7734 troy ounces", which
  is false for the 2021 revival issues (.999 fine, more silver), so it now
  says "struck between 1878 and 1921"; and the sentence about where the
  Morgan mint mark sits moved out of `intro` into `mintMarkLocation`, because
  it was about to be on the page twice.

32 pages build — five coins bring their composition archive, their
denomination archive, the tagged hub and four tag pages in each of the two
sections, plus both section hubs. `npm run check` is clean, 27 unit tests
pass, and all 30 build checks pass.

**Archive copy is generated (2026-09-19).** `src/lib/catalog-copy.ts` is the
catalogue's answer to the question the melt section already answered: where do
the sentences on a page nobody had time to write come from. Every string on the
hub, a composition archive, a denomination archive and a tag page — H1,
`<title>`, meta description, FAQ question, opening answer, section headings and
body copy — is assembled there from facts the catalogue already holds: the
year span, the metals present, the denominations reached. Never a count of the
entries; see the note at the top of this file.

- **`Group` and `Tag` now need `slug`, `name` and `kind`/`meltDriven`, and
  nothing else.** Every copy field is optional and wins for its
  own field when it is filled. Registering a tag stopped being a writing
  assignment, which is the whole point: the tag registry is unbounded and a
  catalogue of ten thousand coins carries hundreds of them.
- **An override that matches the generator fails the build.** Three fields were
  deleted from `silver`, two from `washington-quarter` and one from `us-coin`
  when the check first ran, because the generator produced exactly those
  strings. The hand-written copy that says something the generator cannot —
  silver's "sort by date first", the Washington quarter's one-digit answer — is
  untouched and still wins.
- **`validateCatalogCopy()` throws on** a duplicate `<title>`, meta
  description, H1, FAQ question or *paragraph* across the whole section, coin
  pages included; a title or description outside the length a search result has
  room for; a currency figure in catalogue copy; and a generated string with
  `undefined`, a double space or a space before punctuation in it. It runs at
  the module scope, and `faq-registry.ts` imports it, so no route can skip it.
- **`allFaqQuestions()` moved** from `coins.ts` to `catalog-copy.ts`, beside the
  generator that now writes half the questions in it.
- **`metalsIn()` in melt.ts is now `metalsInCoins()` in coins.ts.** Both sides
  of the site needed the same answer to "what is this set made of", and two
  implementations is two archives that can disagree about a coin.
- `tests/catalog-copy.test.mjs` proves a group or tag with every copy field
  deleted still gets a complete page, that an override wins one field at a
  time, and that the duplicate and match-the-generator checks really fire.
  `tests/build-smoke.test.mjs` compares every archive page's built HTML against
  what the generator said it should contain, because a heading typed back into a
  template typechecks and passes everything else.
- `tests/style.test.mjs` now scans the *rendered* archive copy through
  `allArchiveCopy()`. Scanning the registries alone would have quietly stopped
  checking the section the day most of its copy started being generated.
- **`notes` is the seam for hand-written prose (2026-09-20).** It renders after
  the generated paragraphs instead of replacing them, which `intro` does. Every
  hand-written body in `coin-taxonomy.ts` moved to it, and the sentences that
  the generator had started saying in the same words were cut: silver's
  metal-floor paragraph and its second "sort by date", copper's "everything
  above face value is collector demand", nickel's "assume face value and work
  upwards", clad's opening, and the Washington quarter's "this page is where
  they are back together". Nineteen fields went with them — every `h1`,
  `seoTitle` and `faqQuestion` the generator produced character-for-character.
  The registry is 1,700 characters smaller and every archive page now carries
  its derived counts as well as its specifics.
- **Two generator bugs the audit caught.** A tag whose name is a mass noun asked
  "What are Clad coinage worth?", and a common-noun tag kept its stored capital
  mid-sentence ("What are Junk silver coins worth?"). `tagNoun()`,
  `tagCoinsPhrase()` and `tagIsPlural()` in `coins.ts` settle both, by `kind`
  for the capital and by the phrase for the verb, and `melt.ts` reads the same
  three rather than its own copy — it had been shipping "Junk silver Melt Value".
- **Tile stat lines are separate from tile copy.** `groupStat()`, `pairStat()`
  and `tagStat()` carry the count and the year span; the teasers above them say
  nothing about either, because a sentence that repeats the line under it was the
  duplication the house rules single out. The templates no longer count anything
  themselves.
- `spotAsOfLabel()` was formatting the date `en-US` — "September 19, 2026" —
  inside the caveat under every melt figure, which is the most-repeated sentence
  in the build. Now `en-GB`, per STYLE.md.

The hub keeps its hand-written sections: it is one page, and the generator
exists for the hundreds below it. Its H1, title, description, question, answer
and opening paragraph come from the module anyway, because those strings appear
in the schema as well as on the page.

## Live spot prices, and the two renderings (2026-09-19)

Every figure on the site that comes from a metal price is now rendered twice,
and the second rendering happens in the browser. The reasoning is in the header
of `src/lib/spot.ts` and the rules are in CLAUDE.md, "Prices, caching and the
two renderings".

The problem it solves: the build is static and the HTML is cached at the edge
for a day and served stale for a week. A coin's weight is safe in that cache
and the price of silver is not, so a figure baked into the HTML could not be
corrected without a deploy.

What now happens:

- `src/lib/spot.ts` carries a `SpotSnapshot` — prices, `asOf`, `source`,
  `live` — and every derived function takes one and defaults to
  `REFERENCE_SPOT`, which is the committed snapshot from
  `src/data/spot-snapshot.ts`. `formatOzt()` and `spotLadder()` moved here from `melt.ts`,
  which re-exports them, because the browser needs them and `melt.ts` pulls in
  the whole catalogue.
- `/api/spot` (`src/server/spot.ts`, `api/spot.ts`) serves that snapshot,
  cached an hour at the edge against a day for the HTML. It takes no
  environment and **never calls metals.dev** — `npm run spot` does, once a day,
  and commits the result. Flagged `live: false`, and the pages word themselves
  accordingly.
- `src/lib/spot-dom.ts` fetches it and rewrites every element carrying
  `data-spot` — prices, values, sums, weights, stamps, caveats, the strip note
  and the whole ladder — calling the same functions the build called. No second
  `formatUsd`.
- `src/components/SpotLive.astro` is in `Base.astro`, on every page, not opted
  into per page: a flag somebody has to remember fails silently, and
  `bootSpot()` returns on its first line when a page has no figure.
- The melt page's inline calculator is gone. The quantity box is wired by the
  same module, so "how many do you have" and "what is silver worth today" are
  one line of code rather than two implementations that had to be regex-tested
  against each other.
- A sentence with a price in it is generated once and rendered twice: the
  generators in `melt.ts` take a `Mark`, `plainUsd` for JSON-LD and meta, and
  `markedUsd` for the reader. A rewritten sentence carries `data-spot-sync`, so
  the browser puts its rewrite into the page's JSON-LD too.

Checks: `tests/spot.test.mjs` grew the snapshot, endpoint and cache-header
tests; `tests/melt.test.mjs` replaced the old inline-formatter test with one
that fails if a formatter comes back; `tests/build-smoke.test.mjs` feeds every
marked figure in the build back through the browser's own rule and pins the
ladder cell by cell.

Not covered, and deliberately: `llms.txt` is served as text and cannot be
rewritten, so it states its price, its source and its date.

## The dev workbench (2026-09-19)

- `/dev`, `/dev/pages`, `/dev/coins`, `/dev/add-a-coin`, served by `astro dev`
  only. One rest route, `src/pages/dev/[...tool].astro`, whose
  `getStaticPaths()` returns `[]` outside dev; views in `src/dev/`.
- `/dev/pages` lists every URL from the registries and then **fetches each one
  from the dev server** to read back its title, description, canonical, H1s,
  breadcrumbs and JSON-LD, flagging missing canonicals, second H1s, absent
  schema and over-long titles. Nothing about a page's content is described in
  the tool; it is all read off the page.
- `/dev/coins` shows, per coin, the URLs it created (marked load-bearing when
  the archive would 404 without it), the two FAQ questions it claims, and a
  field table with `required` / `expected` / `optional` levels — the check the
  type system cannot make.
- `ADDING-A-COIN.md` is the procedure, rendered into `/dev/add-a-coin` beside
  the live taxonomy so the lists of groups, denominations, tags and metals are
  the real ones. `COIN-ARTICLE-GUIDE.md` remains the editorial half.
- Guarded by a build check: `dist/dev` must not exist, the sitemap must not
  mention it, and no shipped page may link to it.

## The Mercury dime is complete: 84 coins, 2,387 grade pages (2026-09-22)

**Every year, every mint mark, every grade.** 77 circulation dates plus the
seven Philadelphia proofs of 1936–1942, on **five** sources, with nothing
withheld and no tie. `npm run report` says "Nothing outstanding. Every coin the
sources attest has a page." Nothing is committed.

| | |
| --- | --- |
| Coins | **84** — 77 circulation, 7 proof |
| Grade pages | **2,387** — 77 × 30 Sheldon rungs, 7 × 11 PR rungs |
| Sources | **five**, and the primary is not Wikipedia |
| Confidence | 74 figures agreed by every source that holds one, 10 on a majority |
| Withheld / tied / single-source | **none, none, none** |
| Priced rungs | 383 of 2,387; 77 of 84 coins carry at least one figure |

### The finding that shaped the whole series: there is no Wikipedia page

`npm run discover -- mercury-dime` reports `0 tables, 0 readable` on every
candidate, and it is not a parser problem. The article "Mercury dime" carries
**no table of any kind**, and the family of `<X> mintage figures` pages that
holds the cent, the nickel, the quarter, the half dollar and the *Roosevelt*
dime has no entry for this series. There is no page to register.

Under the ordinary rule that is a series which generates nothing — and for the
wrong reason. The figures are not doubtful: five sources carry the whole run and
agree on all but ten figures. What is absent is the thing that *seeds* the
merge. The primary source decides which coins EXIST; the vote decides the
figure; and those were never the same job.

**So a series may now name its primary, and the owner's decision is Numista.**
`primary: { via: 'numista', ... }` on the entry in `fetch-mintages.mjs`, about
fifteen lines of merge change, and `PRIMARY` was load-bearing in exactly two
places. Numista rather than one of the collector charts because it is already a
first-class source here, its responses are cached and committed under
`data/numista/`, and it is a catalogue with an editorial process rather than a
blog with a table on it. The other four then vote exactly as they always do.

Two things this cost, both of which are the system working:

- **The primary must not vote twice.** `numistaRows` is not read again as the
  second source for such a series. Counting it in both places would make every
  disagreement a tie the primary wins.
- **The primary is outvoted on seven coins, and should be.** Numista folds the
  proofs into its Philadelphia totals from 1936 to 1942 — 87,504,130 where the
  others say 87,500,000 and state the 4,130 proofs separately. This catalogue
  gives the proof its own page, so the primary's figure counts those coins
  twice. Three sources outvote it on all seven.

### The five sources, and the caution about counting them

coinmintages.com and landofcoins.com quote **identical figures down to the last
digit**, and coinmintages names MercuryDime.net as its source: one lineage
counted twice. silverrecyclers cites the Red Book. usacoinbook is the one that
agrees with Numista where the others do not. So a 3–2 split in this series is
usually two families rather than three opinions — the same caution the
quarter's entry records about its own ties.

**The one figure worth a second look is the 1945-S.** Numista and usacoinbook
say 41,920,000; the other three say 41,290,000, which is a digit transposition
in one family or the other. The majority rule takes 41,290,000, and
`ADJUDICATED` cannot override it — that list is only consulted at a tie. Both
figures are about 41 million, so no page calls a common coin scarce either way,
and `data/mintage-consensus.json` records what every source said. Settling it
properly wants a sixth source; one PCGS CoinFacts call would do it.

### Four things that had to be got right

- **The design name on a one-design series.** A coin with no `breakdown` had its
  design defaulted to the literal `'Eagle'` — the quarter's pre-1999 reverse —
  in `verify-mintages.mjs`. The name travels onto every figure and the merge
  PAIRS designs, so an 'Eagle' figure against a 'Mercury' primary does not pair,
  arrives as an orphan, and is added as a *second* design: twice the mintage
  with "2 reverse designs" over it. It is `DESIGN_OF_ONE`, per series, now.
- **`Mint.years` is coarser than it looks, and precision defeats it.** Spans
  written to the exact dates struck suppress the very sentence they describe:
  `plausibleMint()` prints "There is no 1923-D" only where the mint was working
  on the series around that date *and* `attested` shows no such coin, so cutting
  1923 out of Denver's span makes both tests unsatisfiable. The spans are the
  mint's run; the holes live in each mint's `note` and in `attested`. That is
  worth four sentences here — 1923-D, 1930-D, 1921-S, 1934-S.
- **`P` means Philadelphia and no Mercury dime carries one.** usacoinbook writes
  the mint into every path (`/1916-P/`); this site writes the mint MARK. Left as
  written, all twenty-seven Philadelphia figures key on a coin that does not
  exist and vote on nothing. The quarter needs no such line because from 1980
  its Philadelphia coins really do carry a P.
- **One design, so anything in the design slot is a variety** — the Morgan's
  rule, on both price sources and on usacoinbook's mintage pages. This series
  is catalogued by Fivaz-Stanton number: `1919-double-die-fs-101`,
  `1942-s-fs-501`, `1945-s-micro-s`, `1942-w-double-die` (a W no Mercury dime
  carries) and `19421`, which is the 1942/1 overdate with the slash removed. It
  matters most where the money is — the overdate is worth roughly fifty times
  the ordinary 1942, and a variety on the plain date's ladder would drag its
  ceiling up by that factor.

### What is left on this series

- **The seven proofs have no figures at all**, and honestly so: USA Coin Book
  lists no proof page, PriceCharting does, and one source cannot clear the
  two-source gate. Their 77 grade pages render everything else.
- **The cheat sheet is `checked: false` and its 28 rows now match the
  five-source consensus exactly** — verified, 0 mismatches. It was not flipped,
  because the sheet's `sources` list names the Red Book and the Mint's annual
  report, and what actually checked those rows is `data/mintages.json`. Update
  the list, then flip it.
- **No `sections` on any of the 84**, by the rule: a generated coin's page ends
  at the pull quote. The 1916-D is the obvious candidate for promotion into
  `coin-seed.ts` — it is the key to the series and the most faked date in it.
- **No PCGS calls were spent.** Phase 5 on the key dates (1916-D, 1921, 1921-D,
  1926-S) is where a call is worth most per call.

## The Morgan dollar is complete: 126 coins (2026-09-22, later the same day)

**Every coin of the series is in. No grade pages for the new ones and no
prices — the owner's instruction was to finish the catalogue first and leave
every figure TBD until the prices are researched.** 8,149 pages build;
`npm run check`, `npm test` (247 cases) and `npm run test:build` are green.
Nothing is committed.

| | |
| --- | --- |
| Coins | **126**, up from 96: +26 Philadelphia proofs, +4 tail-feather reverses |
| Sources | four, and **two of them are new**: coinmintages.com and landofcoins.com |
| Confidence | 86 figures agreed by all four, 32 by three, 7 by two, 1 settled by hand |
| Still disputed | **two** — the 1890-O and the 1898-O, both published with the spread on the page |
| Single-source figures | **none**, down from one |

### The twenty-six missing proofs, and how they got a third vote

Philadelphia struck proofs every year from 1878 to 1904 and the primary table
carries one of them. Numista had the figures and the merge refused them,
correctly: a coin the primary does not carry may not be invented by a second
source, because that rule is what keeps the 1976 Bicentennial out.

**The fix was not to relax the rule, it was to notice that it conflates two
things.** "This table does not cover proofs" — which the Morgan source already
said, in prose, in its `missing` field — is a different claim from "this table
was told to leave the Bicentennial out". A source may now declare `gaps`
beside that sentence, and a secondary figure inside one builds its coin.
`MIN_GAP_SOURCES` is **two that agree**, which is a *higher* bar than a coin
the primary carries has to clear: a figure the primary states is being checked,
and an absence of confirmation is an absence of checking, but a figure nothing
states is being taken on trust and one quotation of it cannot be told from a
typo.

So two more sources were needed, and finding them was most of the work.
**coinmintages.com** carries a row per (date, finish); **landofcoins.com** a
three-column chart with a proof column. Both were checked against Numista row
by row before either was registered, and they agree with it on every
Philadelphia proof of the run bar one — 832 against 833 in 1888, which is
inside `NEAR_ENOUGH` and settles to the higher figure like any other revised
collector total. Every one of the twenty-six now stands on three sources.

They paid for themselves twice over on the dates already published: the ties
fell from seven to two, and nothing is left on a single source.

**What is not reachable, so nobody looks again:** `usacoinbook` has no
1878–1904 proof page but the 1895, `silverrecyclers` has no Morgan page at all,
PCGS and Greysheet answer 403, and NGC's coin explorer renders from an
undocumented API its page does not name.

### The 1878 tail feathers are three pages, and it is the owner's call

`varieties` was the house rule's default and the owner reversed it for these
two. They are not a judgement about a die: eight tail feathers or seven, told
apart by counting, with separate published mintages at 749,500 and 9,759,300 —
one coin in fourteen. `SeriesInfo.hubs` is the exception and holds two entries
on this whole site. The tests are written down in CLAUDE.md and all three are
required at once.

**The year's page survives**, at the owner's decision, because "1878 Morgan
dollar value" is the phrase almost everybody types and the reader who has just
found one does not yet know the question exists. It states the combined total,
its `mintageNote` says the figure is the two added together, and its checklist
tells them to count. `tests/mintages.test.mjs` fails if the hubs stop adding up
to it.

The **7-over-8 stays a `varieties` row** and must: its coins are counted inside
the seven-feather figure, so a page for it would either state a mintage it has
not got or restate one that is already somewhere else.

One figure needed a decision. Numista puts the eight-feather reverse at 750,000
and coinmintages at 749,500, and only the second adds up to the primary's year
total of 10,508,800 — Numista's own year total is 10,509,300, the same rounding
carried through. `ADJUDICATED` records the arithmetic, and it is the one entry
where `take` is a figure rather than the name of a source.

### Two copy bugs it turned up, both of which had already shipped

- **"one of 3,837 struck with the design on yours"** on every proof page on the
  site, the twenty-two 1936–1964 quarters included. The clause was written for
  the quarter from 1999, where a year has five or six reverses and a proof
  figure is the number of sets, and it is the sentence that stops a reader
  taking the year's total for their coin's. On a one-design year it says
  nothing and implies something false. Same trap as `article()`: right on every
  page on the site, wrong on the next hundred.
- **"the same metal, and the same value, as an 1878-CC"** on the 1878
  Philadelphia page. The clause only ever meant "the mint mark does not matter
  here", and it was crossing a scarcity boundary — an 1878-CC is a two-million
  Carson City dollar worth several times a Philadelphia one. It is filtered to
  siblings on the same rung now, and hubs are excluded outright, since the
  whole point of their pages is that they are *not* worth the same.

### The completeness audit, and what is deliberately not here

Every (year, mint) the mints struck has a page. Seven Morgan dollars exist that
this site has no page for, and all seven are deliberate:

- **1895-P circulation.** The Mint's report records 12,000 and not one has ever
  been confirmed. Two accounts, both in the new hand-written `1895-proof-morgan-dollar`
  page: melted under the Pittman Act of 1918, or never dated 1895 at all
  (Hettger's research, and a footnote in the Mint's own records reading "12,000
  coined in 1894"). Neither is settled here, because the sources do not settle it.
- **Six branch-mint proofs**, roughly 1879-O, 1883-O, 1893-CC and a contested
  tail. They fail every test a `hubs` entry has to pass: no mint ever published
  a figure, the counts are survival estimates or single digits, and **the
  sources do not agree on which dates belong** — landofcoins lists the 1884-CC
  and 1884-O, coinparade calls those disputed and adds a 1921-S, Greysheet has
  an 1881-O page. Four sources that cannot agree on the LIST is the condition
  this site refuses to publish through. They are one `varieties` row now, whose
  answer is "have it certified", which is the true answer.

**`1895-proof-morgan-dollar` is the first Morgan in `coin-seed.ts`.** The
generated page was correct and useless — "one of 880 struck", on the page a
person lands on holding a silver dollar dated 1895, which is the most-faked
date in the series because hundreds of 1895-O and 1895-S dollars exist with the
mint mark filed off. That fact is derivable from no figure in the pipeline,
which is the test for a `sections` block.

### Every Morgan now has a grade ladder, and it cost no network at all

**`npm run grades` was all it took.** The importer loops over `COINS`, not over
the feed — a coin the sources priced nothing for still gets a ladder with every
eligible rung on it, all TBD, and an empty `sources` list because it cited
nothing. The thirty new coins had no grade pages only because nobody had re-run
the import since they entered the catalogue.

| | |
| --- | --- |
| Morgan ladders | **126**, up from 96 |
| Morgan rungs | **2,259** — 620 priced, 1,639 TBD |
| All-TBD ladders | 38 (the 29 proofs, and 9 dates the gates refused every rung of) |
| Morgan grade pages | **2,259**, up from 1,911 |
| Site | **8,497 pages**, up from 8,149 |

A proof takes the eleven PR rungs and nothing else; a circulation strike takes
the full Sheldon run of twenty. `eligibleRungs()` decides it off
`Coin.finish.kind`, which the proofs already carry.

**It found a real collision, which is what the validator is for.**
`validateGradeCopy()` refused the build: `<title>` "1878 Dollar PR70 Value" was
being used by both 1878 proof tail-feather pages, on all eleven proof rungs.
The cause is that a grade `<title>` falls back to a short STEM — year, mint
mark, denomination — when the full name will not fit, and the stem knew nothing
about a hub. Fixed with a `hub` field on `Coin` carrying the title-case form,
set from the issue and read by `stem()`. The full name is not enough on its
own, because the fallback is the thing that collides.

### What is left on this series

1. **The prices, and only the prices.** `npm run pcgs -- morgan-dollar --budget 95`
   daily until the queue empties (≈17 days on one key), then `npm run grades`
   again. 1,639 Morgan rungs say TBD; that is the number this buys down.
   **The free guides will not help on the proofs** — neither carries a
   1878–1904 proof page but the 1895 — so every one of those 319 proof rungs
   needs PCGS or a hand-written sheet.
2. **Wire the PCGS populations and realized sales into `GradedLadder`.** Bought
   and committed already; pure plumbing, no calls.
4. **Consider linking the 1878 page down to its two hubs.** It does not today,
   and neither does any coin page link to a sibling — the 1878-P does not link
   to the 1878-CC either, and the archive one level up is how a sibling is
   reached on this site. So the hubs are no worse off than any other coin, and
   the year page does state both reverses and both figures in its
   `mintageNote`, which is the load-bearing half. But this is the one case
   where the page raises a question it cannot answer, and `sections` is never
   generated, so a link would need a generated block that does not exist yet.
   Worth a decision rather than a quiet omission.
5. **`Coin.identify` is still unrendered**, as the coin template's header has
   said since the HowTo schema was cut. The hub checklist steps are generated
   and correct and reach no page; they cost nothing and will be right the day
   the checklist renders.

---

## How it stood earlier that day: 96 coins, 2,007 grade pages (2026-09-22)

**Phases 0 to 4 of `RUNBOOK-MORGAN-DOLLAR.md` are done. Phase 5, the PCGS
fetcher, is not, and it is now the single most valuable thing in this section.**
8,090 pages build in 53s; `npm run check`, `npm test` and `npm run test:build`
are all green. Nothing is committed.

What landed:

| | |
| --- | --- |
| Coins | **96**, 1878-1921, every mint. 88 mintages confirmed by both sources, 7 settled by the tie rule with a `mintageCaveat`, 1 on one source |
| Grade pages | **2,007** — every eligible rung of all 96 |
| Priced rungs | about 5 in 20 on a common date, **1 in 19 on the 1889-CC** |
| Not in the catalogue | **1878-P**, because neither price source has a plain page for it; every 1878 Philadelphia entry they carry is a tail-feather variety |

### Three pieces of one-off code, none of them Morgan-specific

- **`SERIES` in `scripts/grade-sources.mjs`.** A price source is now registered
  per series — console slug, category path, the words to strip from a title,
  and the mint marks that exist. That was phase 3 and it is finished; the next
  series is an entry in that table.
- **`article()` in `src/lib/meta.ts`.** "A 1878-CC Morgan dollar" is wrong, and
  it was wrong in the bluf, the melt answer, the FAQ question, the meta
  description and all twenty grade pages of every coin in the series. Ten call
  sites across four modules, plus a new `{a}` slot in the 31 grade definitions.
  Correct for every page that existed and wrong for two thousand of the next
  ones — which is the shape to watch for on series three.
- **`parseTable` reads a `scope="row"` header cell as DATA.** The Morgan
  mintage table writes every year that way, and read as a header it takes the
  entire year column out of the rows.

### The finding worth carrying forward

**The free guides are least useful on exactly the coins people search for.**
PriceCharting computes from completed sales and a scarce date has almost none:
its own 1889-CC page states $1,128.10 ungraded, then **$37.00 in VG8** and
$311,475 in MS70, a grade that coin has never been awarded. Against USA Coin
Book's $1,384 that is 37x apart, the spread gate refuses the rung, and the
1889-CC keeps one rung of nineteen. A common date behaves normally.

So the series is **common dates priced thinly, key dates almost entirely TBD**,
and the failure is a placeholder rather than a wrong figure. Do not touch
`SPREAD_LIMIT` — letting the 1889-CC through would publish "$37 to $1,384" for
a coin worth a thousand. Phase 5 is the fix, and the key dates are where a PCGS
call buys the most.

### Phase 5 is built and has run once

**`npm run pcgs` exists.** Run it **once a day** — it is resumable and costs
nothing it has already spent:

```bash
npm run pcgs -- morgan-dollar --plan       # what it would ask, no calls
npm run pcgs -- morgan-dollar --budget 95
npm run grades
```

Day one, on one key, 94 calls: **86 of 96 coins resolved to a PCGS number** (free,
from Numista, which now carries the reference on every issue it caches), **82
guide figures**, and every one of their certified populations and realized
auction sales. 1,606 pairs left — about seventeen more days on one key, six on
three.

`data/pcgs/morgan-dollar.json` is a **ledger and it is committed**: a pair is
never asked twice, each key's daily count lives in the file rather than in the
process, and it is written after every call rather than at the end. That is the
opposite of `data/prices/.cache`, which is scratch and deletes itself, and the
difference is that a response here costs a share of a hundred a day.

**It forced one change to the gates, and it is worth knowing about.** With three
or more sources on a rung, `rangeFor` now takes one vote per source and drops
any source more than `SPREAD_LIMIT` from the median of those votes, recording
what it dropped. That is the mintage pipeline's own lesson arriving here the day
a third source did. **With two sources nothing changed**, so the whole
Washington quarter is untouched. The 1889-CC went from one priced rung to seven
the moment PriceCharting's $37 could be outvoted instead of refusing the rung.

**Still to wire up, and it costs no calls:** the ledger already holds a
certified population and up to ten realized sales for every pair asked, and
neither reaches a page — a ladder's `sale` and `population` come from a
hand-written sheet only. The data is bought and committed; it is plumbing.

### What is left on this series

1. **Run `npm run pcgs` daily** until the queue empties, then `npm run grades`.
   Still true.
2. ~~The 1878 tail feathers.~~ Done, as three pages per finish. See the section
   above.
3. ~~The proofs.~~ Done, all twenty-six, on two sources found that day. See the
   section above.

---

## Next series: the Morgan dollar, and two bots (2026-09-22)

Recorded before the run above. The blockers below were all reproduced first and
all of them are now fixed; the section is kept because the reasoning is what
makes the next series cheap.

**`RUNBOOK-MORGAN-DOLLAR.md`** is the whole run written out, verified against
the live sources rather than guessed. The headline: **about half of it is
one-off code that makes the pipeline series-aware**, because
`scripts/grade-sources.mjs` is hardcoded to quarters in seven places. Three
blockers were reproduced rather than assumed:

- `parseIssueName('1889 CC')` returns mark `P` and a design called `CC`. The
  regex knows P, D, S and W, so **every Carson City and New Orleans Morgan
  currently parses as a Philadelphia coin.**
- The PriceCharting console is `coins-morgan-dollar` (~690 rows, five cursor
  pages) and USA Coin Book is `/coins/dollars/morgan/` (138 rows). Neither
  matches the quarter-only lists or the two path regexes.
- **VAMs will swamp PriceCharting.** Its Morgan console is mostly variety pages
  (`1878-78tf-strong-vam-37` and hundreds like it), and the design-count rule
  will NOT save it: a Morgan has one design, so the rule would refuse
  PriceCharting for nearly every date and the series would come out one-source
  and therefore all TBD. `variety()` has to learn `vam-\d+` and the tail-feather
  tokens first.

`npm run discover -- morgan-dollar` already reports the taxonomy side: the tag
has the run, the mints, the composition era, the key dates and the varieties,
and is missing `denomination`, `country`, `compositions[].specs`,
`markPositions`, `mints[].years` and **`wear`** — that last one gates the entire
grade section. Note also that Carson City struck 1878-1885 and 1889-1893, which
is two ranges, and `Mint.years` is a list for exactly that reason.

Three PCGS CoinFacts keys are coming, which is 300 calls a day rather than 100.
A Morgan run is roughly 2,000 (PCGS number, grade) pairs, so about a week — and
the fetcher still has to be built. Rotate the keys and keep each one's daily
count in the cache, not in memory, for the same reason `/api/spot` keeps its
guards in the cached document.

**`BOTS.md`** records two batched jobs and the rules they run under. The two
that matter most, because the easy version of each breaks a house rule:

- A price-refresh bot must put its timestamp on the FIGURE (`asOf`), never on
  the page. No `dateModified`, no sitemap `lastmod` — the build check fails on a
  date reappearing in the HTML.
- A rung it cannot price stays TBD. No interpolation between neighbours, no
  carrying last month's figure forward. A stale figure under a fresh timestamp
  is a lie with a date on it.

---

## Every rung of every coin, priced or TBD (2026-09-22)

**5,983 pages, of which 5,284 are grade pages.** Build 34s. `npm run check`,
`npm test` and `npm run test:build` all green. 380 rungs carry a researched
figure across 171 coins; the other 4,904 print `TBD to TBD`.

This reverses the decision of the day before, when a rung was a page only if a
figure survived the gates (247 pages over 76 coins). **The owner's instruction:
completeness first, with a section to follow telling a reader how to find the
price manually.** The concern was put -- five thousand pages whose answer is TBD
is the scaled-content shape -- and overruled, and indexing all of them was
confirmed deliberately. If it proves wrong the fix is the ladder-expansion loop
in `import-grades.mjs`, not the copy, which is honest either way.

### What decides whether a rung is a page now

`eligibleRungs()` in `grades.ts`, and it asks a question about the COIN rather
than about the evidence: can this object be given this grade at all?

| Coin | Rungs |
| --- | --- |
| circulation strike | the whole Sheldon run, AG3 to MS70 |
| Mint-set uncirculated | mint state only — it never circulated |
| proof, silver proof | PR60–PR70 only |

A series with **no `wear` points still gets nothing**, and that is the one gate
TBD does not rescue: without them the page cannot say what the grade looks like
on that coin, which is the content that makes an unpriced page worth having.

### The proof ladder, which is new

Proofs were excluded entirely the day before, on the grounds that one rung is a
point rather than a ladder. With every rung a page that reasoning is gone, and
what is left is the part that was always right: **a proof is not graded on the
Sheldon scale.** So `PROOF` in `grades.ts` is a tier of its own — no wear slots
in any definition, and `validateGrades()` enforces that for every non-circulated
tier.

**PR and PF are one grade with two spellings**, like XF and EF, and neither is
dominant: one service writes PR and the other PF, and a reader types whichever
is on the slab in front of them. `alsoWritten` carries the pair, so a PR65 page
contains PR65, PR-65, PF65 and PF-65.

Only 12 of the 104 proof issues carry a figure, all at PR65, because that is the
one proof rung both sources publish.

### Four things that had to be got right

**A rung with no figure carries no date and no source.** `valueBasis()` stamps a
figure; stamping "recorded to 22 September 2026" over a TBD dates an absence,
which is what the no-dates rule exists to stop. `validateTaxonomy()` now throws
BOTH ways — a price with no source, and a source with no price.

**The `normaliseQuestion()` trap fired exactly as the house rules predicted.**
It strips parentheticals, so "Mint State (MS-63)" and "Mint State (MS-66)" both
normalise to "Mint State" — and an unpriced answer has no figure to tell them
apart, so every mint state rung of one coin produced one identical string and
`validateGradeCopy()` refused the build. The answer now leads with the CODE, as
the rule already said it should. **The priced branch had the same latent bug**
and was saved only by prices happening to differ; it was changed too.

**TBD, never a blank, a dash, a zero or an estimate.** Each of the others is a
claim: a blank reads as an oversight, a dash is what this site's own sources
print for "no figure" and a price-table reader takes it as "worth nothing", a
zero is false, an estimate is what the catalogue exists not to do. This is NOT
the melt section's "say None rather than leave a blank" — there the figure is
genuinely zero, here it exists in the world and has not been measured here.

**One test was asserting the wrong rule.** `tests/build-smoke.test.mjs` demanded
the provenance phrase on every grade page, which on an unpriced one means dating
nothing. It now checks what the rule actually is: state a range and you must
date it; state none and you must print TBD rather than a blank, a zero or a
guess.

### The gates changed job

They no longer refuse pages, only figures. Two sources minimum, a spread inside
12x, and a ladder whose ceiling does not fall — a rung failing any of those
drops to TBD instead of disappearing. Separation survives as a measurement and
removes nothing: with every rung a page, its only remaining choice would be to
replace a figure the site HAS with a placeholder.

### Where the remaining figures would come from

Unchanged from the section below, and now more valuable rather than less,
because there are 4,904 slots waiting for them. **PCGS CoinFacts is the one to
build**: one call returns the guide value, the certified population AND up to
ten realized auction sales for a given (PCGS number, grade), which is all three
evidence types at once. It is capped at 100 calls a day, so it needs a budgeted,
resumable, permanently-cached command. Read that section before starting.

---

## Two more price sources, found but NOT yet built (2026-09-22)

Reconnaissance only. Nothing below is implemented; the 247 pages still stand on
two sources. This section exists so the API discovery is not done twice.

### PCGS CoinFacts -- the best source available, and the key is in `.env`

`COINFACTS_API_KEY` (a ~300-character bearer token). The endpoint takes QUERY
parameters, not path segments, which is why the documented-looking path form
404s:

```
GET https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByGrade
      ?PCGSNo=5791&GradeNo=65&PlusGrade=false
Header: authorization: bearer <COINFACTS_API_KEY>
```

**One call returns all three kinds of evidence a hand-written sheet carries:**

| Field | What it is |
| --- | --- |
| `PriceGuideValue` | the PCGS guide figure for that exact grade |
| `Population`, `PopHigher` | the certified census at and above the grade |
| `AuctionList` | up to ten realized sales: house, month, price, `IsCAC` |

That is the gap this section has been publishing around. Every generated ladder
today is guide-derived with no sales and no populations, because the auction
archives are behind a login -- and this hands over Heritage and Stack's Bowers
results directly, already matched to a grade.

**THE CONSTRAINT IS 100 CALLS A DAY** (owner, 2026-09-22), and the endpoint is
per (PCGS number, grade). A full fan-out is 318 coins x ~16 rungs = ~5,000
calls, or fifty-one days. So this cannot be a bulk fetch and must be built as a
**budgeted, resumable, permanently-cached** command -- something like
`npm run pcgs -- <series> --budget 100`, run daily, that keeps a priority queue
and never re-requests a pair it already holds. Deepening the 76 coins that
already have ladders is about thirteen days; the whole catalogue is fifty-one.

Two things to get right when building it:

- **Strip `CoinFactsNotes` before caching.** It is several kilobytes of prose
  per response and it is somebody else's copy, which must never reach a page.
- **`IsCAC` sales are a different market.** The 1932-D MS65 list runs $5,280 to
  $9,150 with one CAC coin at $19,520. Folding that in would widen the range by
  a factor of two and the importer would then accept it as evidence of its own
  range. Either exclude CAC sales or treat them as a separate figure.

**The catalogue has one `pcgsNumber` in it** (the 1932-D). The other 317 have
to be resolved before any of this works -- and they can be, free, from Numista:
every one of type 54's 124 issues carries a PCGS reference.

### Numista prices -- proven, cheap, circulated grades only

Same credential as the mintage pipeline.

```
GET https://api.numista.com/api/v3/types/54/issues/23176/prices?currency=USD
→ {"prices":[{"grade":"g","price":43.43},{"grade":"vg",...},...,{"grade":"au",...}]}
```

Six bands: g, vg, f, vf, xf, au. **No mint state at all**, so it does nothing
for the 1,332 one-source refusals concentrated in MS62-MS67 -- but it would
corroborate roughly 430 refused circulated rungs (g4 81, vg8 62, f12 63, vf30
75, xf40 54, au58 75, f15 20).

Independent of both current sources: community collections and swap lists,
rather than a retail estimate or a computation over completed sales.

**Cost is small, because only five types cover 1932-1998**: 54 (1932-1964),
55 (1965-1998), 56 and 21333 (Bicentennial), 30062 (silver proofs). So it is
about five issue-list calls plus one price call per issue -- roughly 220 against
an allowance of 2,000 a month. The modern types are 268 more and are not worth
it: Numista has little on modern clad, and 109 of those coins already fail the
gates on price flatness rather than on evidence.

### eBay -- rejected, and not only because it is blocked

Scraping sold comps answers 403 even with a browser user agent. The only
legitimate route is the Marketplace Insights API, which is restricted and needs
an application.

**It should be refused even if that access is granted.** PriceCharting already
computes its figures from completed sales, largely eBay's, so eBay comps would
be a second source that is the same source -- which is exactly the trap
`data/mintages.json` documents, where Wikipedia's mintage column turned out to
cite washingtonquarters.org. It would look like corroboration and would not be.

### NGC -- partially cracked, worth finishing

The real URL is by subcategory id, not by the slug the site shows:
`https://www.ngccoin.com/price-guide/united-states/quarters/38/`. The ids come
from `/price-guide/united-states/quarters/subcategories/`, which is a plain HTML
fragment: 34 Early, 35 Seated, 36 Barber, 37 Standing Liberty, **38 Washington
1932-1998**, 88 State and Territorial, 103 America the Beautiful, 254 Crossing
the Delaware, 260 American Women.

The page is a frozen-column layout: the FIRST table holds the coin names (310
rows) and a LATER table holds the price grid, 70 columns wide, G through MS70 --
which is exactly the mint state coverage that is missing.

**Only the first 25 rows of the price grid are rendered server-side.** The rest
loads from `https://production.api.aws.ccg-ops.com/api/...`; six guessed
endpoint shapes all 404, and `?page=`, `?p=`, `?start=`, `?offset=` and `?year=`
change nothing. Finding the real endpoint means reading their Angular bundle,
which is not linked from the landing page. There is also a collector/dealer
login on the page, so the remaining rows may be gated.

---

## The grade-price pipeline, built and shipped (2026-09-22)

**247 grade pages over 76 coins**, from 318 Washington quarters. The site builds
946 pages, up from 715. `npm run check`, `npm test` and `npm run test:build` are
all green.

The coins that earned pages are the 1932-1964 silver run, plus the 2003-D. That
is the gates working rather than a gap: grade moves the price of a silver
quarter and does not move the price of a 1974-D, which is worth the same in
About Good as in Extremely Fine, and a page per rung there would be twenty
copies of one page.

### The commands

```bash
npm run prices -- <series-slug>       # both guides, every coin of that series
npm run prices -- --report            # what matched and what did not; no fetch
npm run prices -- --coin <coin-slug>  # one coin
npm run prices -- --refresh           # ignore the cache, go to the network
npm run prices -- --keep-cache        # leave the responses for the next pass
npm run prices -- --clean             # drop them after an interrupted run
npm run grades                        # merge and gate -> graded-values.ts
npm run grades -- --report            # every refusal, with its reason
npm run grades -- --coin <coin-slug>  # one coin: every figure, every decision
```

**`npm run grades -- --coin <slug>` is the one to remember.** It answers "why
does this coin have two grade pages and that one none" without opening a file:

```
2003-d-washington-quarter
5 rung(s) with a figure, over 5 design(s):
  ms60   usacoinbook 0.74-0.93, pricecharting 0.99-0.99
  ms64   pricecharting 1.52-8.95
  ms65   usacoinbook 1.88-2.5, pricecharting 2-10
  ...
2 grade page(s):
  ms60   $0.74 - $0.99
  ms65   $1.88 - $10
Refused:
  ms64: one source only (pricecharting)
  ms66: one source only (pricecharting)
```

It writes nothing, so it is safe mid-edit.

### What the gates threw away, and it is most of it

1,683 rungs refused. By reason:

| Refusals | Reason |
| ---: | --- |
| 1,332 | one source only |
| 242 | the coin was left with fewer than two rungs, so it gets no pages |
| 71 | does not separate from the rung below |
| 37 | the two sources are more than twelve times apart |

**"One source only" is the number to act on, and the fix is a third source.**
The two guides overlap on about eight rungs — G4, VG8, F12, VF20, XF40, AU50,
MS60, MS65 — and everything else one of them publishes alone. F15, VF30, AU58,
MS62, MS63, MS64, MS66 and MS67 are refused on almost every coin for that reason
and no other. A third source that prices the mint state rungs would roughly
double this section on its own.

### The files

| File | What it is |
| --- | --- |
| `scripts/grade-sources.mjs` | The two readable sources: how to enumerate them, how to read one of their names into a (year, mark, finish, design) key, how to parse a grade table. A third source is an entry in `SOURCES`. |
| `scripts/fetch-grade-prices.mjs` | `npm run prices`. Crawls, caches, matches, writes `data/grade-prices.json`. Decides nothing. |
| `scripts/merge-grade-prices.mjs` | The gates, in a module of their own so they are testable with no network and no catalogue. |
| `scripts/import-grades.mjs` | Merges the feed alongside the hand sheets. `--report`, `--coin`. |
| `data/grade-prices.json` | Committed. Every figure, with the URL it came from and the date. The source PAGES are not kept. |

### Decisions, and what would reverse them

**Two sources, and the obvious four are unreadable.** PCGS, Greysheet and
Heritage answer 403 to a scripted request; NGC's price guide renders from an API
its page does not name. What is left is USA Coin Book (exact Sheldon rungs, a
retail estimate with a live melt floor under it) and PriceCharting (a fuller
ladder, circulated grades published as bands, computed from completed sales).
Genuinely independent, which is the only reason two is enough.

**Separation is ON for the feed and OFF for a hand sheet.** The 1932-D keeps its
sixteen rungs. A generated ladder earns each one. Split by where the figures
came from, not by which coin it is.

**No proof issue gets a grade page**, and the gates decided it rather than a
rule: of the eleven proof rungs the sources publish, one has two sources behind
it, and one rung is a point rather than a ladder. It is also right on the
merits — a proof never circulated, so the Sheldon question does not apply.

**A design is checked by COUNT against the Mint's own figures, never by name.**
Both sources list the famous varieties where a state name goes. Two rules were
tried and failed first: a word list catches the doubled dies and misses the next
variety named after a leaf, and requiring the two sources to agree on the name
is defeated by the fact that they do not call one design by one name — Salt
River Bay is `salt-bay-national-park` in one of them. So `data/mintages.json`,
which already records how many reverses the Mint struck for every (year, mark,
finish), is the corroborator: a source listing more pages for an issue than the
Mint struck designs has a variety in its list, and its whole list for that issue
is refused. Thirteen issues were caught this way, including the 2004-D Wisconsin
extra leaf.

### Copy that had to change, and why

Six sentences were written for the 1932-D and were false or awkward across a
318-coin catalogue. Each is fixed with the reasoning in a comment beside it in
`src/lib/grade-copy.ts`.

- The **bottom-rung sentence** claimed the figure was "many times what the metal
  in it is worth". On an ordinary silver quarter the bottom of the ladder IS the
  melt figure, and on a clad one there is no metal worth naming. It also
  compared against the spot price inside a sentence the browser cannot rewrite,
  so it would have gone from true to false on its own.
- The **no-sales sentence** explained the absence as "normal at the bottom of a
  ladder: certifying costs a large share of what this one is worth". True of a
  six-dollar coin, plainly untrue on an MS67 worth four hundred. It now branches.
- **`FLOOR_HEADING`** said "The silver floor under it". More than half this
  catalogue is clad, and the heading reaches the meta description.
- **`gradeLadderNote` said "this date"** and named no coin, so every 1932, 1932-S
  and 1935 quarter running VG8 to MS65 shipped one identical paragraph on three
  pages. `validateGradeCopy()` caught it, which is what that check is for.
- **`rangeText` printed "$29 to $29"** — a point wearing a range's clothes,
  which happens whenever two guides land within a dollar of each other. It now
  reads "about $29".
- **The step clause had two bands and needed three.** A 1940-S goes from $18 in
  VG8 to $29 in AU50 and was described as "a little more".

One sentence was added: `gradeSpansNote()`, for a date struck with several
reverses. It is `mintageNote`'s obligation one section over.

One wear point was rewritten. `lustre` on the Washington quarter was
"Washington's cheek and jaw, the largest open fields on the coin" — an
appositive dropped into the middle of a generated sentence, which read as a
comma splice on all seventy-five MS65 pages.

### Open ends

- **No realized sales and no certified populations in any generated ladder.**
  The auction archives are behind a login. Every generated rung is
  guide-derived, which is the weakest evidence this section publishes; a hand
  sheet in `data/grades/` is how a coin gets better than that.
- **104 coins have no figures at all** — every one a proof or a Mint-set
  uncirculated issue, which get no pages regardless. No circulation strike is
  missing from both sources.
- **13 issues lost PriceCharting** to the variety-count rule and fell to one
  source. Refusing the issue is right — there is no way to tell from outside
  which of the extra pages is the variety — but a fix that identified it would
  return those coins.
- **`npm test` no longer rewrites `graded-values.ts`.** It did, because
  `tests/grades.test.mjs` imports `import-grades.mjs` and that module called
  `main()` at load, so running the tests satisfied the one check worth having:
  that somebody re-ran the import after editing a sheet. `main()` is now guarded
  on `process.argv[1]`.

---

## Grade pages, and how the catalogue fans out (2026-09-21)

Designed, not built. The question was whether to give every coin a page per
grade -- 1960-1964 Washington quarters, every year and mint, times every grade
on the Sheldon scale -- and the worry was build size and build time. The
measurements say the worry is misplaced and the real constraint is elsewhere.

**The build is not the constraint, and the numbers are on the record.** A clean
build on 2026-09-21: 75 pages in 2.4s, 2.4 MB of HTML, averaging 33 KB and
32 ms a page. The ten 1960-1964 quarters across a ~28-step ladder is ~300
pages: about ten seconds and ten megabytes. Static output holds to roughly
25,000-30,000 pages against Netlify's default fifteen-minute build cap, ~60,000
against Vercel's forty-five. That is ~1,000 catalogue coins fanned out by
grade, and the answer there is incremental builds, not a server.

**Dynamic rendering was considered and rejected, on two grounds.** It breaks
`output: 'static'`, which is the first architecture rule and the reason a
visitor's request touches a file on a CDN and nothing else. And it does not
reduce the cost that actually bites: Google crawls and indexes 300 URLs whether
they were built ahead of time or on demand. Rendering on demand moves the cost
the site can afford and keeps the one it cannot. Client-side rendering would
reduce the index cost by not being indexed, and breaks "nothing on the page is
rendered only by the browser".

**The decision is per coin, not per grade, and it is computable.** A 1964
quarter is worth its metal in AG3 and in EF40, so twenty grade pages are twenty
copies of one page. An F15 capped bust half is worth several times the G4 and a
fraction of the VF30, so grade is the entire answer and the page says something
no other page on the site says. The test:

> A coin fans out by grade when the spread across its grade ladder is large
> relative to its melt floor.

`commonality` in `src/data/coin-schema.ts` is the first cut: `scarce` and
`key-date` fan out across the whole ladder, and `PREMIUM_VERDICT` has already
committed the site to the claim that grade matters on exactly those two. A
grade then earns a URL only where its value separates from the grade below it.
A capped bust half earns G4/VG8/F12/F15/VF20/VF30/EF40/AU50 because each step
is a real jump; it does not earn AU53/AU55/AU58 unless the data shows
separation.

**Correction, later the same day: `commonality` is a hint, not the gate.**
Saying `very-common` and `common` never fan out is wrong at the top of the
ladder. A 1961-D Washington quarter is common in every sense and worth melt in
every circulated grade -- and in MS67 it is worth hundreds, because almost none
survived that well. That is condition rarity, it is the whole answer to "why is
this $400 when the MS65 is $30", and a rule keyed to `commonality` alone would
refuse to build the one page on that coin worth having. The gate is population,
below.

`gradedPath()` in `src/data/coins.ts` already reserves
`/coin-info/graded/<series>`, `graded` is in `RESERVED_SEGMENTS`, and the link
on the coin page sits behind `GRADED_PAGES_AVAILABLE`. That URL is one page per
series holding the ladder across every date, and it answers most of these
queries on its own. It is the first thing to build and it is already linked.

**Population is the gate: a grade with none known gets no page.** Owner's
call, 2026-09-21, and it is the best pruning rule available -- it deletes the
pages that are wrong rather than merely thin. There is no 1961-D Washington
quarter in MS69. A page for it would be a URL asserting a coin exists, which is
worse than a duplicate: it is a fact the site got wrong, and it would rank for
a phrase whose honest answer is "no such coin has ever been graded".

**It is not more research per coin.** The census is a dataset, not an
editorial act -- PCGS and NGC both publish population reports keyed to the same
per-issue numbers the auction archives use, so it arrives as another column in
the import already planned, not as a second pass over the catalogue by hand.
The same applies to keeping it current: populations move slowly, a re-import
refreshes them, and `valueAsOf` already dates the figures beside them.

**The trap, and it will silently produce wrong pages if missed.** A population
of zero means two opposite things depending on where it sits on the ladder.
Above the grade where certification becomes economic, zero means none are
known. Below it, zero means nobody pays thirty dollars to slab a six-dollar
coin -- there are tens of millions of G4 Washington quarters and the census
will show almost none, because grading one is throwing money away. A naive
`population > 0` gate would therefore keep the MS67 page and delete every
circulated page on a capped bust half, which is the exact inversion of what
this rule is for.

So the gate is conditional on the coin's certification threshold: above it,
population decides existence; below it, population is silent and the value
data decides. A grade with no population figure and no sales data is the case
where the site knows nothing and the page is not built.

**Population is content, not just a filter, and on modern coins it IS the
answer.** "Only three have graded MS67" is why the coin is worth four hundred
dollars, and it is the one fact a reader cannot get from the grade description
or the melt arithmetic. It belongs in block 2, the BLUF, on any coin where
condition rarity rather than scarcity drives the price -- which is most of the
top of most modern ladders. That is the same figure doing three jobs: gating
the page, explaining the value, and giving the page something no other page on
the site has.

**Two things to settle before the import.**

- **Licensing.** Population data is proprietary to the grading services. The
  house rule is that the field is not filled from a scrape nobody can name on
  the page, and it applies here exactly as it applies to the prices. Settle
  the terms with the same deal that gets the auction data, or use published
  census reports and cite them in `sources`.
- **What the number counts.** A population report counts *gradings*, not
  coins: resubmissions and crackouts inflate the top of every ladder, so
  "three in MS67" may be one coin submitted three times. That does not stop
  the figure being the best available and it does not need repeating on every
  page -- it is one line in the new common question, linked from the grade
  pages the way the rest of the lookup material is.

**The template is not the problem; an unsourced number is.** A page titled
"F15 capped bust half dollar value" that restates what a capped bust half is
and never states a value ranks, loses the reader in three seconds, and teaches
Google that this site's titles do not pay out. That is the mechanism by which
thin pages drag down the good ones, and it is not a style objection. The fix is
not hand research: `GradedValue` is already `low`/`high` with `valueAsOf`
required and `sources[]` beside it, which is an import target by design.

**Use auction-realized prices** -- Heritage and GreatCollections publish
archives by date, grade and certification number. Realized prices are measured
rather than estimated, which is more than a price guide can claim; they date
themselves; and they are literally `MARKET_TRUTH`, the site's only quotation,
with a number in it. This is the answer to the open question under "Next" item
3: the source exists, and it is not the scrape nobody can name on the page.

**No page date, and the reasoning did not change.** The proposal was to refresh
auction figures so Google sees the pages being updated. Freshness is
query-dependent and close to inert for "F15 capped bust half dollar value",
where nobody wants today's news; and touching dates so a crawler sees movement
is the exact practice the no-dates rule was written against, with the cost
recorded -- the sitemap's build-date fallback told Google every page changed on
every deploy. `tests/build-smoke.test.mjs` fails on `lastmod`, `dateModified`,
`datePublished`, `article:*_time` and a "Last updated" line.

What is legitimate is that auction prices really do move, unlike a coin's
weight. So they get the exception the spot price gets: **date the figure, not
the page.** `valueAsOf` is the graded equivalent of `spotBasis()` -- the
timestamp sits next to the number that moved. A visible "most recently March
2026" beside six sales is a freshness signal a crawler can verify against the
body copy, which beats a `dateModified` it has to take on faith. The reason to
refresh the data is that a page quoting $140 when the market is at $210 loses
to the page that is current, timestamp or no timestamp. Quarterly is plenty,
and the spot refresh already shows the shape: re-import, then rebuild.

**How to find the value goes on the page, generated per coin.** The reader
looking up a coin should not have to click away to learn how to check the
number. The duplicate rule in `catalog-copy.ts` is exact-string uniqueness --
it forbids the same paragraph twice, not the same topic -- and the whole
archive-copy design is the answer: copy that names its own subject is different
on every page by construction. The per-coin version is also the more useful
one:

- **The search, as a live link**, not an instruction to perform one:
  `LH_Sold=1&LH_Complete=1` on an eBay query for that coin and that grade.
  Those two parameters filter to real transactions, which is the mistake the
  generic advice exists to warn about -- here it is prevented instead of
  explained.
- **The price-guide rows that apply**, via the PCGS and NGC per-issue numbers.
  That is a fact about the issue and belongs in the coin record.
- **The tie-back to the page's own range**, which names the coin's figures and
  is therefore unique per page.

The conceptual half -- what the sources are, why sold is not asking, why the
Red Book is retail and an annual, why a dealer's offer sits below every
published number -- is identical everywhere and earns one page. It is a new
common question and a real gap: `how-much-is-my-coin-worth` is the
top-ranked question and covers what *determines* value without ever saying
where to look it up. Search demand is its own ("how to look up coin values",
"coin price guide", "how to check what a coin sold for").

Sending a reader out to verify the number independently is what a site
confident in its numbers does, and it is the opposite of the thin-page smell.

**Still to decide: whether those outbound links carry an eBay Partner Network
tag.** That is a monetization decision and a `/privacy` change, not a link
format, and SPEC.md has monetization open. Settle it while the URL is generated
in one place rather than retrofitting a tag onto thousands of links.

**Build order.** The first two do not depend on the data deal:

1. The new common question on looking a value up. **Still to do**, and the
   grade pages have a hole where its link goes: block 6 explains the eBay
   filter and the guide row per coin, and the conceptual half -- why sold is
   not asking, why the Red Book is retail, why a dealer's offer sits below
   every published number -- has nowhere to live yet.
2. `/coin-info/graded/<series>`, behind the flag that already exists.
   **Still to do**, and it is now the missing hub: four grade pages link to
   each other and up to the coin, and nothing lists the ladder across dates.
3. The auction-archive import into `values`/`valueAsOf`/`sources`. **Still to
   do**, and it is what replaces the hand-researched 1932-D figures.
4. Per-grade URLs, for the coins the predicate picks and the grades that
   separate. **Built, as a four-page sample on the 1932-D** -- see the top of
   this file. The route, the copy module, the validators and the build checks
   are done; what is left is coins and rows to feed them.

### The grade page template

Owner's layout, 2026-09-21, with four collisions resolved inline. Blocks in
render order. Every one states where its content comes from; nothing on this
page is typed per coin.

**0. Breadcrumb and `crumbs`.** Home > Coin Values > `<group>` > `<type>` >
`<coin>` > `<grade>`. One array, `Base.astro` builds the trail and the
`BreadcrumbList` from it, and a build check fails the markup without the trail.

**1. `<title>` and H1.** H1 is `<coin> in <grade>` -- "1961-D Washington
Quarter in MS67". The `<title>` adds the word the query carries: `<coin>
<grade> Value` plus whatever else fits, run through `fit()` in
`src/lib/meta.ts` against `TITLE_MAX`, measured with the ` | AboutMyCoin`
suffix `Seo.astro` appends. "1961-D Washington Quarter MS67 Value" ships at 49
characters and has room; the longer bust-half names are what the fitter is for.
Dropping "Value" would leave the title naming the coin without naming the
question, which is what the catalogue's own `seoTitle`s already avoid.

**2. The BLUF.** *Not* "This coin is a `<coin>` in a grade of `<grade>`.'' That
sentence tells the reader what they typed and answers nothing, and "every page
answers its question in the first sentence" is the rule the whole site is
written to. The first sentence states the value and the reason:

> A 1961-D Washington quarter in MS67 sells for `$low`-`$high`, many times the
> `$melt` of silver in it, because at this grade the coin is bought by
> collectors rather than weighed.

Generated from `values`, the melt figure and `commonality`, so it cannot
disagree with the blocks under it. On a coin with no sales data the same
sentence leads with the floor instead, which is still an answer.

**3. What the grade means.** Heading is the grade, body is the description.
The owner's plan was one description per grade reused across all pages; that
is a paragraph on every page, which is the doorway-page shape and trips the
exact-string check. The fix costs one field per **series**, not per coin:
generate the sentence from the grade *and* the series' wear points, so MS67 on
a Washington quarter names the cheek and the eagle's breast where F15 on a
bust half names the drapery and LIBERTY. Same seventy definitions, parameterised
once, and the result is more useful than the generic form -- the reader is
holding one of these, not a diagram of the Sheldon scale.

**4. Where this grade sits.** The ladder: this grade against the ones either
side, with their values and their populations. Answers "what if mine is a point
better", which is the question a reader has the moment they read block 3, and
it is inherently per-coin because it carries that coin's figures. Carries
prev/next grade links and the "other grades" link to
`/coin-info/graded/<series>`.

**Grades with none known are absent from the ladder, not listed at zero.**
Owner's instruction and it is right: a row saying "MS69 -- none" invites the
reader to wonder whether one might turn up, and the melt section's "say None
rather than leave a blank" rule does not transfer, because there the figure is
zero and here the coin does not exist. Prev/next therefore step to the next
grade that exists, not the next integer.

**5. What it sold for.** Recent realized auction prices, with dates, from the
import. This comes **before** "how to look it up", not after: the sales are
the answer and the lookup is the verification. A direct eBay sold-comps link
for this coin and this grade -- `LH_Sold=1&LH_Complete=1`, the two parameters
that filter asking prices out.

The owner's "if it's a common coin, say so instead" branch is worth watching:
if the template needs that branch, the fan-out predicate should have excluded
the coin. A grade page whose honest content is "this is common, it trades at
melt" is the page the `commonality` rule exists to not build. Keep the branch
as a backstop, treat every page that renders it as a bug report against the
threshold.

**6. How to check it yourself.** Generated per coin, per the section above:
the eBay search, the PCGS/NGC guide rows for this issue, and a tie-back naming
this page's own range. Links to the new common question for what the sources
are and how to read them.

**7. The metal floor.** Only when the coin has `silverOzt`, `goldOzt` or
`platinumOzt`. **One figure, not a table and not a ladder** -- the melt page
owns the arithmetic and the ladder lives on the group archive. It is here at
all because it is the floor the grade premium is measured against, which is
what makes block 2's comparison mean anything. It carries `data-spot` so
`spot-dom.ts` rewrites it and the build check can re-derive it, and it carries
`spotBasis()`. One link out to the coin's melt page.

**Links to the series, throughout.** Block 3 takes the wear points from it,
block 4 links to its graded section, and the coin page and series page are both
one hop up. `related` throws on a coin not in the catalogue, so grade pages
link to grades of the same coin and to the series -- never sideways to a coin
that may not exist yet.

**Traps this template walks past.**

- **No `offers` in the JSON-LD.** The page states a price and the `Product`
  schema still carries none. That rule does not relax because a number appeared
  on the page; `tests/build-smoke.test.mjs` checks the built HTML.
- **No date on the page.** The figures carry `valueAsOf`, the melt figure
  carries `spotBasis()`, and nothing carries `dateModified`.
- **One FAQ question, one page.** "What is a 1961-D quarter worth in MS67?"
  goes in `faq-registry.ts` and must not collide with the coin page's question.
  The registry throws, on every build.
- **No melt page per grade.** Grade does not change metal content, so the
  mirror stops at the coin. Block 7's link points at the coin's melt page.
- **A population of zero below the certification threshold is not an absence.**
  See the population section above. The gate reads it as "ungraded, not
  unknown" there, and as "none exist" above it.

## Next

0. **The three dark series pages, and the 1944 Lincoln cent first.**
   mercury-dime, lincoln-cent and morgan-dollar are written and validated but
   not built, because no coin carries those tags yet. One Mercury dime, one
   Lincoln cent and one Morgan dollar turn on three complete series pages
   between them.

   Start with the **1944 Lincoln cent**, which pays for itself three times
   over: it is what somebody holding a wheat penny actually searches for, it
   lights the `lincoln-cent` series page, and it is the only way the RD/RB/BN
   rungs get a render site — without it they are a generator with nothing to
   render, which the house rules say to delete rather than keep warm. It needs
   `wear` points on the series tag and a research sheet; the ladder will be
   short, because a common cent has published figures at the top of the
   mint state range and nowhere else.

1. **Populate the catalogue.** Started: the 1964 Washington quarter is in,
   and its copy is a first pass to be refined. Adding one coin creates its
   page, its composition archive, its denomination archive and its tag pages
   with no other edit; `coin-catalog.example.ts` shows the shape of an entry.
   Note that `related` throws on a coin that is not in the catalogue, so the
   1964 quarter's links to the 1965 quarter and the Mercury dime were dropped
   and go back in when those pages exist.
   Still to decide (SPEC.md "Open"): where the rows come from — hand-written
   for a narrow high-traffic slice, or a licensed catalogue.
2. **Write the catalogue generator**, once there is something to generate from:
   `scripts/build-catalog.mjs` -> `src/data/coin-catalog.ts`. The seam exists
   and the file header describes the contract it has to honour.
3. **Market data.** Two separate things, and only one of them is still open.

   *Graded price ranges* — the source question is now answered: auction-realized
   prices from the Heritage and GreatCollections archives, imported into
   `values`/`valueAsOf`/`sources`. See "Grade pages, and how the catalogue fans
   out" above for why, and for the rule deciding which coins fan out by grade at
   all. Until that import exists `values` stays empty and every coin page keeps
   its honest "graded price ranges are not published yet" section. Do not fill
   the field from a scrape nobody can name on the page.

   *Spot metal prices* — **built.** metals.dev, through a cache the endpoint
   refreshes itself. `/api/spot` serves the JSON document at `SPOT_CACHE_URL` (a
   Vercel Blob object) and calls the feed only when the last call was more than
   twenty hours ago, writing the result back. No cron: the reader who arrives
   after the interval pays for the refresh. Two guards keep the metered feed
   inside a hundred calls a month — the time of the last call and a month-to-date
   count, both stored in the cached document — and every failure path serves the
   best snapshot on hand at 200.

   **What is left is four dashboard steps, in `.env.example`:** create and
   connect a Blob store, set `METALS_DEV_API_KEY` in Production only, hit
   `/api/spot` once so the first document is written, then copy that object's URL
   into `SPOT_CACHE_URL`. Do not stop after the third: a document whose URL the
   handler has not been given is a document whose call count it cannot read.
   Until then the endpoint serves the built-in reading and nothing is broken.

   The built-in figure — what a crawler and a no-JavaScript reader see — is kept
   current by two things, because it only changes when the site is rebuilt:
   `npm run build` takes its figure from the cached document (free, no key, no
   metered call; `scripts/prebuild-spot.mjs`, which is a no-op on any failure),
   and a successful refresh pokes `SPOT_DEPLOY_HOOK_URL` to trigger that build.
   Set the hook to get roughly one deploy a day; leave it unset and the built-in
   figure is as old as your last deploy.

   Do **not** replace this with a direct feed call behind a long CDN cache. The
   edge cache is per-region and purged on every deploy, so that is
   *(regions) × (1 + deploys)* calls a day against a monthly allowance, and a
   stateless function cannot count its own calls. `src/server/spot.ts` has the
   arithmetic. `npm run spot` refreshes the built-in fallback in
   `src/data/spot-snapshot.ts` and is not the update path.

4. **The mark** — RENAME.md step 4. `public/favicon.svg`,
   `src/components/Logo.astro`, `scripts/generate-brand-assets.mjs`, then
   `npm run assets`. Also the OG card headline and `imageAlt` in `Seo.astro`.
5. **Design** — done for now: `src/styles/global.css` carries the new palette,
   the radius tokens, the heading treatment and the two coin motifs. What is
   still outstanding is the *mark* (step 4 above) and a webfont, which needs
   `assets/fonts-src/` populated and `npm run fonts` before
   `SITE.preloadFonts` can be set. Headings currently lean on weight and
   tracking precisely because there is no font file.
6. **Environment** — `cp .env.example .env`, generate the two signing secrets.
7. **CSP** — settled, and no change is needed. The browser fetches this site's
   own `/api/spot` and never a feed, so `connect-src 'self'` already covers it
   and will still cover it on the day a provider is wired in. Only revisit this
   if somebody proposes fetching a feed from the page, which they should not:
   it would put the API key in the client and the feed's domain in all three
   host configs.
8. **Remaining content** — `src/lib/pricing.ts`, the home page, `/about`.
9. **The next common questions.** The five slugs listed in the header of
   `src/data/questions.ts`, in that order. The fifteen written on 2026-09-20
   interlink with each other and with the catalogue already; a new one links
   into the existing set rather than sitting beside it, because `related` and
   the body-link check both throw on a path the build does not produce.

## Traps, carried over and new

- The folder name must stay exactly `aboutmycoin.com`; a build test asserts it
  equals `SITE.domain`.
- `src/lib/pricing.ts` is still starter placeholder content. Nothing renders it
  now, but the moment `_pricing.astro` is renamed back it will, and the build
  check will fail until the *_AVAILABLE flags match the copy. That is the check
  working, not a bug to route around.
- The home page ships in every build. The holding page and `HOME_PLACEHOLDER`
  were deleted on 2026-09-23 at the owner's instruction — a blank `/` is not to
  be shipped again, now or in the future — so the real page in
  `src/pages/index.astro` is what a deploy serves. Its three "First real thing
  it does" feature cards are still starter copy; the hero, the sign-up box and
  the FAQ are not.
- **The email list is switched on in production**, confirmed by the owner on
  2026-09-23: `RESEND_SEGMENT_ID`, `RESEND_SIGNUP_EVENT` and the contacts scope
  on `RESEND_API_KEY` are all set there, so the footer box really does file an
  address. They are deliberately NOT in `.env.example` with values, and a local
  checkout without them answers 503 and says the list is not switched on --
  which is the honest local failure, not a regression.
- `/privacy` and `src/lib/third-parties.ts` are true of the starter as shipped,
  and the spot-price feed did not change that. `/api/spot` calls metals.dev
  server-side, with nothing of the reader's in the request, and the browser only
  ever talks to this origin — so `connect-src 'self'` still covers it and no
  feed's domain appears in the three host configs. They stop being true the day
  something a *page* loads or fetches comes from another origin, which is the
  reason never to let a page fetch the feed itself.
- **The spot price is the only timed thing on the site.** `spotBasis()` prints
  "based on spot prices at 20 September 2026 23:27 UTC" beside every figure
  worked from it, read off the snapshot rather than typed, and it names no
  vendor. Nothing else — no page, no entry, no sitemap row — carries a date at
  all. A test that pins a literal price or timestamp will start failing the day
  after `npm run spot` runs, so assert against `REFERENCE_SPOT` and
  `spotBasis()` instead.
- **A series page is built only when a coin carries its tag.** Three of the
  four are written and invisible right now. That is the same rule every
  archive follows and it is not a bug, but it means a mistake in those three
  entries is caught by `validateTaxonomy()` and by nothing else until a coin
  arrives -- the HTML checks skip a page that was not built.
- **`SeriesInfo` has no field for a price, on purpose.** Do not add one. The
  key date table is the most tempting place on the site to type a figure, and
  a build check fails if one appears there.
- **Archive copy is not written in a template.** Every sentence on a
  /coin-info archive comes from `src/lib/catalog-copy.ts`, and a build check
  compares the built HTML against it page by page. Typing a heading back into
  an `.astro` file is the failure it exists to catch.
- **A generated paragraph must name its own subject.** The validator fails a
  paragraph used on two pages, which is how it stops a formula producing
  boilerplate. If a new branch of generated copy would read the same for every
  tag of its kind, interpolate the tag.
- **`validateTaxonomy()` throws, it does not warn.** An unregistered tag, a
  duplicate slug, a group named after a reserved segment or two pages claiming
  one FAQ question all fail the build. That is deliberate; do not soften it to
  a console warning to get a build through.

## The series cheat sheet (2026-09-19)

A series page now opens with a **cheat sheet**: three lists naming every key
date, variety and mint error worth a second look, above the glance table. It
is derived from `SeriesInfo`, so there is nothing to keep in step. `SPEC.md`
has the reasoning, `COIN-ARTICLE-GUIDE.md` has the writing rules.

New this session:

- `MintError` in `src/data/coin-schema.ts` and `SeriesInfo.errors`. An error
  is a planchet, a variety is a die: `check` is the magnet or the scale and
  `caution` is required, because the reader almost certainly has the ordinary
  coin.
- `Variety.coin` removed. Varieties and errors are listed and never linked,
  and get no pages — the schema no longer offers the option. Key dates still
  link.
- Errors written for the Lincoln cent (1943 bronze, 1944 steel, 1982-D small
  date in bronze) and the Washington quarter (1965 on a silver planchet),
  each verified against PCGS/NGC census and discovery reports before printing.
  The Mercury dime and the Morgan dollar have none documented, so neither
  renders the section.
- `tests/style.test.mjs` was spreading `keyDates` as objects into a
  string-only `push`, so the longest prose on every series page — `why`,
  `lookFor`, every caution — had never been style-checked. Fixed, and
  varieties and errors added.

Closed on 2026-09-19: the 12 over-long meta descriptions and three over-long
titles. `src/lib/meta.ts` now owns the limits and the ` | AboutMyCoin` suffix
rule, `Seo.astro` calls it, `catalog-copy.ts` and `melt.ts` fit every generated
title and description to it, the six hand-written strings that were over were
trimmed, `/dev/pages` reads the same numbers and treats them as faults rather
than notes, and a build check measures the shipped HTML. The suffix was the real
bug: five melt titles were 74 characters because every check measured the string
before it was appended to.
