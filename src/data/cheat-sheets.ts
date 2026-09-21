/**
 * The cheat-sheet registry: /cheat-sheets and /cheat-sheets/<slug>.
 *
 * One page per series, and the page answers one question: which years and
 * mint marks of this series are worth a second look. It is the question
 * somebody with a jar of coins actually has, and it is not the question the
 * catalogue answers -- /coin-value/<group>/<type>/<coin> answers "what is
 * THIS coin worth", one issue at a time, and a reader sorting a roll has
 * forty issues in front of them and no idea which one to look up first.
 *
 * ---------------------------------------------------------------------------
 * THIS SECTION OVERLAPS THE SERIES TAG PAGE, AND THAT IS A DECISION
 * ---------------------------------------------------------------------------
 *
 * CLAUDE.md says the series page IS the series tag page, and that a second URL
 * for one subject is the site competing with itself. A cheat sheet for the
 * Washington quarter and /coin-value/tagged/washington-quarter are two URLs
 * about one series, so that rule is live here and has to be settled rather
 * than ignored. The settlement, which every page in this section has to hold
 * to:
 *
 *   - The series tag page owns the SERIES: the run, the designer, the metal
 *     eras, where the mint mark sits, and the coins filed under the tag. It
 *     carries a derived cheat sheet as its opening scan.
 *   - A page here owns the SORT: the reader is holding a handful of coins and
 *     wants to know which to set aside. Nothing but the checkable labels and
 *     how each one is settled.
 *   - Where a sheet covers a series that has a tag page, `seriesTag` links
 *     the two, both ways, and neither may repeat the other's sections. A
 *     sheet that grows a designer row or a metal-era table has become the tag
 *     page and should be deleted instead.
 *
 * If that line cannot be held in the writing, this section is the thing to
 * drop -- not the tag page. The tag page is load-bearing for the catalogue.
 *
 * ---------------------------------------------------------------------------
 * NOTHING HERE IS WRITTEN YET
 * ---------------------------------------------------------------------------
 *
 * Every entry below is `written: false`. A stub builds a page, says plainly
 * that the sheet is not written, and is `noindex` -- the one concession that
 * keeps ten empty URLs from being ten thin pages in the index. The house rule
 * is that a slug with no answer behind it is a published URL with nothing on
 * it, and ten of these are exactly that until somebody fills them. The flag
 * is the record of which ones still are.
 *
 * Filling one means setting `written: true` and adding the lists. The fields
 * for those lists do not exist yet on purpose: the shape of a cheat sheet is
 * already settled on the series tag page -- key dates, varieties, errors,
 * each sorted by how the reader settles it -- and the right move when the
 * first one is written is to reuse `KeyDate`, `Variety` and `CoinError` from
 * `coin-schema.ts` rather than to invent a second vocabulary for the same
 * three lists.
 *
 * ---------------------------------------------------------------------------
 * THE RULES
 * ---------------------------------------------------------------------------
 *
 * - **A slug is never changed once published.** No redirects in a static build.
 * - **The title, the description and the H1 are formulas, not fields.** Ten
 *   becomes forty, and a hand-typed <title> is one nobody measures against the
 *   suffix `Seo.astro` appends. Both are fitted by `src/lib/meta.ts`.
 * - **`seriesTag` throws on a tag this site does not register**, and on one
 *   that is not `kind: 'series'`. A link written in anticipation of a page is
 *   a 404 a static build ships in silence.
 * - **No price, anywhere in this file.** Which dates are scarce has been
 *   settled for a century; what they fetch is true for a week. Same rule as
 *   `SeriesInfo`, and the validator enforces it.
 * - **No count of the section, and no sentence about the section.** See
 *   CLAUDE.md, "Never count the catalogue".
 */
import { TAGS } from './coin-taxonomy';
import { DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_MAX, fit, titleCase } from '../lib/meta';

export interface CheatSheet {
  /** URL segment. Lowercase, hyphenated, and never changed once published. */
  slug: string;
  /**
   * The series as a reader names it, not as a catalogue does.
   *
   * "Wheat penny", not "Lincoln cent, wheat reverse". This is the phrase
   * somebody types with the coin in their hand, and it is the whole reason
   * this section is filed by series rather than by the catalogue's two axes.
   * Stored with its own capitalisation and never re-cased mid-sentence: every
   * one of these begins with a proper noun or a name the trade capitalises.
   */
  name: string;
  /** The run. `to` omitted means the series is still being struck. */
  years: { from: number; to?: number };
  /**
   * The `kind: 'series'` tag in `coin-taxonomy.ts` this sheet covers.
   *
   * Set it only when the tag is registered; validation throws otherwise. The
   * tag page and the sheet link to each other wherever both exist, and the
   * link is the thing that keeps them from being read as two attempts at one
   * page.
   */
  seriesTag?: string;
  /**
   * False until the lists are in. A stub page builds, admits it, and is
   * noindex. See the header.
   */
  written: boolean;
}

export const CHEAT_SHEETS_ROOT = '/cheat-sheets';

/**
 * The ten series a reader is most likely to be holding, in alphabetical
 * order, which is also the order the hub renders them in.
 *
 * Alphabetical rather than by how often each is asked about, unlike the
 * common questions: a reader arrives here having already identified the coin
 * in their hand and is looking that name up, so the index is a lookup table
 * and an editorial ordering would only make the name harder to find.
 */
export const CHEAT_SHEETS: CheatSheet[] = [
  { slug: 'buffalo-nickel', name: 'Buffalo nickel', years: { from: 1913, to: 1938 }, written: false },
  { slug: 'indian-head-penny', name: 'Indian Head penny', years: { from: 1859, to: 1909 }, written: false },
  { slug: 'jefferson-nickel', name: 'Jefferson nickel', years: { from: 1938 }, written: false },
  { slug: 'kennedy-half-dollar', name: 'Kennedy half dollar', years: { from: 1964 }, written: false },
  { slug: 'mercury-dime', name: 'Mercury dime', years: { from: 1916, to: 1945 }, seriesTag: 'mercury-dime', written: false },
  { slug: 'morgan-dollar', name: 'Morgan dollar', years: { from: 1878, to: 1921 }, seriesTag: 'morgan-dollar', written: false },
  { slug: 'peace-dollar', name: 'Peace dollar', years: { from: 1921, to: 1935 }, written: false },
  { slug: 'roosevelt-dime', name: 'Roosevelt dime', years: { from: 1946 }, written: false },
  { slug: 'washington-quarter', name: 'Washington quarter', years: { from: 1932 }, seriesTag: 'washington-quarter', written: false },
  { slug: 'wheat-penny', name: 'Wheat penny', years: { from: 1909, to: 1958 }, written: false },
];

/* ===========================================================================
   Lookups
   =========================================================================== */

export const cheatSheetPath = (s: CheatSheet) => `${CHEAT_SHEETS_ROOT}/${s.slug}`;
export const cheatSheetBySlug = (slug: string) => CHEAT_SHEETS.find((s) => s.slug === slug);

/** The sheet covering a series tag, for the tag page's link across. */
export const cheatSheetForTag = (tagSlug: string) =>
  CHEAT_SHEETS.find((s) => s.seriesTag === tagSlug);

/** "1909–1958", or "1932 to today" for a series still being struck. */
export const cheatSheetYears = (s: CheatSheet): string =>
  s.years.to ? `${s.years.from}–${s.years.to}` : `${s.years.from} to today`;

/** "from 1909 to 1958", or "from 1932 to today". A clause, not a label. */
export const cheatSheetRun = (s: CheatSheet): string =>
  `from ${s.years.from} to ${s.years.to ?? 'today'}`;

/* ===========================================================================
   The copy formulas
   ===========================================================================

   Derived, for the reason the questions' are: ten of these becomes forty, and
   the limits in meta.ts are not something anybody is going to measure three
   dozen strings against by hand afterwards. Every form below names its own
   series, so no two pages in this section can ship one sentence.
   =========================================================================== */

/** "Wheat Penny Cheat Sheet". The H1, and the phrase the page competes for. */
export const cheatSheetH1 = (s: CheatSheet): string => `${titleCase(s.name)} Cheat Sheet`;

export const cheatSheetTitle = (s: CheatSheet): string =>
  fit(
    [
      `${cheatSheetH1(s)}: Key Dates and Mint Marks`,
      `${cheatSheetH1(s)}: Key Dates`,
      cheatSheetH1(s),
    ],
    TITLE_MAX,
  );

/**
 * What the page says, by whether it says anything yet.
 *
 * A stub's description states that it is a stub. A description promising key
 * dates to a reader who will find none is the one thing worse than a thin
 * page, because it spends a click to disappoint somebody.
 */
export const cheatSheetDescription = (s: CheatSheet): string => {
  if (!s.written) {
    return `The ${s.name} ran ${cheatSheetRun(s)}. This cheat sheet of its key dates, mint marks and varieties is not written yet.`;
  }
  return `Which ${s.name} dates and mint marks are worth setting aside, across the ${cheatSheetYears(s)} run: the key dates, the varieties and the errors.`;
};

/** The one-line summary under the name on the hub. */
export const cheatSheetTeaser = (s: CheatSheet): string =>
  s.written
    ? `${cheatSheetYears(s)}. The dates and mint marks worth setting aside.`
    : `${cheatSheetYears(s)}. Not written yet.`;

/* ===========================================================================
   The hub's copy
   ===========================================================================

   Hand-written, the way the question topics are and for the same reason: it
   is one page, it is a bounded editorial act, and the generator exists for
   the dozens below it.
   =========================================================================== */

export const CHEAT_SHEETS_H1 = 'Coin Cheat Sheets';

export const CHEAT_SHEETS_BLUF =
  'These cheat sheets say which years and mint marks in a series are the scarce ones, so you can sort a jar or a roll of coins without learning the whole series first.';

export const CHEAT_SHEETS_INTRO: string[] = [
  'One sheet per series, and each one is a single scan: the key dates you read straight off the coin, the varieties that need you to look at one feature and decide, and the errors that a magnet or a scale settles rather than an eye. Everything a sheet does not list is the common version of that coin.',
  'They are lookup tables, not reading. Find the series you are holding, check the date and the letter beside it against the list, and set aside anything that matches.',
];

export const CHEAT_SHEETS_TITLE = fit(
  [
    `${CHEAT_SHEETS_H1}: Key Dates and Mint Marks by Series`,
    `${CHEAT_SHEETS_H1}: Key Dates and Mint Marks`,
    CHEAT_SHEETS_H1,
  ],
  TITLE_MAX,
);

export const CHEAT_SHEETS_DESCRIPTION =
  'Which years and mint marks in a coin series are the scarce ones, one series per page. Key dates, varieties and errors, sorted by how you settle each one.';

/* ===========================================================================
   Build-time validation
   ===========================================================================

   Throws rather than warns, for the reason validateTaxonomy() does: every
   failure below builds cleanly and is invisible in the output.
   =========================================================================== */

/** A currency figure has no place here. Same rule as SeriesInfo. */
const MONEY = /[$£€]\s?\d/;

export function validateCheatSheets(): void {
  const problems: string[] = [];
  const seen = { slug: new Set<string>(), name: new Set<string>(), tag: new Set<string>() };
  const strings = new Map<string, string>();

  const unique = (value: string, what: string, where: string) => {
    const owner = strings.get(value);
    if (owner) problems.push(`${what} "${value}" is used by both ${owner} and ${where}`);
    else strings.set(value, where);
  };

  for (const s of CHEAT_SHEETS) {
    const where = cheatSheetPath(s);

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug)) {
      problems.push(`cheat sheet "${s.slug}" is not a lowercase hyphenated slug`);
    }
    if (seen.slug.has(s.slug)) problems.push(`two cheat sheets claim the slug "${s.slug}"`);
    seen.slug.add(s.slug);

    if (seen.name.has(s.name)) problems.push(`two cheat sheets are named "${s.name}"`);
    seen.name.add(s.name);

    if (s.years.to !== undefined && s.years.to < s.years.from) {
      problems.push(`${where} ends before it starts`);
    }

    if (s.seriesTag !== undefined) {
      const tag = TAGS.find((t) => t.slug === s.seriesTag);
      if (!tag) problems.push(`${where} names unregistered series tag "${s.seriesTag}"`);
      else if (tag.kind !== 'series') {
        problems.push(`${where} names "${s.seriesTag}", which is a ${tag.kind} tag rather than a series`);
      }
      if (seen.tag.has(s.seriesTag)) {
        problems.push(`two cheat sheets cover the series tag "${s.seriesTag}"`);
      }
      seen.tag.add(s.seriesTag);
    }

    const title = cheatSheetTitle(s);
    const description = cheatSheetDescription(s);

    if (title.length > TITLE_MAX) {
      problems.push(`${where} title is ${title.length} characters, over ${TITLE_MAX}: "${title}"`);
    }
    if (description.length > DESCRIPTION_MAX) {
      problems.push(`${where} description is ${description.length} characters, over ${DESCRIPTION_MAX}`);
    }
    if (description.length < DESCRIPTION_MIN) {
      problems.push(`${where} description is ${description.length} characters, under ${DESCRIPTION_MIN}`);
    }

    unique(title, 'title', where);
    unique(description, 'description', where);
    unique(cheatSheetH1(s), 'H1', where);
    unique(cheatSheetTeaser(s), 'teaser', where);

    for (const [what, value] of [['title', title], ['description', description], ['teaser', cheatSheetTeaser(s)]] as const) {
      if (MONEY.test(value)) problems.push(`${where} states a price in its ${what}`);
      if (value.includes('undefined')) problems.push(`${where} ${what} contains "undefined"`);
      if (/ {2}| [,.;:]/.test(value)) problems.push(`${where} ${what} is badly spaced: "${value}"`);
    }
  }

  unique(CHEAT_SHEETS_TITLE, 'title', CHEAT_SHEETS_ROOT);
  unique(CHEAT_SHEETS_DESCRIPTION, 'description', CHEAT_SHEETS_ROOT);
  if (CHEAT_SHEETS_TITLE.length > TITLE_MAX) {
    problems.push(`${CHEAT_SHEETS_ROOT} title is ${CHEAT_SHEETS_TITLE.length} characters, over ${TITLE_MAX}`);
  }
  if (CHEAT_SHEETS_DESCRIPTION.length > DESCRIPTION_MAX || CHEAT_SHEETS_DESCRIPTION.length < DESCRIPTION_MIN) {
    problems.push(`${CHEAT_SHEETS_ROOT} description is ${CHEAT_SHEETS_DESCRIPTION.length} characters`);
  }
  for (const p of [CHEAT_SHEETS_BLUF, ...CHEAT_SHEETS_INTRO]) {
    if (MONEY.test(p)) problems.push(`${CHEAT_SHEETS_ROOT} states a price in its copy`);
  }

  const ordered = [...CHEAT_SHEETS].map((s) => s.slug).sort();
  if (CHEAT_SHEETS.map((s) => s.slug).join('|') !== ordered.join('|')) {
    problems.push('CHEAT_SHEETS is not in alphabetical order by slug, which is the order the hub renders');
  }

  if (problems.length > 0) {
    throw new Error(`Cheat-sheet registry problems:\n  - ${problems.join('\n  - ')}`);
  }
}

validateCheatSheets();
