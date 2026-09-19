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

- **What is sold.** The starter ships Stripe checkout and a licence-key flow.
  It is not yet decided whether this site sells anything at all, and if so
  what: a subscription to full price history, a one-time report, an ad-free
  tier, something else. `src/lib/pricing.ts` is untouched starter content and
  must not be shown to a visitor until this is answered.
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
- **A live spot-price source.** The melt arithmetic is currently stated as a
  formula the reader completes — "0.1808 troy oz x the spot price" — which is
  honest, useful and needs no third party. Fetching a live price turns three
  host configs, `/privacy` and `src/lib/third-parties.ts` into one change.
- **Spelling convention.** The starter's own docs and code use British spelling
  (`colour`, `licence`, `canonicalise`). petprintkit.com was converted to US
  English throughout. A US-coin site probably wants the same; it has not been
  done here.

---

## Decided

### URL structure and taxonomy

Settled 2026-09-19. Built and live in `src/data/`. The ambition is a page for
every coin ever struck; this is the structure chosen to survive getting there.

```
/coin-value                                every populated composition group
/coin-value/<group>                        /coin-value/silver
/coin-value/<group>/<type>                 /coin-value/silver/quarter
/coin-value/<group>/<type>/<coin>          /coin-value/silver/quarter/1964-washington-quarter
/coin-value/tagged                         the topic index
/coin-value/tagged/<tag>                   /coin-value/tagged/canada
```

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
`/coin-value/tagged/canada` assembles the country view for free. A
`/coin-value/canada/...` tree would need a parallel silver tree the day
somebody wants "all silver coins", and then every coin has two URLs and a
canonical problem.

**Composition belongs to the issue, not the series.** This is the trap in the
obvious version and it is worth reading twice. A 1964 Washington quarter is
90% silver; a 1965 Washington quarter is copper-nickel clad. Same series, same
denomination, different metal, therefore different branch:

```
/coin-value/silver/quarter/1964-washington-quarter
/coin-value/clad/quarter/1965-washington-quarter
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

Nothing on the site mentions any of them until they exist. The melt calculator
is the one with a dependency: a live spot-price source means a CSP
`connect-src` entry in all three host configs, an update to `/privacy` and to
`src/lib/third-parties.ts`, and a decision about what the page shows when the
fetch fails.

### Design direction

Modern and a bit fun, but the information wins. The playful element is confined
to one device — a small gradient disc that reads as a coin seen edge-on, used
as the metal swatch — and everything else is typography, whitespace and a
single accent colour per metal. No illustrations, no photography, no shadows
doing a border's job. The catalogue ships zero JavaScript and zero images, and
a coin page is about 24 KB.

Metal colours are decoration only. Everywhere one appears the metal is also
named in text, because a swatch that is the only signal is invisible to a
screen reader and ambiguous to roughly one reader in twelve.

### The rest

- Domain and identity: `src/lib/site.ts`, done.
- Licence key prefix: `AMC`. Changing it later invalidates every key issued.
- Everything else inherited from the starter: Astro static, Tailwind v4, Preact
  islands, Vercel, Stripe, Resend, GA4, R2. No database, no auth, no backend
  framework.
