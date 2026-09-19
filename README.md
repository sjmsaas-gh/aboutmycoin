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

Two generators are run by hand, not at build time, because their output is
committed and the deploy must not depend on the build machine having sharp's
system dependencies or fonttools installed:

```bash
npm run assets       # favicon/logo/OG rasters from the SVG mark (needs sharp)
npm run fonts        # re-subset the webfonts (needs `pip install fonttools brotli`)
```

`npm run dev` serves the marketing pages with no configuration at all. The
contact form and checkout need environment variables, and say so honestly (503,
"not configured") rather than failing silently — see `.env.example`.

---

## What is already built

| Area | Where |
|---|---|
| Site identity, in one place | `src/lib/site.ts` |
| Pre-launch lockdown (4 mechanisms) | `src/lib/site.ts`, `Seo.astro`, `robots.txt.ts`, host configs |
| Canonical URLs, OG, Twitter, robots meta | `src/components/Seo.astro` |
| JSON-LD builders | `src/lib/schema.ts` |
| Sitemap with per-URL lastmod + priority | `astro.config.mjs` |
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
| Honest sitemap `lastmod`, one date per page | `src/lib/page-dates.ts` |
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
Astro build is `output: 'static'` — a static site with a couple of endpoints
beside it, which is exactly the shape the no-backend constraint allows.

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

The site ships hidden. `DISCOVERABLE = false` in `src/lib/site.ts` makes four
mechanisms agree that this site should not be crawled, indexed, cited or trained
on. To open up:

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
