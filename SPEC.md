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
- **Where the coin data comes from.** The largest question by far. Options
  include hand-built JSON for a narrow, high-traffic slice (Lincoln cents,
  silver Washington quarters, wheat pennies) versus licensing or scraping a
  broader catalog. This decides the whole shape of the site, and the no-database
  house rule means the catalog ships as build-time data.
- **Scope of the catalog.** US-only to start, or world coins. US-only is the
  honest default: the search demand is there and the data is tractable.
- **Which calculators.** Likely first: melt value (silver/gold by weight and
  spot price), and a date + mint mark + condition value lookup. Spot price
  needs a live source, which means a CSP `connect-src` entry and a decision
  about what the page shows when the fetch fails.
- **Spelling convention.** The starter's own docs and code use British spelling
  (`colour`, `licence`, `canonicalise`). petprintkit.com was converted to US
  English throughout. A US-coin site probably wants the same; it has not been
  done here.

---

## Decided

- Domain and identity: `src/lib/site.ts`, done.
- Licence key prefix: `AMC`. Changing it later invalidates every key issued.
- Everything else inherited from the starter: Astro static, Tailwind v4, Preact
  islands, Vercel, Stripe, Resend, GA4, R2. No database, no auth, no backend
  framework.
