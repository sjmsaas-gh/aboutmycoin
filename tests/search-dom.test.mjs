/**
 * The search box, run the way a browser runs it, against pages the build made.
 *
 * Two things nothing else can catch.
 *
 * The first is the index pointing somewhere that does not exist. Every entry
 * is built from a registry helper, so a wrong path is not a typo -- it is a
 * route that was removed or renamed while the helper stayed -- and on a static
 * site with no redirects and no 404 report, a suggestion that 404s is found by
 * a reader. So every path in the built `search-index.json` is held against the
 * files the build actually wrote.
 *
 * The second is the control itself. The suggestions exist only in a browser,
 * so a page whose box does nothing is byte-for-byte a page whose box works.
 * The header's markup is parsed into a real DOM, the index fetch is stubbed
 * with the file the build produced, and the module is run: type, and the list
 * has to fill with links to pages that exist.
 *
 * Run: node --experimental-strip-types --no-warnings --import ./tests/ts-resolve.mjs tests/search-dom.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { SEARCH_INDEX_PATH, SEARCH_LIMIT, noMatchNote } from '../src/lib/search.ts';

const DIST = 'dist';

if (!existsSync(DIST)) {
  console.error('dist/ is missing -- run `npm run build` first.');
  process.exit(1);
}

const INDEX_FILE = join(DIST, SEARCH_INDEX_PATH.replace(/^\//, ''));
const INDEX = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));

/** A path the build produced, as a page rather than as an asset. */
const built = (path) => {
  const rel = path.replace(/^\//, '');
  return existsSync(join(DIST, `${rel}.html`)) || existsSync(join(DIST, rel, 'index.html'));
};

test('the index is a file in the build, not a request to anything', () => {
  assert.ok(existsSync(INDEX_FILE), `${SEARCH_INDEX_PATH} was not built`);
  assert.ok(Array.isArray(INDEX) && INDEX.length > 100, 'the index is empty or not an array');
});

test('every suggestion points at a page the build wrote', () => {
  for (const e of INDEX) assert.ok(built(e.p), `${e.t}: ${e.p} is not in the build`);
});

test('no page on the site links to the index or ships it inline', () => {
  /* It is data for a control, not a page: nothing links to it, and nothing
     embeds it -- eighty kilobytes in the markup of every page is the cost this
     arrangement exists to avoid. */
  const page = readFileSync(join(DIST, 'coin-info', 'index.html'), 'utf8');
  assert.ok(!page.includes('href="/search-index.json"'), 'a page links to the index');
  assert.ok(page.length < 400_000, 'a page is large enough to be carrying the index');
});

/** The home page, loaded with the module run over it exactly as a browser
 *  would -- including the stubbed fetch the module makes on the first
 *  keystroke. */
async function boot(page = 'coin-info/index.html') {
  const { window, document } = parseHTML(readFileSync(join(DIST, page), 'utf8'));
  globalThis.window = window;
  globalThis.document = document;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), SEARCH_INDEX_PATH, `the box fetched ${url}`);
    return { ok: true, status: 200, json: async () => INDEX };
  };
  const mod = await import('../src/lib/search-dom.ts');
  mod.bootSearch();
  return { window, document };
}

/** Type into a box and wait for the fetch chain to settle. */
async function type(document, value, id = 'site-search') {
  const input = document.getElementById(id);
  input.value = value;
  input.dispatchEvent(new document.defaultView.Event('input'));
  await new Promise((r) => setTimeout(r, 0));
  return input;
}

const listOf = (document, id = 'site-search') => document.getElementById(`${id}-results`);

/**
 * FIRST, and it has to be. The module holds one fetch for the life of a
 * document and this file shares one module instance across every test below,
 * so a successful load here would be the one every later test reuses. Running
 * the failure first also proves the thing worth proving about it: the failure
 * is NOT remembered, and every test after this one loads the index again.
 */
test('a failed fetch says the search is unavailable, not that nothing matched', async () => {
  const { document } = await boot();
  globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => [] });
  await type(document, 'quarter');
  const list = listOf(document);
  assert.match(list.textContent, /unavailable/i);
  assert.ok(!list.textContent.includes(noMatchNote('quarter')), 'a download failure read as no results');
  assert.ok(list.querySelector('a[href="/coin-info"]'), 'no way out of a failed search');
});

test('the box ships empty, hidden and closed', async () => {
  const { document } = await boot();
  const list = listOf(document);
  assert.ok(list, 'no results list in the header');
  assert.equal(list.hidden, true, 'the list ships open');
  assert.equal(list.children.length, 0, 'the list ships with rows in it');
  assert.equal(document.getElementById('site-search').getAttribute('aria-expanded'), 'false');
});

test('typing fills the list with links to pages that exist', async () => {
  const { document } = await boot();
  await type(document, 'washington quarter');
  const list = listOf(document);
  assert.equal(list.hidden, false, 'the list stayed hidden');
  const links = [...list.querySelectorAll('.search-result a')];
  assert.ok(links.length > 0, 'nothing was suggested');
  assert.ok(links.length <= SEARCH_LIMIT, `${links.length} suggestions`);
  for (const a of links) {
    const href = a.getAttribute('href');
    assert.ok(built(href), `suggested ${href}, which the build did not write`);
  }
  assert.equal(
    links[0].getAttribute('href'),
    '/coin-info/tagged/washington-quarter',
    'the series page is not first',
  );
  assert.equal(document.getElementById('site-search').getAttribute('aria-expanded'), 'true');
});

test('a query that matches nothing says so and offers the way out', async () => {
  const { document } = await boot();
  await type(document, 'zeppelin');
  const list = listOf(document);
  assert.equal(list.hidden, false);
  assert.equal(list.querySelectorAll('.search-result').length, 0, 'it suggested a page anyway');
  assert.match(list.textContent, /zeppelin/, 'the query is not quoted back');
  assert.equal(list.textContent.includes(noMatchNote('zeppelin')), true);
  assert.ok(list.querySelector('a[href="/coin-info"]'), 'no way out of an empty result');
});

test('clearing the box shuts the list', async () => {
  const { document } = await boot();
  await type(document, 'quarter');
  assert.equal(listOf(document).hidden, false);
  await type(document, '');
  const list = listOf(document);
  assert.equal(list.hidden, true);
  assert.equal(list.children.length, 0, 'the rows stayed in the document');
  assert.equal(document.getElementById('site-search').hasAttribute('aria-activedescendant'), false);
});

test('the arrow keys move one selection and Escape shuts the list', async () => {
  const { window, document } = await boot();
  await type(document, 'quarter');
  const input = document.getElementById('site-search');
  /* linkedom has no KeyboardEvent, and the module reads one property off the
     event, so an Event with a key on it is the same thing to the code under
     test. */
  const key = (k) => {
    const e = new window.Event('keydown', { bubbles: true });
    e.key = k;
    input.dispatchEvent(e);
  };

  key('ArrowDown');
  const rows = [...listOf(document).querySelectorAll('.search-result')];
  assert.equal(rows[0].getAttribute('aria-selected'), 'true');
  assert.equal(input.getAttribute('aria-activedescendant'), rows[0].id);
  key('ArrowDown');
  assert.equal(rows[0].getAttribute('aria-selected'), 'false');
  assert.equal(rows[1].getAttribute('aria-selected'), 'true');
  assert.equal(
    rows.filter((r) => r.getAttribute('aria-selected') === 'true').length,
    1,
    'two rows are selected at once',
  );
  key('ArrowUp');
  assert.equal(rows[0].getAttribute('aria-selected'), 'true');

  key('Escape');
  assert.equal(listOf(document).hidden, true);
});

test('both copies of the box are wired, and they do not share an id', async () => {
  const { document } = await boot();
  const boxes = [...document.querySelectorAll('[data-search]')];
  assert.equal(boxes.length, 2, 'the bar and the mobile menu should each carry one');
  const ids = boxes.map((b) => b.querySelector('[data-search-box]').id);
  assert.equal(new Set(ids).size, ids.length, `two fields share an id: ${ids}`);
  await type(document, 'morgan', 'menu-search');
  assert.equal(listOf(document, 'menu-search').hidden, false, 'the menu box does nothing');
  assert.equal(listOf(document).hidden, true, 'typing in one box filled the other');
});

