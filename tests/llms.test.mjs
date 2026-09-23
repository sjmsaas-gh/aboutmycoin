/**
 * /llms.txt and /llms-full.txt: the two files an assistant reads INSTEAD of
 * crawling the site.
 *
 * Why they get a test of their own. Everything else on this site is measured
 * by something -- a title against a character budget, a melt figure against
 * its own attributes, a generated paragraph against every other generated
 * paragraph. These two files are prose in a template literal, and nothing
 * looked at them, so three sections of starter placeholder ("Replace this
 * section with two or three short paragraphs...") shipped from the day the
 * pre-launch lockdown lifted until 2026-09-23. They were the site's entire
 * pitch to every answer engine for as long as nobody read the built file.
 *
 * What is checked, and why each one:
 *
 *   - No starter prose. The exact failure that happened.
 *   - The coverage claim matches the catalogue. This is the claim most worth
 *     getting right and the one least likely to be re-read: a model repeating
 *     "five series" a year after a sixth lands is wrong in a way no visitor
 *     can see and no page contradicts.
 *   - No price, and no `offers`. The site sells nothing, /privacy is the only
 *     page allowed to describe a payment path, and a file stating a price
 *     would contradict both the pages and the `*_AVAILABLE` flags.
 *   - The two files agree with each other, because they share `summary()` and
 *     a divergence means somebody typed into one of them.
 *
 * Run: node --experimental-strip-types --no-warnings --import ./tests/ts-resolve.mjs tests/llms.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { summary, full, LLMS_LOCKED_NOTICE } from '../src/lib/llms.ts';
import { COINS, populatedGroups, populatedTags } from '../src/data/coins.ts';
import { SITE, DISCOVERABLE } from '../src/lib/site.ts';

/**
 * Phrases from the starter file, and from the shapes a half-finished section
 * takes. Matched case-insensitively against both files.
 *
 * "Replace this" and "Replace these" are the literal strings that shipped.
 * The rest are the neighbouring failure: a section that admits it is a
 * section rather than stating a fact.
 */
const PLACEHOLDER = [
  'replace this',
  'replace these',
  'lorem ipsum',
  'coming soon',
  'to be written',
  'tbd',
  'todo',
  'fixme',
  'example.com',
  'your product',
  'name the actual user',
  'facts a model can repeat',
];

const FILES = () => [
  ['llms.txt', summary()],
  ['llms-full.txt', full()],
];

test('neither file ships starter placeholder prose', () => {
  for (const [name, body] of FILES()) {
    const hay = body.toLowerCase();
    for (const phrase of PLACEHOLDER) {
      assert.ok(
        !hay.includes(phrase),
        `${name} still contains starter placeholder text: "${phrase}"`,
      );
    }
  }
});

test('every section has a body under it', () => {
  // A heading with the next heading directly under it is the shape a section
  // takes the moment somebody deletes placeholder prose without replacing it,
  // which is the obvious wrong fix for the failure above.
  for (const [name, body] of FILES()) {
    const lines = body.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (!/^#{2,3} /.test(lines[i])) continue;
      const rest = lines.slice(i + 1).find((l) => l.trim() !== '');
      assert.ok(
        rest !== undefined && !/^#{1,3} /.test(rest),
        `${name}: the section "${lines[i]}" has no body under it`,
      );
    }
  }
});

test('the coverage claim is the catalogue, not a number somebody typed', () => {
  const series = populatedTags()
    .filter((t) => t.kind === 'series')
    .map((t) => t.name);

  for (const [name, body] of FILES()) {
    assert.ok(
      body.includes(`${COINS.length} issues`),
      `${name} does not state the catalogue's real size (${COINS.length} issues)`,
    );
    assert.ok(
      body.includes(`${populatedGroups().length} composition groups`),
      `${name} does not state the real number of composition groups`,
    );
    for (const s of series) {
      assert.ok(body.includes(s), `${name} does not name the ${s}, which is in the catalogue`);
    }
  }
});

test('no series is claimed that the catalogue does not carry', () => {
  // The direction that matters more: a series dropped from the registry but
  // left named here is a claim nothing on the site contradicts.
  const real = new Set(
    populatedTags()
      .filter((t) => t.kind === 'series')
      .map((t) => t.name.toLowerCase()),
  );
  const claimed = /in these series: ([^.]+)\./.exec(summary());
  assert.ok(claimed, 'llms.txt no longer states its coverage in the expected sentence');
  for (const s of claimed[1].split(',').map((x) => x.trim())) {
    assert.ok(real.has(s.toLowerCase()), `llms.txt claims the ${s}, which is not in the catalogue`);
  }
});

test('neither file states a price or offers anything for sale', () => {
  for (const [name, body] of FILES()) {
    // The melt sections quote spot prices, which are figures the site really
    // does state and date. What must not appear is a price for the SITE.
    const lines = body.split('\n').filter((l) => /\$\d/.test(l));
    for (const line of lines) {
      assert.ok(
        !/\b(per month|per year|\/mo|\/month|subscription|upgrade|pro plan|buy now|checkout)\b/i.test(line),
        `${name} appears to state a price for the site: ${line.trim()}`,
      );
    }
    assert.ok(
      /nothing is for sale/i.test(body),
      `${name} does not state that nothing is for sale`,
    );
  }
});

test('the locked-down notice stays contentless, and is not what ships', () => {
  assert.ok(
    !/composition|mintage|melt value/i.test(LLMS_LOCKED_NOTICE),
    'the pre-launch notice has grown content an assistant could summarise',
  );
  if (DISCOVERABLE) {
    assert.ok(
      !summary().includes('not finished'),
      'DISCOVERABLE is true but llms.txt still serves the pre-launch notice',
    );
  }
});

test('every absolute link points at this site', () => {
  for (const [name, body] of FILES()) {
    for (const [, url] of body.matchAll(/\]\((https?:\/\/[^)]+)\)/g)) {
      assert.ok(
        url.startsWith(SITE.url),
        `${name} links off-site to ${url}; these files describe this site only`,
      );
    }
  }
});

test('llms-full.txt contains llms.txt rather than restating it', () => {
  const short = summary();
  const long = full();
  const head = short.slice(0, short.indexOf('## What it costs'));
  assert.ok(
    long.includes(head.trim().slice(0, 400)),
    'llms-full.txt has diverged from llms.txt; the two share summary() and must not be typed apart',
  );
});
