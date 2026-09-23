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
import { SITE, DISCOVERABLE, NOINDEX_DIRECTIVE, HOME_COPY } from '../src/lib/site.ts';
import { ONE_TIME_AVAILABLE, ONE_TIME, PRO_AVAILABLE } from '../src/lib/pricing.ts';
import {
  spotBasis,
  coinMetal,
  meltValue,
  spotPrice,
  formatUsd,
} from '../src/lib/spot.ts';
import {
  COINS,
  COIN_INFO_ROOT,
  coinPath,
  groupPath,
  tagPath,
  typePath,
  documentedSeries,
  populatedTags,
  coinBySlug,
  normaliseQuestion,
  gradedPairs,
  gradedValue,
  gradedGrades,
  gradePath,
  gradeQuestion,
  GRADES,
} from '../src/data/coins.ts';
import { markedUpFaqQuestions } from '../src/data/faq-registry.ts';
import {
  CHEAT_SHEETS,
  CHEAT_SHEETS_H1,
  CHEAT_SHEETS_ROOT,
  cheatSheetDescription,
  cheatSheetH1,
  cheatSheetIndexable,
  cheatSheetPath,
  cheatSheetTeaser,
  cheatSheetTitle,
} from '../src/data/cheat-sheets.ts';
import { SILVER_COINS } from '../src/data/silver-coins.ts';
import { GOLD_COINS } from '../src/data/gold-coins.ts';
import { rowOzt, rowQtyId, rowsSumAttr } from '../src/data/melt-rows.ts';
import { allArchiveCopy } from '../src/lib/catalog-copy.ts';
import { allGradeCopy, gradeAnswer, isPriced, LADDER_BASIS } from '../src/lib/grade-copy.ts';
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  RENDERED_TITLE_MAX,
  renderedTitle,
} from '../src/lib/meta.ts';
import {
  QUESTIONS,
  QUESTIONS_ROOT,
  QUESTION_CATEGORIES,
  categoryDescription,
  categoryLinks,
  categoryOf,
  categoryPath,
  categoryTitle,
  questionDescription,
  questionLinks,
  questionPath,
  questionsInCategory,
  questionTitle,
} from '../src/data/questions.ts';
import { REFERENCE_SPOT } from '../src/lib/spot.ts';
import { spotFigureText } from '../src/lib/spot-dom.ts';
import {
  MELT_ROOT,
  MELT_TAGGED_ROOT,
  meltCoins,
  meltPath,
  meltOf,
  unpricedMeltCoins,
  meltGroups,
  meltGroupPath,
  meltGroupQuestion,
  meltGroupMetals,
  spotLadder,
  meltPairs,
  meltTypePath,
  meltPairQuestion,
  meltTags,
  meltTagPath,
  meltTagQuestion,
} from '../src/lib/melt.ts';

const DIST = 'dist';

/** The calculators' root. Named once, like every other section's. */
const CALCULATORS_ROOT = '/tools/coin-calculators';
const read = (p) => readFileSync(join(DIST, p), 'utf8');

const tests = [];
const test = (name, fn) => tests.push([name, fn]);


/**
 * HTML entities back to the characters a generator produced.
 *
 * Shared, because two checks now compare a generator's output against what
 * the build printed, and a second copy of this table is a second way for
 * those two checks to disagree about what "&middot;" is.
 */
const decode = (html) =>
  html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&middot;/g, '\u00b7')
    .replace(/&times;/g, '\u00d7')
    .replace(/&rarr;/g, '\u2192');

/**
 * A page's visible text, with the entities turned back into characters and the
 * whitespace collapsed.
 *
 * For the checks that compare a JSON-LD string against what the reader can
 * actually see. It keeps the case, unlike the one inside the British-spelling
 * check below: a question marked up as "What is the melt value of a 1965
 * Washington quarter?" has to appear as that, not as something that matches it
 * once both are lowercased.
 */
/**
 * Every JSON-LD node on a page, flattened, for the checks that read the graph
 * rather than grep it.
 *
 * Parsed rather than matched with a regex, which is not fastidiousness: the
 * first version of the Product check below used a regex with a lookahead for
 * the next node, it matched nothing at all on any page, and it therefore
 * passed on the exact build it had been written to fail. A vacuous check is
 * worse than no check, because it is counted.
 */
const jsonLdNodes = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(
    ([, raw]) => {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    },
  );

const renderedText = (html) =>
  decode(
    html
      .slice(Math.max(0, html.indexOf('<body')))
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ');

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

test('every title and description fits what a search result shows', () => {
  // Measured on the HTML, because the string a page declares is not the string
  // that ships: Seo.astro appends " | AboutMyCoin" to anything that does not
  // already name the site, so a check on the source is thirteen characters
  // wrong. That is how five melt pages reached 74 characters while every source
  // check passed. Both halves of the catalogue now fit their generated forms to
  // src/lib/meta.ts; this is the check that proves it of what actually shipped.
  const problems = [];

  /*
   * THE SKIP IS THE SITEMAP, NOT THE ROBOTS TAG, and that is the whole point.
   *
   * It used to skip any page whose HTML said noindex. That is correct
   * reasoning -- a page that is not in a search result has no result to fit --
   * and it made the check VACUOUS, because the pre-launch lockdown marks every
   * page on the site noindex. All 21,588 of them were skipped, the test passed
   * in under a second, and 31 pages were over the limits underneath it: 27
   * melt titles and 4 descriptions. A check that switches itself off for the
   * whole of the period before launch is a check that runs for the first time
   * on launch day.
   *
   * The sitemap says the same thing without the lockdown in it: it is built
   * from the per-page intent (astro.config.mjs filters out 404, 500,
   * checkout-complete and the unwritten cheat sheets) and it is written
   * whether DISCOVERABLE is true or false. A page in the sitemap is a page
   * this site wants in a result list, so it is a page whose title and
   * description have to fit one.
   */
  const sitemap = existsSync(join(DIST, 'sitemap-0.xml')) ? read('sitemap-0.xml') : '';
  assert.ok(sitemap.length > 0, 'no sitemap-0.xml to read the indexable pages from');
  const indexable = (page) => {
    const url = `${SITE.url}/${page.replace(/index\.html$/, '').replace(/\/$/, '')}`;
    return sitemap.includes(`<loc>${url}</loc>`);
  };

  for (const page of htmlFiles()) {
    if (!indexable(page)) continue;
    const html = read(page);
    const title = /<title>([^<]+)<\/title>/.exec(html)?.[1] ?? '';
    const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
    if (title.length > RENDERED_TITLE_MAX) {
      problems.push(`${page}: title is ${title.length} characters, over ${RENDERED_TITLE_MAX} — "${title}"`);
    }
    if (description.length > DESCRIPTION_MAX) {
      problems.push(`${page}: description is ${description.length} characters, over ${DESCRIPTION_MAX}`);
    }
    if (description.length < DESCRIPTION_MIN) {
      problems.push(`${page}: description is ${description.length} characters, under ${DESCRIPTION_MIN}`);
    }
  }
  /*
   * The home page is measured from HOME_COPY as well as from dist/ above: the
   * constant is where the strings are written, so a check on it names the
   * thing to edit rather than the file it landed in. `renderedTitle()` is
   * applied because the suffix is what ships.
   */
  const homeTitle = renderedTitle(HOME_COPY.title);
  if (homeTitle.length > RENDERED_TITLE_MAX) {
    problems.push(`HOME_COPY.title is ${homeTitle.length} characters, over ${RENDERED_TITLE_MAX} — "${homeTitle}"`);
  }
  if (HOME_COPY.description.length > DESCRIPTION_MAX) {
    problems.push(`HOME_COPY.description is ${HOME_COPY.description.length} characters, over ${DESCRIPTION_MAX}`);
  }
  if (HOME_COPY.description.length < DESCRIPTION_MIN) {
    problems.push(`HOME_COPY.description is ${HOME_COPY.description.length} characters, under ${DESCRIPTION_MIN}`);
  }

  assert.deepEqual(problems, [], `\n  - ${problems.join('\n  - ')}\n`);
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
    // Every group that disallows /api/ must allow /api/spot above it. A
    // rendering crawler that cannot fetch the price endpoint indexes the
    // baked-in figure instead of the current one, and the longest-match rule
    // is what makes the narrower Allow win.
    const groups = read('robots.txt').split(/\n(?=User-agent:)/).filter((g) => g.includes('Disallow: /api/'));
    assert.ok(groups.length > 0, 'no group disallows /api/ -- has the policy changed?');
    for (const group of groups) {
      assert.ok(
        group.includes('Allow: /api/spot'),
        `a robots group blocks /api/ without allowing /api/spot:\n${group}`,
      );
      assert.ok(
        group.indexOf('Allow: /api/spot') < group.indexOf('Disallow: /api/'),
        'Allow: /api/spot must come before Disallow: /api/',
      );
    }
  } else {
    assert.equal(headerCount, 3, 'while locked down, all three host configs must send X-Robots-Tag');
    assert.ok(read('index.html').includes(NOINDEX_DIRECTIVE), 'locked down but the home page is indexable');
    assert.match(read('robots.txt'), /Disallow: \//, 'locked down but robots.txt allows crawling');
    assert.ok(!read('robots.txt').includes('Sitemap:'), 'locked down but the sitemap is advertised');
    assert.match(read('llms.txt'), /not finished/, 'locked down but llms.txt serves the real summary');
  }
});

test('nothing is offered for sale while nothing is for sale', () => {
  // This check used to run one way: it caught copy that sold a feature whose
  // *_AVAILABLE flag was still false. It now runs both ways, because the
  // decision was taken to launch with nothing for sale at all, and the new
  // failure is the opposite one -- a price, a checkout link or an Offer
  // creeping back into the build ahead of the product.
  //
  // RENAME: when something IS sold, flip its flag in src/lib/pricing.ts and
  // re-enable src/pages/_pricing.astro. Both halves below then do the right
  // thing without being edited.
  const sold = [
    [ONE_TIME_AVAILABLE, 'ONE_TIME_AVAILABLE', `the one-time price, $${ONE_TIME}`],
    [PRO_AVAILABLE, 'PRO_AVAILABLE', 'the Pro subscription'],
  ];
  const anythingSold = sold.some(([live]) => live);

  if (!anythingSold) {
    // Nothing is sold, so no built page may link to a checkout or advertise a
    // price. /pricing is not even a route -- see src/pages/_pricing.astro.
    assert.ok(!existsSync(join(DIST, 'pricing')), '/pricing was built but nothing is sold');
    for (const page of htmlFiles()) {
      const html = read(page);
      assert.ok(!html.includes('href="/pricing"'), `${page} links to /pricing, which is not a route`);
      // A paid Offer in JSON-LD is a claim a crawler will repeat even though
      // no visible page makes it -- exactly the mismatch that costs a site its
      // rich results. A zero-price Offer is fine and is the honest one.
      for (const [, price] of html.matchAll(/"@type":"Offer"[^}]*?"price":"([^"]+)"/g)) {
        assert.equal(price, '0', `${page} declares a paid Offer of ${price} while nothing is sold`);
      }
    }
    return;
  }

  // Something is sold. Every claim must be backed by a live flag -- report all
  // the missing ones at once, because on launch day this is a checklist.
  const off = sold.filter(([live]) => !live).map(([, flag, claim]) => `${flag} (${claim})`);
  assert.equal(off.length, 0, `the site sells what is switched off:\n       ${off.join('\n       ')}`);
});

test('every URL in the sitemap is its own canonical', () => {
  // The other half of the noindex check below. A grade page canonicalises to
  // its coin, and a sitemap that lists it anyway asks for a URL to be indexed
  // that the page itself says is not the one to index -- which Search Console
  // reports as a conflict rather than resolving in the site's favour.
  if (!DISCOVERABLE) return;
  const sitemap = existsSync(join(DIST, 'sitemap-0.xml')) ? read('sitemap-0.xml') : '';
  let pointedElsewhere = 0;
  for (const page of htmlFiles()) {
    const html = read(page);
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    const url = `${SITE.url}/${page.replace(/index\.html$/, '').replace(/\/$/, '')}`.replace(/\/$/, '');
    const own = url === SITE.url ? `${SITE.url}/` : url;
    if (!canonical || canonical === own) continue;
    pointedElsewhere++;
    assert.ok(
      !sitemap.includes(`<loc>${own}</loc>`),
      `${page} canonicalises to ${canonical} but is listed in the sitemap`,
    );
  }
  assert.ok(pointedElsewhere > 0, 'no page canonicalises elsewhere, so this check proves nothing');
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

test('nothing on this site claims a date except the spot price', () => {
  // Everything here was settled before the site was written: what a coin
  // weighs, what it is made of, which dates are scarce. A "last updated" on
  // one of those says when a file was saved, which is no use to the reader and
  // a claim a crawler can check and find worthless -- and the sitemap's old
  // build-date fallback told Google every page changed on every deploy.
  //
  // The exception is the spot price, which really does move. It is dated at
  // the figure, by spotBasis(), not at the top of the page.
  const sitemap = existsSync(join(DIST, 'sitemap-0.xml')) ? read('sitemap-0.xml') : '';
  assert.ok(!sitemap.includes('<lastmod>'), 'the sitemap states a lastmod');

  for (const page of htmlFiles()) {
    const html = read(page);
    for (const field of ['dateModified', 'datePublished']) {
      assert.ok(!html.includes(`"${field}"`), `${page} declares ${field} in its JSON-LD`);
    }
    assert.ok(
      !/article:(published|modified)_time/.test(html),
      `${page} carries an article timestamp`,
    );
    assert.ok(!/Last updated/i.test(html), `${page} prints a "last updated" line`);
  }
});

test('every coin page was built, and its archive links to it', () => {
  // The orphan check. A generated page that nothing links to is a page Google
  // finds in the sitemap, crawls once and then discounts -- and the whole
  // argument for a taxonomy is that every page sits in a cluster. The archive
  // one level up is the link that has to exist.
  for (const coin of COINS) {
    const page = `${coinPath(coin).slice(1)}/index.html`;
    assert.ok(existsSync(join(DIST, page)), `${coinPath(coin)} was not built`);
    const archive = read(`${typePath(coin.group, coin.type).slice(1)}/index.html`);
    assert.ok(
      archive.includes(`href="${coinPath(coin)}"`),
      `${typePath(coin.group, coin.type)} does not link to ${coinPath(coin)}`,
    );
  }
});

test('every coin page carries Article, FAQPage and Product schema, and no HowTo', () => {
  // Three types, each doing a different job -- see the header of the coin
  // route. Losing one is invisible on the page and costs a rich result.
  for (const coin of COINS) {
    const html = read(`${coinPath(coin).slice(1)}/index.html`);
    for (const type of ['"Article"', '"FAQPage"', '"Product"']) {
      assert.ok(html.includes(`"@type":${type}`), `${coinPath(coin)} is missing ${type} schema`);
    }
    // HowTo went when the visible identification checklist did. Structured
    // data describing a section that is not on the page is the mismatch
    // Google issues manual actions for, so the two have to move together:
    // if the checklist comes back, this assertion flips with it.
    assert.ok(
      !html.includes('"@type":"HowTo"'),
      `${coinPath(coin)} carries HowTo schema with no visible checklist behind it`,
    );
    // The honesty constraint, checked in the output rather than trusted: a
    // Product with an offer is a thing for sale at a price, and this site does
    // not know what any individual coin will fetch.
    assert.ok(!html.includes('"offers"'), `${coinPath(coin)} claims an offer for a coin`);
  }
});

test('a printed melt value carries the price it used and the caveat', () => {
  // The house rule is that the site never prints a value it did not measure.
  // The spot prices are a snapshot up to a day old, so the melt figure is only honest
  // while the page says what price it used, when that price was set and that
  // it is not a live quote. Checked in the built HTML because that sentence
  // is the whole licence for printing the number at all.
  for (const coin of COINS) {
    const metal = coinMetal(coin);
    const html = read(`${coinPath(coin).slice(1)}/index.html`);
    if (!metal) {
      // Matched on the figure block's own id rather than on the words "melt
      // value", which now appear in the footer of every page on the site as a
      // link to /melt-value. A check that fires on a navigation link says
      // nothing about the thing it is here to police.
      assert.ok(
        !html.includes('id="melt-heading"'),
        `${coinPath(coin)} works out a metal value for a coin with no precious metal`,
      );
      continue;
    }
    const value = formatUsd(meltValue(metal.troyOunces, metal.metal));
    assert.ok(html.includes(value), `${coinPath(coin)} does not print its melt value ${value}`);
    assert.ok(
      html.includes(formatUsd(spotPrice(metal.metal))),
      `${coinPath(coin)} prints a melt value without the spot price behind it`,
    );
    // The provenance phrase, in full: the price is only honest next to the time
    // the reading behind it was taken.
    assert.ok(
      html.includes(spotBasis()),
      `${coinPath(coin)} prints a melt value without "${spotBasis()}"`,
    );
  }
});

test('each FAQ question is marked up on exactly one page', () => {
  /*
   * Google wants a question to carry FAQPage markup once. faq-registry.ts
   * enforces uniqueness across the catalogue, the melt section and the common
   * questions; this checks the built HTML, which is where a question could
   * still be duplicated by a hand-written page.
   *
   * `markedUpFaqQuestions()` rather than every question the site asks. The
   * grade pages ask 21,123 questions and mark up none of them since
   * 2026-09-23, so walking the full list would look for a `Question` node that
   * is deliberately absent and fail on the count at the bottom. They are still
   * in the registry, and still unique, which is the half of the job that is
   * about the reader rather than about the crawler.
   */
  const owners = new Map();
  for (const { question, path } of markedUpFaqQuestions()) {
    owners.set(normaliseQuestion(question), path);
  }
  const seen = new Map();
  for (const page of htmlFiles()) {
    const html = read(page);
    for (const [, raw] of html.matchAll(/"@type":"Question","name":"((?:[^"\\]|\\.)*)"/g)) {
      const q = normaliseQuestion(JSON.parse(`"${raw}"`));
      if (!owners.has(q)) continue;
      const already = seen.get(q);
      assert.ok(!already, `the question "${raw}" is marked up on both ${already} and ${page}`);
      seen.set(q, page);
    }
  }
  assert.equal(
    seen.size,
    owners.size,
    `${owners.size - seen.size} catalogue FAQ question(s) were registered but never rendered`,
  );
});

test('every marked-up FAQ question and answer is visible on its own page', () => {
  /*
   * Google's FAQ guidance asks for one thing above all: the whole of the
   * question and the whole of the answer have to be visible to the reader on
   * the page carrying the markup. Answers are easy -- every page on this site
   * renders the BLUF the schema quotes. Questions are not, because a question
   * is a generated string and a heading is a different generated string, and
   * nothing connected them.
   *
   * All 633 melt coin pages failed this. The `verdict-label` read "The short
   * answer" on the argument that the H1 had already asked the question; the H1
   * is "Melt value of 1965 Washington Quarter (No Mint Mark)", which asks
   * nothing, and the marked-up question -- "What is the melt value of a 1965
   * Washington quarter with no mint mark?" -- appeared nowhere in the
   * document. Marked up, invisible, on a fifth of the site.
   *
   * The answer is probed on its opening rather than whole, because the visible
   * copy carries `<span>`s the schema's plain form does not and entities the
   * schema's does not, and the two are already held character-for-character by
   * the melt tests. What is being checked here is presence, not equality.
   */
  const problems = [];
  for (const page of htmlFiles()) {
    const html = read(page);
    const text = renderedText(html);
    for (const [, rawQ] of html.matchAll(/"@type":"Question","name":"((?:[^"\\]|\\.)*)"/g)) {
      const q = JSON.parse(`"${rawQ}"`);
      if (!text.includes(q)) problems.push(`${page}: marks up "${q}" and never shows it`);
    }
    for (const [, rawA] of html.matchAll(/"@type":"Answer","text":"((?:[^"\\]|\\.)*)"/g)) {
      const probe = JSON.parse(`"${rawA}"`).replace(/\s+/g, ' ').trim().slice(0, 60);
      if (probe && !text.includes(probe)) problems.push(`${page}: answers with "${probe}..." and never shows it`);
    }
  }
  assert.deepEqual(problems.slice(0, 20), [], `\n  - ${problems.slice(0, 20).join('\n  - ')}\n  (${problems.length} total)\n`);
});

test('a page with no metal in it does not advertise one in its description', () => {
  /*
   * The third of the description-versus-page checks, and the one that caught
   * the most: five archives under /melt-value promised "metal content in troy
   * ounces, what it is worth at a stated and dated spot price" over a body
   * whose first word is "Nothing." Three denomination archives (clad quarters,
   * copper cents, steel cents) and two tag archives (clad coinage, Wheat
   * pennies).
   *
   * Every one of them had a generator whose ANSWER carried a no-metal branch
   * and whose DESCRIPTION did not -- `meltPairAnswer` against
   * `meltPairDescription`, `meltTagAnswer` against `meltTagDescription`. That
   * is the shape of the bug, and it is invisible in the source: both functions
   * sit in one file within a few lines of each other and only one of them was
   * ever read next to the page it writes.
   *
   * The test is the page, not the generator: a page that renders no figure
   * worked from a spot price may not promise one, however it came to say so.
   */
  const problems = [];
  for (const page of htmlFiles()) {
    if (!page.startsWith('melt-value/')) continue;
    const html = read(page);
    /*
     * Any `data-spot` marker at all is enough to pass. The hub carries only a
     * `stamp` -- "Silver $66.30/ozt, based on spot prices at ..." -- and that
     * IS a stated, dated spot price, which is all its description claims; the
     * multiplying out happens on the pages it points at. The pages this is
     * aimed at carry no marker of any kind, because there is no metal in them
     * to work a figure from.
     */
    if (/data-spot=/.test(html)) continue;
    const description = decode(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '');
    if (/troy ounce|spot price|melt value of/i.test(description)) {
      problems.push(`${page}: states no melt figure and its description promises one — "${description}"`);
    }
  }
  assert.deepEqual(problems, [], `\n  - ${problems.join('\n  - ')}\n`);
});

test('a Product states no specification its own page does not print', () => {
  /*
   * The companion to the Dataset check, and it was found the same way: by
   * reading the JSON-LD against the rendered text rather than against the
   * template that wrote it.
   *
   * Every grade page carried a Product asserting `material` ("90% silver, 10%
   * copper"), a `weight` of 6.25 g and a `diameter` of 24.3 mm, on a page that
   * prints none of the three -- a grade page has no specification table by
   * design. Twenty thousand URLs making three invisible machine-readable
   * claims each. The Product now stops at the coin page, which shows all of
   * them in a table; this is what keeps it there.
   *
   * The figures are matched as numbers rather than as formatted strings,
   * because the page prints "6.25 g" and "24.3 mm" and the schema carries
   * bare values with a separate unitCode.
   */
  const problems = [];
  for (const page of htmlFiles()) {
    const html = read(page);
    if (!html.includes('"@type":"Product"')) continue;
    const text = renderedText(html);
    for (const node of jsonLdNodes(html)) {
      if (node['@type'] !== 'Product') continue;
      if (node.material && !text.includes(node.material)) {
        problems.push(`${page}: Product asserts material "${node.material}", which the page does not print`);
      }
      const figures = [
        ['weight', node.weight?.value],
        ...(node.additionalProperty ?? []).map((prop) => [prop.name, prop.value]),
      ];
      for (const [name, value] of figures) {
        if (value === undefined || value === null) continue;
        if (!text.includes(String(value))) {
          problems.push(`${page}: Product asserts ${name} ${value}, which the page does not print`);
        }
      }
    }
  }
  assert.ok(
    problems.length === 0,
    `\n  - ${problems.slice(0, 15).join('\n  - ')}\n  (${problems.length} total)\n`,
  );
});

test('only a page that renders reference data carries a Dataset', () => {
  /*
   * schema.ts states the rule -- "variableMeasured must list columns the page
   * genuinely renders" -- and it was broken in the one way a rule like that
   * gets broken: not by a wrong label, but by a redesign. /coin-info declared
   * eight variables and /melt-value four, and both had rendered none of them
   * since the cards rewrite took the coin list off the hubs. Nine cards, and a
   * Dataset over them describing the page as it had been two redesigns
   * earlier.
   *
   * What this pins is the LIST, not the labels, and that is deliberate. A
   * label is a name for a quantity and the page prints the quantity, not the
   * name: /melt-value/silver renders "0.7734 troy oz silver" for "Metal
   * content (troy ounces)" and the calculators render "90% silver" for
   * "Fineness". Matching those as strings would fail every honest page and
   * pass any page that happened to use the word, which is worse than not
   * checking. A short allow-list cannot do that: adding a Dataset to a tenth
   * page means coming here and saying which table on it the variables name.
   */
  const ALLOWED = {
    'melt-value/silver/index.html':
      'the group archive lists every silver coin with its content in troy ounces and its melt value, over the spot ladder the figures were worked at',
    'tools/coin-calculators/silver-melt-price/index.html':
      'a row per composition, each stating grams, fineness, content in troy ounces and the melt value of one',
    'tools/coin-calculators/gold-melt-price/index.html': 'the same, for gold',
  };
  const carrying = htmlFiles().filter((page) => /"@type":"Dataset"/.test(read(page)));
  assert.deepEqual(
    carrying.sort(),
    Object.keys(ALLOWED).sort(),
    'a page gained or lost a Dataset; say in ALLOWED which table on it the variables name',
  );
  for (const page of carrying) {
    const html = read(page);
    const vars = [...html.matchAll(/"@type":"Dataset".*?"variableMeasured":\[([^\]]*)\]/gs)]
      .flatMap(([, block]) => [...block.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(([, r]) => JSON.parse(`"${r}"`)));
    assert.ok(vars.length > 0, `${page} declares a Dataset with no variableMeasured`);
    // The figures the variables name have to be somewhere on the page, and on
    // these three every one of them is a marked spot figure or a table cell.
    assert.ok(
      /<table/.test(html) || /data-spot=/.test(html),
      `${page} declares a Dataset and renders no table and no computed figure`,
    );
  }
});

test('a series page prints its key dates, its varieties and its mint marks', () => {
  // The series page is assembled entirely from SeriesInfo, so the way it fails
  // is by rendering a section heading with nothing under it -- a `keyDates`
  // array that stopped being read, a mints table whose marks vanished because
  // Philadelphia's is the empty string. None of that fails a typecheck and
  // none of it fails a build. It is only visible in the HTML.
  for (const tag of documentedSeries()) {
    const path = tagPath(tag.slug);
    const file = `${path.slice(1)}/index.html`;
    // A series with no coin behind it is registered but not built, which is
    // the same rule every other archive follows.
    if (!existsSync(join(DIST, file))) {
      assert.ok(
        !populatedTags().some((t) => t.slug === tag.slug),
        `${path} has coins but was not built`,
      );
      continue;
    }
    const html = read(file);
    const series = tag.series;

    for (const m of series.mints) {
      assert.ok(html.includes(m.city), `${path} does not list the ${m.city} mint`);
    }
    assert.ok(
      html.includes('>None<') || series.mints.every((m) => m.mark !== ''),
      `${path} has a mint with no mark and does not say so`,
    );
    for (const c of series.compositions) {
      assert.ok(html.includes(c.composition), `${path} omits the "${c.composition}" era`);
    }
    for (const k of series.keyDates ?? []) {
      assert.ok(html.includes(k.label), `${path} omits key date ${k.label}`);
      assert.ok(html.includes(k.why), `${path} names ${k.label} without saying why it is scarce`);
      if (k.mintage) {
        assert.ok(
          html.includes(k.mintage.toLocaleString('en-US')),
          `${path} omits the mintage behind ${k.label}`,
        );
      }
    }
    for (const v of series.varieties ?? []) {
      assert.ok(html.includes(v.label), `${path} omits variety ${v.label}`);
      // The whole point of a variety row: what to put under a loupe. A label
      // with no instruction is a list of words a reader cannot act on.
      assert.ok(html.includes(v.lookFor), `${path} names ${v.label} without saying what to look at`);
    }
    for (const e of series.errors ?? []) {
      assert.ok(html.includes(e.label), `${path} omits mint error ${e.label}`);
      // The test is the row. An error names a coin the reader would like to
      // own and cannot identify by looking, so a row without the measurement
      // is a row that only raises the hope.
      assert.ok(html.includes(e.check), `${path} names ${e.label} without the test that settles it`);
      assert.ok(html.includes(e.caution), `${path} names ${e.label} without saying what people have instead`);
    }
    // Every link this page generates must be to a page that exists. A static
    // site has no soft 404, so an unbuilt target is a dead end. Only key
    // dates link: varieties and errors are listed and never followed.
    for (const k of series.keyDates ?? []) {
      if (!k.coin) continue;
      const target = coinPath(coinBySlug(k.coin));
      assert.ok(html.includes(`href="${target}"`), `${path} does not link ${k.label} to ${target}`);
    }
  }
});

test('the cheat sheet lists every checkable thing, and links none of them out', () => {
  // The cheat sheet is a summary sitting above the tables that prove it, so
  // the failure mode is drift: a list that stops matching what is underneath
  // it, and gets believed because it is first on the page. It is derived from
  // SeriesInfo for that reason, and this is the check that it stays derived.
  //
  // The second half is the editorial decision: a variety and a mint error are
  // specialties with their own literature and their own authentication
  // problem, and this site names them so a reader knows what they are looking
  // at. It does not build a page for each. A `coin` slug appearing on one
  // would be the start of that divergence, so the schema has no field for it
  // and this fails if the markup grows one.
  for (const tag of documentedSeries()) {
    const path = tagPath(tag.slug);
    const file = `${path.slice(1)}/index.html`;
    if (!existsSync(join(DIST, file))) continue;
    const html = read(file);
    const series = tag.series;

    const checkable = [
      ...(series.keyDates ?? []),
      ...(series.varieties ?? []),
      ...(series.errors ?? []),
    ];
    if (checkable.length === 0) {
      assert.ok(!html.includes('Cheat sheet'), `${path} has a cheat sheet with nothing on it`);
      continue;
    }

    const sheet = html.split('Cheat sheet')[1]?.split('The series at a glance')[0];
    assert.ok(sheet, `${path} has ${checkable.length} things to check and no cheat sheet`);
    for (const e of checkable) {
      assert.ok(sheet.includes(e.label), `the cheat sheet on ${path} omits ${e.label}`);
    }
    // Nothing in the sheet is a link out of the page: the jump anchors are the
    // only hrefs it is allowed to carry.
    for (const href of sheet.matchAll(/href="([^"]+)"/g)) {
      assert.ok(
        href[1].startsWith('#'),
        `the cheat sheet on ${path} links out to ${href[1]}`,
      );
    }
    for (const c of ['#key-dates', '#varieties', '#errors']) {
      const listed = c === '#key-dates' ? series.keyDates : c === '#varieties' ? series.varieties : series.errors;
      if (!listed?.length) continue;
      assert.ok(sheet.includes(`href="${c}"`), `${path} lists ${c.slice(1)} with no jump to them`);
      assert.ok(html.includes(`id="${c.slice(1)}"`), `${path} jumps to ${c} and has no such heading`);
    }
  }
});

test('a series page states no price, and the coin page still links to it', () => {
  // Two house rules at once. A key date table is the most tempting place on
  // the site to type "worth about $200", and the figure would be stale within
  // the month and carried by no source -- SeriesInfo has no field for it, and
  // this is the check that nobody adds one in the template. The second half is
  // the orphan check: the series page is reached from its coins.
  for (const tag of documentedSeries()) {
    const path = tagPath(tag.slug);
    const file = `${path.slice(1)}/index.html`;
    if (!existsSync(join(DIST, file))) continue;
    const main = read(file).split('<main')[1] ?? '';
    // The spot-price strip is the one legitimate figure in the layout, so the
    // search is for a dollar amount inside the series sections themselves.
    const sections = main.split('The series at a glance')[1] ?? '';
    const priced = sections.match(/\$[0-9][0-9,]*(\.[0-9]{2})?/);
    assert.ok(!priced, `${path} prints the figure ${priced?.[0]} in its series sections`);

    for (const coin of COINS.filter((c) => c.tags.includes(tag.slug))) {
      assert.ok(
        read(`${coinPath(coin).slice(1)}/index.html`).includes(`href="${path}"`),
        `${coinPath(coin)} does not link up to its series page ${path}`,
      );
    }
  }
});

test('the visible breadcrumb trail matches the BreadcrumbList schema', () => {
  // These used to be one array feeding only the schema, with nothing on the
  // page. Both now render from `crumbs`; this is what stops a future edit
  // dropping one of the two and leaving markup with no visible counterpart.
  for (const page of htmlFiles()) {
    const html = read(page);
    const crumbs = /"@type":"BreadcrumbList","itemListElement":\[(.*?)\]/.exec(html)?.[1];
    if (!crumbs) continue;
    assert.ok(
      html.includes('aria-label="Breadcrumb"'),
      `${page} has BreadcrumbList schema but renders no visible trail`,
    );
    const names = [...crumbs.matchAll(/"name":"((?:[^"\\]|\\.)*)"/g)].map(([, n]) =>
      JSON.parse(`"${n}"`),
    );
    for (const name of names) {
      assert.ok(html.includes(name), `${page} breadcrumb "${name}" is in schema but not on the page`);
    }
  }
});

test('every coin has a melt page, and the twins link to each other where there is a figure', () => {
  // The orphan check for the mirrored section, and the check that the links
  // each page is supposed to carry are actually in the HTML. Every half of
  // this is a silent failure: a page nobody links to is a page Google
  // discounts, and a missing link is only visible to somebody scrolling.
  for (const coin of meltCoins()) {
    const page = `${meltPath(coin).slice(1)}/index.html`;
    assert.ok(existsSync(join(DIST, page)), `${meltPath(coin)} was not built`);

    // Its denomination archive lists it, and that archive is linked from its
    // composition archive, which is linked from the hub -- so the coin is
    // three clicks down a trail and not an orphan.
    const parentPath = meltTypePath(coin.group, coin.type);
    assert.ok(
      read(`${parentPath.slice(1)}/index.html`).includes(`href="${meltPath(coin)}"`),
      `${parentPath} does not link to ${meltPath(coin)}`,
    );

    // Upwards on every melt page without exception: a reader who landed on
    // the metal half of the answer always has one link to the other half.
    assert.ok(
      read(page).includes(`href="${coinPath(coin)}"`),
      `${meltPath(coin)} does not link to ${coinPath(coin)}`,
    );
    // Downwards only for a coin with metal in it. Since 2026-09-23 a coin
    // with none carries no link to its melt page -- the page is still built,
    // still reachable from the melt archives and still links back up, but a
    // coin page does not invite a reader to go and read "None". So the
    // assertion flips: the link must be there where there is a figure behind
    // it, and must NOT be there where there is not, because a link that comes
    // back by accident is exactly what this check is here to catch.
    const coinHtml = read(`${coinPath(coin).slice(1)}/index.html`);
    if (meltOf(coin)) {
      assert.ok(
        coinHtml.includes(`href="${meltPath(coin)}"`),
        `${coinPath(coin)} does not link to its melt page`,
      );
    } else {
      assert.ok(
        !coinHtml.includes(`href="${meltPath(coin)}"`),
        `${coinPath(coin)} has no precious metal in it but still links to its melt page`,
      );
    }
  }
});

test('the melt tree mirrors the catalogue, segment for segment', () => {
  // The structural check. /melt-value is /coin-info with one segment
  // changed, at every level, and a reader who edits the URL by hand must land
  // on a page rather than a 404. validateMeltPaths() asserts this over the
  // registries at build time; this asserts it over the HTML that was
  // actually written to disk.
  const built = (path) => existsSync(join(DIST, `${path.slice(1)}/index.html`));

  const pairs = [
    [COIN_INFO_ROOT, MELT_ROOT],
    [`${COIN_INFO_ROOT}/tagged`, MELT_TAGGED_ROOT],
    ...meltGroups().map((g) => [groupPath(g.slug), meltGroupPath(g.slug)]),
    ...meltPairs().map(({ group, type }) => [
      typePath(group.slug, type.slug),
      meltTypePath(group.slug, type.slug),
    ]),
    ...meltTags().map((t) => [tagPath(t.slug), meltTagPath(t.slug)]),
    ...meltCoins().map((c) => [coinPath(c), meltPath(c)]),
  ];

  for (const [coinSide, meltSide] of pairs) {
    assert.equal(
      meltSide,
      `${MELT_ROOT}${coinSide.slice(COIN_INFO_ROOT.length)}`,
      `${meltSide} is not ${coinSide} with the root swapped`,
    );
    assert.ok(built(coinSide), `${coinSide} was not built`);
    assert.ok(built(meltSide), `${meltSide} was not built, so the mirror has a hole in it`);
  }
});

test('every melt archive asks its own question and links back up', () => {
  // One FAQ question per page, rendered on the page that owns it, and a trail
  // that reaches the hub. The registry already refuses to let two pages claim
  // one question; this is the check that the page prints the one it claimed.
  const hub = read(`${MELT_ROOT.slice(1)}/index.html`);

  const archives = [
    ...meltGroups().map((g) => [meltGroupPath(g.slug), meltGroupQuestion(g), true]),
    ...meltPairs().map(({ group, type }) => [
      meltTypePath(group.slug, type.slug),
      meltPairQuestion(group, type),
      false,
    ]),
    ...meltTags().map((t) => [meltTagPath(t.slug), meltTagQuestion(t), false]),
  ];

  assert.ok(archives.length > 0, 'the melt section has no archives, so there is nothing to mirror');

  for (const [path, question, onHub] of archives) {
    const page = read(`${path.slice(1)}/index.html`);
    assert.ok(page.includes(question), `${path} does not ask its own question`);
    assert.ok(page.includes(`href="${MELT_ROOT}"`), `${path} does not link back to the hub`);
    if (onHub) {
      assert.ok(hub.includes(`href="${path}"`), `${MELT_ROOT} does not link to ${path}`);
    }
  }
});

test('a melt page with no metal in it says None rather than a figure', () => {
  // The coins with no silver and no gold are not a separate category any
  // more -- they are ordinary members of their composition group, and the
  // honesty check moved with them. A zero, or a blank where a figure goes, is
  // how a table teaches a reader to distrust it.
  for (const coin of unpricedMeltCoins()) {
    const page = read(`${meltPath(coin).slice(1)}/index.html`);
    assert.ok(page.includes('>None<'), `${meltPath(coin)} has no precious metal but does not say so`);
    assert.ok(
      !/class="figure-big"[^>]*>\s*\$/.test(page),
      `${meltPath(coin)} renders a dollar melt figure for a coin with no metal in it`,
    );
  }
});

test('a melt page prints its figure, its working and its caveat', () => {
  // The same house rule the coin pages are held to -- never print a value the
  // site did not measure -- applied to the pages that exist to print one. A
  // melt page showing a figure without the price, the date and the
  // not-a-live-quote line would be the worst instance of it on the site.
  for (const coin of meltCoins()) {
    const html = read(`${meltPath(coin).slice(1)}/index.html`);
    const melt = meltOf(coin);
    if (!melt) {
      assert.ok(
        html.includes('no silver or gold'),
        `${meltPath(coin)} has no precious metal but does not say so`,
      );
      continue;
    }
    assert.ok(html.includes(formatUsd(melt.value)), `${meltPath(coin)} omits its melt value`);
    assert.ok(html.includes(formatUsd(spotPrice(melt.metal))), `${meltPath(coin)} omits the spot price`);
    assert.ok(
      html.includes(spotBasis()),
      `${meltPath(coin)} prints a figure without "${spotBasis()}"`,
    );
    // The "how many do you have" input. Server-rendered at one coin, so this
    // block is a correct static answer with JavaScript off, and driven by
    // src/lib/spot-dom.ts otherwise -- which is also what rewrites the figure
    // when /api/spot answers. Pinning the server-rendered default is what
    // catches a figure that starts at something other than one coin.
    assert.ok(
      html.includes('id="calc-count"'),
      `${meltPath(coin)} has no quantity input`,
    );
    assert.match(
      html,
      new RegExp(`id="calc-total"[^>]*>${formatUsd(melt.value).replace(/[$.]/g, '\\$&')}<`),
      `${meltPath(coin)} does not start its calculator at the one-coin figure`,
    );
    // The browser is handed the weight and the metal, and works the figure out
    // for itself from whatever price the endpoint gives it. A page that prints
    // the figure without them is a page frozen at the price of the last
    // deploy, inside HTML the edge caches for a day.
    const handed = new RegExp(
      `id="calc-total"[^>]*data-spot-ozt="([0-9.eE+-]+)"`,
    ).exec(html)?.[1] ?? new RegExp(
      `data-spot-ozt="([0-9.eE+-]+)"[^>]*id="calc-total"`,
    ).exec(html)?.[1];
    assert.ok(handed, `${meltPath(coin)} does not mark its figure for the spot endpoint`);
    assert.equal(
      Number(handed),
      melt.troyOunces,
      `${meltPath(coin)} marks its figure with a weight it did not print`,
    );
    assert.match(
      html,
      /id="calc-total"[^>]*data-spot-qty|data-spot-qty[^>]*id="calc-total"/,
      `${meltPath(coin)} has a quantity box that does not drive the headline figure`,
    );
  }
});

test('every grade page was built, and the coin page links to it both ways', () => {
  // The orphan check for the newest section, and the link that keeps it out of
  // the doorway-page shape: a grade page is reached from the coin's own ladder,
  // and it leads back to the coin. It is not in the sitemap, so a grade page
  // nothing links to is a page nothing reaches at all -- and one with no
  // way back up is a dead end for the reader who landed on the wrong rung.
  const pairs = gradedPairs();
  assert.ok(pairs.length > 0, 'no grade page was built, so this check proves nothing');

  for (const { coin, grade } of pairs) {
    const path = gradePath(coin, grade);
    const page = `${path.slice(1)}/index.html`;
    assert.ok(existsSync(join(DIST, page)), `${path} was not built`);

    const html = read(page);
    assert.ok(html.includes(`href="${coinPath(coin)}"`), `${path} does not link back to its coin`);
    assert.ok(
      read(`${coinPath(coin).slice(1)}/index.html`).includes(`href="${path}"`),
      `${coinPath(coin)} does not link to ${path}`,
    );
  }
});

test('every grade page ships the copy its generator produced', () => {
  // The same discipline the archives are held to. A heading typed back into
  // the .astro file typechecks and passes every unit test; only the built HTML
  // shows that the template stopped reading src/lib/grade-copy.ts.
  const problems = [];
  for (const row of allGradeCopy()) {
    const file = `${row.path.slice(1)}/index.html`;
    if (!existsSync(join(DIST, file))) {
      problems.push(`${row.path} was not built`);
      continue;
    }
    const html = decode(read(file));
    const expect = (what, text) => {
      if (text && !html.includes(text)) problems.push(`${row.path} is missing its ${what}: "${text}"`);
    };
    expect('H1', row.h1);
    expect('<title>', row.seoTitle);
    expect('meta description', row.description);
    expect('FAQ question', row.question);
    expect('answer', row.answer);
    row.paragraphs.forEach((p, i) => expect(`paragraph ${i + 1}`, p));
    row.headings.forEach((h, i) => expect(`heading ${i + 1}`, h));
  }
  assert.deepEqual(problems, [], `\n  - ${problems.join('\n  - ')}\n`);
});

test('a grade page states a price only where it has one, and still offers nothing', () => {
  // The three rules this section is closest to breaking. It prints prices, so
  // it is the page most likely to grow an `offers` block; it prints prices that
  // MOVE, so it is the page most likely to grow a `dateModified`; and since
  // 2026-09-22 most of its pages have no price at all, so it is the page most
  // likely to grow a placeholder where one should go.
  for (const { coin, grade } of gradedPairs()) {
    const path = gradePath(coin, grade);
    const html = decode(read(`${path.slice(1)}/index.html`));

    assert.ok(!html.includes('"offers"'), `${path} claims an offer for a coin`);

    /*
     * The provenance belongs to the FIGURE, so a page with no figure carries
     * neither -- and since the owner made this an information catalogue rather
     * than a price guide, a page with no figure carries no range BLOCK either.
     *
     * It printed `TBD to TBD` in the largest type on the page on six and a
     * half thousand pages, which was honest and was still the wrong shape: a
     * placeholder for a price, set as the headline, is a price page that has
     * failed. What replaced it is nothing at all, so the two questions this
     * asks are the two that are now the rule -- a page that states a range
     * says where it came from and what it is not, and a page that does not
     * states no range, no provenance and no placeholder.
     *
     * The range block is identified by its own heading id rather than by the
     * first `figure-big` on the page: on an unpriced silver coin the first one
     * is the METAL FLOOR, which is real arithmetic and carries a dollar sign,
     * so a regex that did not tell them apart would pass this test by reading
     * the wrong figure.
     *
     * The phrase is matched against the constant rather than retyped here. A
     * test with its own copy of a sentence is a second place for it to drift,
     * and this one is a disclaimer, which is the worst kind to let drift.
     */
    const priced = isPriced(gradedValue(coin, grade));
    const range = /<p class="figure-label" id="range-heading">[\s\S]*?<p class="figure-big"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1];
    if (priced) {
      assert.ok(html.includes(LADDER_BASIS), `${path} prints a range with no provenance under it`);
      assert.ok(range !== undefined, `${path} has a researched range and renders no range block`);
      assert.match(range, /\$/, `${path} has a researched range and does not print it`);
    } else {
      assert.ok(
        !html.includes(LADDER_BASIS),
        `${path} has no researched range and names a source for it anyway`,
      );
      assert.equal(
        range,
        undefined,
        `${path} has no researched range and renders a range block anyway: "${range}"`,
      );
    }

    // No placeholder, anywhere, in any form. This is the string the section
    // used to print in that slot, and the check that it has not come back.
    assert.ok(!html.includes('TBD'), `${path} still prints a TBD placeholder`);

    assert.ok(html.includes('"@type":"Article"'), `${path} is missing Article schema`);

    /*
     * The question and its answer are RENDERED, which is what this asserts and
     * what nothing asserted before 2026-09-23.
     *
     * Until that day the only thing tying the visible block to anything
     * checkable was the FAQPage node, which carried the same two strings and
     * was itself checked. Taking the markup off would have quietly removed the
     * site's only guard that the first block on 21,123 pages says anything at
     * all -- so the guard moves here, where it should always have been: the
     * words a reader sees, matched against the generator that writes them.
     */
    const question = gradeQuestion(coin, grade);
    assert.ok(
      html.includes(question),
      `${path} does not print its question: "${question}"`,
    );
    const answer = gradeAnswer(coin, grade);
    assert.ok(
      html.includes(answer),
      `${path} does not print the answer its question promises`,
    );

    /*
     * AND NO FAQPage, which is the opposite of what this asserted until
     * 2026-09-23. The markup came off all 21,123 grade pages on the owner's
     * decision: Google has not shown FAQ rich results for a site like this one
     * since 2023, so it bought nothing, and 21,123 FAQPage nodes whose
     * question is one formula with a coin and a grade substituted in is the
     * scaled-content shape asserted in machine-readable form.
     *
     * The question and the answer still RENDER -- that is checked a few lines
     * up, against `gradeQuestion()` and `gradeAnswer()`. What is gone is the
     * claim about what the page is. The coin pages, the melt pages and the
     * common questions keep theirs.
     */
    assert.ok(
      !html.includes('"@type":"FAQPage"'),
      `${path} carries FAQPage markup; grade pages render the question and do not mark it up`,
    );

    /*
     * AND NO Product, which is the opposite of what this asserted until
     * 2026-09-22. The node used to be here and it stated `material`, `weight`
     * and `diameter` -- three facts a grade page deliberately does not render,
     * because the coin page owns the specification table. The Product stops at
     * the coin, the same place the melt mirror stops and for the same reason:
     * grade does not change the object.
     */
    assert.ok(
      !html.includes('"@type":"Product"'),
      `${path} carries a Product node; the coin page owns it`,
    );
  }
});

test('a grade ladder lists only the grades that exist, and there is no melt page per grade', () => {
  // Two absences, each of which would be invisible in a clean build.
  //
  // A row saying "MS69: none" asserts that a reader might turn one up, which is
  // the one thing worse than a duplicate page: a fact the site got wrong. And
  // grade does not change metal content, so the melt mirror stops at the coin
  // -- a /melt-value/.../g4 would be a second page doing the coin's melt
  // arithmetic under a heading that implies grade changes it.
  for (const { coin, grade } of gradedPairs()) {
    const path = gradePath(coin, grade);
    const html = decode(read(`${path.slice(1)}/index.html`));
    const built = gradedGrades(coin).map((g) => g.code);

    for (const g of GRADES) {
      if (built.includes(g.code)) continue;
      assert.ok(
        !html.includes(`>${g.label}<`),
        `${path} lists ${g.label}, which this coin has no researched price for`,
      );
    }

    assert.ok(
      !existsSync(join(DIST, `${meltPath(coin).slice(1)}/${grade.slug}/index.html`)),
      `a melt page was built for ${coin.slug} in ${grade.slug}; grade does not change metal content`,
    );
  }
});

test('every common question was built, and the hub links to it', () => {
  const hub = read(`${QUESTIONS_ROOT.slice(1)}/index.html`);
  for (const q of QUESTIONS) {
    const page = `${questionPath(q).slice(1)}/index.html`;
    assert.ok(existsSync(join(DIST, page)), `${questionPath(q)} was not built`);
    assert.ok(hub.includes(`href="${questionPath(q)}"`), `${QUESTIONS_ROOT} does not link to ${questionPath(q)}`);
    const html = read(page);
    assert.ok(html.includes('"@type":"FAQPage"'), `${questionPath(q)} carries no FAQPage schema`);
    assert.ok(html.includes('"@type":"Article"'), `${questionPath(q)} carries no Article schema`);
  }
});

test('every common question ships the copy its formulas produced', () => {
  // The templates hold layout and the registry holds sentences, which is the
  // division the catalogue is under and for the same reason: a <title> typed
  // back into the .astro file typechecks and passes every unit test. So the
  // check that matters is on the HTML -- what shipped has to be what
  // questionTitle() and questionDescription() said, suffix included.
  for (const q of QUESTIONS) {
    const html = decode(read(`${questionPath(q).slice(1)}/index.html`));
    const title = renderedTitle(questionTitle(q));
    assert.ok(
      html.includes(`<title>${title}</title>`),
      `${questionPath(q)} does not ship the generated title "${title}"`,
    );
    assert.ok(
      html.includes(questionDescription(q)),
      `${questionPath(q)} does not ship its generated description`,
    );
    assert.ok(
      html.includes(q.answer),
      `${questionPath(q)} does not print the answer its FAQPage schema claims`,
    );
  }
});

test('a link written into a question renders, and goes somewhere that exists', () => {
  // The registry checks every href against the paths the site builds. This is
  // the other half: that the paragraph was rendered as HTML at all. A template
  // printing a paragraph as text ships the link markup to the reader verbatim
  // and passes every other check on this page.
  for (const q of QUESTIONS) {
    const html = decode(read(`${questionPath(q).slice(1)}/index.html`));
    // Scripts first: inline JavaScript is full of `queue[j]()` and none of it
    // is copy.
    const copy = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
    assert.ok(!copy.includes(']('), `${questionPath(q)} shipped unrendered link markup`);

    const links = questionLinks(q);
    assert.ok(links.length > 0, `${questionPath(q)} links to nothing`);
    for (const { label, href } of links) {
      assert.ok(
        html.includes(`<a href="${href}">${label}</a>`),
        `${questionPath(q)} does not link to ${href} under "${label}"`,
      );
      assert.ok(
        existsSync(join(DIST, `${href.slice(1)}/index.html`)),
        `${questionPath(q)} links to ${href}, which was not built`,
      );
    }
  }
});

test('every topic page was built, and the section links both ways', () => {
  // The hub links down to a topic, the topic links down to its questions, and
  // each question links back up to the topic it is filed under. A tree with
  // one of those missing is a page nothing points at or a page with no way
  // out, and neither shows up in any other check here.
  const hub = read(`${QUESTIONS_ROOT.slice(1)}/index.html`);

  for (const c of QUESTION_CATEGORIES) {
    const page = `${categoryPath(c).slice(1)}/index.html`;
    assert.ok(existsSync(join(DIST, page)), `${categoryPath(c)} was not built`);
    assert.ok(
      hub.includes(`href="${categoryPath(c)}"`),
      `${QUESTIONS_ROOT} does not link to ${categoryPath(c)}`,
    );

    const html = decode(read(page));
    assert.ok(html.includes('"@type":"CollectionPage"'), `${categoryPath(c)} is not a CollectionPage`);
    assert.ok(html.includes('"@type":"ItemList"'), `${categoryPath(c)} carries no ItemList`);
    // Each question is marked up where it is answered, once. A topic page
    // repeating its members' Q&A is the house rule's exact failure case.
    assert.ok(
      !html.includes('"@type":"FAQPage"'),
      `${categoryPath(c)} carries FAQPage markup for questions it does not answer`,
    );

    const held = questionsInCategory(c.slug);
    assert.ok(held.length >= 2, `${categoryPath(c)} holds ${held.length} question(s)`);
    for (const q of held) {
      assert.ok(
        html.includes(`href="${questionPath(q)}"`),
        `${categoryPath(c)} does not link to ${questionPath(q)}`,
      );
    }

    for (const { label, href } of categoryLinks(c)) {
      assert.ok(
        html.includes(`<a href="${href}">${label}</a>`),
        `${categoryPath(c)} does not link to ${href} under "${label}"`,
      );
    }
    assert.ok(!html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').includes(']('),
      `${categoryPath(c)} shipped unrendered link markup`);
  }

  for (const q of QUESTIONS) {
    const c = categoryOf(q);
    assert.ok(c, `${questionPath(q)} is filed under no topic`);
    const html = read(`${questionPath(q).slice(1)}/index.html`);
    assert.ok(
      html.includes(`href="${categoryPath(c)}"`),
      `${questionPath(q)} does not link up to ${categoryPath(c)}`,
    );
  }
});

test('every topic page ships the copy its formulas produced', () => {
  for (const c of QUESTION_CATEGORIES) {
    const html = decode(read(`${categoryPath(c).slice(1)}/index.html`));
    const title = renderedTitle(categoryTitle(c));
    assert.ok(
      html.includes(`<title>${title}</title>`),
      `${categoryPath(c)} does not ship the generated title "${title}"`,
    );
    assert.ok(
      html.includes(categoryDescription(c)),
      `${categoryPath(c)} does not ship its generated description`,
    );
    assert.ok(html.includes(c.h1), `${categoryPath(c)} does not print its H1`);
  }
});

test('no page states a metal price without the time it was read', () => {
  // The site-wide version of the melt check. Any built page that prints the
  // price of a metal is making a claim about what an ounce costs, and the only
  // thing that makes that claim honest on a static page is the timestamp beside
  // it. One phrase, from spotBasis(), so a page cannot word it its own way.
  /*
   * MATCHED ON THE MARKER, NOT ON ONE SPELLING OF THE FIGURE.
   *
   * It used to look for the literal "$66.30/ozt", which is how `spotStamp()`
   * writes a price -- so it only ever fired on a page that already carried a
   * stamp, and every page that printed the price some other way was skipped
   * rather than failed. The two denomination archives with metal in them say
   * "$66.30 a troy ounce" in their opening answer and nothing else anywhere,
   * and they sat there stating a metal price with no minute against it while
   * this test passed on all 20,081 pages.
   *
   * `data-spot` is the honest trigger: it is on every figure the build worked
   * from a spot price, it is what the browser looks for when it rewrites them,
   * and a page cannot print such a figure without it -- that is a separate
   * check below. So "carries a spot-derived figure" and "says when the price
   * was read" are now the same population.
   */
  for (const page of htmlFiles()) {
    const html = read(page);
    // Never the vendor's name, anywhere: provenance for a reader is the time,
    // not who sells the feed.
    assert.ok(!html.includes('metals.dev'), `${page} names the price feed`);
    if (!/data-spot="(value|price|sum|ozt|stamp)"/.test(html)) continue;
    assert.ok(
      html.includes(spotBasis()),
      `${page} prints a figure worked from a spot price without saying when it was read`,
    );
  }
});

test('every figure the build printed is marked for the browser to replace', () => {
  // The prices are the one class of fact on this site that goes stale inside
  // the cache: the HTML is held at the edge for a day and served stale for a
  // week, and a coin's weight does not move but the price of silver does. So
  // every figure derived from a price carries `data-spot`, and the module
  // Base.astro loads on every page rewrites them from /api/spot -- which is
  // cached for an hour instead.
  //
  // An unmarked figure does not look broken. It looks like a number. That is
  // exactly why it is checked here rather than left to review.
  let marked = 0;
  for (const page of htmlFiles()) {
    const html = read(page);

    // A marked figure with nothing to rewrite it is worse than an unmarked
    // one: it looks wired up. Base.astro loads the module on every page it
    // renders, unconditionally -- a per-page flag fails silently the first
    // time somebody forgets it -- so the only pages without it are the ones
    // that do not use Base at all, and none of those carry a figure.
    if (html.includes('data-spot=')) {
      assert.match(
        html,
        /<script type="module" src="\/_astro\/SpotLive[^"]*"/,
        `${page} marks a figure but never loads the module that rewrites it`,
      );
    }

    // A page that prints a per-ounce price must also mark it, or the caveat
    // beneath it will be rewritten while the number above it is not.
    for (const metal of ['silver', 'gold', 'platinum']) {
      const price = `${formatUsd(spotPrice(metal))}/ozt`;
      if (!html.includes(price)) continue;
      assert.ok(
        html.includes('data-spot='),
        `${page} prints ${price} with nothing marked for the spot endpoint`,
      );
    }

    if (html.includes('data-spot=')) marked += 1;
  }
  // A sanity floor: if this drops to nothing, the markup contract has been
  // removed rather than the figures.
  assert.ok(marked > 10, `only ${marked} built pages mark a figure -- something dropped the contract`);
});

test('every marked figure says what its own attributes say it should', () => {
  // The strongest check in this file, and the cheapest.
  //
  // A marked figure is rendered twice from two directions: the build computes
  // the text from a coin, and the browser recomputes it from the attributes
  // beside that text. If the attributes are wrong -- a weight that is not the
  // coin's, a metal copied from the row above, a `sum` that lost a term --
  // nothing looks wrong in the built page. It looks like a number. Then the
  // endpoint answers and the number jumps to something that was never true.
  //
  // So every marked figure in the build is fed back through the browser's own
  // rule at the reference price, which is the price the build used. Both
  // directions must agree, everywhere, or one of them is lying.
  const MARKED = /<(?:span|p|dd|td)\b([^>]*\bdata-spot="[^"]*"[^>]*)>([^<]*)</g;
  const attr = (tag, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

  /**
   * The quantity every box on a page shipped at, by id.
   *
   * A figure that a box multiplies has to be re-derived at the quantity the
   * BUILD rendered it at, which is the box's `value` attribute -- one on a melt
   * page, none on the silver melt price calculator, and the same lookup spot-dom.ts
   * does in the browser. Assuming one here would pass a calculator whose
   * figures and boxes disagreed the instant the page loaded.
   */
  const shippedQuantities = (html) => {
    const out = new Map();
    for (const [, tag] of html.matchAll(/<input\b([^>]*)>/g)) {
      const id = /\bid="([^"]*)"/.exec(tag)?.[1];
      const value = /\bvalue="([^"]*)"/.exec(tag)?.[1];
      if (id && value !== undefined && value !== '') out.set(id, Number(value));
    }
    return out;
  };

  let checked = 0;
  for (const page of htmlFiles()) {
    const html = read(page);
    const boxes = shippedQuantities(html);
    for (const [, tag, text] of html.matchAll(MARKED)) {
      const kind = attr(tag, 'data-spot');
      // The ladder is a shape rather than a string, and is rebuilt wholesale
      // rather than rewritten in place.
      if (kind === 'ladder') continue;
      const qty = /\bdata-spot-qty\b/.test(tag);
      const box = attr(tag, 'data-spot-qty');
      const expected = spotFigureText(
        {
          kind,
          metal: attr(tag, 'data-spot-metal'),
          ozt: attr(tag, 'data-spot-ozt'),
          sum: attr(tag, 'data-spot-sum'),
          suffix: attr(tag, 'data-spot-suffix'),
          qty,
        },
        REFERENCE_SPOT,
        qty ? (boxes.get(box === undefined ? 'calc-count' : box) ?? 1) : 1,
      );
      assert.ok(
        expected !== undefined,
        `${page} has a marked figure the browser cannot rebuild: <${tag.trim()}>`,
      );
      assert.equal(
        decode(text),
        expected,
        `${page} printed "${decode(text)}" where its own attributes say "${expected}"`,
      );
      checked += 1;
    }
  }
  assert.ok(checked > 50, `only ${checked} marked figures were checked -- did the markup change shape?`);
});

test('the ladder the build writes is the ladder the browser rewrites', () => {
  // renderLadder() in src/lib/spot-dom.ts replaces this <tbody> wholesale when
  // a new price lands, because a new spot price moves the rungs as well as the
  // ratios. The two must produce the same rows or the table changes shape the
  // moment the endpoint answers. The client's version cannot be run here --
  // there is no DOM -- so what is pinned is the server's, cell by cell,
  // against the same spotLadder() the client calls.
  let ladders = 0;
  for (const group of meltGroups()) {
    const html = read(`${meltGroupPath(group.slug).slice(1)}/index.html`);
    for (const metal of meltGroupMetals(group.slug)) {
      const body = new RegExp(
        `<tbody data-spot="ladder" data-spot-metal="${metal}"[^>]*>([\\s\\S]*?)</tbody>`,
      ).exec(html);
      assert.ok(body, `${meltGroupPath(group.slug)} has no marked ${metal} ladder`);

      const rows = [...body[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, row]) =>
        [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(([, cell]) =>
          decode(cell.replace(/<[^>]*>/g, '')).trim(),
        ),
      );
      const spot = spotPrice(metal);
      assert.deepEqual(
        rows,
        spotLadder(metal).map((price) => [
          `${formatUsd(price)}/ozt${price === spot ? ' used above' : ''}`,
          `${(price / spot).toFixed(2)}×`,
        ]),
        `${meltGroupPath(group.slug)} renders a ${metal} ladder the browser would rebuild differently`,
      );
      ladders += 1;
    }
  }
  assert.ok(ladders > 0, 'no ladder was checked -- the block has moved or stopped rendering');
});

test('the spot endpoint is not a page, and no page links to it as one', () => {
  // /api/spot is a function, not part of the static build. If it ever appears
  // under dist/ something has started pre-rendering it, and a pre-rendered
  // price is the exact thing this whole arrangement exists to avoid: it would
  // be cached for a day like every other file in there.
  assert.ok(!existsSync(join(DIST, 'api')), 'dist/api exists -- the endpoint is being pre-rendered');
  assert.ok(
    !existsSync(join(DIST, 'api/spot/index.html')),
    'the spot endpoint was built as a page',
  );
});

test('every archive page renders the copy the generator wrote for it', () => {
  // The templates under /coin-info take every sentence from
  // src/lib/catalog-copy.ts, and the point of that is one place to change the
  // wording of hundreds of pages. A template that quietly stops reading the
  // module -- a heading typed back in, a description left behind after an edit
  // -- passes the type check, passes every unit test, and breaks exactly that.
  // So the built HTML is checked against the generator, page by page.

  const problems = [];
  for (const row of allArchiveCopy()) {
    const file = `${row.path.slice(1)}/index.html`;
    if (!existsSync(join(DIST, file))) {
      problems.push(`${row.path} was not built`);
      continue;
    }
    const html = decode(read(file));
    const expect = (what, text) => {
      if (text && !html.includes(text)) problems.push(`${row.path} is missing its ${what}: "${text}"`);
    };
    expect('H1', row.h1);
    expect('<title>', row.seoTitle);
    expect('meta description', row.description);
    expect('FAQ question', row.question);
    expect('opening answer', row.answer);
    row.intro.forEach((p, i) => expect(`paragraph ${i + 1}`, p));
    row.notes.forEach((p, i) => expect(`hand-written paragraph ${i + 1}`, p));
    row.headings.forEach((h, i) => expect(`heading ${i + 1}`, h));
  }
  assert.deepEqual(problems, [], `\n  - ${problems.join('\n  - ')}\n`);
});

test('every built page uses British spellings in its visible text', () => {
  // STYLE.md, enforced on the output rather than the source, because "British
  // spellings everywhere" means everywhere: page copy written straight into an
  // .astro file never passes through the catalogue registries, so the
  // source-level check in tests/style.test.mjs cannot see it.
  //
  // Scripts and styles are stripped first. `color` is a CSS property and
  // `license` is a Stripe field name; neither is prose, and neither is ours to
  // respell. What is left is what a reader actually sees.
  const AMERICAN = {
    color: 'colour', colors: 'colours', colored: 'coloured',
    gray: 'grey', catalog: 'catalogue', catalogs: 'catalogues',
    jewelry: 'jewellery', defense: 'defence', meter: 'metre', meters: 'metres',
    liter: 'litre', fiber: 'fibre', mold: 'mould', plow: 'plough',
    labeled: 'labelled', labeling: 'labelling', traveled: 'travelled',
    modeling: 'modelling', canceled: 'cancelled',
    analyze: 'analyse', analyzed: 'analysed',
    recognize: 'recognise', recognized: 'recognised',
    organize: 'organise', organized: 'organised',
    penalize: 'penalise', penalized: 'penalised',
    minimize: 'minimise', minimized: 'minimised',
    skeptical: 'sceptical',
  };

  const visibleText = (html) =>
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;|&#\d+;/gi, ' ')
      .toLowerCase();

  const problems = [];
  for (const page of htmlFiles()) {
    const text = visibleText(read(page));
    for (const [american, british] of Object.entries(AMERICAN)) {
      if (new RegExp(`\\b${american}\\b`).test(text)) {
        problems.push(`${page}: "${american}" should be "${british}"`);
      }
    }
  }
  assert.deepEqual(problems, [], `\n  - ${problems.join('\n  - ')}\n`);
});

test('every cheat sheet was built, and the section links both ways', () => {
  // Orphan and dead-end. The hub is the only page above a sheet.
  const hub = read(`${CHEAT_SHEETS_ROOT.slice(1)}/index.html`);
  assert.ok(hub.includes(`>${CHEAT_SHEETS_H1}<`), `${CHEAT_SHEETS_ROOT} does not print its own H1`);

  for (const sheet of CHEAT_SHEETS) {
    const path = cheatSheetPath(sheet);
    const file = `${path.slice(1)}/index.html`;
    assert.ok(existsSync(join(DIST, file)), `${path} was not built`);
    // The hub sends a reader only to a sheet that is written AND checked; an
    // unchecked one is built, noindex and linked from nowhere, so both
    // directions are asserted -- a hub linking one is the failure too.
    assert.equal(
      hub.includes(`href="${path}"`),
      cheatSheetIndexable(sheet),
      cheatSheetIndexable(sheet)
        ? `${CHEAT_SHEETS_ROOT} does not link to ${path}`
        : `${CHEAT_SHEETS_ROOT} links to ${path}, which is not indexable`,
    );

    const html = read(file);
    assert.ok(
      html.includes(`href="${CHEAT_SHEETS_ROOT}"`),
      `${path} does not link back to ${CHEAT_SHEETS_ROOT}`,
    );
    assert.ok(html.includes(`<title>${cheatSheetTitle(sheet)}`), `${path} did not ship its generated title`);
    assert.ok(
      html.includes(`content="${cheatSheetDescription(sheet)}"`),
      `${path} did not ship its generated description`,
    );
    assert.ok(html.includes(`>${cheatSheetH1(sheet)}<`), `${path} did not ship its generated H1`);
  }
});

test('a cheat sheet that is not written says so, and is kept out of the index', () => {
  // The concession that lets ten empty URLs exist: noindex, out of the
  // sitemap, and it says so on its face. Take one away and the section is ten
  // thin pages.
  //
  // The noindex assertion is not load-bearing yet -- while DISCOVERABLE is
  // false every page is noindex anyway. The sitemap and wording halves were
  // verified by mutation; this one starts proving something at launch.
  const sitemap = existsSync(join(DIST, 'sitemap-0.xml')) ? read('sitemap-0.xml') : '';
  for (const sheet of CHEAT_SHEETS) {
    const path = cheatSheetPath(sheet);
    const html = read(`${path.slice(1)}/index.html`);
    assert.equal(
      html.includes('is not written yet'),
      !sheet.written,
      `${path}: the stub wording and the registry's \`written\` flag disagree`,
    );

    if (!cheatSheetIndexable(sheet)) {
      assert.ok(
        html.includes('name="robots" content="noindex'),
        `${path} is not indexable but is not noindex`,
      );
      assert.ok(
        !sitemap.includes(`<loc>${SITE.url}${path}</loc>`),
        `${path} is not indexable but is listed in the sitemap`,
      );
    } else {
      assert.ok(
        sitemap === '' || sitemap.includes(`<loc>${SITE.url}${path}</loc>`),
        `${path} is indexable but missing from the sitemap`,
      );
    }
  }
});

test('a cheat sheet states no price and does not restate the series page', () => {
  // No price: settled a century ago, true for a week. And no section for the
  // run, the designer or the metal eras -- those are the series page's, and a
  // sheet that grows them has become it.
  // Headings and column headers only: a sheet may name an edge in a caution,
  // it may not grow a section for one.
  const FORBIDDEN = [
    /\bdesigner\b/, /\bobverse\b/, /\breverse\b/, /\bmetal era/,
    /\bat a glance\b/, /\bmint marks?\b/, /\bcomposition\b/,
  ];
  for (const sheet of CHEAT_SHEETS) {
    const path = cheatSheetPath(sheet);
    const html = read(`${path.slice(1)}/index.html`);
    const body = html.slice(html.indexOf('<body'));
    const text = body
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    assert.ok(!/[$\u00a3\u20ac]\s?\d/.test(text), `${path} states a price`);

    const headings = [...body.matchAll(/<(h[23]|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) =>
      m[2].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ').trim().toLowerCase(),
    );
    for (const heading of headings) {
      for (const pattern of FORBIDDEN) {
        assert.ok(
          !pattern.test(heading),
          `${path} has a heading "${heading}" matching ${pattern}, which belongs on the series page`,
        );
      }
    }
  }
});

test('a cheat sheet prints its notes, and they stay inside their cap', () => {
  // The notes are the one place a sheet may state a composition, so the rule
  // that keeps them from becoming the series page is the cap, and the cap is
  // only worth anything if the lines really ship. A note silently dropped by
  // a template change is a sheet that has stopped answering "which of these
  // are silver", which is the question a jar-sorter asks first.
  for (const sheet of CHEAT_SHEETS) {
    const notes = sheet.notes ?? [];
    if (notes.length === 0) continue;
    const path = cheatSheetPath(sheet);
    const html = read(`${path.slice(1)}/index.html`);
    assert.ok(html.includes('>Notes<'), `${path} has notes but no Notes heading`);
    assert.ok(notes.length <= 3, `${path} has ${notes.length} notes`);
    for (const note of notes) {
      const escaped = note.replace(/&/g, '&#38;').replace(/</g, '&#60;');
      assert.ok(
        html.includes(note) || html.includes(escaped),
        `${path} did not ship the note "${note.slice(0, 40)}..."`,
      );
    }
  }
});

test('a heading that gives up its margin has it re-homed on the row', () => {
  // `.heading-row` is a flex row holding an h2 and the print button. The h2
  // has to drop its bottom margin to share a baseline with the button, so the
  // row has to carry that margin instead -- and when it did not, the two
  // error tables sat flush against their own headings. The date table hid it,
  // because a line of copy follows that heading and supplies its own spacing,
  // which is why this is worth pinning rather than leaving to the eye.
  const sheet = CHEAT_SHEETS.find((s) => s.written);
  const css = read(`${cheatSheetPath(sheet).slice(1)}/index.html`).replace(/\s+/g, '');
  if (!css.includes('.heading-rowh2{margin-bottom:0')) return;
  const row = /\.heading-row\{([^}]*)\}/.exec(css);
  assert.ok(row, 'the h2 gives up its margin but there is no .heading-row rule to carry it');
  const declared = /margin-bottom:([^;}]+)/.exec(row[1]);
  assert.ok(
    declared && !/^0[a-z]*$/.test(declared[1]),
    '.heading-row h2 zeroes its bottom margin but .heading-row sets none, so a table butts against the heading',
  );
});

test('the cheat-sheet hub carries no FAQPage markup', () => {
  // It answers nothing itself: CollectionPage over an ItemList, the shape the
  // question topics use.
  const hub = read(`${CHEAT_SHEETS_ROOT.slice(1)}/index.html`);
  assert.ok(!hub.includes('"@type":"FAQPage"'), `${CHEAT_SHEETS_ROOT} carries FAQPage markup`);
  assert.ok(hub.includes('"@type":"ItemList"'), `${CHEAT_SHEETS_ROOT} carries no ItemList`);
  for (const sheet of CHEAT_SHEETS.filter(cheatSheetIndexable)) {
    assert.ok(
      hub.includes(cheatSheetTeaser(sheet)),
      `${CHEAT_SHEETS_ROOT} does not ship the generated teaser for ${sheet.slug}`,
    );
  }
});

/** The calculators, as the pair of (page, rows) every check below runs over. */
const CALCULATORS = [
  { slug: 'silver-melt-price', rows: SILVER_COINS, metal: 'silver' },
  { slug: 'gold-melt-price', rows: GOLD_COINS, metal: 'gold' },
];

test('every melt calculator ships a box per coin, and one total over all of them', () => {
  // The page is a form whose every figure the browser recomputes, so the two
  // silent failures are a row whose box is not wired to it -- it looks like a
  // number and never moves -- and a total that is not the rows added up. The
  // attribute contract is what spot-dom.ts reads, and tests/spot-dom.test.mjs
  // runs the browser half against this same HTML.
  for (const { slug, rows, metal } of CALCULATORS) {
  const page = `tools/coin-calculators/${slug}/index.html`;
  assert.ok(existsSync(join(DIST, page)), `${CALCULATORS_ROOT}/${slug} was not built`);
  const html = read(page);

  for (const coin of rows) {
    const id = rowQtyId(coin);
    assert.ok(html.includes(`id="${id}"`), `${coin.slug} has no quantity box`);
    // Shipped empty: a reader has three kinds of coin in a jar, not one of
    // everything. The total below is worked at the same quantity, and
    // spot-dom.ts falls back to this attribute when a box is cleared -- so a
    // box shipped at anything else silently changes all three.
    assert.match(
      html,
      new RegExp(`id="${id}"[^>]*value="0"|value="0"[^>]*id="${id}"`),
      `${coin.slug}'s box does not ship at none`,
    );
    assert.ok(html.includes(`for="${id}"`), `${coin.slug}'s box has no label`);
    assert.match(
      html,
      new RegExp(`data-spot-qty="${id}"[^>]*data-spot-lot="|data-spot-lot="[^"]*"[^>]*data-spot-qty="${id}"`),
      `${coin.slug}'s figure is not driven by its own box, or is not in the total`,
    );
    // The row states the coin's own weight, derived rather than typed.
    assert.ok(
      html.includes(`data-spot-ozt="${rowOzt(coin)}"`),
      `${coin.slug} does not ship its derived silver content`,
    );
  }

  // One total, marked as the sum of the lot, carrying the one-of-each figure
  // the build worked out. The check above that re-derives every marked figure
  // from its own attributes covers the arithmetic; this covers the wiring.
  const total = /<p[^>]*id="lot-total"([^>]*)>/.exec(html);
  assert.ok(total, `${CALCULATORS_ROOT}/${slug} has no total`);
  assert.match(total[1], /data-spot="sum"/, 'the total is not marked as a sum');
  assert.match(total[1], /data-spot-lot-total="/, 'the total is not the total of a lot');
  assert.ok(
    total[1].includes(`data-spot-sum="${rowsSumAttr(rows, 0)}"`),
    'the total does not agree with the quantities the boxes shipped at',
  );

  // Every quantity is zero, so the reference figure -- what ONE of each coin's
  // silver is worth -- has to be somewhere on the row, or the page is a table
  // of zeros to a crawler and to a reader with no JavaScript.
  const eachFigures = [...html.matchAll(/<p class="lot-each"([^>]*)>([^<]*)</g)];
  assert.equal(
    eachFigures.length,
    rows.length,
    'the melt value of one coin is not a column on every row',
  );
  for (const [i, coin] of rows.entries()) {
    const [, tag, text] = eachFigures[i];
    assert.equal(
      text,
      formatUsd(meltValue(rowOzt(coin), metal)),
      `${coin.slug} does not state what one of them is worth`,
    );
    // It is the melt value of ONE, so the box must not touch it. A figure in
    // this column that moved with the quantity would be the line total twice.
    assert.ok(!/data-spot-qty/.test(tag), `${coin.slug}'s per-coin figure is driven by the box`);
  }
  assert.match(total[1], /aria-live="polite"/, 'the total changes silently for a screen reader');

  // A jar is not one coin: the page must carry as many boxes as it has rows,
  // and no stray one.
  const boxes = [...html.matchAll(/<input[^>]*type="number"/g)].length;
  assert.equal(boxes, rows.length, 'the number of boxes is not the number of coins');
  }
});

test('the calculator hub and its calculators link to each other', () => {
  const hub = read(`${CALCULATORS_ROOT.slice(1)}/index.html`);
  for (const { slug } of CALCULATORS) {
    const page = read(`${CALCULATORS_ROOT.slice(1)}/${slug}/index.html`);
    assert.ok(
      hub.includes(`href="${CALCULATORS_ROOT}/${slug}"`),
      `${CALCULATORS_ROOT} does not link to ${slug}, which it holds`,
    );
    assert.ok(
      page.includes(`href="${CALCULATORS_ROOT}"`),
      `${CALCULATORS_ROOT}/${slug} does not link back to its hub`,
    );
  }
  // The hub states no figure. A hub that shows a number is a hub competing
  // with the page that owns it.
  assert.ok(!/\$\d/.test(hub.slice(hub.indexOf('<body'))), `${CALCULATORS_ROOT} states a figure`);
});

test('the dev workbench is not in the build', () => {
  // /dev is the inspector: it reads the whole catalogue, links to every page
  // and describes the switches that are off. It is served by `astro dev` and
  // by nothing else, guarded by one line in getStaticPaths() -- which is
  // exactly why it is worth checking that the line still works.
  assert.ok(!existsSync(join(DIST, 'dev')), 'dist/dev exists: the /dev guard is not holding');

  const sitemap = read('sitemap-0.xml');
  assert.ok(!sitemap.includes('/dev'), 'the sitemap lists a /dev URL');

  // And nothing that does ship points at it. A dead internal link on the live
  // site is the other half of the same mistake.
  for (const page of htmlFiles()) {
    assert.ok(!/href="\/dev(\/|")/.test(read(page)), `${page} links to the dev workbench`);
  }
});

test('_redirects carries no rule the host would truncate or loop on', () => {
  /*
   * THIS USED TO ASSERT THE OPPOSITE -- that rules were generated, one per
   * route. There were 22,638 of them in a 2.4 MB file, and that file could not
   * work on either host it was written for:
   *
   *   - Cloudflare Pages caps `_redirects` at 2,000 static rules and silently
   *     drops the rest, so the behaviour would have been the first two
   *     thousand routes alphabetically.
   *   - Netlify normalises the trailing slash BEFORE redirect rules run, so
   *     every rule was a no-op there.
   *
   * Vercel, the deploy target, does the job with `"trailingSlash": false` in
   * vercel.json. The reasoning in full is over `trailingSlashRedirects()` in
   * astro.config.mjs, including why the one-splat-rule version cannot be
   * written: neither host allows a splat anywhere but the end of a path.
   *
   * What is checked now is that nothing has crept back in over the cap, and
   * that the root is not redirecting to itself -- the loop the old enumerated
   * list existed to make impossible, and the one a splat rule would introduce.
   */
  const redirects = read('_redirects');
  const rules = redirects
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  assert.ok(
    rules.length <= 2000,
    `dist/_redirects has ${rules.length} rules; Cloudflare Pages caps the file at 2,000 and drops the rest`,
  );
  assert.ok(!/^\/\s+\/\s+30[18]/m.test(redirects), 'the root must not redirect to itself');
  for (const rule of rules) {
    const [from] = rule.split(/\s+/);
    assert.ok(
      !/\*.+/.test(from),
      `${rule}: neither Netlify nor Cloudflare Pages supports a splat before the end of a path`,
    );
  }
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
  for (const f of ['logo.png', 'og/default.png', 'apple-touch-icon.png', 'favicon.ico']) {
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
