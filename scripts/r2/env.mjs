/**
 * Project-scoped R2 credentials.
 *
 * Deliberately reads ONLY ./.env.r2 and never process.env.
 *
 * That is the whole point of this file. wrangler and the AWS SDK both
 * auto-discover credentials from ambient environment variables and shared
 * config files, so running either one here could silently pick up a work
 * Cloudflare account and push this project's assets into it. Reading a single
 * explicit file makes that impossible: if .env.r2 is absent, nothing happens.
 *
 * For CI, write the file from a secret in the job rather than exporting these
 * as environment variables.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILE = resolve(process.cwd(), '.env.r2');

const REQUIRED = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
];

function parse(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function loadR2Config() {
  if (!existsSync(ENV_FILE)) {
    console.error(`
No .env.r2 found at ${ENV_FILE}

This project never reads Cloudflare credentials from your environment, so your
work wrangler login is not used and cannot be used by accident.

Copy the template and fill it in:

    cp .env.r2.example .env.r2

See "R2 setup" in README.md for how to mint a bucket-scoped token.
`);
    process.exit(1);
  }

  const cfg = parse(readFileSync(ENV_FILE, 'utf8'));
  const missing = REQUIRED.filter((k) => !cfg[k]);
  if (missing.length) {
    console.error(`.env.r2 is missing: ${missing.join(', ')}`);
    process.exit(1);
  }

  // A token scoped to one bucket is the safety net. If the file names a
  // different bucket than the manifest expects, stop rather than write into
  // whatever bucket the credential happens to reach.
  return {
    accountId: cfg.R2_ACCOUNT_ID,
    accessKeyId: cfg.R2_ACCESS_KEY_ID,
    secretAccessKey: cfg.R2_SECRET_ACCESS_KEY,
    bucket: cfg.R2_BUCKET,
    endpoint: cfg.R2_ENDPOINT || `${cfg.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  };
}

/** Fail loudly if .env.r2 and r2/manifest.json disagree about the bucket. */
export function assertBucketMatches(cfg, manifestBucket) {
  if (cfg.bucket !== manifestBucket) {
    console.error(
      `Bucket mismatch: .env.r2 says "${cfg.bucket}", r2/manifest.json says ` +
        `"${manifestBucket}". Refusing to run — one of them is wrong, and ` +
        `guessing which would write to the wrong place.`,
    );
    process.exit(1);
  }
}
