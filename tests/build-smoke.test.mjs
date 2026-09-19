/**
 * Checks the built site rather than the source.
 *
 * These are the mistakes that typecheck cleanly, pass every unit test, and are
 * only visible in the HTML that actually ships -- which is to say, the ones
 * that reach production. Each assertion below exists because the failure it
 * catches is silent.
 *
 * Run: npm run test:build   (builds first, then this)
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SITE, DISCOVERABLE, NOINDEX_DIRECTIVE } from '../src/lib/site.ts';
import { ONE_TIME_AVAILABLE, ONE_TIME, PRO_AVAILABLE } from '../src/lib/pricing.ts';

const DIST = 'dist';
const read = (p) => readFileSync(join(DIST, p), 'utf8');

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('the build exists', () => {
  assert.ok(existsSync(join(DIST, 'index.html')), 'run `npm run build` first');
});

test('astro.config.mjs and SITE.url agree on the origin', () => {
  // They are two separate declarations of the same fact, because Astro reads
  // its config before the app graph exists. When they disagree the canonical
  // tags point at one domain and the sitemap at another, and nothing else
  // notices.
  const config = readFileSync('astro.config.mjs', 'utf8');
  const declared = /const SITE_URL = '([^']+)'/.exec(config)?.[1];
  assert.equal(declared, SITE.url, 'SITE_URL in astro.config.mjs must equal SITE.url');
});

test('SITE.domain matches the directory this project lives in', () => {
  // The family convention: /var/www/more_html/sjmsaas/<domain>/. A mismatch is
  // the signature of a half-finished rename. The starter itself is exempt.
  const dir = process.cwd().split('/').filter(Boolean).pop();
  if (dir === 'starter') return;
  assert.equal(dir, SITE.domain, `directory ${dir} should be named ${SITE.domain}`);
});

test('every page carries a canonical URL, and it has no trailing slash', () => {
  for (const page of htmlFiles()) {
    const html = read(page);
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    assert.ok(canonical, `${page} has no canonical`);
    assert.ok(canonical.startsWith(SITE.url), `${page} canonical is not on ${SITE.url}`);
    if (canonical !== `${SITE.url}/`) {
      assert.ok(!canonical.endsWith('/'), `${page} canonical has a trailing slash`);
    }
  }
});

test('every page carries a title, a description and JSON-LD', () => {
  for (const page of htmlFiles()) {
    const html = read(page);
    assert.match(html, /<title>[^<]+<\/title>/, `${page} has no title`);
    assert.match(html, /<meta name="description" content="[^"]+"/, `${page} has no description`);
    assert.match(html, /application\/ld\+json/, `${page} has no structured data`);
  }
});

test('the pre-launch lockdown is all-or-nothing', () => {
  // The failure this catches: DISCOVERABLE flipped to true while an
  // X-Robots-Tag is still sitting in a host config, so the site looks live and
  // is still invisible -- for weeks, usually.
  // Matched on the directive VALUE rather than the header name, because all
  // three files also mention `X-Robots-Tag` in a comment explaining what to
  // delete -- and a check that fires on the explanation would fail the day
  // somebody follows it correctly.
  const configs = ['public/_headers', 'netlify.toml', 'vercel.json'].map((f) =>
    readFileSync(f, 'utf8'),
  );
  const headerCount = configs.filter((c) => c.includes(NOINDEX_DIRECTIVE)).length;

  if (DISCOVERABLE) {
    assert.equal(headerCount, 0, 'DISCOVERABLE is true but a host config still sends the noindex X-Robots-Tag');
    assert.ok(!read('index.html').includes('noindex'), 'DISCOVERABLE is true but pages say noindex');
    assert.match(read('robots.txt'), /Sitemap:/, 'an open site advertises its sitemap');
  } else {
    assert.equal(headerCount, 3, 'while locked down, all three host configs must send X-Robots-Tag');
    assert.ok(read('index.html').includes(NOINDEX_DIRECTIVE), 'locked down but the home page is indexable');
    assert.match(read('robots.txt'), /Disallow: \//, 'locked down but robots.txt allows crawling');
    assert.ok(!read('robots.txt').includes('Sitemap:'), 'locked down but the sitemap is advertised');
    assert.match(read('llms.txt'), /not finished/, 'locked down but llms.txt serves the real summary');
  }
});

test('nothing the home page sells is switched off', () => {
  // The launch-ORDER failure, and the one that cannot be seen by looking at
  // the page: DISCOVERABLE flips, search engines arrive, and the product
  // politely refuses something the home page just described. The copy is not
  // wrong -- it is early, which is worse, because the visitor finds out after
  // choosing to trust it.
  //
  // RENAME: pair every *_AVAILABLE flag with the sentence that sells it. If a
  // claim is cut from the site, delete its line here; do not silence the check
  // by relaxing it, because then the next feature ships unguarded.
  const sold = [
    [ONE_TIME_AVAILABLE, 'ONE_TIME_AVAILABLE', `the one-time price, $${ONE_TIME}, on the home page and /pricing`],
    [PRO_AVAILABLE, 'PRO_AVAILABLE', 'the Pro subscription on /pricing'],
  ];

  if (!DISCOVERABLE) {
    // While locked down the flags are free to be false -- that is the whole
    // point of writing the copy before the product is ready. Assert instead
    // that this check will have something to say later.
    assert.ok(sold.length > 0);
    return;
  }

  // Every missing flag at once, not the first: on launch day this is a
  // checklist, and finding the items one failed run at a time wastes it.
  const off = sold.filter(([live]) => !live).map(([, flag, claim]) => `${flag} (${claim})`);
  assert.equal(off.length, 0, `DISCOVERABLE is true but the site sells what is switched off:\n       ${off.join('\n       ')}`);
});

test('noindex pages are not in the sitemap', () => {
  // A URL that is both noindex and in the sitemap is a contradiction crawlers
  // report as an error: the sitemap asks for indexing and the page refuses.
  //
  // Only meaningful once the site is discoverable. While locked down EVERY page
  // is noindex by design, so this would fail on all of them and say nothing
  // about the per-page `noindex` props it is actually here to police.
  if (!DISCOVERABLE) return;
  const sitemap = existsSync(join(DIST, 'sitemap-0.xml')) ? read('sitemap-0.xml') : '';
  for (const page of htmlFiles()) {
    if (!read(page).includes('name="robots" content="noindex')) continue;
    const url = `${SITE.url}/${page.replace(/index\.html$/, '').replace(/\/$/, '')}`;
    assert.ok(!sitemap.includes(`<loc>${url}</loc>`), `${page} is noindex but listed in the sitemap`);
  }
});

test('every sitemap lastmod is the date the page itself declares', () => {
  // The sitemap used to fall back to the build date, so it told Google every
  // page changed on every deploy while the pages' own schema said otherwise.
  // Both now read src/lib/page-dates.ts; this checks they still agree in the
  // output, and that no lastmod appears for a page with no date of its own.
  const sitemap = existsSync(join(DIST, 'sitemap-0.xml')) ? read('sitemap-0.xml') : '';
  for (const [, loc, lastmod] of sitemap.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)) {
    const path = loc.replace(SITE.url, '').replace(/^\//, '');
    const html = read(path ? `${path}/index.html` : 'index.html');
    const declared = /"dateModified":"([^"]+)"/.exec(html)?.[1];
    assert.ok(declared, `${loc} has a sitemap lastmod but the page declares no dateModified`);
    assert.equal(lastmod.slice(0, 10), declared, `${loc}: the sitemap says ${lastmod.slice(0, 10)}, the page says ${declared}`);
  }
});

test('the trailing-slash redirects were generated', () => {
  const redirects = read('_redirects');
  assert.match(redirects, /301/);
  // The one rule that must never appear: the root redirecting to itself.
  assert.ok(!/^\/\s+\/\s+301/m.test(redirects), 'the root must not redirect to itself');
});

test('no font is preloaded that does not exist', () => {
  // A preload for a missing file is a 404 on every page of the site, and it is
  // invisible unless someone opens the network tab.
  for (const f of SITE.preloadFonts) {
    assert.ok(existsSync(join(DIST, f)), `preloaded font ${f} is not in the build`);
  }
});

test('the brand rasters referenced by every page are present', () => {
  // logo.png is cited by Organization JSON-LD, og/default.png by every social
  // card, apple-touch-icon.png by the head. All three are generated by
  // `npm run assets` and committed; a missing one is a silent 404.
  for (const f of ['logo.png', 'og/default.png', 'apple-touch-icon.png', 'favicon.svg']) {
    assert.ok(existsSync(join(DIST, f)), `${f} is missing -- run \`npm run assets\``);
  }
});

test('no placeholder domain survives in the built output', () => {
  // The rename check. Once SITE.domain is not example.com, nothing in the build
  // should still be pointing at it.
  if (SITE.domain === 'example.com') return;
  for (const page of htmlFiles()) {
    assert.ok(!read(page).includes('example.com'), `${page} still references example.com`);
  }
});

/** Every built HTML file, relative to dist. */
function htmlFiles(dir = DIST, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === '_astro') continue;
      out.push(...htmlFiles(join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.html')) {
      out.push(rel);
    }
  }
  return out;
}

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}\n     ${err.message}`);
  }
}
console.log(failed ? `\n${failed} build check(s) failed.` : '\nAll build checks passed.');
process.exit(failed ? 1 : 0);
