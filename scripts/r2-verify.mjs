/**
 * Checks the deployed assets the way the browser will actually fetch them.
 *
 * Deliberately uses no credentials: it hits the public custom domain over plain
 * HTTPS with a cross-origin `Origin` header, which is the only thing that
 * proves the setup works for a real visitor. `npm run r2:sync` succeeding says
 * the bytes are in the bucket; it says nothing about whether the custom domain
 * is attached, whether CORS was ever applied, or whether the cache headers make
 * a large file re-download on every visit.
 *
 * Checks every key listed in r2/manifest.json. Run it before switching on any
 * feature that depends on those files: a flag that says "live" while its file
 * 404s is an app that works in dev and fails in production.
 *
 *   npm run r2:verify
 */
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('r2/manifest.json', 'utf8'));
const BASE = `https://${manifest.domain}`;
/**
 * The origin a real visitor's page has. CORS must allow exactly this.
 *
 * Read from src/lib/site.ts rather than typed here. On memorialprintkit.com
 * this was a hardcoded sibling domain, which made the check pass while the
 * real site's origin was blocked -- the exact failure this script exists to
 * catch.
 */
const ORIGIN = (() => {
  const m = readFileSync('src/lib/site.ts', 'utf8').match(/^\s{2}url: '([^']+)',$/m);
  if (!m) throw new Error('SITE.url not found in src/lib/site.ts');
  return m[1];
})();

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

async function check(key) {
  const url = `${BASE}/${key}`;
  const problems = [];
  const notes = [];

  let res;
  try {
    // HEAD with an Origin header: same CORS evaluation as the real GET, without
    // pulling the whole file down to find out.
    res = await fetch(url, { method: 'HEAD', headers: { Origin: ORIGIN } });
  } catch (e) {
    return { key, url, problems: [`unreachable: ${e.message}`], notes };
  }

  const allow = res.headers.get('access-control-allow-origin');

  if (!res.ok) {
    // Cache and length checks are meaningless on an error body, and reporting
    // them alongside a 404 makes one problem look like three. CORS is still
    // worth reporting: its headers are set by bucket config, not by the object,
    // so a 404 that carries them proves the bucket is configured and only the
    // upload is outstanding.
    problems.push(
      `HTTP ${res.status} ${res.statusText} — not uploaded yet? Run npm run r2:sync`,
    );
    if (!allow) problems.push('and no access-control-allow-origin: apply r2/cors.json too');
    return { key, url, size: 0, problems, notes };
  }

  if (!allow) {
    problems.push(
      'no access-control-allow-origin — the browser will block this fetch. Apply r2/cors.json.',
    );
  } else if (allow !== ORIGIN && allow !== '*') {
    problems.push(`access-control-allow-origin is "${allow}", not "${ORIGIN}"`);
  }

  const cc = res.headers.get('cache-control') ?? '';
  if (!/immutable/.test(cc)) {
    problems.push(
      `cache-control is "${cc || '(none)'}" — versioned keys should be immutable, ` +
        'or every visitor re-validates a large object.',
    );
  }

  const len = Number(res.headers.get('content-length')) || 0;
  const encoding = res.headers.get('content-encoding');
  if (!len) {
    // Cloudflare compresses JS and wasm on the fly, and a compressed response
    // has no content-length by definition. That is correct and desirable. It
    // only matters to a download progress bar that reads this header, which
    // should fall back to an indeterminate state. Never a failure.
    notes.push(
      encoding
        ? `no content-length (${encoding}-compressed by Cloudflare — expected)`
        : 'no content-length',
    );
  }

  return { key, url, size: len, problems, notes };
}

async function main() {
  const keys = (manifest.assets ?? []).map((a) => a.key);
  if (keys.length === 0) {
    console.log('r2/manifest.json lists no assets yet. Add an entry per object the site depends on.');
    return;
  }

  console.log(`Checking ${BASE} as ${ORIGIN}\n`);
  const results = await Promise.all(keys.map(check));

  let bad = 0;
  for (const r of results) {
    if (r.problems.length === 0) {
      console.log(`  ok    ${r.key}${r.size ? `  (${mb(r.size)})` : ''}`);
    } else {
      bad += 1;
      console.log(`  FAIL  ${r.key}`);
      for (const p of r.problems) console.log(`        ${p}`);
    }
    for (const n of r.notes) console.log(`        note: ${n}`);
  }

  console.log();
  if (bad) {
    console.error(
      `${bad} of ${results.length} objects are not ready. Leave the features that need them switched off.`,
    );
    process.exit(1);
  }
  console.log(`All ${results.length} objects are reachable, CORS-enabled and immutably cached.`);
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
