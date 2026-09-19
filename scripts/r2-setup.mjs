/**
 * Verifies the R2 credentials reach the bucket, and applies the CORS policy if
 * the token is permitted to.
 *
 * Bucket creation, the custom domain, and CORS are bucket *configuration*, not
 * object operations. An "Object Read & Write" token deliberately cannot do any
 * of them -- that is the point of scoping it that way. So this script verifies
 * access, tries CORS, and if it is refused prints exactly what to paste into
 * the dashboard rather than asking for a broader token.
 *
 *   npm run r2:setup
 */
import { readFileSync } from 'node:fs';
import { loadR2Config, assertBucketMatches } from './r2/env.mjs';
import { putBucketCors, getBucketCors, listObjects } from './r2/client.mjs';

const manifest = JSON.parse(readFileSync('r2/manifest.json', 'utf8'));
const corsRules = JSON.parse(readFileSync('r2/cors.json', 'utf8'));

async function main() {
  const cfg = loadR2Config();
  assertBucketMatches(cfg, manifest.bucket);

  console.log(`Bucket:   ${cfg.bucket}`);
  console.log(`Endpoint: https://${cfg.endpoint}\n`);

  // Listing proves the credentials reach this bucket before we change anything.
  let existing;
  try {
    existing = await listObjects(cfg);
  } catch (e) {
    console.error(`Cannot reach the bucket: ${e.message}\n`);
    console.error(`Check that:
  - the bucket "${cfg.bucket}" exists
  - the token has "Object Read & Write" on that bucket
  - R2_ACCOUNT_ID matches the account the bucket lives in`);
    process.exit(1);
  }
  console.log(`Credentials OK — bucket holds ${existing.length} object(s).\n`);

  try {
    await putBucketCors(cfg, corsRules);
    console.log('CORS applied.\n');
    console.log(await getBucketCors(cfg));
  } catch (e) {
    if (!/40[13]/.test(e.message)) throw e;
    console.log(`CORS not applied — the token cannot change bucket settings.

That is expected and correct: an "Object Read & Write" token is scoped to
objects only, which is what keeps it from touching anything else in the
account. Uploads will work fine.

Set CORS once by hand instead:

  Cloudflare dashboard
    -> R2 -> ${cfg.bucket} -> Settings -> CORS Policy -> Edit / Add

Paste exactly this (it is r2/cors.json):

${JSON.stringify(corsRules, null, 2)}
`);
  }

  console.log(`Without CORS the browser cannot fetch model weights or WASM from
https://${manifest.domain} — it is required, not optional.

Next:
  1. Confirm the custom domain is attached: ${manifest.domain}
  2. Stage files under r2-assets/, then:  npm run r2:sync -- --dry-run
`);
}

main().catch((e) => {
  console.error(`\n${e?.message ?? e}`);
  process.exit(1);
});
