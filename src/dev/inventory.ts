/**
 * The site, described to itself. Development only -- nothing here ships.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 *
 * The catalogue generates pages. One coin brings a coin page, a melt page and
 * up to six archives into existence, and the only places that knowledge lived
 * were the route files and the head of whoever wrote them. This module states
 * it once, from the registries the pages are actually built from, so the
 * answer to "what exists, and what did that coin just create" is a page you
 * can open rather than a build you have to read.
 *
 * ---------------------------------------------------------------------------
 * THE RULE THIS MODULE LIVES BY
 * ---------------------------------------------------------------------------
 *
 * `src/dev/` is never imported by a page that ships. The dev routes are in
 * `src/pages/dev/[...tool].astro`, whose `getStaticPaths()` returns nothing
 * outside `astro dev`, so `npm run build` emits no /dev URL at all --
 * `tests/build-smoke.test.mjs` fails if one ever appears in `dist/`.
 *
 * It also states no fact of its own. Every path, name and date below is read
 * from the same registry the page reads, and the per-page title, description,
 * H1 and JSON-LD are fetched from the running dev server rather than
 * described here. A copy of the site's facts that could disagree with the
 * site is worse than no copy: it would be believed.
 */
import {
  COINS,
  GROUPS,
  TYPES,
  TAGS,
  COIN_VALUE_ROOT,
  coinPath,
  groupPath,
  typePath,
  tagPath,
  groupBySlug,
  typeBySlug,
  tagBySlug,
  coinsInGroup,
  coinsInGroupType,
  coinsWithTag,
  populatedGroups,
  populatedPairs,
  populatedTags,
  documentedSeries,
  yearLabel,
  coinQuestion,
  GRADED_PAGES_AVAILABLE,
  type Coin,
} from '../data/coins';
import {
  MELT_ROOT,
  MELT_TAGGED_ROOT,
  meltPath,
  meltCoins,
  meltGroups,
  meltGroupPath,
  meltGroupH1,
  meltGroupQuestion,
  meltCoinsInGroup,
  meltPairs,
  meltTypePath,
  meltPairH1,
  meltPairQuestion,
  meltCoinsInGroupType,
  meltTags,
  meltTagPath,
  meltTagH1,
  meltTagQuestion,
  meltCoinsWithTag,
  meltQuestion,
  METAL_SLUGS,
} from '../lib/melt';
import { QUESTIONS, QUESTIONS_ROOT, questionPath } from '../data/questions';
import { coinMetal, METAL_LABEL } from '../lib/spot';
import { groupH1, groupQuestion, tagH1, tagQuestion } from '../lib/catalog-copy';
import { DISCOVERABLE, HOME_PLACEHOLDER } from '../lib/site';

/* ===========================================================================
   Routes
   =========================================================================== */

export interface RouteEntry {
  /** The URL as the site serves it, no trailing slash. */
  path: string;
  /** What the page is, in the words of the registry behind it. */
  label: string;
  /** The file that renders it, relative to the repo root. */
  template: string;
  /** Whether a person made this URL or a registry entry did. */
  kind: 'static' | 'generated';
  /** The FAQ question this page owns, when it owns one. */
  question?: string;
  /** How many catalogue entries stand behind it. Archives only. */
  count?: number;
  /** True for a route that answers with something other than HTML. */
  text?: boolean;
}

export interface RouteSection {
  title: string;
  blurb: string;
  routes: RouteEntry[];
}

const COIN_TEMPLATE = 'src/pages/coin-value/[group]/[type]/[coin].astro';
const MELT_COIN_TEMPLATE = 'src/pages/melt-value/[group]/[type]/[coin].astro';

/** Every URL the site builds today, grouped the way a person would look for one. */
export function routeSections(): RouteSection[] {
  return [
    {
      title: 'Core',
      blurb:
        'Hand-written pages. Each one is a file, and the file is the only place it exists.',
      routes: [
        entry('/', 'Home', 'src/pages/index.astro', 'static'),
        entry('/contact', 'Contact', 'src/pages/contact.astro', 'static'),
        entry('/privacy', 'Privacy', 'src/pages/privacy.astro', 'static'),
        entry('/404', 'Not found', 'src/pages/404.astro', 'static'),
      ],
    },
    {
      title: 'Catalogue',
      blurb:
        'Two axes in the path — composition, then denomination — and everything else a tag. Every page here is generated from src/data/, and an archive with no coins in it has no URL.',
      routes: [
        entry(COIN_VALUE_ROOT, 'The catalogue hub', 'src/pages/coin-value/index.astro', 'static', {
          count: COINS.length,
        }),
        ...populatedGroups().map((g) =>
          entry(groupPath(g.slug), groupH1(g), 'src/pages/coin-value/[group]/index.astro', 'generated', {
            question: groupQuestion(g),
            count: coinsInGroup(g.slug).length,
          }),
        ),
        ...populatedPairs().map(({ group, type }) =>
          entry(
            typePath(group.slug, type.slug),
            `${group.name} ${type.namePlural}`,
            'src/pages/coin-value/[group]/[type]/index.astro',
            'generated',
            { count: coinsInGroupType(group.slug, type.slug).length },
          ),
        ),
        ...COINS.map((c) =>
          entry(coinPath(c), c.name, COIN_TEMPLATE, 'generated', { question: coinQuestion(c) }),
        ),
        entry(
          `${COIN_VALUE_ROOT}/tagged`,
          'The topic index',
          'src/pages/coin-value/tagged/index.astro',
          'static',
          { count: populatedTags().length },
        ),
        ...populatedTags().map((t) =>
          entry(tagPath(t.slug), tagH1(t), 'src/pages/coin-value/tagged/[tag].astro', 'generated', {
            question: tagQuestion(t),
            count: coinsWithTag(t.slug).length,
          }),
        ),
      ],
    },
    {
      title: 'Melt values',
      blurb:
        'The catalogue tree, segment for segment, answering the metal question instead of the coin question. Every archive here has a twin under /coin-value at the same path, and validateMeltPaths() fails the build if the two stop matching.',
      routes: [
        entry(MELT_ROOT, 'The melt hub', 'src/pages/melt-value/index.astro', 'static', {
          count: meltCoins().length,
        }),
        ...meltGroups().map((g) =>
          entry(
            meltGroupPath(g.slug),
            meltGroupH1(g),
            'src/pages/melt-value/[group]/index.astro',
            'generated',
            { question: meltGroupQuestion(g), count: meltCoinsInGroup(g.slug).length },
          ),
        ),
        ...meltPairs().map(({ group, type }) =>
          entry(
            meltTypePath(group.slug, type.slug),
            meltPairH1(group, type),
            'src/pages/melt-value/[group]/[type]/index.astro',
            'generated',
            {
              question: meltPairQuestion(group, type),
              count: meltCoinsInGroupType(group.slug, type.slug).length,
            },
          ),
        ),
        ...meltCoins().map((c) =>
          entry(meltPath(c), `${c.name} melt value`, MELT_COIN_TEMPLATE, 'generated', {
            question: meltQuestion(c),
          }),
        ),
        entry(
          MELT_TAGGED_ROOT,
          'The melt topic index',
          'src/pages/melt-value/tagged/index.astro',
          'static',
          { count: meltTags().length },
        ),
        ...meltTags().map((t) =>
          entry(meltTagPath(t.slug), meltTagH1(t), 'src/pages/melt-value/tagged/[tag].astro', 'generated', {
            question: meltTagQuestion(t),
            count: meltCoinsWithTag(t.slug).length,
          }),
        ),
      ],
    },
    {
      title: 'Common questions',
      blurb:
        'Written one at a time, never generated. A question whose answer depends on which coin the reader is holding belongs in the catalogue instead.',
      routes: [
        entry(QUESTIONS_ROOT, 'The question index', 'src/pages/common-questions/index.astro', 'static', {
          count: QUESTIONS.length,
        }),
        ...QUESTIONS.map((q) =>
          entry(questionPath(q), q.question, 'src/pages/common-questions/[slug].astro', 'generated', {
            question: q.question,
          }),
        ),
      ],
    },
    {
      title: 'For machines',
      blurb:
        'Not HTML, and not in the page inspector below for that reason — these open in a new tab instead.',
      routes: [
        entry('/llms.txt', 'The short brief', 'src/pages/llms.txt.ts', 'static', { text: true }),
        entry('/llms-full.txt', 'The full brief', 'src/pages/llms-full.txt.ts', 'static', { text: true }),
        entry('/robots.txt', 'Crawl rules', 'src/pages/robots.txt.ts', 'static', { text: true }),
        entry('/sitemap-index.xml', 'Sitemap (built, not in dev)', '@astrojs/sitemap', 'generated', {
          text: true,
        }),
      ],
    },
  ];
}

function entry(
  path: string,
  label: string,
  template: string,
  kind: RouteEntry['kind'],
  extra: Partial<RouteEntry> = {},
): RouteEntry {
  return { path, label, template, kind, ...extra };
}

export const allRoutes = (): RouteEntry[] => routeSections().flatMap((s) => s.routes);

/* ---------------------------------------------------------------------------
   Routes that exist in the repo but not in the build
   --------------------------------------------------------------------------- */

export interface ParkedRoute {
  /** Where it would live. */
  path: string;
  what: string;
  /** The file, and what has to be true for it to be routed. */
  file: string;
  unlockedBy: string;
}

/**
 * The pages that are written, or half-written, and deliberately not served.
 *
 * They are on the inspector because a parked page is the thing most likely to
 * be forgotten and then rediscovered as a surprise. An underscore prefix
 * makes Astro skip a file; a false flag makes a template refuse to link.
 */
export function parkedRoutes(): ParkedRoute[] {
  return [
    {
      path: '/pricing',
      what: 'The pricing page, written against src/lib/pricing.ts',
      file: 'src/pages/_pricing.astro',
      unlockedBy: 'Deciding what is sold (SPEC.md), then renaming the file and flipping the *_AVAILABLE flag behind it',
    },
    {
      path: '/checkout-complete',
      what: 'The Stripe return page',
      file: 'src/pages/_checkout-complete.astro',
      unlockedBy: 'The same decision. Nothing is sold, so nothing returns from checkout',
    },
    {
      path: `${COIN_VALUE_ROOT}/graded/<series>`,
      what: `Graded price tables, one per series (${documentedSeries().length} documented series today)`,
      file: 'not written — gradedPath() in src/data/coins.ts reserves the URL',
      unlockedBy: 'GRADED_PAGES_AVAILABLE in src/data/coins.ts, which is false and must stay false until there are sourced prices',
    },
  ];
}

/* ===========================================================================
   What one coin creates
   =========================================================================== */

export interface FootprintRow {
  path: string;
  what: string;
  /**
   * 'new' -- this URL exists because of this coin and would vanish without it.
   * 'shared' -- it already existed; this coin is one more entry on it.
   */
  state: 'new' | 'shared';
  detail: string;
}

/**
 * Every page a coin is responsible for, and whether it created that page or
 * merely joined it.
 *
 * Computed by asking what would be left if the coin were removed, which is
 * the same question as "did this coin bring a URL into existence". An archive
 * with one coin on it is that coin's page in everything but name: delete the
 * coin and the URL 404s.
 */
export function coinFootprint(coin: Coin): FootprintRow[] {
  const rows: FootprintRow[] = [];
  const only = (n: number) => (n <= 1 ? 'new' : 'shared') as FootprintRow['state'];

  rows.push({
    path: coinPath(coin),
    what: 'Its own catalogue page',
    state: 'new',
    detail: 'The page. Group and denomination are in the path and can never be revised.',
  });
  rows.push({
    path: meltPath(coin),
    what: 'Its melt page',
    state: 'new',
    detail: coinMetal(coin)
      ? 'The metal question, with the arithmetic and the quantity input.'
      : 'Generated even with no precious metal in it — the page says so, which is a real answer to a real search.',
  });

  const group = groupBySlug(coin.group);
  const inGroup = coinsInGroup(coin.group).length;
  if (group) {
    rows.push({
      path: groupPath(group.slug),
      what: `The ${group.name.toLowerCase()} archive`,
      state: only(inGroup),
      detail: `${inGroup} coin${inGroup === 1 ? '' : 's'} in this composition group.`,
    });
  }

  const type = typeBySlug(coin.type);
  const inPair = coinsInGroupType(coin.group, coin.type).length;
  if (group && type) {
    rows.push({
      path: typePath(group.slug, type.slug),
      what: `${group.name} ${type.namePlural}`,
      state: only(inPair),
      detail: `${inPair} coin${inPair === 1 ? '' : 's'} at this composition and denomination.`,
    });
  }

  for (const slug of coin.tags) {
    const tag = tagBySlug(slug);
    if (!tag) continue;
    const n = coinsWithTag(slug).length;
    rows.push({
      path: tagPath(slug),
      what: `${tag.name} (${tag.kind} tag)`,
      state: only(n),
      detail: `${n} coin${n === 1 ? '' : 's'} carry this tag.`,
    });
  }

  // The melt twins. Every archive above has one at the same path under
  // /melt-value, populated by the same coins, so a coin that created a
  // catalogue archive created its melt archive in the same move.
  if (group) {
    const n = meltCoinsInGroup(group.slug).length;
    rows.push({
      path: meltGroupPath(group.slug),
      what: `The ${group.name.toLowerCase()} melt archive`,
      state: only(n),
      detail: `${n} coin${n === 1 ? '' : 's'}, listed richest first.`,
    });
  }
  if (group && type) {
    const n = meltCoinsInGroupType(group.slug, type.slug).length;
    rows.push({
      path: meltTypePath(group.slug, type.slug),
      what: `${group.name} ${type.namePlural} melt values`,
      state: only(n),
      detail: `${n} coin${n === 1 ? '' : 's'} at this composition and denomination.`,
    });
  }
  for (const slug of coin.tags) {
    const tag = tagBySlug(slug);
    if (!tag) continue;
    const n = meltCoinsWithTag(slug).length;
    rows.push({
      path: meltTagPath(slug),
      what: `${tag.name} melt values`,
      state: only(n),
      detail: `${n} coin${n === 1 ? '' : 's'} carry this tag.`,
    });
  }

  rows.push({
    path: COIN_VALUE_ROOT,
    what: 'The catalogue hub',
    state: 'shared',
    detail: 'Lists populated groups, and re-dates itself when any coin changes.',
  });
  rows.push({
    path: `${COIN_VALUE_ROOT}/tagged`,
    what: 'The topic index',
    state: 'shared',
    detail: 'Lists populated tags only.',
  });
  rows.push({
    path: MELT_ROOT,
    what: 'The melt hub',
    state: 'shared',
    detail: 'The melt tree’s root. A coin changes its group tile’s count and total, and adds a tile of its own.',
  });
  rows.push({
    path: MELT_TAGGED_ROOT,
    what: 'The melt topic index',
    state: 'shared',
    detail: 'Lists populated tags only, with what the metal in each adds up to.',
  });

  return rows;
}

/** The FAQ questions one coin puts into the registry, which must all be unique. */
export function coinQuestions(coin: Coin): { question: string; path: string }[] {
  return [
    { question: coinQuestion(coin), path: coinPath(coin) },
    { question: meltQuestion(coin), path: meltPath(coin) },
  ];
}

/* ===========================================================================
   Is this entry finished?
   =========================================================================== */

export interface FieldRow {
  field: string;
  /** 'required' is enforced by the type or by validateTaxonomy(); the rest are judgement. */
  level: 'required' | 'expected' | 'optional';
  present: boolean;
  value: string;
  note: string;
}

const list = (xs: unknown[] | undefined) => (xs && xs.length ? `${xs.length}` : '');
const num = (n: number | undefined) => (n === undefined ? '' : String(n));

/**
 * One coin, field by field, against what the format expects rather than what
 * the type demands.
 *
 * The type already stops a build without a `bluf`. What it cannot see is an
 * entry with no `identify` steps, no mintage and no series facts, which
 * compiles perfectly and renders a page with three empty blocks. That is what
 * this table is for, and why `level` is a judgement rather than a copy of the
 * interface: 'expected' means the page is visibly poorer without it.
 */
export function coinFields(coin: Coin): FieldRow[] {
  const metal = coinMetal(coin);
  const series = coin.tags.map((t) => tagBySlug(t)).find((t) => t?.kind === 'series');
  return [
    row('slug', 'required', coin.slug, 'Never changed once published. The melt URL is this too.'),
    row('group', 'required', coin.group, 'Composition of THIS issue, not of its series.'),
    row('type', 'required', coin.type, 'Denomination or format.'),
    row('tags', 'required', coin.tags.join(', '), 'The series tag is required; country and theme tags are how it is found.'),
    row('name', 'required', coin.name, 'The H1 stem.'),
    row('shortName', 'optional', coin.shortName ?? '', 'Needed when `name` carries a year range — it is what goes in the FAQ sentence.'),
    row('seoTitle', 'required', coin.seoTitle, 'Keyword-led, under about 60 characters.'),
    row('bluf', 'required', coin.bluf, 'One sentence. Also the FAQPage answer, so it must stand alone.'),
    row('description', 'required', coin.description, 'The meta description.'),
    row('primaryKeyword', 'required', coin.primaryKeyword, 'The phrase a person types. Name them.'),
    row('secondaryKeywords', 'expected', coin.secondaryKeywords.join(', '), 'The variants. Not a keyword pile.'),
    row('years', 'required', yearLabel(coin), 'A single year, or a run when the year does not change the answer.'),
    row('mintMark', 'optional', coin.mintMark ?? '', 'Omit for Philadelphia issues that carry none.'),
    row('country', 'required', coin.country, 'Drives the country tag and the spec table.'),
    row('composition', 'required', coin.composition, 'As a person would read it off a spec sheet.'),
    row('faceValue', 'required', coin.faceValue, 'Text, in the issuing currency.'),
    row('silverOzt / goldOzt / platinumOzt', 'expected', metal ? `${metal.troyOunces} ozt ${metal.metal}` : '', 'The melt block and the metal page both come from this. Absent is a real answer: the melt page says so.'),
    row('weightGrams', 'expected', num(coin.weightGrams), 'Gross weight. Not the metal weight — the spec table shows both.'),
    row('diameterMm', 'expected', num(coin.diameterMm), 'Spec row.'),
    row('obverse', 'expected', coin.obverse ?? '', 'Per issue, never copied from the series.'),
    row('reverse', 'expected', coin.reverse ?? '', 'Per issue. A long series outlives its own artwork.'),
    row('struckAt', 'expected', list(coin.struckAt), 'The mints that struck THIS issue.'),
    row('mintage', 'expected', num(coin.mintage), 'Only when it is a published figure.'),
    row('commonality', 'required', coin.commonality, 'Drives the verdict line and the badge, which cannot then disagree.'),
    row('identify', 'required', list(coin.identify), 'The checklist, and the HowTo schema. An entry with none renders a heading over nothing.'),
    row('premiumIf', 'expected', list(coin.premiumIf), 'Lowercase noun phrases, no commas inside an item.'),
    row('sections', 'optional', list(coin.sections), 'Depth for the minority still reading. Zero is acceptable; restating a field is not.'),
    row('values', 'optional', list(coin.values), 'Leave empty unless a source can be named on the page. valueAsOf and sources become required with it.'),
    row('related', 'optional', list(coin.related), 'Sibling slugs, rendered as in-cluster links.'),
    row(
      'series facts',
      'expected',
      series?.series ? `${series.name} has SeriesInfo` : series ? `${series.name} has no SeriesInfo yet` : '',
      'Lives on the series TAG, not the coin. Without it the series block renders nothing.',
    ),
  ];
}

function row(field: string, level: FieldRow['level'], value: unknown, note: string): FieldRow {
  const text = value === undefined || value === null ? '' : String(value);
  return { field, level, present: text.trim().length > 0, value: text, note };
}

/** The fields a page will visibly miss, for the one-line summary on a card. */
export const coinGaps = (coin: Coin): FieldRow[] =>
  coinFields(coin).filter((f) => !f.present && f.level !== 'optional');

/* ===========================================================================
   The taxonomy, and what is waiting on a coin
   =========================================================================== */

export interface TaxonomyRow {
  slug: string;
  name: string;
  kind: string;
  count: number;
  path: string;
  /** False means the entry is written and the archive is not built yet. */
  live: boolean;
}

export function taxonomyRows(): { title: string; blurb: string; rows: TaxonomyRow[] }[] {
  return [
    {
      title: 'Composition groups',
      blurb:
        'The first path segment. Hand-written in src/data/coin-taxonomy.ts; an empty one has no URL until a coin lands in it.',
      rows: GROUPS.map((g) => ({
        slug: g.slug,
        name: g.name,
        kind: g.meltDriven ? 'melt-driven' : 'premium-driven',
        count: coinsInGroup(g.slug).length,
        path: groupPath(g.slug),
        live: coinsInGroup(g.slug).length > 0,
      })),
    },
    {
      title: 'Denominations and formats',
      blurb:
        'The second path segment. A denomination page exists per composition, so `quarter` can be live under silver and unbuilt under clad.',
      rows: TYPES.map((t) => ({
        slug: t.slug,
        name: t.namePlural,
        kind: 'type',
        count: COINS.filter((c) => c.type === t.slug).length,
        path: `${COIN_VALUE_ROOT}/<group>/${t.slug}`,
        live: COINS.some((c) => c.type === t.slug),
      })),
    },
    {
      title: 'Tags',
      blurb:
        'Everything that is not composition or denomination. A tag is a page the day a coin carries it, and the series tag is where SeriesInfo lives.',
      rows: TAGS.map((t) => ({
        slug: t.slug,
        name: t.name,
        kind: t.kind + (t.kind === 'series' && !t.series ? ' (no facts yet)' : ''),
        count: coinsWithTag(t.slug).length,
        path: tagPath(t.slug),
        live: coinsWithTag(t.slug).length > 0,
      })),
    },
    {
      title: 'Metals',
      blurb:
        'Priced in src/lib/spot.ts. A metal is not a URL — the melt tree is filed by composition group, like the catalogue — so this is what the figures are worked at, and which coins carry it.',
      rows: METAL_SLUGS.map((m) => {
        const n = COINS.filter((c) => coinMetal(c)?.metal === m).length;
        return {
          slug: m,
          name: METAL_LABEL[m],
          kind: 'metal',
          count: n,
          path: `${MELT_ROOT}/<group>`,
          live: n > 0,
        };
      }),
    },
  ];
}

/* ===========================================================================
   The state of the build itself
   =========================================================================== */

export interface FlagRow {
  name: string;
  value: string;
  where: string;
  effect: string;
}

/** The switches that decide what a build actually contains. */
export function flagRows(): FlagRow[] {
  return [
    {
      name: 'HOME_PLACEHOLDER',
      value: String(HOME_PLACEHOLDER),
      where: 'src/lib/site.ts',
      effect: 'True in every build: / serves a blank holding page. False in dev, which is why you can see the real home page here.',
    },
    {
      name: 'DISCOVERABLE',
      value: String(DISCOVERABLE),
      where: 'src/lib/site.ts',
      effect: 'False: every page ships noindex and robots.txt disallows everything. Flip on launch day, not before.',
    },
    {
      name: 'GRADED_PAGES_AVAILABLE',
      value: String(GRADED_PAGES_AVAILABLE),
      where: 'src/data/coins.ts',
      effect: 'False: the graded block renders dark and links nowhere. Needs sourced prices first.',
    },
  ];
}

export interface CountRow {
  what: string;
  n: number;
}

export function counts(): CountRow[] {
  return [
    { what: 'Coins', n: COINS.length },
    { what: 'URLs built', n: allRoutes().filter((r) => !r.text).length },
    { what: 'Composition groups live', n: populatedGroups().length },
    { what: 'Denomination archives live', n: populatedPairs().length },
    { what: 'Tags live', n: populatedTags().length },
    { what: 'Melt archives live', n: meltGroups().length + meltPairs().length + meltTags().length },
    { what: 'Metals priced in a coin', n: METAL_SLUGS.filter((m) => COINS.some((c) => coinMetal(c)?.metal === m)).length },
    { what: 'Common questions', n: QUESTIONS.length },
  ];
}

/** Re-exported so a dev view never reaches around this module into the registries. */
export { COINS };
