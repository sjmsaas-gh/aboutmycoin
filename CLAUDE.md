# aboutmycoin.com

> **New session, start here.** Read `SPEC.md` first -- it holds the product
> decisions (pricing, tone, positioning, naming) and the reasoning behind them.
> Then read `NEXT-SESSION.md` for exactly where the build stopped and what is
> next. Adding a coin has its own procedure in `ADDING-A-COIN.md` and adding a
> whole run of one has another in `ADDING-A-SERIES.md`;
> `RUNBOOK-MORGAN-DOLLAR.md` is the next series written out step by step,
> including the seven places the price sources are still hardcoded to quarters.
> `BOTS.md` records two jobs that are planned and not built, and the rules they
> have to run under. With `npm run dev` running, `/dev` is a workbench that
> shows every URL the site builds, what each page declares, and what each coin
> created.

A coin database with value calculators and identification tools. For collectors
and for people who have just found a coin and want to know what it is and what
it is worth -- the second group is larger, arrives from search with one specific
coin in hand, and has no vocabulary for grading. Every copy and design decision
follows from that: the site has to answer "what is this and what is it worth"
before it asks anyone to learn anything.

What is sold, and at what price, is not decided yet. See `SPEC.md`.

---

# Information first, value second

**The owner's decision of 2026-09-22, and it outranks the section rules below
wherever they disagree.** The catalogue was built as a price guide with facts
attached, and it read like one: "Coin Values", "Price Guide", "and What They
Are Worth" on every heading, title and FAQ question down the tree, and six and
a half thousand grade pages whose loudest element was `TBD to TBD` where a
figure was meant to be.

What this site actually knows, and can stand behind without qualification, is
the other half. What a coin is, when and where it was struck, how many, what
it is made of, which mints did not strike that date, how to tell it from the
one beside it. Plus exactly one figure it computes rather than guesses: the
melt value, weight in troy ounces times a spot price it reads and timestamps.

So three rules, and they run through every generated string on the site:

- **The H1s lost the word "value"; the `<title>`s kept it; "price guide" is
  gone from both.** An H1 is read by somebody who has already arrived and can
  afford to name the subject -- "Silver Coins", "1980-P Washington Quarter". A
  `<title>` is competing in a result list and has to name the question, and
  "silver coin values" is the phrase people type. The pages answer it: a melt
  figure worked from a live spot price, a researched graded range where one
  exists, a scarcity verdict, and a sold-comps search filtered to that exact
  coin and grade where none does. **Telling a reader how to find a figure is a
  legitimate thing for a page titled "Value" to do; stating one the site has
  not got is not, and that is enforced in the body rather than in the title.**
  What does not come back anywhere is "Price Guide" -- "value" is the question
  this site answers and "price" is an answer it cannot give, because it never
  sees the coin. `primaryKeyword` was never touched.
- **`/melt-value` and the whole price pipeline are untouched.** Every coin page
  keeps its melt block, the group archives keep the spot ladder, and
  `npm run prices` and `npm run grades` go on gathering graded figures. A
  researched figure the site HAS is printed, with its provenance. Nothing about
  gathering changed.
- **Where there is no figure, there is no slot.** No placeholder, no blank
  cell in a column of blanks, no heading over an absence, no `<title>` or meta
  description or FAQ question promising a price the body does not state. The
  page renders what it knows and stops.
- **The URL segment is `/coin-info`, not `/coin-value`.** `COIN_INFO_ROOT` in
  `coins.ts` is the one place it is written. This broke "a slug is never
  changed once published", knowingly, and it was the last moment it could be
  broken: it was done while the site was still behind the pre-launch lockdown,
  so nothing was indexed and the rename cost a `sed`. **That window is now
  shut.** `DISCOVERABLE` is true, the real home page ships in every build,
  there is no holding page and no `HOME_PLACEHOLDER`, and the whole catalogue
  is live and crawlable. The next slug change costs the catalogue renumbered,
  and a static build has no redirects to soften it.

---

# House rules

Read this before changing anything. These rules were paid for on an earlier site
in this family; the reasoning matters more than the letter of them, so where a
rule says "why", that is the part to preserve.

## Architecture

- **No database, no auth provider, no backend framework *at runtime*.** If a
  feature seems to need one, redesign the feature. State lives in Stripe
  metadata, in a signed token, or in the user's own browser.
  A **build-time** database is fine and is the plan for the coin catalogue: it
  writes `src/data/coin-catalog.ts`, that file is committed, and `astro build`
  turns it into HTML. The line is what a *visitor's request* touches, and the
  answer to that stays "a file on a CDN". A build that fetches rows live would
  cross it — see `src/data/coin-catalog.ts` for why the snapshot is committed.
- **The build stays static.** `output: 'static'`, no SSR, no adapter-specific
  runtime APIs on any page. Server code goes in `src/server/` as a host-agnostic
  handler over Web `Request`/`Response`, with a thin adapter in `api/`.
- **The three host configs must agree.** `vercel.json`, `netlify.toml` and
  `public/_headers` express the same headers. Edit one, edit all three.
- **`dist/_redirects` carries no rules, and a generated rule set must not come
  back.** It held one trailing-slash rule per route -- 22,638 of them, 2.4 MB --
  and that file could not work on either host it was written for. Cloudflare
  Pages caps the file at 2,000 static rules and silently drops the rest;
  Netlify normalises the trailing slash BEFORE redirect rules run, so every
  rule was a no-op there. Vercel, the deploy target, does the job with
  `"trailingSlash": false` in `vercel.json`, which is the real mechanism.
  **The one-line version cannot be written either**: neither host allows a
  splat anywhere but the end of a path, and a trailing splat matches the
  slashless form too, so it redirects it to itself forever. The reasoning is
  over `trailingSlashRedirects()` in `astro.config.mjs` and
  `tests/build-smoke.test.mjs` fails on a file over the cap or on a rule with a
  splat before the end of a path.
- **Nothing large comes from the app origin.** Put it behind `SITE.assetOrigin`
  and add that origin to the CSP in all three configs at the same time.

## The coin catalogue

The full reasoning is in `SPEC.md` and in the header of `src/data/coins.ts`;
the procedure for adding one is `ADDING-A-COIN.md`. These are the rules that
get broken by accident.

- **Two axes in a URL, everything else a tag.** A coin's path is
  `/coin-info/<composition>/<denomination>/<coin>`, and those two facts are in
  the path because they can never be revised. Country, series and key-date
  status are tags, because they can be. Adding a third path segment is a
  decision to renumber the site later.
- **A mint mark is a page only when it earns three answers.** Different
  mintages worth stating, a different identification step, and both phrases
  typed. The 1960-1964 Washington quarters split on all three and are the
  precedent; the header of `coin-catalog.ts` records what the merged pages got
  wrong. Anything short of all three is a spec row, not a URL -- fanning a
  series out by its mints is the generated-catalogue failure with a letter
  instead of a year.
- **Composition belongs to the issue, not the series.** A 1964 quarter is
  silver and a 1965 quarter is clad, so the Washington quarter lives in two
  branches and its series tag reunites it. This looks like a bug and is the
  design. Hoisting the group up to the series would make one coin's URL depend
  on a fact about a different coin.
- **A slug is never changed once published.** Not to fix a typo, not to improve
  a keyword. There are no redirects in a static build beyond the generated
  trailing-slash rules.
- **Registries throw, they do not warn.** `validateTaxonomy()` fails the build
  on an unknown group, an unregistered tag, a duplicate slug, a reserved
  segment or two pages claiming one FAQ question. Do not relax it to get a
  build through; every one of those failures is silent in the output.
- **An archive page with nothing on it does not get a URL.** Groups, types and
  tags are all filtered to the populated ones. Nine groups times eight
  denominations is seventy-two possible archives and only eight exist.
- **Never print a value the site did not measure.** `values` requires
  `valueAsOf` and `sources`, enforced. A coin with no market data says so in
  its own section rather than guessing, and the metal arithmetic — content in
  troy ounces times spot price — carries the page in the meantime.
- **`Product` schema carries no `offers`.** The site does not sell coins and
  does not know what one will fetch. A price in machine-readable form that the
  visible page refuses to state is the mismatch Google issues manual actions
  for; `tests/build-smoke.test.mjs` checks the built HTML for it.
- **The series page is the series tag page.** `/coin-info/series/<slug>`
  does not exist and must not: a series is already a tag, the tag already has
  a page, and a second URL for one subject is the site competing with itself.
  `series` stays a reserved segment with nothing behind it. The extra
  sections come from `SeriesInfo` on a `kind: 'series'` tag and render only
  when it is filled.
- **A fact belongs to the run or to the issue, never to both.** The years,
  the designer, where the mint mark sits, the metal eras, the key dates and
  the varieties are series facts and live on the series page. Weight,
  diameter, metal content and the melt figure are issue facts and live on the
  coin page. The coin page keeps a three-row glance at its series and a link
  up; that is the only overlap allowed, and `tests/build-smoke.test.mjs`
  checks the link is really there.
- **A key date is a date, a variety is a judgement, an error is a
  measurement.** That is the whole taxonomy of the series cheat sheet, and
  each list sorts by how the reader settles it. A key date is read off the
  coin with no skill at all, so it gets a mintage and a reason. A variety
  needs the reader to look at one feature and decide, so `lookFor` is
  required and `caution` says what the lookalike is. An error is the wrong
  blank in the press, so nothing about the design differs and looking proves
  nothing: `check` is the magnet or the scale, and `caution` is required
  because the reader almost certainly has the ordinary coin. Most people who
  think they have a doubled die have machine doubling, and a row that does
  not say so is a row that sends somebody to a dealer to be disappointed.
- **The cheat sheet is derived, never written.** It is the first thing on a
  series page — every label worth a second look in one scan — and it is built
  from `keyDates`, `varieties` and `errors`, so it cannot disagree with the
  tables that prove it. There is no field anywhere for "cheat sheet". A
  summary above a detail that is typed by hand is a summary that drifts and
  then gets believed, because it is the part people read.
- **Varieties and errors are listed and never followed.** No link out, no
  page each. Every one is a specialty with its own literature and its own
  authentication problem, and a page per doubled die is a divergence that
  never converges. Neither type has a `coin` field, and
  `tests/build-smoke.test.mjs` fails if a link appears in the cheat sheet.
  Key dates are the exception: a key date is an ordinary issue of the series
  that happens to be scarce, so it is a catalogue coin like any other.
- **Only errors documented on that series.** Off-centre strikes, clipped
  planchets and die cracks happen to every coin ever struck, so they are a
  common question and not a block repeated on every series page. Most series
  have none, and then the section does not render.
- **Every row of a cheat sheet is checked before it is printed.** Mintages
  from the mint's published figures, populations from a grading service's
  census or a published discovery report, weights from the specifications. A
  row that cannot be traced to one of those does not go in. `COIN-ARTICLE-GUIDE.md`
  has the writing rules for all three lists.
- **No price ever enters `SeriesInfo`.** Which dates are scarce has been
  settled for a century; what they fetch is true for a week. There is no
  field for it and a build check fails if a figure appears in those sections.
- **Four sources vote; the majority wins; a tie is published and says so.**
  TWO SOURCES IS NOT ENOUGH and that is the lesson to carry to the next series:
  two can only agree or disagree, so every disagreement is a coin with no page,
  and the first run of this pipeline withheld thirty-three of them including
  whole years. A third and fourth brought that to nothing, because most of what
  looks like disagreement is one site's transcription slip and a third vote
  identifies it. Where the vote ties, the coin is STILL published -- completeness
  first, correctness a very close second -- with `mintageCaveat` naming the
  spread, and the tie goes to the HIGHEST figure, because the worst thing this
  site can do to somebody holding an ordinary coin is tell them it is scarce.
  `npm run verify` crawls sources three and four and `npm run report` prints
  only what is left to decide.
- **The primary source decides which coins EXIST; the vote decides the figure,
  and those were never the same job.** The primary is a Wikipedia mintage table
  everywhere but one series, and that is a fact about shape rather than about
  authority — the pages cite collector sites and say so. A secondary source may
  confirm a figure, outvote it or fill a declared gap; it may not invent a coin.
- **A series whose primary source does not exist names another, and the
  owner's decision of 2026-09-22 is that it is Numista. The Mercury dime is the
  only one.** Wikipedia carries no mintage table for that series — the article
  has no table at all and there is no "dime mintage figures" page beside the
  cent's, the nickel's, the quarter's and the half dollar's — so under the
  ordinary rule it generates nothing, not because the figures are doubtful but
  because the thing that seeds them is absent. `primary` on the series' entry in
  `fetch-mintages.mjs` names Numista, its four collector sources vote exactly as
  they do elsewhere, and 84 issues came out on five sources with nothing
  withheld and no tie. Numista rather than one of the collector charts because
  it is already a first-class source here, its responses are cached and
  committed under `data/numista/`, and it is a catalogue with an editorial
  process rather than a blog with a table on it. What it costs is visible and is
  the system working: Numista folds the proofs into its Philadelphia totals from
  1936 to 1942, and three sources outvote it on all seven.
  **Do not let the primary vote twice.** Its figures are the ones being voted
  ON, so `numistaRows` is not read a second time as the second source — counting
  it there would make every disagreement a tie the primary wins.
- **The extra mintage sources are registered PER SERIES**, the same move
  `SERIES` in `grade-sources.mjs` made for the price guides and on the same
  day. Every URL in the old flat list names a quarter — an index path, a slug
  shape, a path regex — so a second series reached none of them. Three shapes
  and which one a source gets is decided by what the SOURCE is: `indexes`
  enumerates itself, `urls` is addressed by a slug built from a design's name,
  and `pages` is the whole series on one chart, which is the shape a one-design
  series takes. `npm run verify -- <series>` narrows the run and KEEPS what is
  already in the file for the others: the quarter's crawl is eight hundred
  pages, and a narrowed run that silently dropped its votes would withhold
  every coin they settled.
- **A near-tie on a collector issue is one figure, not two.** A proof's mintage
  is how many were SOLD, revised as the audits land, so 512,798 and 512,729 are
  one number either side of a correction and the later one is the higher.
  `NEAR_ENOUGH` is half a per cent and applies only to the collector finishes; a
  circulation mintage is a production total that does not drift, so a tie there
  is one source being wrong.
- **A coin with no total still gets a page, and states no mintage.** Where some
  of a year's designs have no published figure, summing the rest and calling it
  a total is worse than printing nothing, so `coverage` records the gap and the
  page says why the number is absent.
- **A figure the sources disagree about is printed with the disagreement.**
  `npm run mintages` fetches the primary pages and cross-checks every one
  against Numista (`scripts/numista.mjs`, a build-time credential, every
  response cached under `data/numista/` and committed). Four outcomes and all
  four are recorded per figure: both agree, the primary alone, the second alone
  — accepted only into a coin the primary already publishes, or this would add
  the coins the primary was told to leave out — and disagreement, which refuses
  the design and takes its whole coin with it. A single source is the status
  quo and the file says so; a *known* conflict is evidence of error. This is
  the grade pages' "two figures minimum, or the rung is not a page", applied
  to a mintage. It has already caught Wikipedia repeating one row's figures in
  another and Numista holding a mint's first announcement rather than its
  audited total, in the same run — which is why neither source may be
  preferred by rule.
- **A DECLARED GAP is not an exclusion, and it is the only way a coin the
  primary source does not carry gets built.** "This table does not cover
  proofs" and "this table was told to leave the Bicentennial out" are different
  claims, and the merge could not tell them apart — so twenty-six Morgan proofs
  that exist, that people search for by name and that three sources give one
  figure for had no page. A source may now declare `gaps` beside the `missing`
  sentence it already writes for a reader, and a secondary figure inside one
  builds its coin. The bar is HIGHER than for a coin the primary carries, not
  lower: `MIN_GAP_SOURCES` is two that agree, where a coin the primary states
  may stand on that one source. A figure the primary states is being checked
  and an absence of confirmation is an absence of checking; a figure nothing
  states is being taken on trust, and one quotation of it cannot be told from a
  typo.
- **A conflict is settled in writing, against a third source, or not at all.**
  `ADJUDICATED` in `fetch-mintages.mjs` is judgement and the merge is
  mechanics. An entry states the year, the design, the **finish** and what the
  third source said; the finish is required because an entry without one
  silently settled the 2018-S proofs on the strength of a circulation figure.
  An entry with nothing behind it is a preference, and a preference is what the
  list exists instead of. **`take` may be a FIGURE rather than the name of a
  source**, and it needs to be exactly once: inside a declared gap both sources
  are secondary, so "take the primary" names nothing. `checked` is required
  either way, which is what keeps that form a decision rather than a preference
  typed in as a number.
- **A reverse hub may get a page; a variety may not, and the difference is not
  a matter of degree. The owner's decision of 2026-09-22.** `SeriesInfo.hubs`
  holds the exception and it holds two entries on this whole site — the eight-
  and seven-tail-feather reverses of 1878. Three tests, all three required at
  once: the sources state a SEPARATE MINTAGE for it, so the page has a figure
  of its own rather than the year's repeated; a reader tells it apart by
  COUNTING or reading something, with no loupe and no judgement; and the
  figures are far enough apart to matter, 749,500 against 9,759,300. A doubled
  die fails the second — it is a call somebody makes and mostly gets wrong —
  and every VAM fails the first. The seven-over-eight reverse fails it too:
  its coins are counted inside the seven-feather figure, so a page for it would
  either state a mintage it has not got or restate one that is already
  somewhere else. It stays a `varieties` row, which is what that list is for.
- **A hub never replaces a date.** The year's own coin keeps its page and its
  combined total, because that is the phrase almost everybody types and the
  reader who has just found an 1878 does not yet know the question exists. Its
  `mintageNote` says the figure is the two added together and its checklist
  tells them to count. Three pages, and the split is checked rather than
  trusted: `tests/mintages.test.mjs` fails if the hubs do not come to the year
  the primary source states, because otherwise the page almost everybody lands
  on is the one that disagrees.
- **A hub is carried on the `Coin` as well as inside its name**, because the
  grade pages' `<title>` falls back to a short STEM — year, mint mark,
  denomination — when the full name will not fit, and a stem that did not know
  about hubs gave both 1878 proof reverses the title "1878 Dollar PR70 Value"
  on all eleven proof rungs. `validateGradeCopy()` threw, which is what it is
  for. A long name is not the fix: the fallback is the thing that collides, so
  the fact has to be a field.
- **A hub is a fourth axis of an issue and its slug token is permanent**, like
  a finish's, and it comes after the finish —
  `1878-proof-8-tail-feathers-morgan-dollar`. Last, because it is the axis a
  reader is least likely to type and a slug that opened with it would bury the
  year. The hub phrase sits OUTSIDE the name's parenthetical, for the same
  reason a grade page's headline carries the code and not the label:
  `normaliseQuestion()` strips parentheticals before every uniqueness check
  here, so "(8 Tail Feathers)" would normalise onto the plain year and three
  pages would collide in silence.
- **A hub registry says how to TELL THEM APART and never which is scarcer.**
  That clause was in it for one afternoon and was false on half the pages it
  reached: among the circulation strikes the eight-feather reverse is one coin
  in fourteen, and among the 1878 proofs it is 500 of 750 and the COMMONER of
  the two. Scarcer or commoner is derived from the two figures on the page it
  prints on, which is the only place it can be got right — and a registry
  asserting it would go on asserting it the day a source revised the split.
- **A finish is an axis of an issue, like a mint mark, and its slug token is
  permanent.** From 1992 San Francisco strikes two quarters of every date and
  from 2012 three: a clad proof, a silver proof and an uncirculated coin sold
  in Mint rolls. `FINISH_SLUG` in `coin-copy.ts` is the only place the tokens
  are written, the bare form belongs to the proof, and the bare form can only
  ever belong to ONE coin per (year, mark) — which is why the twenty-two
  markless Philadelphia proofs of 1936-1964 are out of scope rather than
  published, recorded in `outOfScope` with the collision that stopped them.
- **A coin that was never in a till gets no scarcity verdict.** `commonality`
  is a statement about survival and survival is only a question for a coin that
  circulated; every proof was bought by somebody who wanted it and kept it, so
  the thresholds would print "Scarce" over ninety cheap coins. `Coin.finish`
  carries a generated sentence and suppresses the verdict, the badge and the
  market note. It is a fifth branch rather than a fifth `commonality` value
  because those four are read as a ladder and there is no honest rung on it for
  "different question".
- **Say what a mintage COUNTS whenever it is not one striking of one design.**
  From 1999 a mint strikes five or six reverses a year and a page belongs to
  the (year, mark, finish), so the figure is a sum, and a sum in the slot where
  a 1950-D page prints one striking's mintage is the site changing what a word
  means halfway down its own catalogue. `Coin.mintageNote` is generated from
  the figures. Where every design carries the same number — every proof,
  because the figure is the number of sets, and 2019-W and 2020-W at two
  million apiece — `perDesign` is set, and it is what the page leads with and
  what the scarcity thresholds are applied to. Ten million is an accounting
  fact about West Point; two million is why anybody is looking.
- **A sum must cover every design struck, and no design twice.** Both are
  checked and both have failed. A coin whose figure covers four of five designs
  is withheld, because the sentence over it would claim to be a total. And the
  two catalogues do not call one design by one name, so they are paired
  loosely — every time the pairing failed, the design looked absent from one
  side, was filled as a gap, and the coin came out with one design more than
  the mint ever struck: six on the 2019-W page, seven on the 2009 pages, six on
  2017's. `tests/mintages.test.mjs` holds each as a case.
- **Existence and price are two different questions.** The generated
  identification checklist says which mints did NOT strike a date, and it reads
  the `attested` list in `data/mintages.json` — every (year, mark, finish) the
  sources showed — rather than the catalogue. A coin withheld for a source
  conflict is absent from the catalogue and present in the world, and reading
  the catalogue made the 2012-S page say "There is no 2012-D. Denver struck
  none of these in 2012" about five hundred million coins.
- **`Mint.years` is a LIST of ranges.** San Francisco struck quarters to 1954,
  struck none for thirteen years, and has struck proofs since 1968. One range
  claims either that it never stopped or that it never started again.
- **`compositions` is a timeline; `finishCompositions` is not.** The first is
  ordered, gapless and covers the whole run, because the series page reads it
  out as "the metal changed partway through the run" and the date is what tells
  a reader which era they hold — so an era splits when the reverse or the
  obverse changes and not only when the alloy does, and the GROUP stays the same
  across such a split so it never reaches a URL. The second holds the
  compositions struck in a collector finish only, which overlap the run one coin
  a year: 1999 is both clad and silver, and folding that into the timeline makes
  the page claim the date decides the metal when it does not. The importer reads
  the timeline first and falls back, so only the silver proofs need an entry.
- **A comparison in a checklist must name a coin the reader could be holding by
  its date alone.** "A quarter dated 1992-2018 has a uniform silver-grey edge"
  is what comes of comparing against a finish-only era, and all but a few
  thousand quarters of those years are clad. The edge and weight tests compare
  across metals and across timeline eras only.
- **The build never fetches, and neither does a second run of the import.**
  Every source response is cached and committed — `data/wikitext/` for the
  primary pages, `data/numista/` for the second source — so the exact text every
  figure was read out of is in the repository, a re-run costs nothing of a
  metered allowance, and the diff on those files is the record of a source
  moving. `--refresh` is the only thing that goes to the network.
- **The generator gets no exemption from "name the person who types this".**
  A registry makes ten thousand thin pages as easy as ten good ones.

## The cheat sheets

`/tools/cheat-sheets` is one page per series. The reasoning is in the header of
`src/data/cheat-sheets.ts`; these are the rules that get broken.

- **The tools live under `/tools/`, and that prefix is one constant each.**
  `CHEAT_SHEETS_ROOT` is the only place the cheat-sheet path is written, and
  `/tools/coin-calculators` holds its own. `/tools` itself is a hub, at the
  owner's instruction: the header carries a "Coin Tools" link and it was a 404
  on every page until the page existed. It is a heading and two cards and must
  stay that — it lists neither the sheets nor the calculators, because both of
  those hubs state their own contents and a third recital competes with them.
- **An empty tool is noindex, out of the sitemap and linked from nowhere**,
  the concession the unwritten cheat sheets get.

## The calculators

`/tools/coin-calculators` holds one calculator per metal. The reasoning is in
the headers of `src/data/melt-rows.ts` and the two lists over it.

- **One block, one row type, one validator, and a list per metal.** The block
  is `src/components/MeltCalculator.astro`, the shape and the checks are
  `src/data/melt-rows.ts`, and a page is a list, a lot name and its own copy.
  A second calculator that copied the block would be a second copy of the
  markup contract `spot-dom.ts` reads, and a check that exists twice is a check
  that gets fixed once.
- **A calculator has no arithmetic of its own, and no script.** The rows come
  from a registry, every figure is `meltValue()` and `formatUsd()` from
  `src/lib/spot.ts`, and the boxes are wired by `src/lib/spot-dom.ts` — the
  module `Base.astro` already loads everywhere. A quantity and a spot price
  move the same figures through the same functions, so they cannot round
  differently. An inline `usd()` is the thing this site removed once already.
- **A total is not a figure with a kind of its own.** It is
  `data-spot="sum"` over the lot its rows declare, and `spot-dom.ts` adds the
  rows up and writes the answer into the total's own attributes before
  rendering it. That is what keeps the total inside the check in
  `tests/build-smoke.test.mjs` that re-derives every marked figure on the site
  from its attributes — a total computed in a branch of its own would be the
  one figure nothing verifies.
- **Every box ships at none, and the reference figure lives on the row.** A
  reader has three kinds of coin in a jar, not one of everything, so the form
  opens empty — which means the total and every line figure are rendered at
  zero, and a page of zeros would be no use to a reader without JavaScript or
  to a crawler. So the melt value of ONE of that coin is a column of its own,
  before the box: it is what the reader is checking their coin against, it is
  true whatever they type, and it carries no `data-spot-qty`. The line total
  after the box is the same figure times the quantity, and the two are equal
  only at a quantity of one, so neither restates the other. Nothing on the page is rendered only by the browser.
- **A box's `value` attribute is the one place its default lives.** The build
  works the figures at it, `spot-dom.ts` falls back to it when a reader clears
  the box — so an emptied box means none on the calculator and one coin on a
  melt page, with no constant in the module — and
  `tests/build-smoke.test.mjs` re-derives every quantity-driven figure at it.
  Change the attribute and all three follow; type a quantity into any of the
  other three and they disagree at load.
- **A list is compositions, not issues, and it is not the catalogue.** A row is
  "90% silver quarter" or "$20 double eagle", because that is what somebody
  over a jar has; `coin-catalog.ts` holds dated issues with pages of their own.
  Neither is a subset of the other, and `validateSilverCoins()` throws when a
  United States coin in the catalogue states a silver weight no row for its
  denomination matches. Two files, two jobs, one set of facts.
- **The dollars are the exception, and it is the owner's, not an oversight.**
  The Morgan, the Peace and the 1983–2018 commemorative are three rows holding
  one figure, because those are the coins people ask for by name and a row
  called "Silver dollar" is a row a reader looking for a Morgan reads past.
  Everywhere else one row carries one figure, and `dated` leads with the names
  — "Barber, Mercury or Roosevelt" — which is what makes the other rows
  findable without splitting them. Do not tidy the dollars back into one row.
- **A row states a weight and a fineness; the silver content is derived.** No
  ASW is ever typed — the published figure is somebody else's arithmetic, and
  the page shows its own. The one exception is where the Mint states the
  content rather than the alloy (the Eagle), and the validator holds that
  figure against the weight beside it anyway.
- **Bars and private rounds are a band of their own, and they cite the stamp.**
  A drawer with silver in it has coins, bullion and bars, so all three are on
  the page — but a Mint specification says what a coin weighs, while a bar is
  worth what its maker stamped on it. `STAMPED_WEIGHT` is that source, the rows
  say "as stamped", and the note under each table says to weigh anything from a
  dealer you do not know. Do not file a private round next to an Eagle: the
  band is what keeps the difference in where the fact comes from visible.
- **A row orders itself, and the order is validated rather than sorted.**
  Circulating coins, then bullion coins, then bars, then denomination — off `TYPES` where the
  taxonomy registers it, off metal content where it does not — then the richest
  composition first. The gold denominations are the second case: all classic
  United States gold is 90% fine, so content order IS denomination order, which
  is what keeps the quarter eagle and the double eagle out of the taxonomy.
  Registering a type to sort a list would be adding a URL segment to the
  catalogue to decide the order of a table. The typed-or-untyped rule is per
  BAND, not per list, which is what lets typed silver coins carry untyped bars
  underneath without either band losing its order.
- **A calculator states no price a coin will fetch.** What a silver quarter is
  worth beyond its metal is the catalogue's answer, and the page links there.
  No key dates, no grading advice, no spot-price ladder: the ladder is on
  `/melt-value/<composition>`, one section over.

- **A cheat sheet is short, and it is the shortest thing on this site.** Two
  sentences on what the coin is, two on condition, one line over the date
  table, nothing over the error tables. It is a lookup table read standing
  over a jar, not an article. Anything needing a paragraph belongs on the
  series page, a coin page or a common question. The validator caps the two
  fields a paragraph would fit in, because this shape drifts back one sheet
  at a time.
- **The opening, the condition line and both error headings are generated**
  from `name`, `plural`, `denomination`, `identify` and `mintMarks`. A
  hand-written opening is where the extra paragraph gets in, and a generated
  one names its own series, which keeps a sentence off forty pages.
- **`name` is stored in sentence form and headings title-case it.** "wheat
  penny", "Washington quarter". A capital that is not in
  `PROPER_SERIES_WORDS` fails the build: there is no way back from "Wheat
  Penny" to knowing the W was decorative where the M of "Mercury Dime" was
  not.
- **`written` and `checked` are two flags; a sheet is noindex until both.**
  An unwritten sheet has nothing on it; an unchecked one has mintages nobody
  traced to the sources it names, which is worse because it looks finished.
  `cheatSheetIndexable()` is the single predicate.
- **`checked` is re-earned on every build, not set once by hand.** It was a
  boolean somebody flipped after reading a table, and nothing held it to
  anything afterwards -- the same shape as a generated ladder nobody
  re-imported: true on the day it was typed and silently false from the moment
  a figure moved. `tests/cheat-sheets.test.mjs` now holds every date row of a
  checked sheet against `data/mintages.json`, the site's own four-source
  mintage pipeline, and a sheet may not be `checked` -- and therefore may not
  be indexable -- for a series the pipeline has no data for. **If one of the
  five uncovered sheets should be indexed, run the pipeline for that series;
  do not set the flag.** The first run of that check found the 1880-CC Morgan
  published at 495,000 against a real figure of 591,000, on a sheet that ranks
  by scarcity, so the wrong number was very nearly the wrong row.
- **A `sources` entry is a reference, never a claim about the work.** Eight
  sheets carried a source reading "Every mintage above was cross-checked
  against a second published table and every difference resolved" while
  `checked` was false, which is a verification claim printed under figures
  nobody had verified. A reference names somewhere to look; a claim of work
  done has to be true of the sheet printing it, and the test fails on one that
  is not.
- **Dates are ranked scarcest first and the order is validated, never
  sorted.** Sorting would hide a mintage typed an order of magnitude wrong.
- **A sheet owns the sort; the series tag page owns the series.** No
  designer and no mint-mark section -- a build check fails on a heading here
  that goes looking for them.
- **The metal eras are the one exception, and they live in `notes`.** "Which
  of these are silver" is a sorting question, not a series-history question:
  it decides what comes out of the jar, it is answered before condition and
  before the date table, and a reader holding a half dollar needs the 1964
  cut-off in the first ten seconds. So a sheet carries up to three one-line
  notes -- the silver years, the years nothing was struck, what a clad edge
  looks like -- and that is the only place a composition may be stated here.
  The cap is the rule, because this is the field that would quietly become
  the series page again: `validateCheatSheets()` throws on a fourth note, on
  a line over 170 characters, on a price, on a line naming the designer or
  where the mint mark sits, and on two sheets sharing one. The notes are also
  the one run of prose the print stylesheet keeps.

## The grade pages

`/coin-info/<group>/<type>/<coin>/<grade>` is one coin in one grade. The
reasoning is in the headers of `src/data/grades.ts`, `src/lib/grade-copy.ts`
and the route; the design is written out under "Grade pages, and how the
catalogue fans out" in `NEXT-SESSION.md`. These are the rules.

- **A grade earns a URL by being a grade the coin can be given, and a price is
  not required. That reversed on 2026-09-22 and it is the owner's decision.**
  Every rung `eligibleRungs()` returns is a page. The reasoning is that the
  price is not the only thing on the page: what the grade looks like ON THIS
  COIN, where it sits against the rungs either side, every spelling of it a
  reader might type, the metal floor underneath and how to check the market
  yourself are all true and useful without a figure, and a reader who has just
  been told their coin grades VF30 is better served by that page than by a 404.
  If it proves wrong, the fix is the loop in `import-grades.mjs` that expands a
  ladder to its full set of rungs -- not the copy, which is honest either way.
- **A rung with no figure states NOTHING in the range slot: no figure, no
  placeholder, no provenance, no date, no sales. The owner's decision of
  2026-09-22, that evening, and it is the pivot that made this an information
  catalogue rather than a price guide.** The range block does not render at
  all, and `gradeQuestion()` asks what the grade MEANS on that coin rather than
  what one is worth.
  **The `<title>` still says "Value", on every grade page, priced or not, and
  that is the owner's decision rather than an oversight.** It was dropped for a
  few hours on 2026-09-22 and put back the same evening. The reasoning is that
  a page which cannot state a figure is not a page that fails to answer the
  value question: it gives the metal floor under the coin, the rung either side
  with what those fetch, the certified census where there is one, and a
  sold-comps search already filtered to that exact coin in that exact grade --
  which is the answer a dealer would give, and a better one than a retail
  guide's row. **Telling a reader how to find the figure is a legitimate thing
  for a page titled "Value" to do.** What the page still must not do is STATE a
  figure it has not got, and that is enforced in the BODY, where it belongs,
  rather than by rewording the title.
  For one day the slot held `TBD to TBD`, on the argument that every other
  option is a claim: a blank reads as an oversight, a dash is what this site's
  own sources print for "no figure" and a reader of a price table reads it as
  "worth nothing", a zero is false, and an estimate is the thing the catalogue
  exists not to do. That argument was right about marks and wrong about the
  page. There were six and a half thousand of them, set in the largest type on
  the page, in the slot a reader's eye goes to first, and a page whose loudest
  element is a placeholder for a price is a price page that has failed however
  honestly the placeholder is worded. `LADDER_GAP_NOTE` in `grade-copy.ts`
  carries the whole argument and `tests/build-smoke.test.mjs` fails on the
  string `TBD` appearing anywhere in the built HTML.
  The blank-reads-as-an-oversight problem survives in exactly one place -- a
  ladder TABLE where some rungs are priced and some are not -- and it is
  answered there by one sentence under the table rather than by a mark in every
  empty cell.
- **A column whose every cell would say the site has no data does not render.**
  `ladderHasFigures()` gates the value column and `ladderHasPopulations()` gates
  the certified column, in both ladder tables. 185 of the 444 coins with a
  ladder have no researched figure anywhere, and on those the table is a list
  of the grades the coin can be given -- which is a way into the grade pages
  and stands on its own. A column of "Not counted" twenty rows deep is the
  archive rules' "never count the catalogue" wearing a table header: it tells a
  reader holding a dollar what this website has not done yet.
- **The provenance block is one sentence naming the public sources, not a list
  of the two a given ladder happened to cite. The owner's decision of
  2026-09-22.** `FIGURE_SOURCES` and `SOURCES_NOTE` in `grade-copy.ts` are the
  one place it is written. A per-ladder list told a reader which two websites
  were reachable on the day rather than where the site's figures come from, and
  it was right only while there were exactly two sources and a rung was a page
  only if both priced it -- neither of which is true now.
  **The gate under it did not change and must not**: the block renders only on
  a coin with a researched figure somewhere on its ladder, because a
  "where these figures come from" heading over a page whose rungs carry no
  figure claims provenance the page has not got. A ladder's `sources` data stays too,
  unrendered, because `validateTaxonomy()` still throws both ways on a price
  with no source and a source with no price.
- **A grade page asks its question and does not mark it up. The owner's
  decision of 2026-09-23.** Every grade page renders the question and the
  answer -- `gradeQuestion()` and `gradeAnswer()`, in the verdict block, first
  thing under the H1 -- and the page's only JSON-LD type is `Article`. The
  FAQPage node came off all 21,123 of them at once. Google has not shown FAQ
  rich results outside authoritative government and health domains since 2023,
  so the markup bought nothing; what it still cost was a machine-readable claim,
  repeated 21,123 times, that a site which is 93% grade pages by URL count is
  93% FAQ -- with a question that is one formula holding a coin and a grade.
  The coin pages, the melt pages and the common questions keep theirs, because
  on those a question is the subject rather than a heading.
  **The questions stay in `faq-registry.ts` all the same**, and that is the part
  to not undo: the registry now carries `markedUp` per entry, so uniqueness is
  still checked across all 21,123 -- two pages answering one question is the
  site competing with itself whether or not a crawler was told -- while only
  the marked-up ones are held to rendering a `Question` node.
  Taking the markup off also removed the only thing that checked the visible
  answer existed, so `tests/build-smoke.test.mjs` now asserts the question and
  the answer are on the page, against the generators that write them.
- **A grade page canonicalises to its coin and is not in the sitemap.** The
  owner's decision of 2026-09-23. The coin page is the one that should rank
  for the coin; twenty rungs competing with it is the site bidding against
  itself. A sitemap that listed them anyway would contradict their own
  canonical tags, so the filter in `astro.config.mjs` leaves them out and
  `tests/build-smoke.test.mjs` fails on any sitemap URL whose page names a
  different canonical. The coin's ladder table is how a crawler reaches them.
- **Which rungs a coin can be given is a fact about how it was made, and it is
  the one gate left.** `eligibleRungs()` in `grades.ts`: a proof takes PR60-PR70
  and nothing else, because it never circulated and was never in a mint bag; a
  Mint-set uncirculated issue takes mint state and nothing below it, because a
  page offering one in Very Fine describes a coin that would have had to be
  spent; a circulation strike takes the whole Sheldon run and no proof rung. A
  series with no `wear` still gets nothing at all -- that gate is about the
  page's content rather than its price, so a figureless page does not rescue it.
- **PR and PF are one grade with two spellings, like XF and EF.** One service
  writes PR and the other PF, both are on slabs, and neither is dominant, so
  `alsoWritten` carries the pair and `gradeForms()` makes all four spellings.
  The proof rungs are a TIER of their own and not the top of the Sheldon
  ladder: what separates PR65 from PR67 is hairlines and the contrast between
  frosted devices and mirrored fields, which is a third question, and the coin
  page already carries the matching rule where a proof gets no scarcity verdict.
- **`commonality` gates nothing and must not start to**: a 1961-D quarter is
  common in every sense and worth melt in every circulated grade, and in MS67
  it is worth hundreds because almost none survived that well.
- **The separation test no longer gates anything, as of 2026-09-22.** It
  survives as a measurement and reports, because a run of rungs that do not
  separate is a fact about the coin -- grade does not move its price -- but
  with every rung a page there is nothing left for it to decide except whether
  to replace a figure the site HAS with a placeholder, which helps nobody. The
  paragraph below is the history, kept because the reasoning is the valuable
  part and because it is the first thing to reach for if this section is ever
  found to be dragging the coin pages down.
- **(Superseded) The separation test is off for a research sheet and ON for the
  feed, and that is the owner's decision of 2026-09-21 taken twice.** The design said a
  grade earns a URL only where its value separates from the grade below it.
  The 1932-D was allowed the full certified ladder without it -- sixteen rungs,
  three of them at the bottom trading inside one band -- because somebody
  really does type "1932-D quarter VF30". Later the same day the catalogue went
  to three hundred and eighteen quarters and the answer reversed for the
  generated half: the argument for sixteen rungs is an argument about one
  famous coin, and a 1961-D whose bottom six rungs are the same melt figure six
  times is the scaled-content shape exactly. So `SEPARATION` in
  `scripts/merge-grade-prices.mjs` gates every ladder built from the feed, a
  hand-written sheet is exempt, and the split is by where the figures came from
  rather than by which coin it is. A sheet is somebody's judgement and the gate
  exists because a feed has none.
- **Two SOURCES minimum, which is not the same rule as two figures.** On a
  research sheet two figures is right: a guide value and a realized sale each
  count as one, a published band counts as its two ends, and a person gathering
  them one at a time is gathering them from different places. A feed is not. 
  From 1999 a mint strikes five or six reverses a year and this catalogue has
  one page for all of them, so one guide supplies five figures for one rung --
  five figures and one opinion. `rangeFor()` counts distinct sources, which is
  the mintage pipeline's "two can only agree or disagree" pointed at the
  failure a feed actually has. The judgement on a sheet lives in the sheet,
  where a comment says what was left out and why -- see the header of
  `data/grades/1932-d-washington-quarter.tsv`, which is the worked example.
- **Three sources vote; an outlier is outvoted rather than obeyed. Two sources
  still cannot, and nothing about two changed.** This is the mintage pipeline's
  own lesson, arriving here the day a third source did, and it is in `rangeFor`
  in `scripts/merge-grade-prices.mjs`. With three or more sources on a rung,
  each source's middle figure is one vote, any source more than `SPREAD_LIMIT`
  from the median of those votes is dropped, and what was dropped is printed by
  `npm run grades -- --report` -- a figure this site did not print is part of
  the evidence for the one it did. With two sources there is no median to be an
  outlier from, the rung is refused exactly as before, and every ladder built
  before PCGS existed is untouched. What it buys: the 1889-CC went from one
  priced rung to seven, because PriceCharting's $37 for a thousand-dollar coin
  is now outvoted by PCGS and USA Coin Book instead of refusing the rung.
- **A spread of more than an order of magnitude is a disagreement, not a
  market.** Two retail guides on one rung land within a factor of a few of each
  other, and the range is the honest way to print that. Twelve times apart is
  one of them reading a different coin -- a variety page matched onto the plain
  date, a column shifted by one -- so `SPREAD_LIMIT` refuses the rung. The coin
  keeps its other rungs, because the failure is per figure.
- **(Superseded 2026-09-22) A ladder of one rung is a point, and the coin gets
  no grade pages at all.** This held while a rung existed only where a figure
  did. Now every eligible rung is a page, so prev, next and the step sentence
  always have a neighbour to point at -- a rung that states no range, which is
  itself a true statement about what this site knows.
- **(Superseded 2026-09-22) No proof issue gets a grade page.** Proofs now take
  the PR ladder; see the eligibility rule above. What was right in the old
  reasoning and survives is that a proof is NOT graded on the Sheldon scale.
- **PCGS CoinFacts is metered at a hundred calls a day, so `npm run pcgs` is a
  LEDGER with a fetcher attached, and `data/pcgs/<series>.json` is committed.**
  That is the opposite of the rule one section down, and deliberately: the free
  guides are enumerated, so a response is cheap to get again and the cache
  deletes itself. Here the endpoint answers for one (PCGS number, grade) pair,
  a hundred calls is about five coins, and a series is weeks. Three rules
  follow. **A pair is never asked twice** -- an empty answer is a fact about the
  coin and cost the same as a full one, so it is recorded with the date it was
  asked. **The budget lives in the store, not in the process**, the same reason
  `/api/spot` keeps its guards in the cached document: the second run of a day
  has to know what the first one spent. And **a key is named in the ledger by
  eight characters of a digest**, because that file is in git and several keys
  are rotated.
  `CoinFactsNotes` is stripped before anything is written -- kilobytes of
  somebody else's prose per response, which must never reach a page -- and a
  `IsCAC` sale is kept in a list of its own, because on the 1932-D MS65 the
  ordinary sales run $5,280 to $9,150 and one CAC coin fetched $19,520.
- **A PCGS number is resolved from Numista, and ambiguity is refused.** Every
  issue record there carries the reference, so it costs nothing against an
  allowance this build already spends, where asking PCGS would cost a call out
  of a hundred before a single price. Where a year resolves to more than one
  number -- the 1878 Philadelphia dollar has five, one per reverse hub and
  variety -- **no number is taken**, because picking one would price a variety
  as the ordinary coin.
- **The grade prices are fetched, and the responses are NOT kept.** This is the
  one place the mintage pipeline's rule is relaxed, on the owner's instruction
  of 2026-09-21. What is committed is the FIGURES, with the URL each came from
  and the date it was read, in `data/grade-prices.json`. Two guides times three
  hundred issues of full HTML is a quarter of a gigabyte and a diff nobody can
  read. What is lost is real and is worth knowing: when a source redesigns its
  page there is no diff to look at. What stands in for it is
  `npm run prices -- --report`, which prints every label no rung is registered
  for, because a source adding a rung and a parser going blind look identical in
  the output.
- **`data/prices/.cache` is scratch, and it deletes itself.** A crawl this long
  is got right by running it, reading what the parsers made of it, fixing a
  parser and running it again, and paying for the network on every pass is what
  stops anybody fixing the parser. So responses are held during that and dropped
  the moment a run writes the feed. `--keep-cache` leaves them for the next
  pass; `--clean` removes them after an interrupted run, which is the one time
  the cache is the only copy of anything. It is gitignored as well, because both
  guards are worth having.
- **PCGS, Greysheet, NGC and Heritage cannot be read, and that is recorded
  rather than rediscovered.** The first three answer 403 to a scripted request
  and NGC's price guide renders from an API its page does not name. They are
  the four anybody would reach for first. The header of
  `scripts/grade-sources.mjs` says so, and a third source is the single best
  improvement available to this section.
- **A price source is registered PER SERIES, and the registry is
  `SERIES` in `scripts/grade-sources.mjs`.** The console slug, the category
  path, the words to strip out of a title and the mint marks that exist are
  facts about the series, not about the source, and every one of them was
  hardcoded to the quarter until the Morgan dollar arrived. Each failed
  silently rather than loudly, which is what makes this a rule: a mark regex
  that did not know CC parsed `1889 CC` as a Philadelphia coin with a design
  called "CC", so the scarcest coins in the series were the ones that broke.
  `marks` is an ALTERNATION and not a character class, **longest first**, for
  exactly that coin.
- **In a series that struck one design, anything in the design slot is a
  variety.** That is the rule, and it replaced a list of words that could not
  win. The Morgan dollar is catalogued by die pairing under the VAM numbering
  and one source lists five hundred of them beside the dates: `vam-1b3`,
  `vam-6a1b`, `vam-1aq3`, `vam-dbl`, `micro-s`, `zerbe-proof`, `188079-cc`,
  `1882-os`, `1900-occ`. A token list is always one short of whatever gets
  named next. What they share is structural rather than lexical, and the
  design-count rule in `fetch-grade-prices.mjs` cannot do this job: it refuses
  a source that lists more pages than the Mint struck designs, and a Morgan has
  ONE design, so it would have refused the source for nearly every date and
  left the series one-source and entirely TBD.
- **A free guide's ladder is worth least on exactly the coins worth most.**
  PriceCharting computes from completed sales, and on a scarce date it has
  almost none: its own page prices an 1889-CC at $1,128 ungraded and $37 in
  VG8, and $311,475 in MS70, a grade that coin has never been awarded. The
  12x spread gate catches it -- the 1889-CC keeps one rung of nineteen -- so
  the failure is a rung with no figure rather than a wrong figure, which is the
  right way round
  and is not the same as being solved. **The key dates of a series are what
  phase 5 of `RUNBOOK-MORGAN-DOLLAR.md` is for**, and they are where a PCGS
  call is worth most per call.
- **Nothing in the middle of the pipeline is typed by hand**, the same rule the
  coin copy carries and for the same reason. `npm run prices` fetches and
  writes `data/grade-prices.json`, committed; `npm run grades` reads that plus
  the sheets under `data/grades/` and writes `src/data/graded-values.ts`,
  offline and deterministic. A build never fetches.
- **The range spans the designs, and the page says so.** From 1999 a page here
  belongs to the (year, mark, finish) and the guides price each reverse, so the
  ends of the range are two different designs. `spans` on the ladder carries the
  count and `gradeSpansNote()` prints one sentence. It is `mintageNote`'s
  obligation one section over: a figure in the slot where a 1950-D prints one
  striking's is the site changing what a word means halfway down its own
  catalogue.
- **Date the figure, not the page.** Auction prices move, so they get the
  exception the spot price gets. `valueBasis()` is this section's
  `spotBasis()`, it sits at every range, and nothing here carries a
  `dateModified` or a sitemap `lastmod`.
- **A ladder is not a fact about the coin, and does not live on one.** The
  `Coin` holds what was settled before this site existed; a ladder moves, is
  imported rather than written, and carries its own date and provenance. It
  lives in `GRADED_LADDERS` in `src/data/graded-values.ts`, which is
  **generated and committed** from `data/grades/<coin>.tsv` by
  `npm run grades`. Never edit the generated file: it is overwritten on the
  next import, and anything typed into it passed none of the checks.
  `tests/grades.test.mjs` fails when a sheet and the file generated from it
  disagree, which is the check that somebody re-ran the import.
- **Judgement in the sheet, mechanics in the importer.** Which figures count
  and which outlier to ignore are decisions a person makes and writes down in
  the sheet's header. Everything mechanical throws:
  `scripts/import-grades.mjs` refuses an unregistered grade, a rung priced
  twice, a range with no floor, a sale outside its own range, a ladder that
  falls as the grade rises, a sheet with no date or no source, and a
  population with no census behind it. `validateTaxonomy()` runs the same
  checks again at build time, because the generated file is editable.
- **Colour is a second axis over the grade, composed and never declared.**
  `DESIGNATIONS` holds Brown, Red-Brown and Red with one clause each, and
  `GRADES` is the Sheldon rungs plus every (mint state rung x designation)
  pair, built at module load. Writing the twenty-one out by hand would be
  twenty-one places for one clause to drift. Mint state only: below it every
  surviving copper coin is brown and the letters carry nothing a buyer pays
  for. Copper only, and the validator throws on a silver coin graded MS65RD,
  which describes an object nobody has struck.
- **Where colour is designated it is not optional, and the plain rung goes.
  The owner's decision of 2026-09-22.** No service slabs a wheat penny as
  MS65: it comes back MS65BN, MS65RB or MS65RD, so a page offering the coin in
  plain MS65 describes a holder nobody has ever seen. `eligibleRungs()` reads
  `DESIGNATIONS` both ways -- it lets a designated rung onto a copper coin and
  keeps the undesignated one off it -- so the fact is stated once, and it falls
  out by composition group, which puts the 1943 cent on the right side of the
  line for free: zinc-coated steel, colour not designated, plain ladder kept.
  It cost the wheat cents their mint state figures and that is the honest
  outcome: both free guides publish ONE colour-free figure per mint state rung,
  the three chains are not one market -- red is a multiple of brown -- and
  spreading one figure across them would be the catalogue stating a price its
  sources never gave. The importer drops those figures into
  `npm run grades -- --report` rather than failing on them, because a guide
  that states no colour is a known shape of the source and not a page matched
  to the wrong coin.
- **Colour makes the ladder three parallel chains, and they do not compare.**
  A cent in MS64 Red is routinely worth more than the same cent in MS65 Brown.
  So monotonicity is checked WITHIN a chain, in both the importer and
  `validateTaxonomy()`, and prev/next steps within a chain -- a link from a Red
  rung to a Brown one would tell a reader their coin got worse.
- **Every spelling of a grade appears on its own page, once.** `gradeForms()`
  generates them -- XF40, XF-40, EF40, EF-40, and for a designated rung the
  spaced and unspaced slab forms -- and one generated sentence prints them. A
  reader who learned the British convention types EF45; a page that never
  contains the phrase somebody typed has to be found some other way. The
  validator throws when one spelling reaches two rungs.
- **A grade page's headline carries the CODE, not the label.** "in MS63", not
  "in Mint State (MS-63)". Every uniqueness check on this site runs through
  `normaliseQuestion()`, which strips parentheticals, so seven mint state H1s
  and seven FAQ questions normalise onto one string and the collision checks go
  blind. The full label belongs in the body, where the sentence around it
  differs anyway.
- **A range contains its own evidence.** `validateTaxonomy()` throws on a
  recorded sale outside the range printed above it. A page arguing with itself
  in front of the reader loses, and the reader is right.
- **A grade with none known is absent from the ladder, not listed at zero.**
  A row saying "MS69 -- none" invites the reader to wonder whether one might
  turn up, and the melt section's "say None rather than leave a blank" rule
  does not transfer: there the figure is zero, here the coin does not exist.
  Prev/next step to the next grade that EXISTS. A build check fails on a grade
  label appearing on a page whose coin has no row for it.
- **A population of zero is not an absence below the certification
  threshold.** Nobody pays thirty dollars to slab a six-dollar coin, so the
  census at the bottom of a ladder counts almost nothing and means nothing.
  `Population` is optional and its absence renders "Not counted", never
  "None".
- **The grade definitions are parameterised, never written out per grade.**
  One description per grade reused everywhere is a paragraph on every page,
  which is the doorway shape. A definition takes `{coin}`, `{label}` and the
  series' `WearPoints`, so MS63 on a Washington quarter names the cheek and
  the eagle's breast. Every slot is a PLURAL noun phrase and every definition
  takes a plural verb; nothing downstream can fix the agreement.
- **The sales come before the lookup.** What it sold for is the answer; the
  eBay sold-comps link and the price-guide row are the verification. Sending a
  reader out to check the number is what a site confident in its numbers does.
- **No `offers`, still.** The page states a price and the `Product` schema
  carries none, because the site does not sell coins. A build check reads the
  built HTML.
- **No melt page per grade.** Grade does not change metal content, so the
  mirror stops at the coin and the metal floor is ONE figure with a link out.
  No specification table, no spot ladder: the coin page and the melt page own
  those, and a grade page repeating them is three pages competing for one
  search.

## Cards

Every listing of categories -- the metals, the series, the countries, the
topics -- is the same card, on the home page, on `/coin-info` and on
`/melt-value`. Coin listings are not cards and keep their own tiles.

- **A card is a heading and a picture, and nothing else.** No teaser, no stat
  line. "1960-1964 · quarters" under "Silver" was a caption for the page
  behind it rather than a reason to click, and a stat line about what the
  catalogue currently holds is the count rule in a smaller font.
  `TileCard.astro` is the only card, so the two sections cannot drift into two
  shapes.
- **A subject's picture is one fact, in `src/lib/card-art.ts`.** Keyed
  `group/`, `tag/` or `axis/`, so the card for silver on the home page is the
  card for silver on both hubs. A key with no entry is not an error.
- **A card with no photograph shows the drawn placeholder, never an empty
  slot.** `scripts/generate-card-art.mjs` writes `placeholder.webp` with no
  source file, and today most cards use it. The slot is 16:9 in the CSS and
  in the script, which is the contract between them, so a real photograph
  arriving changes nothing but the file name in the map.
- **Nine cards to a section on a hub, and no cap on an archive.** A hub is a
  set of choices and a grid running past the fold is a list; `/coin-info/tagged`
  and `/melt-value/tagged` are where every tag stays reachable, and the topic
  section links to them. `CARDS_PER_SECTION` is the one constant.
- **There is no "all coins" section.** Both hubs listed every coin under one,
  which is the group and denomination archives' job and put the hub in
  competition with them. A coin is reached through a choice, not through a
  catalogue dump.
- **A generator with no render site is deleted, not kept warm.** Dropping the
  teasers took `groupTeaser`, `groupStat`, `tagStat` and `meltGroupTeaser`
  with them, in the same commit.

## The long lists

`/coin-info/tagged/us-coin` lists seven hundred coins and
`/coin-info/tagged/90-percent-silver` lists three hundred and seventy. That is
a wall rather than a way in, so a browser folds the tail away thirty at a time.
The reasoning is in the header of `src/lib/reveal.ts`; these are the rules.

- **Every tile is in the HTML, and the fold belongs to the browser.** A page
  that gives a crawler more links than it gives a reader is cloaking, and this
  site builds its `ItemList` from the same array the tiles come from -- so a
  truncated grid under a complete schema is the mismatch the `Product`
  no-`offers` rule exists to avoid, one section over. The script HIDES; it
  never decides what is rendered. `tests/reveal-dom.test.mjs` fails if the
  build ships a tile already hidden, or if the schema and the grid disagree
  about how many coins are on the page.
- **The link count is not the problem and trimming it is not the fix.** There
  is no penalty for a long list -- the "hundred links" line was a crawler's
  byte limit and has not been guidance since 2013 -- and collapsed content has
  been weighted like visible content since mobile-first indexing. What a long
  archive really costs is a smaller share of link equity per coin, and that is
  arithmetic which folding does not change. If a key date needs to rank, link
  to it from fewer places more prominently; do not shorten the archive.
- **The button is the one thing on this site rendered by the browser alone,
  and it has to be.** With no script nothing is hidden, so a server-rendered
  "show more" would be a control with nothing behind it. That is the opposite
  of the calculators' "nothing is rendered only by the browser" rather than an
  exception to it: there the figures exist without the script, here the button
  exists only because the script took something away.
- **One grid component, one script, no per-page flag.** `RevealGrid.astro` is
  the plain `.tile-grid` with `data-reveal` and `data-reveal-noun` on it, and
  `Base.astro` renders the boot on every page for the reason it renders
  `SpotLive` -- a flag somebody has to remember fails silently, and
  `bootReveal()` returns on its first line when the page carries no marked
  grid. A grid shorter than the step is left alone, so marking one is safe
  whatever the coin.
- **Coin listings fold; cards do not.** The hub card grids are capped at nine
  by `CARDS_PER_SECTION` and a fold over nine cards is a button in place of a
  choice.

## The search box

The header carries a search field to the left of "Find my coin", with
suggestions as the reader types. The reasoning is in the header of
`src/lib/search.ts`; these are the rules.

- **The finder and the box are two controls for two readers, and both stay.**
  The hero's two selects are for somebody who does not know the vocabulary and
  cannot dead-end; the box is the shortcut for somebody who can already name
  the coin. Neither replaces the other.
- **The index is a built file, fetched on the reader's first keystroke.**
  `/search-index.json` is written by `src/pages/search-index.json.ts` at build
  time and nothing imports it into a page. It is eighty kilobytes that most
  visits never need, so it is never loaded on page load and never inlined --
  `tests/search-dom.test.mjs` fails if a page grows large enough to be carrying
  it. A visitor's request touches a file on a CDN, which is the architecture
  rule intact.
- **A page is indexed once, under the name it is listed by.** The per-coin melt
  pages are out -- a coin is one subject with two pages and the coin page links
  to its twin, so offering both answers one query with the same coin twice --
  and the grade pages are out, because nobody types "1964 quarter MS63" before
  they have found the coin. The melt ARCHIVES are in: "silver quarters melt
  value" is a phrase and no catalogue page answers it.
- **Every word typed must begin a word in the title. No stemming, no fuzzy
  matching, no synonyms.** Each of those turns a miss into a WRONG answer, and
  a reader shown a 1965 coin because they typed 1964 has been told something
  false about their coin by a control that looked confident. "quart" finds
  "Washington quarter"; "64 quarter" finds nothing, which is the right side to
  fail on when the alternative is matching 1864, 1964 and 2064 alike.
- **`a` is what a page IS, never what somebody might type.** It exists because
  the melt pair archives are headed "Silver Quarter Value" with the word "melt"
  nowhere in the heading. It is not a keyword field: a synonym list there is
  invisible to everyone, since a reader never sees why a wrong result came
  back. Nothing it contains can outrank a page whose own heading was typed.
- **Every sentence the dropdown can say lives in `search.ts`.** A sentence
  typed into a DOM script is a sentence no test reads and no style check sees.
  A failed fetch says the search is unavailable and never "nothing matched":
  what failed was a file download, not a search of the catalogue.
- **A suggestion is an anchor, and it is checked against the build.** An
  anchor, so the middle button, ctrl-click and "copy link address" all work.
  Checked, because a static site has no redirects and no 404 report:
  `tests/search-dom.test.mjs` holds every path in the built index against the
  pages the build wrote, and `tests/search.test.mjs` names the page each of a
  dozen real queries has to answer with -- a ranking that puts the wrong page
  first is worse than no box at all, because the reader believes it.
- **With no JavaScript the box is hidden, like the finder.** There is nothing
  for a static build to render for a query nobody has typed, so the one
  `<noscript>` rule in `Header.astro` removes the control and the navigation
  beside it is the way in. That is the same decision as the "show more" button
  in `reveal-dom.ts` and the opposite of the calculators' rule rather than an
  exception to it: there the figures exist without the script.
- **It needs no host-config change and must not acquire one.** The index is
  same-origin, so `connect-src 'self'` already allows it, and it falls under
  the HTML catch-all in all three configs -- a day at the edge, purged by the
  deploy that changes it, which is the shelf life of a file that only changes
  when the catalogue does.

## Archive copy

Every page under `/coin-info` above a coin -- the hub, a composition group, a
(group, denomination) pair, a tag -- takes every sentence on it from
`src/lib/catalog-copy.ts`. The reasoning is in that file's header; these are the
rules.

- **Registering a taxonomy entry is a structural act, not a writing
  assignment.** A group or tag needs `slug`, `name` and `kind`/`meltDriven`.
  The H1, the `<title>`, the meta description, the FAQ question, the
  opening answer, the section headings and the body copy are generated from the
  coins that carry it. The tag registry is unbounded -- every series, every
  country, every category anyone files coins under -- so the alternative is a
  section where the pages that got hand-written copy are the pages somebody had
  time for.
- **Hand-written copy is an override, field by field, and never a duplicate.**
  Fill a field when the generated form is worse for that subject; the rest of
  the page stays generated. `validateCatalogCopy()` throws when a written field
  is character-for-character what the generator produces, because that is a
  second place for one sentence to drift from.
- **A hand-written paragraph is added, not substituted.** `notes` renders after
  the generated body; `intro` replaces it and is almost never what anyone wants.
  A fact the formula cannot derive — the 1964 cut-off, that melting United
  States cents is illegal, that a one-ounce Gold Eagle weighs 33.93 grams — goes
  in `notes`, and the page keeps its year span. If a note repeats
  a sentence the generator already writes, cut the note: that is how the silver
  page came to say "sort by date" twice.
- **No price, no currency symbol, on the catalogue side of a generated
  sentence.** The melt section owns the arithmetic and dates it. A figure typed
  into archive copy has no spot price behind it and no date on it; the validator
  throws on one.
- **Never count the catalogue, on any page.** "Five coins in the catalogue,
  1960-1964" is honest and was still cut: it tells a reader holding a quarter
  how much work has been done on this website, which is not what they came to
  find out, and it reads as an apology on a page whose job is to answer a
  question. The same goes for a sentence describing the page it is on --
  "each entry states the year, the mint mark and the composition" is a caption
  for a list the reader can already see. A year span is different and stays:
  it is a fact about the coins. `tests/catalog-copy.test.mjs` fails a count or
  a "in the catalogue" in any generated string.
- **No paragraph may appear on two pages.** Boilerplate is what turns a
  generated archive into a doorway page, so every generated paragraph names its
  own subject -- the group, the denomination, the tag -- and
  `validateCatalogCopy()` fails a paragraph, title, description or FAQ question
  used twice, coin pages included.
- **`kind` chooses the shape of a tag's copy.** A series page answers "which
  years are silver", read off `series.compositions`; a country page answers
  "what are coins from here worth". Five kinds, five questions, and not one
  template with a word changed.
- **A `<title>` and a meta description are fitted, not trimmed.** Each
  generated form is a list from fullest to barest and the formula picks the
  first that fits, because nobody is going to shorten three hundred of them by
  hand afterwards.
- **A coin page's closing section is one fact true of that coin alone, or it
  is omitted.** `sections` is optional and meant to be left off; an issue with
  nothing of its own ends at the pull quote, which is a complete page.
  `validateTaxonomy()` throws on two coins sharing a heading or a paragraph and
  on a heading with no paragraphs, so the cheapest way to fill the field is not
  to copy the coin next door. Reaching for a near-duplicate is the signal that
  the honest answer was nothing. There used to be a line under the empty grade
  table saying the site had no market-data source it would stand behind; it was
  cut for the same reason a page never counts the catalogue — it told a reader
  holding a quarter about this website rather than about their coin.
- **A coin page's copy IS generated, from the issue's own facts, and
  overridden by hand where there is something to say.** This reversed on
  2026-09-21, when the Washington quarter went from eleven issues to
  eighty-three. The old rule -- the pattern stops at the archives -- was right
  for eleven and fails badly at eighty-three, and it fails in the worst way:
  the work stops, because the honest way to add the next one is to write it
  and nobody has the afternoon, so what gets added is the entry next door with
  the year changed and the duplicate checks correctly refuse it.

  **Nothing in the middle of that pipeline is typed by hand.**
  `npm run mintages` fetches and parses the source into `data/mintages.json`,
  committed; `npm run coins` reads that plus the series facts in
  `coin-taxonomy.ts` and writes `coin-generated.ts`, offline and
  deterministic. A build never fetches -- same rule, same shape, as
  `npm run spot`.

  There were TSV sheets in that gap for one afternoon and they shipped a real
  error: from 1980 the Philadelphia quarter carries a P mint mark, and
  nineteen pages went out naming those issues "(No Mint Mark)" and telling
  the reader there must be no letter in that spot. The source says so in a
  Comments column -- "First time the P mint mark was used on the quarter" --
  that a parser reads and an eye skims. A hand-typed sheet is a spreadsheet
  with extra steps and it has a failure mode a parser does not: it is filled
  in by somebody who already thinks they know the answer. Do not reintroduce
  one.

  What a person still types is the series registry in `coin-taxonomy.ts`: the
  denomination, the country, the composition eras with their weights, where
  the mint mark sits in each era, which mint struck proofs only. No feed knows
  where a mint mark sits, and that registry was always the editorial home.

  The split is by file. `coin-seed.ts` holds the coins somebody wrote --
  an issue with a story, carrying a `sections` block true of it and of no
  other. `coin-generated.ts` holds the coins the facts wrote, from
  `data/coins/<series>.tsv` via `npm run coins`. `coin-catalog.ts` merges them
  in date order and is the only one anything imports, so moving a coin from
  generated to written is a change to two files rather than to the site.
- **`sections` is never generated.** It holds the one fact true of this coin
  and of no other, and a generator cannot know one -- if it could, the fact
  would be derivable and would not be worth a section. A generated coin has
  none and its page ends at the pull quote, which is a complete page.
- **The generated sentences are derived from figures that differ per issue** --
  the year, the mint, the mintage, which other mints struck that date, whether
  it is scarce. That is what keeps eighty-three pages from being one page.
  `validateCatalogCopy()` fails a `<title>` or a description used twice, coin
  pages included, and it runs over the generated ones.
- **The mintage source is ONE source, and the file says so.** Wikipedia's
  mintage column cites `washingtonquarters.org`, so comparing the two -- which
  was done by hand and reported as a cross-check -- compares a table with its
  own footnote. `data/mintages.json` records the source and the fact that it
  is single. The real second opinion is the PCGS API, whose CoinFacts response
  carries a mintage per PCGS number; the row-by-row comparison belongs in
  `fetch-mintages.mjs` behind a `--verify` flag, not in anybody's eye.
- **The parser refuses rather than guesses.** A caption it cannot map to a
  composition group, a mintage it cannot read, a mint it does not know: it
  reports and exits non-zero rather than writing a partial file. A coin with
  the mintage of the row above it is worse than a coin that is missing.
- **The templates hold layout, the module holds sentences.** A heading typed
  back into an `.astro` file typechecks and passes the unit tests, so
  `tests/build-smoke.test.mjs` compares the built HTML of every archive page
  against what the generator said it should contain.

## Melt values and common questions

Two sections alongside the catalogue. The reasoning is in `SPEC.md`; these are
the rules.

- **Three sections, three questions, one owner each.** "What is a 1964 quarter
  worth" is a coin page, "what is the melt value of a 1964 quarter" is a melt
  page, "what is spot price" is a common question. No question carries FAQPage
  markup on two of them — `src/data/faq-registry.ts` throws, and it runs on
  every build because `astro.config.mjs` imports it.
- **Every coin gets a melt page**, including the ones with no silver or gold,
  which say so. That is deliberate and it is behind
  `MELT_PAGE_FOR_EVERY_COIN` so it can be reversed in one line.
- **The melt tree mirrors the catalogue, segment for segment.** A coin's melt
  page is its catalogue path with `/coin-info` swapped for `/melt-value`, and
  the same is true of every archive above it: `/melt-value/<composition>`,
  `/melt-value/<composition>/<denomination>` and `/melt-value/tagged/<tag>`.
  The two sections answer two questions about one set of coins, and a reader
  who has learned to browse either one has learned both — changing one segment
  of a URL is the fastest route between the two halves of an answer.
  `validateMeltPaths()` throws when the trees stop matching and
  `tests/build-smoke.test.mjs` checks both were built. It was a flat
  namespace, `/melt-value/<coin>`, until 2026-09-19; that had no page at all
  for "silver quarters melt value", which is a phrase people type.
- **Every melt page links up to its twin; a coin page links down only when it
  has a figure to send the reader to. The owner's decision of 2026-09-23.**
  The melt page links back under the coin's own name without exception, and the
  archives link across both ways. What changed is the coin page of a coin with
  NO precious metal in it: it used to carry a bare "Melt value of …" link
  below the answer, and that link led to a page whose whole content is the word
  "None" — an invitation to click through for an answer the coin page had
  already given. The melt page is still built, still listed in its archives and
  still the page that answers "is there any silver in a 1965 quarter" for
  somebody who types it; it simply is not advertised from above.
  `tests/build-smoke.test.mjs` asserts the link both ways on a coin with metal
  and asserts its ABSENCE on a coin without, because a link that creeps back in
  is the failure this check exists for.
- **The melt archives are the arithmetic; the catalogue archives are the
  price.** `/melt-value/silver` answers "how much is the silver in a coin
  worth", `/coin-info/silver` answers "what are silver coins worth". Same
  shape, same coins, and nothing else shared: do not move the premium, the key
  dates or the grading advice onto the melt side, and do not move a weight or
  a spot price onto the catalogue side beyond the one figure a coin page
  already carries.
- **Every listing under `/melt-value` is sorted richest first.** The
  catalogue's listings are in registry order. That difference is not cosmetic:
  it is the only thing making a melt archive something other than its twin
  re-rendered, and somebody sorting a jar wants to know what to pull out of it
  first. `tests/melt.test.mjs` asserts the ordering at every level.
- **Coins with no melt value are ordinary members of their composition group.**
  There is no `/melt-value/no-melt-value`; clad, copper, nickel and steel get
  the same three levels of archive as silver, and those pages answer "none".
  The category page was a fifth bucket beside the metals and a special case
  the mirror does not need. What must not come back is a column of blanks: a
  page with no figure says "None" in the place the number goes, which
  `tests/build-smoke.test.mjs` checks.
- **A metal is not a URL.** `src/lib/spot.ts` prices metals; the tree is filed
  by composition group, like the catalogue. The two nearly always agree and
  the case where they do not is real — a 40% silver clad half is clad by
  construction and silver by content — so a group's metals are read off its
  coins with `meltGroupMetals()`, never off its slug. Both trees share
  `RESERVED_SEGMENTS`, and `validateMeltPaths()` throws on a group, type or
  tag slug that collides with one.
- **No melt copy is written per page.** Every sentence in the section — the
  H1s, the opening answers, the teasers, the descriptions — is generated in
  `src/lib/melt.ts`, so the answer, the big figure and the tables are the same
  arithmetic and cannot drift. Where a generated sentence reads like the
  catalogue's copy with a word changed, that is a bug: the sections share a
  shape and nothing else.
- **The melt page owns the arithmetic and nothing else.** If a fact can be
  read off the coin page, it goes on the coin page: no specification rows, no
  eyebrow, no second list of archive links. One link out, with the coin's own
  name as the link text. The test before adding a block is whether the coin
  page already carries it — two pages saying the same thing is two pages
  competing for one search.
- **The quantity input and the melt figure are one block.** An input whose
  default state restates the number directly above it is the same duplication
  with a text box in it. The input drives the headline figure.
- **The inline calculator reimplements `formatUsd()` and `formatOzt()`, and
  `tests/melt.test.mjs` lifts both out of the `.astro` file and runs them
  against the real ones.** They must agree: the script rewrites a figure the
  server rendered, so a rounding difference shows up as the number changing
  the moment the page becomes interactive. Change one, change both.
- **The spot price is timed; the page is not.** `spotBasis()` prints the time
  of the reading next to every figure worked from it, because that figure really
  does go stale. The melt page itself carries no `dateModified` and no sitemap
  `lastmod` — see the rule on dates under SEO.
- **The spot-price ladder lives on the group archive, and nowhere below it.**
  `/melt-value/<composition>` carries it as a column of multipliers against
  its whole branch, and that is what keeps the section correct between builds
  for a reader whose browser never reached `/api/spot`: they find today's price
  in the left column. It is not decoration, so do not drop it on the grounds
  that the endpoint now refreshes the figures. A coin page deliberately has none — next to one
  figure the reader already has, a second column of other prices restates the
  arithmetic the page just showed, and a denomination archive is one level
  down from where the ladder already covers it.
- **Common questions are written one at a time, never generated.** A question
  whose answer depends on which coin the reader is holding is a catalogue page
  or a melt page, not an entry in `src/data/questions.ts`. A slug with no
  answer behind it is a published URL with nothing on it, so the ones still to
  write live in that file's header, not in the array.
- **A common question's answer is written; its title and description are
  not.** The `<title>` is Title Case of the question plus `titleTail`, and the
  description is the `lede` plus a comma-separated list of the page's own H2s
  — both fitted to `src/lib/meta.ts` by dropping whole parts, never by
  truncating. The second one is the load-bearing half: a description built
  from the headings cannot promise a section the page does not have. There is
  no override field for either, because fifteen questions become fifty and a
  hand-typed title is a title nobody measures against the suffix `Seo.astro`
  appends. A heading therefore carries no comma or colon, which the validator
  enforces, since those are the punctuation the list uses.
- **A link inside an answer is `[anchor text](/path)`, and the path is checked
  against the routes the build produces.** Anchor text is the phrase the
  target page wants to rank for, never "here". `validateQuestions()` throws on
  a path no route produces — an unpopulated tag archive is not a page — and
  `tests/build-smoke.test.mjs` checks the markup was rendered rather than
  shipped to the reader as text. A static site has no redirects and no 404
  report, so this is the only place a dead internal link can be caught.
- **The questions are ordered by how often they are asked.** That ordering is
  the only editorial act in the registry and the hub renders it directly, so a
  new question goes in at its place in the list rather than at the end.
- **A question belongs to one topic, and a topic is not a tag.** Membership is
  a single required field on the question, and `/common-questions/topic/<slug>`
  is the page. A tag is many-to-many because a coin is legitimately silver and
  a key date and a Washington quarter at once; a question is not, and one filed
  under three headings is a page competing with two of its own archives. The
  registry throws on a topic holding fewer than two questions — a topic over
  one page is a second URL for that page — and on a question filed under a
  topic nobody declared.
- **The topics are ordered by their most-asked question, and that ordering is
  derived.** `validateQuestions()` throws when the declared order of
  `QUESTION_CATEGORIES` stops matching the order the questions themselves rank
  the topics in, because the hub renders both and a second ordering kept in
  step by hand is a second ordering that drifts.
- **A topic page carries no FAQPage markup.** It answers nothing itself: it is
  a CollectionPage over an ItemList of the questions filed under it, and each
  of those is marked up where it is answered. A topic page repeating its
  members' Q&A is the one-question-one-page rule's exact failure case, and
  `tests/build-smoke.test.mjs` fails if the markup appears there.
- **The section links in three directions and every one is checked.** The hub
  links down to each topic, a topic links down to each of its questions, and
  every question links back up to its topic — in the breadcrumb, in an eyebrow
  over the H1 and in a closing section that lists its siblings. A tree missing
  one of those has a page nothing points at or a page with no way out, which
  no other check here would catch.
- **A topic's own copy is hand-written; its title, description and list are
  not.** Four topics is a bounded editorial act, the way `GROUPS` in
  `coin-taxonomy.ts` is, so `h1`, `bluf` and `intro` are written. The title is
  `<h1>: Common Questions` fitted to the limits, and the description is the
  bluf plus the questions the topic actually holds, so it cannot advertise a
  question that is filed elsewhere.
- **No moving number is typed into a question's `sections`.** Prices reach
  those pages through `spotPanel`, from `src/lib/spot.ts`.

## Prices, caching and the two renderings

Everything on this site is safe in a CDN cache except what an ounce of silver
costs. The reasoning is in the header of `src/lib/spot.ts`; these are the
rules.

- **A figure derived from a price is rendered twice, and never typed twice.**
  The build renders the reference table in `src/lib/spot.ts`, dated and
  caveated — that is what a crawler indexes and what a reader without
  JavaScript keeps — and `src/lib/spot-dom.ts` fetches `/api/spot` in the
  browser and rewrites it. Both halves call the same functions. There is no
  second `formatUsd`, no second caveat, no second ladder arithmetic. There
  used to be an inline script on the melt page with its own `usd()` and a test
  that lifted it out with a regex to compare the two; do not put one back.
- **Every derived string takes a `SpotSnapshot` and defaults to the reference
  one.** A function that reads `SPOT` directly is a function the browser
  cannot re-run, and the failure mode is a page that fetches a new price,
  congratulates itself and prints the old one.
- **A figure the browser can rewrite carries `data-spot`, which says what the
  number IS.** A weight, a metal, a breakdown — enough to rebuild it from a
  price and nothing else. `tests/build-smoke.test.mjs` feeds every marked
  figure in the build back through the browser's own rule and fails if the two
  disagree. An unmarked figure does not look broken; it looks like a number.
- **A sentence with a price in it is generated once and rendered twice.** The
  generators in `src/lib/melt.ts` take a `Mark`: `plainUsd` for JSON-LD, a
  `<title>`, a meta description or llms.txt, `markedUsd` for what the reader
  sees. The marked form with its spans stripped must be the plain form,
  character for character, and `tests/melt.test.mjs` checks it. The
  alternative — a regex hunting for dollar signs in a generator's output — is
  the same sentence written twice with extra steps.
- **A visible sentence the browser rewrites carries `data-spot-sync` with its
  plain form**, so the copy of it in the page's JSON-LD is rewritten too.
  Structured data stating a different price from the body is the mismatch
  Google issues manual actions for.
- **`/api/spot` answers 200 whatever happens, and every other endpoint answers
  503.** That is not an exception to failing honestly, it is failing honestly:
  this endpoint has a correct answer to give without its cache and without its
  feed — the built-in reading, labelled with the time it was taken — and every
  page states that time. A form with nowhere to send a message has nothing true
  to say; this does. Cache unreachable, cache malformed, feed down, feed
  rate-limited, nothing configured: all of them fall back, none of them 503.
- **The endpoint refreshes the cache; it does not call the feed per request, and
  there is no cron.** `/api/spot` serves the cached document at
  `SPOT_CACHE_URL` and calls metals.dev only when a refresh is due. Do not
  "simplify" this to a direct call behind a long CDN cache: the edge cache is
  per-region and is purged on every deploy, so that costs *(regions) × (1 +
  deploys)* calls a day against an allowance of a hundred a **month**, and a
  stateless function cannot count its own calls, so the overspend is invisible
  until the feed account is suspended.
- **Two guards decide whether a call is spent, and both keep their state in the
  cached document.** A function instance is not a place to keep state: there are
  many, they are cold, and none sees what the others did. The guards are the
  time of the last feed call and a month-to-date call count, and
  `tests/spot.test.mjs` pins every reason not to call.
- **`fetchedAt` schedules the refresh; `asOf` is what the page prints.** They
  are separate fields for one reason: `asOf` is the feed's own reading time,
  which barely moves while the metals market is shut. Scheduling off it would
  see a Friday timestamp all Sunday, decide a refresh was overdue on every cache
  miss, and spend the month's allowance in a weekend — each call returning the
  same timestamp it had just rejected.
- **The monthly call ceiling is a fuse, not a tuning knob.** If it trips, the
  clock check has stopped working. Raise it only together with the refresh
  interval, and check the feed's plan first: an hourly interval is about 730
  calls a month.
- **The store must be told to cache the document for a minute.** Vercel Blob
  defaults to a month, which would leave the handler reading a copy from before
  its own last write — seeing an old `fetchedAt`, and refreshing on every
  invocation for a month. The read is `cache: 'no-store'` for the same reason.
- **The feed has exactly one call site.** `fetchMetalsDev()` in
  `src/server/metals-dev.ts`, called from `refresh()` and from `npm run spot`. A
  second call site is a second way to spend the allowance, and a test counts
  them. The cache URL is never it: the endpoint refuses a URL that is not https,
  points at a feed, or carries an `api_key` — a key in a URL is a key in the
  platform's logs, the CDN's logs and the next request's `Referer`.
- **A preview deployment gets no feed key.** Without one the endpoint reads
  production's document and refreshes nothing, which is what a branch should do
  rather than spend the month's allowance.
- **The built-in figure only changes when the site is rebuilt, so a refresh
  triggers a build.** A successful daily refresh pokes `SPOT_DEPLOY_HOOK_URL`,
  and `npm run build` takes its figure from the cached document rather than the
  committed file. Without that pair, the price a crawler and a no-JavaScript
  reader see is as old as the last deploy. It fires at most once a day because
  it fires only behind the clock and the budget, and it cannot loop: a build
  never calls the feed, and a deploy never calls `/api/spot`. The hook URL is a
  capability — never log it.
- **The build may read the cached price, and nothing else.** That is a
  deliberate exception to the rule that builds do not fetch, and the reasoning
  is in `scripts/prebuild-spot.mjs`: reproducibility is not wanted for a price,
  the document is public so the build stays credential-free, and every failure
  is a no-op that falls back to the committed reading. What would genuinely
  cross the line is the build calling metals.dev — metered, per-deploy and
  uncountable. It does not, and must not.
- **`src/data/spot-snapshot.ts` is the fallback, not the update path.** It is
  what the static build bakes into every page — what a crawler indexes, what a
  reader with no JavaScript keeps — and what the endpoint serves when the cache
  is empty. `npm run spot` refreshes it. There is no schedule to keep: a stale
  fallback is not a wrong figure, because every page states the time the prices
  it shows were read.
- **A price is stored unrounded and rounded only to display it.** The snapshot,
  the cache document and every intermediate figure carry full precision;
  `formatUsd()` rounds, once, at the point of display. A price rounded on the
  way in is a price the melt arithmetic then multiplies a weight by, landing a
  cent away from the figure printed beside it.
- **Every figure carries one provenance phrase: "based on spot prices at
  <time>".** `spotBasis()` writes it and the stamp, the caveat, the strip note
  and the mid-sentence clause are all built from it, so it cannot be reworded on
  one page and not another. It states a **time**, to the minute and named as
  UTC, because the figures are refreshed on a schedule the site does not control
  and the minute is what tells a reader how much to trust the number. It names
  **no vendor**: a feed's name is provenance for an operator, not for a reader,
  and it would be one more thing to correct on every page the day the feed
  changes — the source travels in the snapshot and comes back from `/api/spot`,
  it is simply not printed. `tests/build-smoke.test.mjs` fails any built page
  that prints a per-ounce figure without the phrase, or that names the feed.
- **A price is never typed into `src/lib/spot.ts`.** `SPOT` and `SPOT_AS_OF`
  are read off the snapshot, so a figure cannot end up on the site under the
  timestamp of the reading it replaced. To change them, run the script.
- **The cache rule is one exported string, repeated in four places.**
  `SPOT_CACHE_CONTROL` in `src/lib/spot.ts`: the header `src/server/spot.ts`
  sets, and the rules in `vercel.json`, `netlify.toml` and `public/_headers`.
  `tests/spot.test.mjs` compares all four to the constant. Every other
  `/api/*` route is `no-store`, and the HTML catch-all must keep excluding
  `api/`.
- **`must-revalidate` must stay off the spot rule**, alone among the rules on
  this site. It forbids serving a stale response and `stale-while-revalidate`
  exists to permit one; a CDN resolving that contradiction drops the SWR, and
  the SWR is the behaviour this endpoint wants most — an older price, labelled
  with its date, beats no price when the upstream is slow or down.
- **The gap between the two cache lifetimes is the feature.** The HTML is held
  for a day and the price for an hour. Tighten the first or loosen the second
  and the second rendering has nothing left to do; a test asserts the gap
  still exists.
- **A restored page catches up.** Back/forward-cache restores do not re-run
  module scripts, so `bootSpot()` listens for `pageshow` with `persisted` —
  the only path on the site that can show a figure older than the endpoint's
  own hour.
- **The browser talks to this origin and nothing else.** A feed is fetched by
  `/api/spot`, never by the page, so no feed's domain ever enters `connect-src`
  in the three host configs, no key ever enters a client bundle, and `/privacy`
  needs no new line on the day one is wired in.
- **`llms.txt` is a static file and cannot be rewritten in the browser.** It
  states its price, its source and its date, which is why that is allowed.
  Anything else that ships as a file rather than a page has the same
  obligation.

## Secrets and privacy

- No API key, signing secret or email address in any module a page imports.
  Anything in `src/lib/` reaches the browser; anything in `src/server/` does not.
- The contact recipient address has **no default in the source**. A default puts
  a real inbox in git.
- Licence keys travel in a request header, never a query string. A key in a URL
  is a key in the platform's logs, the CDN's logs, and the next request's
  `Referer`.
- Before adding a third party — a font CDN, a chat widget, a pixel — check what
  `/privacy` currently promises. That page is the contract.

## Copy

- **BLUF.** Every page answers its question in the first sentence; every section
  leads with the conclusion. No "in today's fast-paced world".
- **`/llms.txt` and `/llms-full.txt` are copy, and they are the copy nothing
  was reading.** Three sections of them -- "What it is", "Who it is for", "Key
  facts" -- shipped as the starter file's own placeholder ("Replace this
  section with two or three short paragraphs...") from the day the lockdown
  lifted until 2026-09-23. They are what an answer engine reads INSTEAD of
  crawling, so for that whole period the site's entire pitch to every assistant
  was three instructions to somebody who never came back. Everything else here
  is measured by something; these were prose in a template literal.
  `tests/llms.test.mjs` is what measures them now: no placeholder, no heading
  with nothing under it, no off-site link, and a coverage claim that has to
  match the catalogue -- which is why the issue count, the group count and the
  series list are read off the registries rather than typed.
- **Never claim what is not built.** Not a feature, not a number you have not
  measured, not social proof that does not exist. `sameAs` stays empty until the
  profiles are real. A feature list that runs ahead of the code spends
  credibility to sell something whose real pitch needed no help.
- **Do not mention refunds anywhere in site copy.** Refunds are given when asked
  for, quietly and case by case. Putting a policy on the site invites the
  question and turns a goodwill gesture into an entitlement to argue about.
- **"a" or "an" before a coin is decided by the YEAR, and it is never typed.**
  `article()` in `src/lib/meta.ts` is the only place the rule lives, and every
  generated sentence that names a coin goes through it -- the bluf, the melt
  answer, the FAQ question, the meta description, the grade definitions'
  `{a}` slot. A year is read aloud, so 1878 is "eighteen seventy-eight" and
  takes "an" while 1932 takes "a". It was a literal `A ` in ten places across
  four modules until the Morgan dollar arrived, and that was correct for every
  page on the site and wrong for two thousand of the next ones. The same trap
  as `letterArticle`, which decides "a D" and "an S" for a mint mark, one field
  to the left.
- **One source per fact.** If a price, a limit or an explanation appears on two
  pages, it lives in a module and both pages import it. Retyped copy drifts into
  contradictory copy, and the version a customer reads is the wrong one.
- **Say the limit at the point of sale.** The wrong customer buying is the most
  expensive kind of sale. Nothing is sold on this site today — `/pricing` is
  not a route and `webApplicationSchema()` emits one free offer. A build check
  fails if a price, a checkout link or a non-zero `Offer` reappears before the
  `*_AVAILABLE` flag backing it goes true.
- **Never promise a message that is not sent.** A receipt, a confirmation, a
  copy of the key: if the code does not send it, no page mentions it. Stripe
  sends no receipts in test mode, so a test purchase will not catch this.

## SEO and answer engines

- Visible HTML and structured data are built from the same object. Google
  penalises schema that does not match the page, and hand-duplicated copy always
  drifts. This includes breadcrumbs: `Base.astro` renders the trail and builds
  `BreadcrumbList` from one `crumbs` array, and a build check fails if a page
  has the markup without the trail.
- Every page: canonical, title, description, JSON-LD. No exceptions —
  `tests/build-smoke.test.mjs` enforces it.
- **A title's length is measured on the string that ships.** `Seo.astro` appends
  ` | AboutMyCoin` to any title that does not already name the site, so a check
  on the declared string is thirteen characters wrong — which is how five melt
  pages shipped 74-character titles while every source check passed. The limits
  and the suffix rule live in `src/lib/meta.ts`, both copy generators fit their
  output to them, and a build check measures the built HTML.
- Answers must survive being quoted with no page around them. That is how a
  model will use them.
- **No page on this site carries a date.** No `lastmod` in the sitemap, no
  `dateModified` or `datePublished` in any JSON-LD, no `article:modified_time`,
  no "last updated" line, and no `updated` or `published` field in any
  registry. Everything here was settled before the site was written — what a
  coin weighs, what it is made of, which dates are scarce — so a page date
  records a file save, which is noise to a reader and a claim a crawler can
  check and find worthless. The sitemap's old build-date fallback told Google
  every page changed on every deploy, which is how the signal gets discounted
  for the pages that would have deserved it. The one exception is the spot
  price, which moves, and it is timed at the figure by `spotBasis()` — "based
  on spot prices at 20 September 2026 23:27 UTC" — rather than dated at the
  top of the page. `tests/build-smoke.test.mjs` fails on a date
  reappearing anywhere in the built HTML or the sitemap.
- **Each FAQ question is marked up on one page only.** Google wants a question
  to carry FAQPage markup once. Mark it up where it is answered best and link
  there from the other pages, rather than repeating the Q&A.
- Programmatic pages need a person who types the phrase. A generated page that
  exists to hold a keyword drags the pages that deserve to rank down with it.

## Performance

- Static HTML by default. An island only where interaction genuinely demands it.
- Nothing third-party on the critical path. Analytics load on first interaction,
  through `LazyThirdParty`.
- A `@font-face` needs a matching preload, and a preload needs a file that
  exists. Either one alone is a bug.
- Identify the LCP element for each template before optimising anything else.

## Failure modes

- **Fail honestly.** An unconfigured endpoint answers 503 and says so. A form
  that accepts a message and drops it is worse than one that admits it is
  broken.
- **Distinct error codes.** "Too fast", "expired" and "bad signature" mean
  different things to the person at the keyboard, and collapsing them makes the
  friendliest of the three impossible to word.
- **Test headers with headers.** `astro dev` and `astro preview` send none of
  the host configs' headers, so a CSP or COOP/COEP change that works locally
  proves nothing. Serve `dist/` with the real headers applied, or check the
  deployment. A missing `blob:` in `script-src` broke both in-browser models on
  memorialprintkit.com in production only.
- **Defaults point the safe way.** Managed Payments is on unless the variable is
  the exact string `false`, because the failure mode of the other default is
  silently owing tax in eighty countries.

## The dev workbench

- **`/dev` is served by `astro dev` and by nothing else.** One guard, in
  `getStaticPaths()` in `src/pages/dev/[...tool].astro`, and a build check
  that fails if `dist/dev` ever exists or a shipped page links to it.
- **Nothing in `src/dev/` is imported by a page that ships**, and nothing in
  it states a fact of its own. The URL list comes from the registries; the
  title, description, H1 and JSON-LD are fetched from the running page. A
  second description of what a page says would be a second thing to keep in
  step, and it would be believed over the page.

## Before you commit

```bash
npm run check        # 0 errors
npm test             # server logic
npm run test:build   # the built HTML, then the browser half against it
```

If you changed a series in `coin-taxonomy.ts` run `npm run coins`; if the
source's figures have moved, `npm run mintages` first. If you touched a sheet
under `data/grades/` run `npm run grades`; if the guides' figures have moved,
`npm run prices` first. Commit what they write -- including
`data/grade-prices.json`, which is the only record of what the sources said,
because their pages are not kept. `npm test` fails if a sheet and its generated
ladder disagree, but only after you have wondered why the page did not change.

`test:build` also runs `tests/spot-dom.test.mjs`, which parses pages out of
`dist/` into a real DOM (linkedom, a devDependency), stubs `/api/spot` with a
snapshot nothing like the reference one, and runs `src/lib/spot-dom.ts` exactly
as a browser would. It is the only test on this site that exercises code
running in a browser, and it needs `dist/` — which is why it lives there and
not in `npm test`.
