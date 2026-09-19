# Source assets

Design sources that are **not** served. Everything here is an input to a
generator or a reference; the output lives in `public/`.

- `fonts-src/` — original woff2 files, subset by `npm run fonts`.

The brand mark is not a file here on purpose. It is defined three times, in
three places that must agree, because each one needs it in a different form:

- `public/favicon.svg` — literal colours, because a favicon renders with no
  stylesheet.
- `src/components/Logo.astro` — CSS variables, so it re-colours in dark mode.
- `scripts/generate-brand-assets.mjs` — plain SVG for sharp to rasterise.

Change the geometry in one and you must change it in all three, then run
`npm run assets`.
