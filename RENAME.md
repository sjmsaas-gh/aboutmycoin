# Starting a new site from this starter

Ordered. Roughly fifteen minutes to step 9, at which point you are building the
product rather than the scaffolding.

---

### 1. Copy it

From `/var/www/more_html/sjmsaas/`:

```bash
cp -r starter newsite.com && cd newsite.com
rm -rf .git node_modules dist .astro .vercel .env .env.r2 r2-assets
git init
```

The folder name **is the domain**, exactly — no `www`, no scheme, no suffix.
`tests/build-smoke.test.mjs` checks that the directory name matches
`SITE.domain`, so a half-finished rename fails a test instead of reaching
production.

### 2. Identity

Edit `src/lib/site.ts`: `name`, `domain` (must equal the folder name), `url`,
`tagline`, `description`, `twitter`. Leave `ga4` empty until the property
exists, and leave `DISCOVERABLE = false`.

Then `astro.config.mjs` — `SITE_URL` at the top must match `SITE.url`. There is
a test for it; it is two declarations of one fact because Astro reads its config
before the app graph exists.

### 3. Names in the plumbing

- `package.json` — `name`.
- `src/server/license.ts` — `KEY_PREFIX`, the visible prefix on every licence
  key. Letters and digits only; changing it later invalidates every key issued.
- `README.md` — the first paragraph.
- `CLAUDE.md` — the "New session, start here" block at the top. Create
  `SPEC.md` (the product decisions and why) and `NEXT-SESSION.md` (where the
  build stopped) now, while the decisions are fresh.

### 4. The mark

Replace the geometry in **all three** places, which must agree:

- `public/favicon.svg` (literal colours — a favicon renders with no stylesheet)
- `src/components/Logo.astro` (CSS variables, so it re-colours in dark mode)
- `scripts/generate-brand-assets.mjs` (plain SVG for sharp)

Then `npm run assets` to regenerate the icon, logo and OG card. Edit the two
headline lines in the OG card while you are in that file, and the `imageAlt`
default in `src/components/Seo.astro` to say what the card shows.

A card of type alone can look like a placeholder in a message thread.
memorialprintkit.com's `scripts/generate-brand-assets.mjs` composites the home
page's hero image beside the headline, if you want to copy it. Write a card with
a photograph in it as a palette PNG (`palette: true`): full colour came to
600 KB, and WhatsApp drops the preview for share images much over that.

### 5. Design

`src/styles/global.css` is the fork point. Replace the `@theme` ramps, the
accent and the fonts; keep the semantic token layer and the component classes.
Update `SITE.themeColor` to match the new `--bg` — it is plain hex because
`<meta name="theme-color">` is read before any stylesheet.

Webfonts, if you want them: `assets/fonts-src/README.md` has the five steps.
System fonts are a perfectly good place to launch from.

### 6. Environment

```bash
cp .env.example .env
openssl rand -base64 48   # LICENSE_SIGNING_SECRET
openssl rand -base64 48   # CONTACT_SIGNING_SECRET (a different one)
```

Fill in test-mode Stripe keys and Resend. Read the comments — several variables
have a deliberate direction to their default.

### 7. CSP

If this site serves anything from another origin, add it to the directives it
serves (`connect-src`, `img-src`, `script-src`, `font-src` — see the note on
`assetOrigin` in `src/lib/site.ts`) in `vercel.json`, `netlify.toml` **and**
`public/_headers`. A blocked asset under CSP fails silently in production and
works perfectly in dev, which is the worst possible combination.

Large files go to Cloudflare R2: [r2/README.md](r2/README.md). If the app runs
WebAssembly or a model in a worker, read "If the app runs WebAssembly" in
README.md before writing the first header. It needs specific CSP and COEP
settings, and none of them show up until production.

### 8. Content

- `src/lib/pricing.ts` — tiers, prices, and `GATE_EXPLAINER`. Nothing in a
  feature list that is not built.
- `src/data/answers.ts` — delete the two examples, write real ones.
- `src/lib/page-dates.ts` — the real date each dated page last changed. Bump
  one only when that page's text changes.
- `src/lib/third-parties.ts` — every outside service a visit touches, worded
  for this product. `/privacy` renders it.
- `KEYWORDS.md` — the keyword map for this niche.
- The pages: `/`, `/about`, `/privacy`, `/faq`, `/pricing`, and the nav in
  `Header.astro` / `Footer.astro`.

`/privacy` is the one to read line by line rather than skim. Every claim on it
is true of the starter as shipped; the day the product does something new, that
page is the first thing that quietly stops being true.

### 9. Verify

```bash
npm install
npm run check        # 0 errors
npm test
npm run test:build
npm run dev
```

### 10. Build the product

### 11. Go live

1. `DISCOVERABLE = true` in `src/lib/site.ts`.
2. Delete the `X-Robots-Tag` line from all three host configs.
3. `npm run test:build` — the lockdown check fails if you did one and not the
   other, and the launch-order check fails if anything the site sells is still
   switched off.
4. `grep -rl noindex dist` lists only `dist/404.html` and
   `dist/checkout-complete/index.html` — both noindex on purpose.
5. After the deploy, `curl -sI https://<domain>/ | grep -i x-robots-tag`
   prints nothing and `/robots.txt` has a `Sitemap:` line.
6. Submit the sitemap in Google Search Console and Bing Webmaster Tools.
7. Check the deployment from the outside — see "Checking a deployment" in
   README.md. `livemode`, `managedPayments` and `amountTotal` are the three
   things that are invisible from the site itself and expensive to get wrong.
