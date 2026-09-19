# Where the build stopped

Last updated 2026-09-19.

## Done

RENAME.md steps 1-3, plus the coin catalogue structure.

**Scaffolding** (unchanged from the previous session): copied from `starter/`,
fresh `git init`, no commit yet. `src/lib/site.ts` identity, `astro.config.mjs`
`SITE_URL`, `package.json` name, `KEY_PREFIX` -> `AMC`, `README.md` and
`CLAUDE.md` headers.

**The catalogue structure** — the URL scheme in SPEC.md, built and passing:

- `src/data/coin-schema.ts` — types only. The contract.
- `src/data/coin-taxonomy.ts` — `GROUPS`, `TYPES`, `TAGS`. Editorial, and
  permanently hand-written even once coins come from a database.
- `src/data/coin-catalog.ts` — `COINS`. Nine hand-written seed entries today;
  a generated, committed snapshot later.
- `src/data/coins.ts` — the module routes import. Re-exports the above, adds
  path helpers and filters, and runs `validateTaxonomy()` at build time.
- Routes: `/coin-value`, `/coin-value/<group>`, `/coin-value/<group>/<type>`,
  `/coin-value/<group>/<type>/<coin>`, `/coin-value/tagged`,
  `/coin-value/tagged/<tag>`.
- `src/components/Breadcrumbs.astro` and `CoinTile.astro`.
- `coinProductSchema()` in `src/lib/schema.ts`.
- Catalogue styling at the foot of `src/styles/global.css`.

Wired through: `page-dates.ts` (catalogue lastmod is derived, not listed),
`astro.config.mjs` sitemap priority, `Header.astro`, `Footer.astro`,
`llms.ts`, `KEYWORDS.md`, and four new checks in `tests/build-smoke.test.mjs`.

49 pages build. `npm run check`, `npm test` and `npm run test:build` all pass.

## Next

1. **Decide what populates the catalogue.** SPEC.md "Open". This is still the
   question that blocks the most. The pipeline shape is settled; the source of
   rows is not.
2. **Write the catalogue generator**, once there is something to generate from:
   `scripts/build-catalog.mjs` -> `src/data/coin-catalog.ts`. The seam exists
   and the file header describes the contract it has to honour.
3. **Market data.** Until there is a source, `values` stays empty and every
   coin page keeps its honest "graded price ranges are not published yet"
   section. Do not fill the field from a scrape nobody can name on the page.
4. **The mark** — RENAME.md step 4. `public/favicon.svg`,
   `src/components/Logo.astro`, `scripts/generate-brand-assets.mjs`, then
   `npm run assets`. Also the OG card headline and `imageAlt` in `Seo.astro`.
5. **Design** — `src/styles/global.css`. The catalogue section at the foot of
   the file is written; the tokens above it are still the starter's neutral
   ramp and indigo accent. The brief is in SPEC.md, "Design direction".
6. **Environment** — `cp .env.example .env`, generate the two signing secrets.
7. **CSP** — only once it is known whether a live spot-price source is fetched
   from the browser. If it is, `vercel.json`, `netlify.toml` **and**
   `public/_headers`, in one change, with `/privacy` and
   `src/lib/third-parties.ts`.
8. **Remaining content** — `src/lib/pricing.ts`, `src/data/answers.ts` (still
   holds the two starter examples), the home page, `/about`, `/faq`.

## Traps, carried over and new

- The folder name must stay exactly `aboutmycoin.com`; a build test asserts it
  equals `SITE.domain`.
- `src/lib/pricing.ts` is still starter placeholder content, and `/pricing`
  still renders it. Nothing in a feature list that is not built.
- `/privacy` and `src/lib/third-parties.ts` are true of the starter as shipped.
  The day this site fetches spot prices from an outside API, both stop being
  true and have to be updated in the same change.
- `src/data/answers.ts` still contains the two starter examples, which describe
  an Astro starter rather than coins. They are in the sitemap.
- **Never bump a coin's `updated` without editing it.** It is the sitemap
  `lastmod` and the schema `dateModified`, and it is also the input to every
  archive page's date. One careless bulk edit re-dates the whole catalogue.
- **`validateTaxonomy()` throws, it does not warn.** An unregistered tag, a
  duplicate slug, a group named after a reserved segment or two pages claiming
  one FAQ question all fail the build. That is deliberate; do not soften it to
  a console warning to get a build through.
