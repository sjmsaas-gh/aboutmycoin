/**
 * Bake the newest cached price into the build. Runs before `astro build`.
 *
 * ---------------------------------------------------------------------------
 * THE PROBLEM THIS SOLVES
 * ---------------------------------------------------------------------------
 *
 * Every page is rendered with a price in it, and that rendering is what a
 * crawler indexes and what a reader with no JavaScript keeps. Readers WITH
 * JavaScript get a current figure from `/api/spot` a moment after the page
 * loads, so the built-in one only has to be reasonable — but "reasonable" has a
 * shelf life, and it is measured in deploys. Left alone, the figure in the HTML
 * is as old as whenever somebody last ran `npm run spot` and pushed, which
 * could be months, and a six-month-old silver price in a search result is the
 * kind of wrong that costs the whole page its credibility.
 *
 * So the build takes its figure from the same cached document `/api/spot`
 * serves, which something refreshed within the last day.
 *
 * ---------------------------------------------------------------------------
 * IT COSTS NOTHING AND IT CANNOT FAIL THE BUILD
 * ---------------------------------------------------------------------------
 *
 * The cached document is a public JSON file. Reading it spends no metals.dev
 * allowance — the feed is never touched here, and this script holds no
 * credential at all. That is the whole reason the build is allowed to read it.
 *
 * And every failure is a no-op: no `SPOT_CACHE_URL`, no network, a slow
 * response, a malformed body, a document older than the committed one. In every
 * case this exits 0 having changed nothing, and `astro build` renders the
 * committed reading in `src/data/spot-snapshot.ts` exactly as it always has.
 * A build must not fail over a nice-to-have.
 *
 * ---------------------------------------------------------------------------
 * THIS IS A DELIBERATE EXCEPTION TO "THE BUILD DOES NOT FETCH"
 * ---------------------------------------------------------------------------
 *
 * CLAUDE.md says a build that fetches rows would cross the line the coin
 * catalogue draws, and the header of `src/data/coin-catalog.ts` gives three
 * reasons: a build must be reproducible, it must work offline and with no
 * credentials, and a diff on the committed file is the review.
 *
 * Each of those is about the catalogue and none of them survives contact with a
 * price:
 *
 *   - reproducibility is not wanted here. Two builds a day apart SHOULD render
 *     different prices; that is the entire point. A coin's weight rendering
 *     differently between two builds would be a bug.
 *   - offline and credential-free still hold. There is no key, and with no
 *     network the build renders the committed file.
 *   - a diff as review makes sense for two hundred new pages. It makes none for
 *     one number that is stamped with its own timestamp on every page it
 *     appears on, and that no human chose.
 *
 * What would genuinely cross the line is the build calling metals.dev. That is
 * metered, per-deploy, and uncountable. It does not happen here and must not.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { METALS, parseSpot } from '../src/lib/spot.ts';
import { SPOT_SNAPSHOT } from '../src/data/spot-snapshot.ts';

const OUT_FILE = resolve(process.cwd(), 'src/data/spot-snapshot.ts');

/** Short: the build is waiting, and the committed reading is already correct. */
const TIMEOUT_MS = 3_000;

/** Nothing here is worth a non-zero exit. Say why, carry on. */
function skip(reason) {
  console.log(`[spot] keeping the committed reading: ${reason}`);
  process.exit(0);
}

const url = process.env.SPOT_CACHE_URL;
if (!url) skip('SPOT_CACHE_URL is not set');

let response;
try {
  // Cache-busted on purpose. The deploy that runs this was very likely
  // triggered moments after the document was rewritten, and the store puts a
  // minute of CDN caching in front of it -- long enough to hand this build the
  // copy it is trying to replace.
  const fresh = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  response = await fetch(fresh, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
} catch (err) {
  skip(`the cache could not be read (${err})`);
}

if (!response.ok) skip(`the cache answered ${response.status}`);

let snapshot;
try {
  // The same validator the endpoint and the browser apply. A half-written
  // document is not something to render into three hundred pages.
  snapshot = parseSpot(await response.json());
} catch (err) {
  skip(`the cache did not return JSON (${err})`);
}
if (!snapshot) skip('the cached document did not parse as a snapshot');

const committed = Date.parse(SPOT_SNAPSHOT.asOf);
const cached = Date.parse(snapshot.asOf);
if (Number.isNaN(cached)) skip('the cached document has no usable timestamp');
if (!Number.isNaN(committed) && cached <= committed) {
  skip('the committed reading is already the newest one');
}

// Same rewrite as scripts/fetch-spot.mjs, against the same file, so there is one
// shape of generated file and one place it is written wrong.
const source = readFileSync(OUT_FILE, 'utf8');
const updated = source
  .replace(/(\n  prices: \{\n)[\s\S]*?(\n  \},)/, (_m, open, close) => {
    const rows = METALS.map((metal) => `    ${metal}: ${snapshot.prices[metal]},`).join('\n');
    return `${open}${rows}${close}`;
  })
  .replace(/(\n  asOf: ')[^']*(')/, `$1${snapshot.asOf}$2`);

if (!updated.includes(`asOf: '${snapshot.asOf}'`)) {
  skip('src/data/spot-snapshot.ts has changed shape; update this script');
}

writeFileSync(OUT_FILE, updated);
console.log(`[spot] built-in reading updated from the cache: ${snapshot.asOf}`);
