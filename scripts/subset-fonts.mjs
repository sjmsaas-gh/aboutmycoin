/**
 * Subsets self-hosted webfonts to the characters the site actually uses.
 *
 * Sources are woff2 files downloaded once into assets/fonts-src/ and committed
 * there so they are never served. This script trims them into public/fonts/,
 * down to printable ASCII plus the specific punctuation the copy relies on
 * (curly quotes, en/em dashes, ×, ·, ✓, ©, °).
 *
 * Variable weight axes are kept intact -- they cost little and let headings and
 * body share one file each across every weight the design uses.
 *
 * Run with `npm run fonts` after adding copy that introduces a new glyph.
 * Requires fonttools: `pip install fonttools brotli`.
 *
 * The starter ships no fonts, so this exits cleanly with an explanation until
 * FONTS below is filled in. See assets/fonts-src/README.md.
 */
import { execFileSync } from 'node:child_process';
import { statSync, existsSync } from 'node:fs';

/**
 * Characters beyond printable ASCII that appear in site copy.
 *
 * Only characters the SOURCE fonts actually contain can be listed here. A
 * Google Fonts *latin* subset has no arrows, no maths operators and no box
 * drawing -- adding e.g. '2192' here silently does nothing, and the copy falls
 * back to a system font mid-sentence. Audit the built HTML against this list
 * rather than trusting it.
 */
// NOTE: 2713 (the tick) was removed from this list when the fonts were added.
// Neither source contains it -- a Google Fonts *latin* subset has no dingbats --
// so asking for it was exactly the silent no-op the comment above warns about.
// If a tick ever appears in copy it will render from a system font; put it in an
// <svg> instead of trusting a glyph the webfont does not have.
const EXTRA = ['2018', '2019', '201C', '201D', '2013', '2014', '2026', '00D7', '00B7', '00A9', '00B0', '00AE', '00A0'];
const ASCII = 'U+0020-007E';
const UNICODES = [ASCII, ...EXTRA.map((c) => `U+${c}`)].join(',');

/** RENAME: add the fonts this site uses. */
const FONTS = [
  // Plus Jakarta Sans, variable 500-800, for headings and the masthead.
  { src: 'assets/fonts-src/jakarta-latin.woff2', out: 'public/fonts/display-subset.woff2' },
  // Inter, variable 400-700, for everything else.
  { src: 'assets/fonts-src/inter-latin.woff2', out: 'public/fonts/body-subset.woff2' },
];

if (FONTS.length === 0) {
  console.log(
    'No fonts configured. This site is using system fonts, which is a fine\n' +
      'place to launch from. To add webfonts: put the woff2 sources in\n' +
      'assets/fonts-src/, list them in FONTS at the top of this script, then see\n' +
      'the font section of src/styles/global.css and SITE.preloadFonts.',
  );
  process.exit(0);
}

for (const f of FONTS) {
  if (!existsSync(f.src)) {
    console.error(`Missing source font: ${f.src}`);
    process.exit(1);
  }
  execFileSync(
    'pyftsubset',
    [
      f.src,
      `--output-file=${f.out}`,
      '--flavor=woff2',
      `--unicodes=${UNICODES}`,
      '--layout-features=kern,liga,calt,tnum',
      '--no-hinting',
      '--drop-tables+=DSIG',
    ],
    { stdio: 'inherit' },
  );
  const before = statSync(f.src).size / 1024;
  const after = statSync(f.out).size / 1024;
  console.log(
    `${f.out}  ${before.toFixed(1)} KB -> ${after.toFixed(1)} KB  (-${(100 - (after / before) * 100).toFixed(0)}%)`,
  );
}
