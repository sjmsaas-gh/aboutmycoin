/**
 * Uploads everything staged in r2-assets/ to the bucket, preserving paths.
 *
 * Objects get immutable, year-long cache headers. That is safe because every
 * key carries a version segment: a new model version is a new path, never an
 * overwrite. Existing keys are skipped unless --force is passed, so re-running
 * this is cheap and cannot silently replace a version users have cached.
 *
 *   npm run r2:sync -- --dry-run
 *   npm run r2:sync
 */
import { readFileSync, statSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { loadR2Config, assertBucketMatches } from './r2/env.mjs';
import { putObject, headObject, listObjects } from './r2/client.mjs';

const ROOT = 'r2-assets';
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

const TYPES = {
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.bin': 'application/octet-stream',
};

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

const manifest = JSON.parse(readFileSync('r2/manifest.json', 'utf8'));
const cfg = loadR2Config();
assertBucketMatches(cfg, manifest.bucket);

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name !== 'README.md' && !e.name.startsWith('.')) out.push(p);
  }
  return out;
}

async function main() {
  const files = await walk(ROOT);
  if (files.length === 0) {
    console.log(`Nothing staged in ${ROOT}/. See r2/manifest.json for the key layout.`);
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let bytes = 0;

  /**
   * True object sizes, from a LIST rather than per-key HEADs.
   *
   * A HEAD comes back through Cloudflare, which may serve the response
   * compressed and then omit content-length -- so `headObject` reported size 0
   * for the two brotli-compressible ORT files and this script announced that
   * an immutable versioned key had changed, advising --force. Both were wrong,
   * and --force on that advice would have re-uploaded 28MB for no reason. The
   * LIST response carries the stored size in XML, unaffected by how any
   * individual response is transferred.
   */
  let remoteSizes = null;
  try {
    remoteSizes = new Map((await listObjects(cfg)).map((o) => [o.key, o.size]));
  } catch (e) {
    if (!dryRun) throw e;
    console.log('note: could not list the bucket, falling back to per-key HEAD');
  }

  for (const file of files) {
    const key = relative(ROOT, file).split(/[\\/]/).join('/');
    const contentType = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
    const size = statSync(file).size;
    const mb = (size / 1024 / 1024).toFixed(2);

    let existing = null;
    let checkFailed = false;
    if (!force) {
      if (remoteSizes) {
        existing = remoteSizes.has(key) ? { size: remoteSizes.get(key) } : null;
      } else {
        try {
          existing = await headObject(cfg, key);
        } catch (e) {
          // A dry run should work offline; a real run must not guess.
          if (!dryRun) throw e;
          checkFailed = true;
        }
      }
    }
    if (existing && existing.size === size) {
      console.log(`skip      ${key}  (already present, ${mb} MB)`);
      skipped++;
      continue;
    }
    if (existing) {
      console.log(
        `WARNING   ${key} exists with a different size (${existing.size} vs ${size}).`,
      );
      console.log(
        `          Versioned keys should never change. Bump the version instead,` +
          ` or pass --force if you are certain.`,
      );
      if (!force) {
        skipped++;
        continue;
      }
    }

    if (dryRun) {
      const suffix = checkFailed ? '  [could not check remote]' : '';
      console.log(`would put ${key}  (${mb} MB, ${contentType})${suffix}`);
      uploaded++;
      bytes += size;
      continue;
    }

    const body = await readFile(file);
    await putObject(cfg, key, body, { contentType, cacheControl: CACHE_CONTROL });
    console.log(`put       ${key}  (${mb} MB, ${contentType})`);
    uploaded++;
    bytes += size;
  }

  console.log(
    `\n${dryRun ? 'Would upload' : 'Uploaded'} ${uploaded}, skipped ${skipped}. ` +
      `${(bytes / 1024 / 1024).toFixed(1)} MB.`,
  );
  if (!dryRun && uploaded) {
    console.log(`Served from https://${manifest.domain}/<key>`);
  }
}

main().catch((e) => {
  // Network and S3 errors are expected failure modes here, not bugs. Print the
  // message, not a stack trace the user has to read past.
  console.error(`\n${e?.message ?? e}`);
  process.exit(1);
});
