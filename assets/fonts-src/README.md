# Font sources

Put the original `.woff2` files here. They are **committed and never served** —
`npm run fonts` subsets them into `public/fonts/`, and only the subset ships.

## Adding a webfont

1. Download the woff2 (from Google Fonts, choose the **latin** subset — a
   full-unicode file defeats the point of subsetting).
2. Save it here as `body-latin.woff2` / `display-latin.woff2`.
3. Add it to `FONTS` at the top of `scripts/subset-fonts.mjs`.
4. `npm run fonts`.
5. Uncomment the `@font-face` blocks in `src/styles/global.css` and put the
   family name first in `--font-sans` / `--font-display`.
6. Add the subset path to `SITE.preloadFonts` in `src/lib/site.ts`.

Steps 5 and 6 are both required. A `@font-face` with no preload costs a
round trip on the critical path; a preload with no `@font-face` downloads a file
nothing uses, and the browser says so in the console.

## Metric-adjusted fallbacks

Once a font is in, measure it and fill in the `size-adjust` /
`ascent-override` block in `global.css`. Without it the swap from the system
font to the webfont reflows every line of text and spends most of the CLS
budget in one go. The numbers are per-font — do not copy someone else's.

## Never link a font from a third-party origin

No Google Fonts CDN, no Adobe, no self-hosting on a different domain. It is a
render-blocking cross-origin round trip on the critical path, and it tells
another company who is reading this site.
