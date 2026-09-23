/**
 * Generates every brand raster from ONE photograph: the 1884 Morgan dollar in
 * assets/brand/aboutmycoin-hero-full.png.
 *
 * Run manually (`npm run assets`) rather than as part of `astro build`: the
 * output is committed, so the deploy does not depend on the build machine
 * having sharp's system dependencies, and the hosted build stays fast.
 *
 * Produces:
 *   src/assets/morgan-mark.png    416x416, the brand mark -- the coin cut out
 *                                 of its background on transparency. Imported
 *                                 by src/components/Logo.astro, so Astro hashes
 *                                 it and emits the small sizes the header and
 *                                 footer actually render.
 *   public/logo.png               512x512, referenced by Organization JSON-LD
 *   public/apple-touch-icon.png   180x180
 *   public/favicon.ico            16/32/48/64
 *   public/og/default.png         1200x630, the social card
 *
 * The coin, not an abstract mark, because the one thing a visitor arriving from
 * a search for "1921 silver dollar value" needs to believe in the first 200ms
 * is that they are on a coin site. A photograph says that at 20px; a geometric
 * glyph does not. It is the same coin as the hero photograph on the home page
 * for the same reason: one coin, seen twice, reads as a brand -- two different
 * coins read as stock art.
 *
 * The crop is a circle taken out of the hero photo. The numbers in COIN below
 * were measured off that file; if the photograph is ever replaced, re-measure
 * them (the disc's bounding box) rather than nudging them until it looks right,
 * and check the right-hand edge: the stack of coins standing behind the Morgan
 * is a few pixels away and creeps into the cut-out at a larger radius.
 *
 * Every string on the card is imported from src/lib/site.ts rather than
 * retyped, so a rename cannot leave it showing the previous site's name. The
 * colours cannot be imported -- they live in CSS -- so they are duplicated
 * below and must be kept in step with global.css by hand.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { SITE } from '../src/lib/site.ts';

/** RENAME: keep in step with --color-accent-600 and friends in global.css. */
const ACCENT = '#14529b';
const BG = '#ffffff';
const INK = '#0f141c';
const MUTED = '#5a6474';
/**
 * Fonts available to librsvg inside sharp, NOT the site's webfonts. Whatever is
 * installed on this machine is what renders; the fallback chain matters more
 * than the first entry.
 */
const FONT = 'DejaVu Sans, Liberation Sans, Arial, sans-serif';

/**
 * `SITE.tagline` is stored in sentence form so it can be dropped into the
 * middle of a sentence elsewhere; on the card it stands alone and takes a
 * capital. Capitalised here rather than stored capitalised, for the same reason
 * a cheat sheet's `name` is stored lowercase: there is no way back.
 */
const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Every raster here is a photograph of grey metal, which quantises to a palette
 * with no visible loss and about a fifth of the bytes. The OG card and the
 * icons are served from the app origin, where the house rule is that nothing
 * large comes from it; a 400 KB favicon would have been absurd.
 */
const PNG = { compressionLevel: 9, palette: true, quality: 92, effort: 10 };

/** The source photograph and the Morgan's disc within it, in source pixels. */
const SOURCE = 'assets/brand/aboutmycoin-hero-full.png';
const COIN = { cx: 519, cy: 423, r: 208 };

/**
 * The coin, cut out of the photograph on transparency at `size` px.
 *
 * Masked with a circle one pixel inside the edge and re-antialiased by the
 * downscale, so the rim lands clean on any background -- the mark sits on white
 * in the header, on the sunken grey in the footer, and on near-black in dark
 * mode, and a matted-in white halo would show on two of the three.
 *
 * Sharpened after the resize, not before: at 32px and below the devices and the
 * date are below the resolution of the raster and the coin collapses into a
 * grey disc without it. The amounts are deliberately mild; a coin is a
 * photograph of metal and oversharpening reads as a JPEG artefact.
 */
async function coin(size) {
  const d = COIN.r * 2;
  /*
   * Two passes, because sharp runs resize before composite whatever order they
   * are written in: the mask has to be cut at the output size, not the source
   * size, or it does not line up with the disc it is masking.
   */
  const disc = await sharp(SOURCE)
    .extract({ left: COIN.cx - COIN.r, top: COIN.cy - COIN.r, width: d, height: d })
    .resize(size, size, { kernel: 'lanczos3' })
    .sharpen({ sigma: size <= 64 ? 0.7 : 1.1 })
    .png()
    .toBuffer();

  const r = size / 2;
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`,
  );
  return sharp(disc)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png(PNG)
    .toBuffer();
}

/**
 * An icon: the coin on the accent square, inset so the rim is not clipped by
 * the rounding.
 *
 * On a fill rather than on transparency because these are the surfaces the site
 * does not control -- a browser tab, an iOS home screen, a Google result. A
 * transparent silver coin vanishes on a light tab strip and half-vanishes on a
 * dark one; the blue square is what makes it findable in a row of twenty tabs,
 * and it is the one blue the rest of the site already uses.
 */
async function icon(size, radius) {
  const inner = Math.round(size * 0.82);
  const plate = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <rect width="${size}" height="${size}" rx="${radius}" fill="${ACCENT}"/>
     </svg>`,
  );
  const offset = Math.round((size - inner) / 2);
  return sharp(plate)
    .composite([{ input: await coin(inner), left: offset, top: offset }])
    .png(PNG)
    .toBuffer();
}

/**
 * Packs PNGs into an .ico. sharp cannot write the format and it is 30 lines of
 * header, which is cheaper than another dependency or a hand-made file that
 * nobody can regenerate.
 *
 * Every size is stored as PNG, which every browser from IE11 on reads.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width  (0 means 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette colours
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

/**
 * The social card. 1200x630, which is the size every platform crops from and
 * the size `Seo.astro` declares in og:image:width/height -- the two have to
 * agree, so this is not a free choice.
 *
 * Deliberately typographic rather than a screenshot: a screenshot is stale the
 * week after it is taken, and this file is regenerated by a script that already
 * knows the site's name. The coin is the one picture on it, at a size where the
 * date and the devices are legible -- the card is the site's first impression
 * in a feed, and a 64px mark scaled up would be the wrong half of the brand.
 *
 * It says the name and what the site is, and nothing else. A share card is read
 * at thumbnail size in a feed beside a headline the platform is already
 * printing, so a second headline on the image competes with it; the name and
 * the coin are what a reader cannot get from the link text. Every string comes
 * from `SITE`, so there is no copy here to go stale -- which is what the
 * previous card's "Headline line one, and line two." was.
 *
 * COIN_Y and the composite offset below are the one thing that has to be kept
 * in step by hand: sharp composites the raster after librsvg has rendered the
 * text, so the layout is split across two languages.
 */
const COIN_SIZE = 260;
const COIN_Y = 96;
const ogCard = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BG}"/>
  <rect x="0" y="0" width="1200" height="10" fill="${ACCENT}"/>

  <text x="600" y="${COIN_Y + COIN_SIZE + 108}" text-anchor="middle" font-family="${FONT}" font-size="88" font-weight="700" fill="${INK}">${SITE.name}</text>
  <text x="600" y="${COIN_Y + COIN_SIZE + 164}" text-anchor="middle" font-family="${FONT}" font-size="28" fill="${MUTED}">${sentence(SITE.tagline)}</text>

  <rect x="0" y="620" width="1200" height="10" fill="${ACCENT}"/>
</svg>`;

await mkdir('public/og', { recursive: true });
await mkdir('src/assets', { recursive: true });

const og = await sharp(Buffer.from(ogCard))
  .composite([{ input: await coin(COIN_SIZE), left: Math.round((1200 - COIN_SIZE) / 2), top: COIN_Y }])
  .png(PNG)
  .toBuffer();

const jobs = [
  ['src/assets/morgan-mark.png', await coin(416)],
  ['public/logo.png', await icon(512, 114)],
  ['public/apple-touch-icon.png', await icon(180, 40)],
  ['public/favicon.ico', ico(await Promise.all([16, 32, 48, 64].map(async (s) => ({ size: s, data: await icon(s, Math.round(s * 0.22)) }))))],
  ['public/og/default.png', og],
];

for (const [out, buf] of jobs) {
  await writeFile(out, buf);
  console.log(`${out}  ${(buf.length / 1024).toFixed(1)} KB`);
}
