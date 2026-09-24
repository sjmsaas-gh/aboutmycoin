/**
 * Refresh the built-in spot prices in src/data/spot-snapshot.ts from the feed.
 *
 *     npm run spot          # fetches and writes
 *     npm run spot -- --dry # fetches, prints, writes nothing
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS AND IS NOT
 * ---------------------------------------------------------------------------
 *
 * It is NOT how a reader's figure gets updated. That happens through the cache
 * `/api/spot` reads and refreshes; see the header of `src/server/spot.ts`.
 *
 * This refreshes the FALLBACK: the reading the static build bakes into every
 * page, which is what a crawler indexes, what a reader with no JavaScript
 * keeps, and what the endpoint serves when the cache is empty or down. Run it
 * when those numbers have drifted far enough to look silly, and commit the
 * result. There is no schedule to keep, because a stale fallback is not a wrong
 * figure: every page states the time the prices it is showing were read.
 *
 * The feed is gold-api.com, which takes no key and meters nothing, so there is
 * no credential to read and no allowance to guard -- the metals.dev version of
 * this script refused to run twice in a day, and that guard went with the key.
 * One run is three requests, a second apart, which is the feed's own rule.
 *
 * The prices are written UNROUNDED, as the feed gave them. Rounding happens
 * once, at the point of display, in `formatUsd()`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { METALS } from '../src/lib/spot.ts';
import { fetchGoldApi } from '../src/server/gold-api.ts';

const OUT_FILE = resolve(process.cwd(), 'src/data/spot-snapshot.ts');

const args = new Set(process.argv.slice(2));
const dry = args.has('--dry') || args.has('--dry-run');

function die(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/* --------------------------------------------------------------------------
   Fetch
   --------------------------------------------------------------------------

   Through src/server/gold-api.ts, which is also what /api/spot calls when the
   cached snapshot goes stale. One implementation of the request, the unit
   bounds, the mapping and the validation, so the figure committed here and
   the figure a reader is served cannot be arrived at two different ways.
   -------------------------------------------------------------------------- */

let reading;
try {
  reading = await fetchGoldApi();
} catch (err) {
  die(`${err instanceof Error ? err.message : err}\n\nThe committed reading is unchanged.`);
}

const { prices, asOf, source: feed } = reading.snapshot;

for (const metal of METALS) console.log(`  ${metal.padEnd(9)} $${prices[metal]}/ozt`);
console.log(`  as of    ${asOf}`);

if (dry) {
  console.log('\n--dry: nothing written.');
  process.exit(0);
}

// The header is rewritten wholesale rather than patched, so the generated file
// has exactly one author and a diff on it is only ever the numbers.
const source = readFileSync(OUT_FILE, 'utf8');
const updated = source
  .replace(/(\n  prices: \{\n)[\s\S]*?(\n  \},)/, (_m, open, close) => {
    const rows = METALS.map((metal) => `    ${metal}: ${prices[metal]},`).join('\n');
    return `${open}${rows}${close}`;
  })
  .replace(/(\n  asOf: ')[^']*(')/, `$1${asOf}$2`)
  .replace(/(\n  source: ')[^']*(')/, `$1${feed}$2`);

if (updated === source) {
  console.log('\nThe file already held these figures. Nothing written.');
  process.exit(0);
}
if (!updated.includes(`asOf: '${asOf}'`)) {
  die(`Could not rewrite ${OUT_FILE} -- its shape has changed. Update this script's patterns.`);
}

writeFileSync(OUT_FILE, updated);
console.log(`\nWrote src/data/spot-snapshot.ts. Commit it: the deployed site reads this file.`);
