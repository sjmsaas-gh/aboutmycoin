# aboutmycoin.com

> **New session, start here.** Read `SPEC.md` first -- it holds the product
> decisions (pricing, tone, positioning, naming) and the reasoning behind them.
> Then read `NEXT-SESSION.md` for exactly where the build stopped and what is
> next.

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

The full reasoning is in `SPEC.md` and in the header of `src/data/coins.ts`.
These are the rules that get broken by accident.

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
- **The generator gets no exemption from "name the person who types this".**
  A registry makes ten thousand thin pages as easy as ten good ones.

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
  expensive kind of sale.
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
- Answers must survive being quoted with no page around them. That is how a
  model will use them.
- `lastmod` and `dateModified` must be real. Bumping a date without editing the
  page is lying to a crawler that can check. Both come from
  `src/lib/page-dates.ts`; a page with no real date gets no `lastmod`.
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

## Before you commit

```bash
npm run check        # 0 errors
npm test             # server logic
npm run test:build   # the built HTML
```
