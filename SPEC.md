# aboutmycoin.com — product spec

Started 2026-09-19. This file holds the decisions and the reasoning behind
them. Anything under "Open" is not decided yet — do not let a page imply an
answer to it.

---

## What it is

A coin database with value calculators and identification tools.

## Who it is for

Two audiences, and the second one is much larger:

1. **Collectors** — know the vocabulary, want date/mint-mark/variety detail and
   a price they can sanity-check against auction records.
2. **People who just found a coin** — a jar, an inheritance, change from a
   register. They arrive from search with one specific coin, have no grading
   vocabulary, and want two answers: what is this, and is it worth anything.

Group 2 sets the design. The site answers "what is it and what is it worth"
before it asks anyone to learn anything. Grading vocabulary gets introduced
where it changes the number, not up front.

## The one thing that makes it different

Every valuation shows its working: the grade assumed, the date and mint mark
used, and where the market data came from. A single number with no provenance
is what every other result in the SERP already gives, and it is the reason
people keep searching after they find one.

---

## Honesty constraints

These are not style preferences; they are the things that make the site
trustworthy, and the first things that quietly stop being true.

- **A value is a range, not a number.** Condition dominates coin value, and we
  cannot see the coin. Anything that prints one figure is a promise we cannot
  keep.
- **Never appraise.** The site estimates from published market data. It does
  not authenticate, does not grade, and says so where a user might assume
  otherwise.
- **Most coins are worth face value.** Saying so plainly, early, is the single
  most useful thing the site does for group 2, and refusing to say it is how
  coin sites lose trust.
- **No refund messaging in site copy** (house rule across these sites — refunds
  are given, never advertised).

---

## Open — decide before building past the scaffolding

- **What populates the catalogue database.** The pipeline shape is settled
  (see "Decided"); its contents are not. Hand-built for a narrow, high-traffic
  slice (Lincoln cents, silver Washington quarters, wheat pennies) versus
  licensing a broader catalogue. Nine seed coins exist today, written by hand
  to exercise the structure.
- **Market data for graded prices.** The `values` field is typed, validated and
  rendered, and no entry carries one, because there is no source yet the site
  is willing to stand behind. Until there is, every coin page says so plainly
  in its own section. Whatever the source is, it has to support naming itself
  on the page: SPEC requires every valuation to show its working.
- **A spot-price source.** Settled: metals.dev, reached through a cache that
  `/api/spot` refreshes itself. The endpoint serves the cached snapshot and calls
  the feed only when the last call was over twenty hours old, which needs no
  cron and keeps a hundred-calls-a-month allowance countable — the time of the
  last call and a month-to-date count both live in the cached document, because
  a function instance keeps no state. `src/data/spot-snapshot.ts` is the
  fallback the static build renders. It needs **no** CSP change, no `/privacy`
  change and no `src/lib/third-parties.ts` entry: the call is server-side with
  nothing of the reader's in it, and the browser only ever talks to this origin.
  `live` stays false — a reading taken at a stated time is not a quote, and the
  pages are worded that way. What is open is only the dashboard setup, listed in
  `.env.example`.
- **Spelling convention.** The starter's own docs and code use British spelling
  (`colour`, `licence`, `canonicalise`). petprintkit.com was converted to US
  English throughout. A US-coin site probably wants the same; it has not been
  done here.

---

## Decided

### Nothing is sold at launch

Settled 2026-09-19. There are no paid tools at first. The site is free to read,
has no account and sells nothing, and every page now says so where the question
arises.

What that meant in practice, so it is not half-undone later:

- `/pricing` and `/checkout-complete` are no longer routes. The files survive
  as `src/pages/_pricing.astro` and `src/pages/_checkout-complete.astro` --
  Astro skips any page whose filename starts with an underscore -- so bringing
  them back is one rename each.
- The Stripe plumbing is untouched and still tested: `api/`, `src/server/`,
  `src/lib/pricing.ts`, `PricingTiers.astro`, `BuyButton.tsx`. Nothing imports
  them from a built page.
- `webApplicationSchema()` emits one free `Offer`. The paid and `PreOrder`
  offers came out: an Offer with a price claims a thing can be bought, and
  `PreOrder` claims it is coming.
- The header call to action points at `/coin-info` ("Find your coin"), which
  is the only action a first-time visitor wants anyway.
- The build check `nothing is offered for sale while nothing is for sale` now
  runs both ways. While both `*_AVAILABLE` flags are false it fails the build
  if any page links to `/pricing` or declares a non-zero `Offer`; the moment a
  flag goes true it reverts to the original check, that nothing is sold which
  is switched off.

This is a launch decision, not a permanent one. The sentence in the house rules
still holds: say the limit at the point of sale, once there is a sale.

### URL structure and taxonomy

Settled 2026-09-19. Built and live in `src/data/`. The ambition is a page for
every coin ever struck; this is the structure chosen to survive getting there.

```
/coin-info                                every populated composition group
/coin-info/<group>                        /coin-info/silver
/coin-info/<group>/<type>                 /coin-info/silver/quarter
/coin-info/<group>/<type>/<coin>          /coin-info/silver/quarter/1964-washington-quarter
/coin-info/tagged                         the topic index
/coin-info/tagged/<tag>                   /coin-info/tagged/canada
```

Two sections sit alongside it, added 2026-09-19:

```
/melt-value                                every populated composition group
/melt-value/<group>                        /melt-value/silver, /melt-value/clad
/melt-value/<group>/<type>                 /melt-value/silver/quarter
/melt-value/<group>/<type>/<coin>          /melt-value/silver/quarter/1964-washington-quarter
/melt-value/tagged                         the topic index
/melt-value/tagged/<tag>                   /melt-value/tagged/junk-silver
/common-questions                          the question index
/common-questions/<slug>                   /common-questions/what-is-spot-price
```

**The melt tree is the catalogue tree with one segment changed** (settled
2026-09-19). Every page under `/coin-info` has a twin under `/melt-value` at
the same address, and `validateMeltPaths()` throws when they stop matching.

It was a flat namespace, `/melt-value/<coin>`, on the argument that the tree
exists to be browsed and the melt section is landed on from a search for one
coin. That was wrong twice over. It is browsed — somebody with a jar of coins
is doing nothing else — and the flat version had no page at all for "what are
silver quarters worth as metal", which is a phrase people type. The two axes
in the path are also the only two facts about a coin that can never be
revised, so they are exactly as safe in this tree as in the other one.

Mirroring costs nothing in duplicate content because the two sections answer
two different questions about one set of coins. The catalogue is a judgement —
condition, scarcity, what a buyer might pay — and it hedges, because it has
to. The melt tree is a multiplication and does not hedge: a weight in troy
ounces times a stated, dated price. So each level pairs off with a question of
its own and its own FAQPage markup, `src/data/faq-registry.ts` throws if two
of them ever normalise onto each other, and every page carries one link to its
twin in both directions.

Three things keep the sections from becoming each other's re-render:

- **Ordering.** Every listing under `/melt-value` is sorted richest first,
  where the catalogue's are in registry order. Somebody sorting a jar wants to
  know what to pull out of it first.
- **Payload.** A catalogue tile carries the coin's `bluf`; a melt tile carries
  the figure and the weight behind it. Nothing in the melt tree restates a
  specification, a scarcity or a grade.
- **Copy.** Every sentence in the section is generated in `src/lib/melt.ts`.
  There is no hand-written melt copy to drift towards the catalogue's.

**A coin page is the object; a melt page is the metal.** "How much is a 1964
quarter worth" and "how much silver is in a 1964 quarter" are two searches by
two people, and KEYWORDS.md lists the second as one of the three phrases the
whole site is arranged around. The person typing it usually has a jar rather
than a coin, so the melt page carries the thing the coin page deliberately
does not: a "how many do you have" input that multiplies as you type.

Everything the coin page already carries was cut from it — the specification
rows, the eyebrow, the paragraph on what melt value is not, the list of
archive links — leaving the figure, the input that drives it, and one link
back under the coin's own name. A melt page that restates the coin page is two
pages competing for one search.

The quantity input is the only island on a content page on this site. It is
inline vanilla rather than a hydrated component: one multiplication, no
framework, and it degrades to a correct static block with JavaScript off,
because the input is server-rendered at 1 and every figure around it is the
one-coin answer.

**The spot-price ladder sits on the group archive**, `/melt-value/<group>`, as
a column of multipliers against its whole branch. A single timed figure goes
stale for a reader whose browser never reached `/api/spot`; a column of prices
either side of the one used keeps the branch correct in March without a third
party, a CSP change or a line in /privacy. It is the cheapest answer to the
question of a live spot-price source,
and it does not foreclose it. A coin page has none: next to one figure the
reader already has, a second column of other prices restates the arithmetic
the page just showed.

**A coin with no silver or gold still gets a melt page**, saying so. That is a
deliberate exception to "an archive page with nothing on it does not get a
URL", and the argument is that the page is not empty: "is there any silver in a
1965 quarter" is a real search whose correct answer is "no". It is behind
`MELT_PAGE_FOR_EVERY_COIN` so it can be reversed in one line if those pages
turn out to be thin in practice.

**Coins with no precious metal are ordinary members of their composition
group.** There was a `/melt-value/no-melt-value` category, and the mirror does
not need it: clad, copper, nickel and steel are groups like silver and gold,
they get the same three levels of archive, and the answer their pages give
happens to be "none". A special case removed is a special case that cannot
drift. What has not changed is the reason the category existed — a list sorted
by what the metal is worth must not put a column of blanks under a heading
that promises figures — so a page with no figure says "None" in the place the
number goes, which is a different answer rather than a smaller one.

**A metal is not a URL.** `src/lib/spot.ts` prices metals; the tree is filed
by composition group. The two nearly always agree, and the case where they do
not is real: a 40% silver clad half is clad by construction and silver by
content. So a group's metals are read off its coins rather than off its slug,
and a group carrying two of them gets two price cards and two ladders. Both
trees share `RESERVED_SEGMENTS`, and `validateMeltPaths()` throws on a group,
type or tag slug that collides with one — a group slugged `tagged` would
shadow four pages rather than two.

**`/common-questions` is written one entry at a time, never generated.** It
holds questions whose answer does not depend on which coin the reader is
holding — what spot price is, what a dealer will pay, how to tell a fake.
Anything that has to name a coin to be answered is a catalogue page or a melt
page. One entry exists today, `what-is-spot-price`; `src/data/questions.ts`
lists the next six in its header rather than as empty entries, because a slug
with no answer behind it is a published URL with nothing on it.

**Each FAQ question is still owned by exactly one page**, now across all three
sections. `src/data/faq-registry.ts` throws at build time on a collision, and
it runs on every build because `astro.config.mjs` imports it.

**Two axes in the path, everything else a tag.** `group` is composition
(silver, gold, copper, nickel, clad, steel, platinum, bi-metallic, other).
`type` is denomination or format (cent, dime, quarter, half-dollar, dollar,
half-crown, bullion — an open registry). Country, series, key-date status,
junk silver, wartime, errors: all tags, each with its own page.

*Why:* a URL is a promise not to change. Composition and denomination are facts
about the metal disc that cannot be revised. Country grouping, series
popularity and "is this a key date" are all things we will reclassify, and a
URL is the wrong place for anything we will reclassify. Tags let a coin appear
on many pages while existing at exactly one address.

**Why composition first rather than country.** It makes the tree work for
foreign coins with no second tree. A 1967 Canadian silver dollar is silver and
it is a dollar, so it files itself beside the Morgan; `canada` is a tag and
`/coin-info/tagged/canada` assembles the country view for free. A
`/coin-info/canada/...` tree would need a parallel silver tree the day
somebody wants "all silver coins", and then every coin has two URLs and a
canonical problem.

**Composition belongs to the issue, not the series.** This is the trap in the
obvious version and it is worth reading twice. A 1964 Washington quarter is
90% silver; a 1965 Washington quarter is copper-nickel clad. Same series, same
denomination, different metal, therefore different branch:

```
/coin-info/silver/quarter/1964-washington-quarter
/coin-info/clad/quarter/1965-washington-quarter
```

That is correct — for that pair the metal *is* the entire answer — but it
splits a series in two. The `washington-quarter` tag is what reunites it, and
every coin therefore carries its series as a tag. Do not fix this by hoisting
the group up to the series; that would make one coin's URL depend on a fact
about a different coin.

**Granularity.** A coin entry is one page and may be a single issue (one year,
optionally one mint mark) or a whole run of identical years. The test is the
existing house rule: name the person who types the phrase. `1965 quarter value`
and `mercury dime value` are both real searches; `1927 mercury dime value` is
mostly not, and thirty pages repeating one sentence would drag the rest down.
The generator does not get an exemption from this rule — it is why the rule
needs writing down.

**Reserved segments**: `tagged`, `series`, `country`, `search`, `all`. A group
or type slug colliding with one throws at build time. `series` and `country`
are reserved ahead of need because both are plausible later routes and
reserving them costs nothing now versus renaming a live URL later.

### The series cheat sheet

Settled 2026-09-19.

A series page opens with a **cheat sheet**: three short lists naming every
date, variety and mint error in the series worth a second look, above the
designer, the edge and the metal eras. The reader arriving at a series page is
holding a coin and has one question about it, and that question is answered by
a list of labels rather than by prose. The reference material is the evidence,
and evidence goes underneath the answer.

The three lists are split by **how the reader settles it**, which is the only
split that helps somebody at a kitchen table: a key date is read off the date
and the mint mark, a variety is looked at under magnification and judged, a
mint error is weighed or held to a magnet. It also happens to be the correct
numismatic distinction — a variety is a die and an error is a planchet — so
the useful arrangement and the accurate one are the same arrangement.

The sheet is derived from the same arrays that fill the tables below it. There
is no hand-written summary, because a summary above a detail is the thing
people read and the thing that drifts.

**Varieties and errors are listed and not followed.** No link, no page each.
This is a deliberate limit on scope: each one is a specialty with its own
literature, its own authentication problem and its own audience, and a page
per doubled die is a divergence that never converges into a site anybody can
maintain. Naming them so a reader knows what they are looking at is the whole
job. Key dates are the exception, because a key date is an ordinary issue of
the series that happens to be scarce — it is a catalogue coin like any other
and already has a page in the plan.

Generic errors — off-centre strikes, clipped planchets, die cracks — are the
same on every coin ever struck, so they are a common question rather than a
block repeated on every series page. Most series have no error entry at all,
and the section then does not render.

### Where the catalogue data comes from

Settled 2026-09-19, superseding part of the old "Open" entry.

**A database, read at build time only.** The pipeline:

```
authoring database -> `npm run catalog` -> src/data/coin-catalog.ts (committed)
                                        -> `astro build` -> static HTML
```

The no-database house rule stands and is not being bent: that rule is about
what the *running site* depends on, and the running site stays a directory of
HTML files on a CDN. Nothing a visitor requests touches a database.

The snapshot is committed rather than fetched during the build, for three
reasons: a build must be reproducible, or a deploy that changes because a row
changed is a deploy nobody can bisect; a build must work offline and on a host
holding no credentials, because Vercel, Netlify and Cloudflare all build from
the repo; and a catalogue change that adds two hundred pages should appear in a
pull request as two hundred pages rather than as an invisible consequence.

Still open: what populates the database. Hand-built for a narrow high-traffic
slice versus licensing a catalogue. See "Open" below — this decision is about
the *shape* of the pipeline, not its contents.

### Scope: world coins are in

Settled 2026-09-19, superseding the "US-only or world" question. World coins
are supported structurally from day one at no cost, because the composition
tree is language- and country-neutral and country is a tag. US coins are still
the priority for *content*, because that is where the search demand and the
data quality are. The distinction matters: the structure is world, the
editorial queue is US-first.

### Tools

Recorded, not built. These are ordinary pages and need no structural support:

| Route | What it does |
|---|---|
| `/tools` | Hub. |
| `/tools/melt-value-calculator` | Metal weight x spot price. Consumes the `silverOzt` / `goldOzt` fields, which are already in the catalogue for exactly this. |
| `/tools/data-lookup` | Find a coin by what the visitor can see: denomination, year, country, mint mark. |

Nothing on the site mentions any of them until they exist. The melt
calculator's dependency has since been settled and built: `/api/spot` and
`src/lib/spot-dom.ts` already price every figure on the site in the browser,
the fetch is same-origin so no host config or privacy line moves, and what a
page shows when the fetch fails is decided — the figures the build rendered,
which state their own price and date.

### Design direction

Modern and a bit fun, but the information wins. Deliberately not the starter's
look -- there is no house style across these sites, and the differences are
chosen rather than inherited.

**Palette.** Warm paper neutrals with a faint olive cast, and a verdigris
accent -- the patina copper takes. The accent choice is functional as well as
thematic: the metal swatches are all desaturated or warm (silver, gold, copper,
nickel, clad, steel), so a cool blue-green accent can never be mistaken for one
of them. An indigo or a brass accent would have been.

Every text pair clears WCAG AA against every surface it sits on, in both
themes, measured rather than eyeballed: muted body text is 4.9:1 at worst,
accent links 5.6:1 at worst. The one value below 3:1 is the silver metal swatch
on a light background, which is acceptable because it is a filled disc that
always has its metal named in text beside it -- no swatch is ever the only
signal.

**Shape and type.** Corner radius is two tokens, `--radius` and `--radius-lg`,
tighter than the starter's: a reference table reads as more authoritative with
crisper corners, and the one soft thing on the page should be the coin.
Headings are differentiated by weight and negative tracking rather than by a
display face, because there is no webfont -- a `@font-face` needs a matching
preload and a real file, and neither exists yet.

**Two playful devices, and only two.** A small gradient disc that reads as a
coin seen edge-on, used as the metal swatch; and "reeding", the milled grooves
round a coin's edge, as a hairline rule under a catalogue H1. Both are pure
CSS. A motif that appears everywhere stops being a motif and becomes a texture,
so the reeding appears under an H1 and nowhere else.

No illustrations, no photography, no shadows doing a border's job. The
catalogue ships zero JavaScript and zero images.

### The rest

- Domain and identity: `src/lib/site.ts`, done.
- Licence key prefix: `AMC`. Changing it later invalidates every key issued.
- Everything else inherited from the starter: Astro static, Tailwind v4, Preact
  islands, Vercel, Stripe, Resend, GA4, R2. No database, no auth, no backend
  framework.
