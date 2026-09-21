/**
 * Normalises the home page's card photographs into one shape and one format.
 *
 * Sources in assets/cards/, output committed to src/assets/cards/*.webp.
 * Run manually (`npm run cards`) for the same reason as `npm run assets`: the
 * output is in git, so a deploy never needs sharp's system libraries and the
 * hosted build stays fast.
 *
 * Every source is a subject on a white studio background, and they arrive in
 * whatever crop the photographer shot -- some are single coins nearly square in
 * frame, others 3:2 piles. A card slot is one aspect ratio, so cropping to fill it
 * would cut the top and bottom off a single coin, and `object-fit: contain`
 * against a slot the picture does not fill leaves a different margin on every
 * card. Both problems are solved once, here, rather than in CSS: trim the white
 * the photograph came with, then pad back out to exactly ASPECT on white with a
 * fixed margin. Every output file is then the same shape with its subject the
 * same size inside it, the CSS is one `aspect-ratio`, and the browser scales
 * nothing it did not have to.
 *
 * WebP, not PNG: these are continuous-tone photographs of metal, where the
 * palette trick in generate-brand-assets.mjs does not apply and lossy encoding
 * is invisible at card size. Astro re-encodes on import anyway and emits the
 * widths the page asks for -- what this script controls is the source it starts
 * from, which is why a 3 MB PNG is not what gets committed.
 *
 * If a photograph is replaced, drop the new file in assets/cards/ under the same
 * name and re-run; a new subject is a new file and a new line in card-art.ts.
 * Every image in the directory is processed, whatever its extension, because a
 * list of names kept here as well as in card-art.ts is a second list to forget
 * to add to -- and a photograph that never reached the map renders nowhere, so
 * the map is the only place that decides what appears. The names are
 * load-bearing: src/lib/card-art.ts maps a composition group's slug, a tag's
 * slug and a catalogue axis to the file of that name.
 *
 * The last output has no source photograph: placeholder.webp is drawn here,
 * and it is what a card whose picture has not been shot yet shows. Drawing it
 * rather than shipping an empty slot keeps a grid of nine cards the same
 * shape whether or not the photography is done, and a card that gains a real
 * photograph gains it by name with no template change. It is deliberately
 * plain -- no text, no logo, nothing a reader could mistake for a fact about
 * the coins -- because it is the one image on the site that says nothing.
 */
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = path.join(root, 'assets/cards');
const OUT = path.join(root, 'src/assets/cards');

/**
 * 16:9 at 800px. The card is at most about 400 CSS pixels wide in the tile
 * grid, so this is the 2x source and nothing more; a larger file would only
 * give Astro more to throw away.
 */
const WIDTH = 800;
const HEIGHT = 450;

/** Studio white, matched to the backgrounds the sources already have. */
const WHITE = { r: 255, g: 255, b: 255 };

/**
 * Fraction of the frame left as white around the trimmed subject. Enough that a
 * coin's rim does not touch the rounded corner of the slot, and no more: the
 * subject is the only thing on the card besides its heading.
 */
const MARGIN = 0.06;

/** Extensions sharp reads that a photograph is plausibly delivered in. */
const SOURCES = /\.(png|jpe?g|webp|tiff?|avif)$/i;

const FILES = (await readdir(SRC)).filter((f) => SOURCES.test(f)).sort();

const inner = {
  width: Math.round(WIDTH * (1 - MARGIN * 2)),
  height: Math.round(HEIGHT * (1 - MARGIN * 2)),
};

await mkdir(OUT, { recursive: true });

/**
 * The stand-in, drawn rather than photographed: the same white frame the
 * photographs are padded out to, with one faint disc in the middle of it at
 * the size a coin sits at. An SVG composited onto the white, so it is the
 * same pipeline and the same encoder as everything above.
 */
const PLACEHOLDER_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">` +
    `<circle cx="${WIDTH / 2}" cy="${HEIGHT / 2}" r="${Math.round(inner.height / 2)}" ` +
    `fill="#f1efe9" stroke="#ddd9cf" stroke-width="2" />` +
    `<circle cx="${WIDTH / 2}" cy="${HEIGHT / 2}" r="${Math.round(inner.height / 2) - 14}" ` +
    `fill="none" stroke="#e6e2d8" stroke-width="2" />` +
  `</svg>`,
);

await sharp({
  create: { width: WIDTH, height: HEIGHT, channels: 3, background: WHITE },
})
  .composite([{ input: PLACEHOLDER_SVG, top: 0, left: 0 }])
  .webp({ quality: 82, effort: 6 })
  .toFile(path.join(OUT, 'placeholder.webp'));

console.log('src/assets/cards/placeholder.webp');

for (const file of FILES) {
  const name = file.replace(SOURCES, '');

  const trimmed = await sharp(path.join(SRC, file))
    // Threshold rather than an exact match: a studio background is not one
    // value, and an exact trim leaves a ragged frame of near-white.
    .trim({ background: WHITE, threshold: 12 })
    .toBuffer();

  await sharp(trimmed)
    .resize(inner.width, inner.height, { fit: 'inside', withoutEnlargement: false })
    .flatten({ background: WHITE })
    .resize(WIDTH, HEIGHT, { fit: 'contain', background: WHITE })
    .webp({ quality: 82, effort: 6 })
    // Two subjects may legitimately be photographed on the same coin -- silver
    // and United States are both the Silver Eagle, junk silver and 90% silver
    // are both the same handful -- and two byte-identical files are one file to
    // Astro's content hash, so both cards end up pointing at whichever name it
    // emitted. That is one subject's picture silently becoming another's: the
    // day one of them is reshot, the card that kept the old photograph is the
    // one nobody looks at. Naming the file inside the file keeps each card's
    // picture its own fact, at the cost of a couple of hundred bytes.
    .withExif({ IFD0: { ImageDescription: `aboutmycoin card art: ${name}` } })
    .toFile(path.join(OUT, `${name}.webp`));

  console.log(`src/assets/cards/${name}.webp`);
}
