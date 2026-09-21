# aboutmycoin.com

> **New session, start here.** Read `SPEC.md` first -- it holds the product
> decisions (pricing, tone, positioning, naming) and the reasoning behind them.
> Then read `NEXT-SESSION.md` for exactly where the build stopped and what is
> next. Adding a coin has its own procedure in `ADDING-A-COIN.md`, and with
> `npm run dev` running, `/dev` is a workbench that shows every URL the site
> builds, what each page declares, and what each coin created.

A coin database with value calculators and identification tools. For collectors
and for people who have just found a coin and want to know what it is and what
it is worth -- the second group is larger, arrives from search with one specific
coin in hand, and has no vocabulary for grading. Every copy and design decision
follows from that: the site has to answer "what is this and what is it worth"
before it asks anyone to learn anything.

What is sold, and at what price, is not decided yet. See `SPEC.md`.

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
- **Nothing large comes from the app origin.** Put it behind `SITE.assetOrigin`
  and add that origin to the CSP in all three configs at the same time.

## The coin catalogue

The full reasoning is in `SPEC.md` and in the header of `src/data/coins.ts`;
the procedure for adding one is `ADDING-A-COIN.md`. These are the rules that
get broken by accident.

- **Two axes in a URL, everything else a tag.** A coin's path is
  `/coin-value/<composition>/<denomination>/<coin>`, and those two facts are in
  the path because they can never be revised. Country, series and key-date
  status are tags, because they can be. Adding a third path segment is a
  decision to renumber the site later.
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
- **The series page is the series tag page.** `/coin-value/series/<slug>`
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
- **The generator gets no exemption from "name the person who types this".**
  A registry makes ten thousand thin pages as easy as ten good ones.

## Cards

Every listing of categories -- the metals, the series, the countries, the
topics -- is the same card, on the home page, on `/coin-value` and on
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
  set of choices and a grid running past the fold is a list; `/coin-value/tagged`
  and `/melt-value/tagged` are where every tag stays reachable, and the topic
  section links to them. `CARDS_PER_SECTION` is the one constant.
- **There is no "all coins" section.** Both hubs listed every coin under one,
  which is the group and denomination archives' job and put the hub in
  competition with them. A coin is reached through a choice, not through a
  catalogue dump.
- **A generator with no render site is deleted, not kept warm.** Dropping the
  teasers took `groupTeaser`, `groupStat`, `tagStat` and `meltGroupTeaser`
  with them, in the same commit.

## Archive copy

Every page under `/coin-value` above a coin -- the hub, a composition group, a
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
- **A coin page's copy is never generated.** Its answer states the composition
  and the metal weight of one researched issue. The pattern stops at the
  archives.
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
  page is its catalogue path with `/coin-value` swapped for `/melt-value`, and
  the same is true of every archive above it: `/melt-value/<composition>`,
  `/melt-value/<composition>/<denomination>` and `/melt-value/tagged/<tag>`.
  The two sections answer two questions about one set of coins, and a reader
  who has learned to browse either one has learned both — changing one segment
  of a URL is the fastest route between the two halves of an answer.
  `validateMeltPaths()` throws when the trees stop matching and
  `tests/build-smoke.test.mjs` checks both were built. It was a flat
  namespace, `/melt-value/<coin>`, until 2026-09-19; that had no page at all
  for "silver quarters melt value", which is a phrase people type.
- **Every single page links to its twin, both ways.** The coin page links to
  its melt page — including the ones with no metal, where the link is outside
  the figure block because there is no figure — and the melt page links back
  under the coin's own name. The archives link across too. A pair of mirrored
  sections with a one-way link between them is half a mirror, and
  `tests/build-smoke.test.mjs` fails on either direction missing.
- **The melt archives are the arithmetic; the catalogue archives are the
  price.** `/melt-value/silver` answers "how much is the silver in a coin
  worth", `/coin-value/silver` answers "what are silver coins worth". Same
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
- **Never claim what is not built.** Not a feature, not a number you have not
  measured, not social proof that does not exist. `sameAs` stays empty until the
  profiles are real. A feature list that runs ahead of the code spends
  credibility to sell something whose real pitch needed no help.
- **Do not mention refunds anywhere in site copy.** Refunds are given when asked
  for, quietly and case by case. Putting a policy on the site invites the
  question and turns a goodwill gesture into an entitlement to argue about.
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

`test:build` also runs `tests/spot-dom.test.mjs`, which parses pages out of
`dist/` into a real DOM (linkedom, a devDependency), stubs `/api/spot` with a
snapshot nothing like the reference one, and runs `src/lib/spot-dom.ts` exactly
as a browser would. It is the only test on this site that exercises code
running in a browser, and it needs `dist/` — which is why it lives there and
not in `npm test`.
