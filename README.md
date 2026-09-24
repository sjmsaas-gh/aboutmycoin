# aboutmycoin.com

A coin database with value calculators and identification tools, built on the
shared foundation in `/var/www/more_html/sjmsaas/starter/`.

Read **[SPEC.md](SPEC.md)** for the product decisions and **[CLAUDE.md](CLAUDE.md)**
for the rules that hold the codebase together. **[NEXT-SESSION.md](NEXT-SESSION.md)**
says where the build stopped.

**[RENAME.md](RENAME.md)** is the starter's own setup checklist, kept here as a
record of which steps have been done. Steps 1-3 are complete; the mark, the
design and the content are not.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # static output to dist/
npm run check        # astro check — must stay at 0 errors
npm test             # server logic: contact, licence, checkout, webhook
npm run test:build   # builds, then checks the built HTML
```

With the dev server running, **`/dev`** is the workbench: every URL the site
builds, grouped and collapsible, with each page's title, description, H1 and
JSON-LD read back off the live page; every coin with the URLs it created and
the fields it is missing; and the procedure in
**[ADDING-A-COIN.md](ADDING-A-COIN.md)** rendered beside the live taxonomy.
None of it is built — `npm run build` emits nothing under `/dev`, and a build
check fails if it ever does.

Two generators are run by hand, not at build time, because their output is
committed and the deploy must not depend on the build machine having sharp's
system dependencies or fonttools installed:

```bash
npm run assets       # favicon/logo/OG rasters from the SVG mark (needs sharp)
npm run fonts        # re-subset the webfonts (needs `pip install fonttools brotli`)
npm run spot         # refresh the built-in metal prices from gold-api.com
```

`npm run dev` serves the marketing pages with no configuration at all. The
contact form and checkout need environment variables, and say so honestly (503,
"not configured") rather than failing silently — see `.env.example`.

---

## What is already built

| Area | Where |
|---|---|
| Site identity, in one place | `src/lib/site.ts` |
| Discoverability switch (`DISCOVERABLE`, now true) | `src/lib/site.ts`, `Seo.astro`, `robots.txt.ts`, host configs |
| Canonical URLs, OG, Twitter, robots meta | `src/components/Seo.astro` |
| JSON-LD builders | `src/lib/schema.ts` |
| Sitemap with per-URL priority, no dates | `astro.config.mjs` |
| Trailing-slash canonicalisation | `astro.config.mjs` + host configs |
| llms.txt / llms-full.txt | `src/lib/llms.ts`, `src/pages/llms*.ts` |
| Security headers + CSP, three hosts | `vercel.json`, `netlify.toml`, `public/_headers` |
| Tiered caching | the same three files |
| Deferred analytics | `LazyThirdParty.astro`, `GoogleAnalytics.astro` |
| Contact form + anti-spam | `src/pages/contact.astro`, `src/server/contact.ts` |
| Stripe checkout, one-time and subscription | `src/server/checkout.ts` |
| Licence keys with no database | `src/server/license.ts` |
| Licence email on subscribe | `src/server/stripe-webhook.ts` |
| Programmatic SEO pattern, with optional HowTo steps | `src/data/answers.ts`, `src/pages/answers/` |
| Third-party list for /privacy, derived from config | `src/lib/third-parties.ts` |
| Large-file upload to Cloudflare R2 | `r2/`, `scripts/r2*.mjs` |
| Design tokens | `src/styles/global.css` |

Pages: `/`, `/about`, `/privacy`, `/contact`, `/pricing`, `/faq`, `/answers`,
`/answers/[slug]`, `/checkout-complete`, `/404`, plus `robots.txt`, `llms.txt`,
`llms-full.txt` and the sitemap.

---

## Architecture, and the rules that hold it together

### No database, no auth provider, no backend framework

If a feature seems to need one, redesign the feature. State lives in Stripe
metadata, in a signed token, or in the user's own browser. This is not
minimalism for its own sake: it is what makes the privacy claims literally true
rather than nearly true, and what keeps the hosting bill flat.

### The build is static and portable

`output: 'static'`, no SSR, no adapter-specific runtime APIs. Server code is a
handful of `api/*.ts` edge functions, each a thin adapter over a host-agnostic
handler in `src/server/`. Moving from Vercel to Netlify or Cloudflare Pages is a
DNS change, a redeploy, and rewriting three twelve-line adapter files.

The three host configs — `vercel.json`, `netlify.toml`, `public/_headers` —
express the same headers three times. **If you edit one, edit all three.**

### Nothing large is served from the app origin

Model weights, video, big media: put them behind `SITE.assetOrigin` (Cloudflare
R2 has free egress). The app origin serves HTML, CSS and a few KB of JS. The
moment `assetOrigin` stops being empty, add it to the CSP in all three host
configs, in the directives it actually serves (see the note on `assetOrigin` in
`src/lib/site.ts`) — a blocked asset under CSP fails silently in production and
works perfectly in dev.

The upload tooling is included and needs no SDK: `npm run r2:setup`,
`r2:sync` and `r2:verify`, with the key layout in `r2/manifest.json`. The steps
are in [r2/README.md](r2/README.md).

### If the app runs WebAssembly or a model in a worker

Learned on memorialprintkit.com, and none of it shows up under `astro dev`,
which sends no headers at all:

- `script-src` needs `'wasm-unsafe-eval'` (or WebAssembly does not compile) and
  `blob:` (ONNX Runtime's threaded build imports its runtime from a `blob:` URL
  inside the worker, and a script import is governed by `script-src`, not
  `worker-src`). Without them: "no available backend found", in production only.
- Threads need `crossOriginIsolated`: COOP `same-origin` (already site-wide)
  plus COEP on the app route. Use `credentialless`, not `require-corp`, which
  demands a CORP header on every cross-origin subresource, and R2 cannot set
  one. Safari has no `credentialless` and simply runs single-threaded.
- The worker bundles need COEP too. Put it on `/_astro/*`, where Astro emits
  hashed workers; without it the worker dies with an empty error message.
- Scope COEP to the app route. A third-party embed breaks under it, and
  Stripe's embedded checkout is one, so checkout from an isolated page is a
  popup (which `BuyButton` already is).
- For `onnxruntime-web`, set Vite `resolve.conditions:
  ['onnxruntime-web-use-extern-wasm']` or the build emits a 28 MB `.wasm` into
  `dist/_astro`. List lazily imported dependencies in `optimizeDeps.include`,
  or the dev server re-optimizes mid-session and reloads the page.

memorialprintkit.com's `public/_headers`, `astro.config.mjs` and
`tests/build-smoke.test.mjs` ("the CSP lets ONNX Runtime start its threaded
runtime") are the working reference.

### Secrets never reach the browser

No API key, no signing secret and no email address appears in a shared module, a
page, or a JSON response. The contact form posts to an endpoint and is never
told where the message goes. Licence keys travel in a request header, never a
URL, because a key in a URL is a key in somebody's request log.

### Anything shown twice is derived once

Prices, FAQ answers, HowTo steps, feature lists: the visible HTML and the
structured data are built from the same object. Never type a number into a page
that also appears in `pricing.ts`.

---

## Hosting

Vercel by default. `api/*.ts` are picked up as edge functions even though the
Astro build is `output: 'static'` — a static site with a few endpoints beside
it, which is exactly the shape the no-backend constraint allows.

| Endpoint | Handler | Needs |
| --- | --- | --- |
| `/api/contact` | `src/server/contact.ts` | `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `CONTACT_SIGNING_SECRET` |
| `/api/subscribe` | `src/server/subscribe.ts` | `RESEND_API_KEY`, `RESEND_SEGMENT_ID`, `RESEND_SIGNUP_EVENT`, `CONTACT_SIGNING_SECRET` |
| `/api/checkout` | `src/server/checkout.ts` | Stripe keys — see `.env.example` |
| `/api/stripe-webhook` | `src/server/stripe-webhook.ts` | Stripe keys — see `.env.example` |
| `/api/spot` | `src/server/spot.ts` | `SPOT_CACHE_URL`, `BLOB_READ_WRITE_TOKEN` — both optional; the feed takes no key |

Each one answers 503 and says so when its variables are missing, rather than
accepting input and dropping it. The sign-up box shares the contact form's
signing secret on purpose: a token from either proves the same fact.

### `/api/spot` is the exception to all of that

It is the only endpoint whose answer is meant to be **cached** — half an hour at the
edge, where the HTML beside it is cached for a day — the only one that takes no
environment at all, and the only one that cannot fail for want of
configuration. All three follow from what it is for.

The site is static, so every figure on it is as old as the last deploy. That is
fine for a coin's weight and wrong for the price of silver. So a price is
rendered twice: the build bakes the committed snapshot into the HTML, dated and
captioned, and `src/lib/spot-dom.ts` fetches this endpoint in the browser and
rewrites every marked figure on the page. Both halves call the same functions in
`src/lib/spot.ts`, so they cannot round differently or word a caveat two ways.

**Where the prices come from.** The endpoint serves a cached snapshot — the JSON
document at `SPOT_CACHE_URL`, a Vercel Blob object — and refreshes it from
gold-api.com when the last refresh was more than thirty minutes ago. There is no
cron: the reader who happens to arrive after the interval pays for the refresh,
and everybody after them is served from the cache. Setup steps are in
`.env.example`.

**Why not just call the feed per request, with a long cache in front of it.**
Because the CDN cache is per-region, is purged on every deploy and is bypassed
by a query string, and the feed bans an IP that sends "multiple requests per
second". It is unmetered and needs no key — it replaced metals.dev, whose free
tier was a hundred calls a **month** — but a stateless function cannot count its
own calls, so the first sign of a runaway would be the ban. Two guards in `src/server/spot.ts` make it
countable instead, and both keep their state in the cached document:

| Guard | What it stops |
| --- | --- |
| `fetchedAt`, the time of the last **feed call** | Refreshing more often than the interval. It is deliberately a different field from `asOf`, the time the prices were *read*: `asOf` barely moves while the metals market is shut, so scheduling off it would refresh on every cache miss all weekend, each call returning the same Friday timestamp it had just rejected. |
| A month-to-date refresh count | Everything else. It is a fuse rather than a knob: if it trips, the clock check has broken, and the log says so while the site goes on serving the last good figures. |

Neither makes the refresh atomic — two requests in the same moment can both
refresh, wasting one call, rarely. `ifMatch` on the write is the fix if the
usage count ever shows it happening.

`src/data/spot-snapshot.ts` is the **fallback**: the reading the static build
bakes into every page, which is what a crawler indexes, what a reader with no
JavaScript keeps, and what the endpoint serves when the cache is empty,
unreachable, slow or malformed. `npm run spot` refreshes it by hand from the
feed.

**Keeping the built-in figure fresh.** It only changes when the site is rebuilt,
so two things keep it current without anyone remembering to. `npm run build`
runs `scripts/prebuild-spot.mjs` first, which takes the figure from the cached
document — a public file, so no credential and no feed call — and falls back to
the committed reading on any failure, including no network. And the first
successful refresh of each week pokes `SPOT_DEPLOY_HOOK_URL`, which rebuilds the
site with the price it just fetched. The price readers with JavaScript see
refreshes every half hour and never waits for a build; the baked-in figure is
rebuilt at most once a week (`hookedAt` in the cached document), and it cannot loop: a build never calls the feed, and a deploy never
calls `/api/spot`.

That prebuild fetch is a deliberate exception to the rule that builds do not
fetch. The three reasons behind that rule are in `src/data/coin-catalog.ts` and
none of them survives contact with a price: reproducibility is not wanted (two
builds a day apart *should* render different prices), the build stays
credential-free and works offline, and a diff as review means nothing for one
number that is stamped with its own timestamp wherever it appears.

So `/api/spot` always has a correct answer and always answers 200. Cache down,
feed down, nothing configured at all: it serves the best snapshot on hand. A 503
would blank a figure in every browser on the site over a cache miss.

Prices are stored and computed **unrounded**, and rounded once at the point of
display in `formatUsd()` — so a figure a page prints is rounded from the number
its arithmetic used.

It is also the one endpoint on the **Node** runtime rather than edge, because
`@vercel/blob` imports `undici` and cannot be bundled for the edge. Behind a
half-hour edge cache this function runs about twice an hour per region, so a
cold start there is invisible.

`astro dev` does not serve `api/*.ts`, so the fetch 404s under `npm run dev`
and every page shows the built-in figures — which is the fallback working, not
a bug. Run `vercel dev` to exercise the endpoint itself.

Cache lifetimes, shortest to longest:

| | Held for | Why |
| --- | --- | --- |
| `/api/spot` in the browser | 5 minutes | a browsing session costs one request, not one per page |
| `/api/spot` at the edge | 30 minutes | one invocation per half hour per region, whatever the traffic; matches the refresh interval |
| …then stale while revalidating | 24 hours | an older price, labelled with its date, beats no price |
| the HTML | 1 day (stale for a week) | it holds weights and words, which do not move |
| `/_astro/*`, the rewriting module | a year, immutable | content-hashed |

The gap between rows two and four is the whole feature: tighten the HTML or
loosen the price and the second rendering has nothing left to do.

That rule is one exported string — `SPOT_CACHE_CONTROL` in `src/lib/spot.ts` —
repeated by the handler and by all three host configs, and
`tests/spot.test.mjs` compares all four to it. It deliberately carries no
`must-revalidate`, unlike every other rule here: that directive forbids
serving a stale response and `stale-while-revalidate` exists to permit one, and
a CDN resolving the contradiction drops the SWR.

`tests/spot-dom.test.mjs` runs the browser half against real built pages and
checks that the figure, its dateline, the ladder under it and the copy of the
sentence in the page's JSON-LD all move together — including after a
back/forward-cache restore, which is the one path that can otherwise show a
figure older than the endpoint's own hour.

### Checking a deployment from the outside

The displayed price and the charged price are two separate systems and nothing
keeps them in step. The checkout endpoint echoes what Stripe will actually do,
so one request answers all three questions that matter:

```bash
curl -s -X POST https://<domain>/api/checkout \
  -H 'content-type: application/json' -d '{"kind":"once"}' | jq
```

- `livemode` — is this taking real money, or only appearing to? A test-mode
  session on the real domain looks completely normal from the outside.
- `managedPayments` — is Stripe the merchant of record, or do you owe the VAT?
- `amountTotal` — does the number on the pricing page match what is charged?

---

## Going live

**This site is live.** `DISCOVERABLE` is `true`, the `X-Robots-Tag` is out of
all three host configs, `/llms.txt` serves the real summary, the real home page
ships in every build and the whole catalogue is crawlable. The steps below are
kept as the record of what was done, and as the procedure for the next site in
this family -- they are not a to-do list here.

A starter in this family ships hidden: `DISCOVERABLE = false` in
`src/lib/site.ts` makes four mechanisms agree that the site should not be
crawled, indexed, cited or trained on. To open up:

1. Set `DISCOVERABLE = true` in `src/lib/site.ts`.
2. Delete the `X-Robots-Tag` line from `public/_headers`, `netlify.toml` and
   `vercel.json`.
3. `npm run test:build` — the lockdown check is all-or-nothing and will fail if
   you did one and not the other.
   The same run checks that nothing the site sells is still switched off (the
   `*_AVAILABLE` flags) — launching before the product is ready is the one
   failure that looks fine on the page.
4. `grep -rl noindex dist` should now list only `dist/404.html` and
   `dist/checkout-complete/index.html`. Those two are noindex on purpose and
   stay that way; anything else in that list is a page that is still hidden.
5. After the deploy, check from the outside:
   `curl -sI https://<domain>/ | grep -i x-robots-tag` prints nothing, the home
   page's `<meta name="robots">` says `index, follow`, and `/robots.txt` ends
   with a `Sitemap:` line.
6. Submit `https://<domain>/sitemap-index.xml` in Google Search Console and
   Bing Webmaster Tools, and request indexing for the home page. Bing's index
   also feeds ChatGPT search and DuckDuckGo.
