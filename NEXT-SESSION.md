# Where the build stopped

Last updated 2026-09-19.

## Done

RENAME.md steps 1–3 only — the scaffolding, not the product.

- Copied from `starter/`, fresh `git init`, no commit yet.
- `src/lib/site.ts`: name, domain, url, tagline, description. `ga4` still
  empty, `DISCOVERABLE` still `false`.
- `astro.config.mjs`: `SITE_URL` matches `SITE.url`.
- `package.json` name → `aboutmycoin`.
- `src/server/license.ts`: `KEY_PREFIX` → `AMC`.
- `README.md` and `CLAUDE.md` headers rewritten for this site.
- `SPEC.md` and this file created.

Not yet run: `npm install`, `npm run check`, `npm test`. The tree has no
`node_modules`.

## Next

Read `SPEC.md` — the "Open" section blocks most of what follows. In particular
**where the coin data comes from** decides the shape of the site, and **what is
sold** decides whether the Stripe half of the starter stays.

Then, in RENAME.md order:

4. **The mark** — `public/favicon.svg`, `src/components/Logo.astro` and
   `scripts/generate-brand-assets.mjs` must agree; then `npm run assets`.
   Also the OG card headline and the `imageAlt` default in `Seo.astro`.
5. **Design** — `src/styles/global.css`. Deliberately different from the other
   sites in the family; there is no house style. Keep `SITE.themeColor` in step
   with `--bg`.
6. **Environment** — `cp .env.example .env`, generate the two signing secrets.
7. **CSP** — only once it is known whether a live spot-price source is fetched
   from the browser. If it is, it goes in `vercel.json`, `netlify.toml` **and**
   `public/_headers`.
8. **Content** — `src/lib/pricing.ts`, `src/data/answers.ts` (delete the two
   starter examples), `src/lib/page-dates.ts`, `src/lib/third-parties.ts`,
   `KEYWORDS.md`, and the pages themselves.

## Traps carried over from the starter

- The folder name must stay exactly `aboutmycoin.com`; a build test asserts it
  equals `SITE.domain`.
- `src/lib/pricing.ts` is still starter placeholder content. Nothing in a
  feature list that is not built.
- `/privacy` and `src/lib/third-parties.ts` are true of the starter as shipped.
  The day this site fetches spot prices from an outside API, both stop being
  true and have to be updated in the same change.
