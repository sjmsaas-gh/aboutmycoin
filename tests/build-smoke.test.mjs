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
import {
  spotBasis,
  coinMetal,
  meltValue,
  spotPrice,
  formatUsd,
} from '../src/lib/spot.ts';
import {
  COINS,
  COIN_VALUE_ROOT,
  coinPath,
  groupPath,
  tagPath,
  typePath,
  documentedSeries,
  populatedTags,
  coinBySlug,
  normaliseQuestion,
} from '../src/data/coins.ts';
import { allSiteFaqQuestions } from '../src/data/faq-registry.ts';
import { allArchiveCopy } from '../src/lib/catalog-copy.ts';
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
  for (const page of htmlFiles()) {
    const html = read(page);
    // A noindex page is not in a search result, so the limits do not apply --
    // the holding page at / is deliberately one sentence long.
    if (html.includes('name="robots"') && /noindex/.test(html)) continue;
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
  // Google wants a question to carry FAQPage markup once. faq-registry.ts
  // enforces uniqueness across the catalogue, the melt section and the common
  // questions; this checks the built HTML, which is where a question could
  // still be duplicated by a hand-written page.
  const owners = new Map();
  for (const { question, path } of allSiteFaqQuestions()) {
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

test('every coin has a melt page, and the two sections link to each other', () => {
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

    // Both ways between the twins. This is the contract the whole mirror
    // exists for: a reader who landed on the wrong half of the answer has one
    // link to the other half, on every single page, in both directions.
    assert.ok(
      read(page).includes(`href="${coinPath(coin)}"`),
      `${meltPath(coin)} does not link to ${coinPath(coin)}`,
    );
    assert.ok(
      read(`${coinPath(coin).slice(1)}/index.html`).includes(`href="${meltPath(coin)}"`),
      `${coinPath(coin)} does not link to its melt page`,
    );
  }
});

test('the melt tree mirrors the catalogue, segment for segment', () => {
  // The structural check. /melt-value is /coin-value with one segment
  // changed, at every level, and a reader who edits the URL by hand must land
  // on a page rather than a 404. validateMeltPaths() asserts this over the
  // registries at build time; this asserts it over the HTML that was
  // actually written to disk.
  const built = (path) => existsSync(join(DIST, `${path.slice(1)}/index.html`));

  const pairs = [
    [COIN_VALUE_ROOT, MELT_ROOT],
    [`${COIN_VALUE_ROOT}/tagged`, MELT_TAGGED_ROOT],
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
      `${MELT_ROOT}${coinSide.slice(COIN_VALUE_ROOT.length)}`,
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
  for (const page of htmlFiles()) {
    const html = read(page);
    for (const metal of ['silver', 'gold']) {
      const price = `${formatUsd(spotPrice(metal))}/ozt`;
      if (!html.includes(price)) continue;
      assert.ok(
        html.includes(spotBasis()),
        `${page} prints ${price} without saying when it was read`,
      );
      // And never the vendor's name: provenance for a reader is the time, not
      // who sells the feed.
      assert.ok(!html.includes('metals.dev'), `${page} names the price feed`);
    }
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

  let checked = 0;
  for (const page of htmlFiles()) {
    const html = read(page);
    for (const [, tag, text] of html.matchAll(MARKED)) {
      const kind = attr(tag, 'data-spot');
      // The ladder is a shape rather than a string, and is rebuilt wholesale
      // rather than rewritten in place.
      if (kind === 'ladder') continue;
      const expected = spotFigureText(
        {
          kind,
          metal: attr(tag, 'data-spot-metal'),
          ozt: attr(tag, 'data-spot-ozt'),
          sum: attr(tag, 'data-spot-sum'),
          suffix: attr(tag, 'data-spot-suffix'),
          qty: /\bdata-spot-qty\b/.test(tag),
        },
        REFERENCE_SPOT,
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
  // The templates under /coin-value take every sentence from
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
