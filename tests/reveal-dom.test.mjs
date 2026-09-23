/**
 * The reveal, run against pages the build actually produced.
 *
 * The thing worth checking is not that the button works -- it is that hiding
 * is all the script does. Every coin the page lists has to be in the HTML
 * before any of this runs, because that is what a crawler reads and what a
 * reader without JavaScript keeps, and it is what the page's own `ItemList`
 * schema claims. A test that only pressed the button would pass just as well
 * on a page that had been truncated at the build.
 *
 * Run: node --experimental-strip-types --no-warnings --import ./tests/ts-resolve.mjs tests/reveal-dom.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { REVEAL_STEP, revealLabel } from '../src/lib/reveal.ts';

const DIST = 'dist';

if (!existsSync(DIST)) {
  console.error('dist/ is missing -- run `npm run build` first.');
  process.exit(1);
}

function htmlFiles(dir = DIST, prefix = '') {
  const out = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...htmlFiles(dir, rel));
    else if (entry.name.endsWith('.html')) out.push(rel);
  }
  return out;
}

const PAGES = htmlFiles();

const docFor = (page) => parseHTML(readFileSync(join(DIST, page), 'utf8')).document;

/** Load a built page and run the module over it, as a browser would. */
async function boot(page) {
  const { window, document } = parseHTML(readFileSync(join(DIST, page), 'utf8'));
  globalThis.window = window;
  globalThis.document = document;
  const mod = await import('../src/lib/reveal-dom.ts');
  mod.bootReveal();
  return document;
}

/**
 * The pages carrying a marked grid, found by reading the text rather than by
 * parsing it. The build is thousands of pages deep -- every grade rung is one
 * -- and parsing all of them to find one takes minutes.
 */
const MARKED = PAGES.map((page) => ({ page, html: readFileSync(join(DIST, page), 'utf8') }))
  .filter((x) => x.html.includes('data-reveal='))
  .map((x) => ({ page: x.page, tiles: (x.html.match(/class="tile"/g) ?? []).length }));

/** The longest marked grid in the build, which is the case that matters. */
function longest() {
  const best = MARKED.reduce((a, b) => (!a || b.tiles > a.tiles ? b : a), null);
  assert.ok(best, 'no built page carries a marked grid');
  return best;
}

const LONGEST = longest();

test('every coin is in the HTML before anything runs', () => {
  const grid = docFor(LONGEST.page).querySelector('[data-reveal]');
  assert.ok(
    grid.children.length > REVEAL_STEP,
    `the longest grid in the build is ${grid.children.length} tiles, which is not long enough to prove anything`,
  );
  // Hidden would be a build that had already folded the list away -- which is
  // the one outcome this design exists to prevent.
  assert.equal(
    Array.from(grid.children).filter((el) => el.hasAttribute('hidden')).length,
    0,
    'the build shipped tiles already hidden; the fold belongs to the browser',
  );
  // The schema is built from the same array the tiles are, so a truncated grid
  // under a complete ItemList is the mismatch this arrangement avoids.
  const schema = Array.from(docFor(LONGEST.page).querySelectorAll('script[type="application/ld+json"]'))
    .map((s) => JSON.parse(s.textContent))
    .flatMap((s) => (Array.isArray(s) ? s : [s]))
    .find((s) => s['@type'] === 'ItemList');
  if (schema) {
    assert.equal(
      schema.itemListElement.length,
      grid.children.length,
      'the ItemList and the grid disagree about how many coins are on the page',
    );
  }
});

test('the browser folds the tail away and leaves a button over it', async () => {
  const document = await boot(LONGEST.page);
  const grid = document.querySelector('[data-reveal]');
  const items = Array.from(grid.children);

  assert.equal(items.filter((el) => !el.hasAttribute('hidden')).length, REVEAL_STEP);
  const button = document.querySelector('.reveal-row button');
  assert.ok(button, 'nothing was offered for the hidden tiles');
  assert.equal(button.textContent, revealLabel(items.length - REVEAL_STEP, REVEAL_STEP, 'coins'));

  // Hidden, not removed: the link is still in the document and still points
  // where it did.
  const hidden = items.find((el) => el.hasAttribute('hidden'));
  assert.match(hidden.getAttribute('href'), /^\/(coin-info|melt-value)\//);
});

test('a press shows the next thirty, and the last press takes the button with it', async () => {
  const document = await boot(LONGEST.page);
  const grid = document.querySelector('[data-reveal]');
  const items = Array.from(grid.children);
  const shown = () => items.filter((el) => !el.hasAttribute('hidden')).length;

  const button = document.querySelector('.reveal-row button');
  button.dispatchEvent(new window.Event('click'));
  assert.equal(shown(), REVEAL_STEP * 2);
  assert.equal(button.textContent, revealLabel(items.length - shown(), REVEAL_STEP, 'coins'));

  let presses = 0;
  while (document.querySelector('.reveal-row button')) {
    document.querySelector('.reveal-row button').dispatchEvent(new window.Event('click'));
    assert.ok((presses += 1) < 200, 'the button never went away');
  }
  assert.equal(shown(), items.length, 'the button went but tiles stayed hidden');
  assert.equal(document.querySelector('.reveal-row'), null);
});

test('a grid shorter than the step is left exactly as it was', async () => {
  const short = MARKED.filter((x) => x.tiles > 0 && x.tiles <= REVEAL_STEP)
    .map((x) => ({ ...x, grid: docFor(x.page).querySelector('[data-reveal]') }))
    .find((x) => x.grid.children.length <= REVEAL_STEP);
  if (!short) return; // Every archive is long today; nothing to prove.
  const document = await boot(short.page);
  // Scoped to the grid: a page has its own hidden elements and none of them
  // are this module's business.
  assert.equal(document.querySelectorAll('[data-reveal] > [hidden]').length, 0);
  assert.equal(document.querySelector('.reveal-row'), null);
});
