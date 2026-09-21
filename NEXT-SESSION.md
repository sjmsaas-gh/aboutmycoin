# Where the build stopped

Last updated 2026-09-20.

## Done

**The cheat sheets, as ten stubs (2026-09-20).** `/cheat-sheets` and
`/cheat-sheets/<slug>`, ten series in alphabetical order, none of them
written. `src/data/cheat-sheets.ts` is the registry and
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
  `/coin-tools` link), `sitePaths()` in `questions.ts` so a question may link
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
- Routes: `/coin-value`, `/coin-value/<group>`, `/coin-value/<group>/<type>`,
  `/coin-value/<group>/<type>/<coin>`, `/coin-value/tagged`,
  `/coin-value/tagged/<tag>`.
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
`/coin-value/tagged/<series>` renders it. There is no `/coin-value/series/`
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

## Next

0. **The three dark series pages.** mercury-dime, lincoln-cent and
   morgan-dollar are written and validated but not built, because no coin
   carries those tags yet. They are the strongest argument for which coins to
   add next: one Mercury dime, one Lincoln cent and one Morgan dollar turn on
   three complete series pages between them.
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

   *Graded price ranges* — no source yet. `values` stays empty and every coin
   page keeps its honest "graded price ranges are not published yet" section.
   Do not fill the field from a scrape nobody can name on the page.

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
- The home page is still starter placeholder copy behind `HOME_PLACEHOLDER`,
  which serves a blank holding page in builds and the real page in `npm run
  dev`. Its three "First real thing it does" feature cards are untouched — the
  hero, the sign-up box and the FAQ are not.
- **The email list is built but not switched on.** `RESEND_SEGMENT_ID` has no
  value anywhere yet, so `/api/subscribe` answers 503 and the box says the list
  is not switched on. Create the segment in Resend, set the variable, and give
  the existing `RESEND_API_KEY` the contacts scope as well as the send scope.
  Until then every sign-up on the deployed site is refused honestly and lost;
  it is fine pre-launch and is the first thing to fix at launch.
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
  /coin-value archive comes from `src/lib/catalog-copy.ts`, and a build check
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
