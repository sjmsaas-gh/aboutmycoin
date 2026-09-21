/**
 * Refresh the built-in spot prices in src/data/spot-snapshot.ts from metals.dev.
 *
 *     npm run spot            # fetches if the built-in reading is a day old
 *     npm run spot -- --force # fetches regardless (spends a call)
 *     npm run spot -- --dry   # fetches, prints, writes nothing
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS AND IS NOT
 * ---------------------------------------------------------------------------
 *
 * It is NOT how a reader's figure gets updated. That happens through the cache
 * `/api/spot` reads, which is written from outside this repository; see the
 * header of `src/server/spot.ts`.
 *
 * This refreshes the FALLBACK: the reading the static build bakes into every
 * page, which is what a crawler indexes, what a reader with no JavaScript
 * keeps, and what the endpoint serves when the cache is empty or down. Run it
 * when those numbers have drifted far enough to look silly, and commit the
 * result. There is no schedule to keep, because a stale fallback is not a wrong
 * figure: every page states the time the prices it is showing were read.
 *
 * ---------------------------------------------------------------------------
 * THE CALL BUDGET
 * ---------------------------------------------------------------------------
 *
 * metals.dev's free tier is a hundred calls a month. Not a hundred a day. So
 * this script is the only thing in the repository that calls it — nothing the
 * deployed site serves does, not a page, not `astro build`, not `/api/spot` —
 * and it refuses to fetch when the committed reading is younger than
 * MIN_AGE_HOURS, so running it twice in an afternoon costs nothing. `--force`
 * overrides that and says out loud that it is spending a call. Every run prints
 * the month-to-date count from the response's `x-api-usage` header, because a
 * budget nobody is shown is a budget nobody notices running out.
 *
 * The key is read from ./.env, or from the environment. It is a BUILD-TIME
 * credential: production never holds it and has nothing to do with it. Nothing
 * here is imported by anything that ships.
 *
 * The prices are written UNROUNDED, as the feed gave them. Rounding happens
 * once, at the point of display, in `formatUsd()`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { METALS } from '../src/lib/spot.ts';
import { SPOT_SNAPSHOT } from '../src/data/spot-snapshot.ts';
import { fetchMetalsDev } from '../src/server/metals-dev.ts';

const ENV_FILE = resolve(process.cwd(), '.env');
const OUT_FILE = resolve(process.cwd(), 'src/data/spot-snapshot.ts');

/**
 * How recent the committed reading has to be for a run to be refused, in hours.
 *
 * Twenty rather than twenty-four so a run at the same time on consecutive days
 * is never skipped by a few minutes of drift. It exists to protect the monthly
 * allowance from a habit of re-running, not to enforce a schedule: there is no
 * schedule to enforce.
 */
const MIN_AGE_HOURS = 20;

const ENDPOINT = 'https://api.metals.dev/v1/latest';

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const dry = args.has('--dry') || args.has('--dry-run');

function die(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/** Read one key out of .env. The same minimal parser as scripts/r2/env.mjs. */
function keyFromEnvFile() {
  if (!existsSync(ENV_FILE)) return undefined;
  for (const raw of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() !== 'METALS_DEV_API_KEY') continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }
  return undefined;
}

const apiKey = process.env.METALS_DEV_API_KEY || keyFromEnvFile();
if (!apiKey) {
  die(`No METALS_DEV_API_KEY in ./.env or the environment.

The site works without it: src/data/spot-snapshot.ts is committed, so the build
and /api/spot both have prices. This script is the only thing that needs a key.`);
}

/* --------------------------------------------------------------------------
   Is a fetch owed at all?
   -------------------------------------------------------------------------- */

const committedAsOf = SPOT_SNAPSHOT.asOf;
const ageHours = (Date.now() - Date.parse(committedAsOf)) / 3_600_000;
if (!Number.isFinite(ageHours)) {
  die(`asOf in src/data/spot-snapshot.ts is not a date: ${committedAsOf}`);
}
// Before the age guard, not after: a future timestamp is younger than
// MIN_AGE_HOURS by any arithmetic, so checked second this would report the
// snapshot as "-9.0h old", exit 0, and quietly never refresh again.
if (ageHours < 0) {
  die(`asOf is in the future (${committedAsOf}). Fix the clock or the file.`);
}
if (ageHours < MIN_AGE_HOURS && !force) {
  console.log(
    `The committed reading is ${ageHours.toFixed(1)}h old (${committedAsOf}).\n` +
      `Nothing fetched -- a call is only worth spending once a day. ` +
      `Use --force to spend one anyway.`,
  );
  process.exit(0);
}

/* --------------------------------------------------------------------------
   Fetch
   --------------------------------------------------------------------------

   Through src/server/metals-dev.ts, which is also what /api/spot calls when the
   cached snapshot goes stale. One implementation of the request, the unit
   assertion, the mapping and the validation, so the figure committed here and
   the figure a reader is served cannot be arrived at two different ways.
   -------------------------------------------------------------------------- */

let reading;
try {
  reading = await fetchMetalsDev(apiKey);
} catch (err) {
  die(`${err instanceof Error ? err.message : err}\n\nThe committed reading is unchanged.`);
}

// Printed whether or not anything else works out: the call has been spent.
if (reading.usage !== undefined) {
  console.log(`metals.dev calls used this month: ${reading.usage} of 100`);
}

const { prices, asOf } = reading.snapshot;

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
  .replace(/(\n  asOf: ')[^']*(')/, `$1${asOf}$2`);

if (updated === source) {
  console.log('\nThe file already held these figures. Nothing written.');
  process.exit(0);
}
if (!updated.includes(`asOf: '${asOf}'`)) {
  die(`Could not rewrite ${OUT_FILE} -- its shape has changed. Update this script's patterns.`);
}

writeFileSync(OUT_FILE, updated);
console.log(`\nWrote src/data/spot-snapshot.ts. Commit it: the deployed site reads this file.`);
