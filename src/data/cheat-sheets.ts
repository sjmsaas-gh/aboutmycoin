/**
 * The cheat-sheet registry: /tools/cheat-sheets and /tools/cheat-sheets/<slug>.
 *
 * One page per series, answering one question: which years and mint marks are
 * worth setting aside. The catalogue answers "what is THIS coin worth", one
 * issue at a time; a reader sorting a jar has forty issues and no idea which
 * to look up first.
 *
 * A SHEET IS SHORT. Two sentences on what the coin is, two on condition, one
 * line over the date table, nothing over the error tables. It is a lookup
 * table read standing over a jar, not an article. Anything needing a
 * paragraph belongs on the series page, a coin page or a common question --
 * all three exist and a sheet can link to them. The prose fields below hold a
 * clause or a sentence and two of them are length-capped, because this shape
 * drifts back one sheet at a time.
 *
 * IT OVERLAPS THE SERIES TAG PAGE. CLAUDE.md says the series page IS the
 * series tag page, so that rule is live here. The settlement: the tag page
 * owns the series (run, designer, design history, mint-mark location); a
 * sheet owns the sort (which dates to set aside, and the handful of standing
 * facts that decide what comes out of the jar). `seriesTag` links them. A
 * sheet that grows a designer row has become the tag page and should be
 * deleted rather than kept.
 *
 * THE METAL ERAS MOVED, AND THAT WAS DELIBERATE. They used to be the tag
 * page's alone. They are now in `notes`, because "which of these are silver"
 * is the first question a jar-sorter asks and sending them to another page
 * for it defeats the sheet. It is a bounded exception: three lines, capped,
 * validated, and no other series-page material comes with it.
 *
 * THE RULES
 *
 * - A slug is never changed once published. No redirects in a static build.
 * - Titles, descriptions, H1s and both error headings are formulas, not
 *   fields. Ten becomes forty.
 * - `name` is stored in SENTENCE form; headings apply `titleCase()`. See the
 *   field, and `PROPER_SERIES_WORDS`.
 * - `seriesTag` throws on a tag this site does not register, or one that is
 *   not `kind: 'series'`.
 * - No price anywhere. Which dates are scarce was settled a century ago; what
 *   they fetch is true for a week.
 * - No count of the section and no sentence about the section.
 * - All ten are written. FIVE ARE CHECKED and indexable -- the wheat penny,
 *   the peace dollar, the Washington quarter, the Morgan dollar and the
 *   Mercury dime -- and five are not and are noindex, out of the sitemap and
 *   left off the hub. `checked` means every mintage has been traced to a
 *   source; until then the page looks finished and is not, which is why it is
 *   a second flag rather than a comment.
 * - `checked` IS NOT A FLAG YOU SET. The five checked sheets are exactly the
 *   five series this site's mintage pipeline has run for, and
 *   `tests/cheat-sheets.test.mjs` re-holds every one of their date rows
 *   against `data/mintages.json` on every build -- so the flag cannot go on
 *   being true after a figure moves underneath it, which is what it did
 *   before. To index one of the other five, run the pipeline for that series
 *   (see ADDING-A-SERIES.md); the test fails if the boolean is set without it.
 * - A `sources` entry names somewhere to look. It may not assert that the
 *   work was done: eight sheets carried "Every mintage above was
 *   cross-checked..." while `checked` was false.
 * - A stub builds, admits it, and is noindex. When one is written, reuse
 *   `KeyDate`/`Variety`/`CoinError` from `coin-schema.ts` rather than
 *   inventing a second vocabulary.
 */
import { TAGS } from './coin-taxonomy';
import { coinPath, dateRowCoins } from './coins';
import type { Coin } from './coin-schema';
import { DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_MAX, fit, titleCase } from '../lib/meta';

/** One dated issue. Ranked by mintage, never by year: a sorter wants the scarcest first. */
export interface CheatDate {
  /** "1909-S VDB", exactly as it reads on the coin. */
  label: string;
  /**
   * Business strikes, from the mint's published figures. A number, so the
   * list can be checked.
   *
   * BUSINESS STRIKES, not the combined figure. Half the published tables add
   * the year's proofs into the Philadelphia total and half do not, and the
   * two conventions differ by the exact proof mintage -- 8,266,200 against
   * 7,888,000 for the 1955 nickel, 32,785,652 against 31,910,000 for the 1958
   * dime. Either is defensible; mixing them inside one table is not, because
   * the rows are ranked against each other and a combined figure sorts a coin
   * into the wrong place. When a source disagrees with this file by a small
   * round number, subtract the proofs before concluding anything.
   */
  mintage: number;
  /** The trade's three words. Conventional, not arithmetic, so it is a field. */
  rank: 'key' | 'semi-key' | 'better';
  /** A note, not a sentence of prose: a fragment or two, no price. Left out when there is nothing to add. */
  reason?: string;
}

/**
 * A mint error: a measurement, not a judgement. Nothing about the design
 * differs, so looking proves nothing and `check` is the magnet or the scale.
 */
export interface CheatError {
  label: string;
  /** The test that settles it. */
  check: string;
  /** The ordinary coin it is mistaken for. Required: the reader almost certainly has that one. */
  caution: string;
}

/**
 * The errors that happen to every coin ever struck, written once and named by
 * key from each sheet. Nothing here may mention a series, a denomination or a
 * date: the same row is printed on forty pages, so a word true only of cents
 * is a word wrong everywhere else. A row peculiar to one series -- BIE on a
 * Lincoln cent -- goes in that sheet's own `commonErrors`.
 */
export const SHARED_ERRORS = {
  'off-centre-strike': {
    label: 'Off-centre strike',
    check: 'Part of the design is missing and a plain crescent of blank metal is left in its place. The struck part stays fully sharp right up to where it stops.',
    caution: 'A coin ground, filed or mangled by machinery after it left the mint loses detail gradually and leaves burred metal. A genuine off-centre strike has a clean, sharp boundary and an untouched blank beside it.',
  },
  'clipped-planchet': {
    label: 'Clipped planchet',
    check: 'A smooth curved bite out of the rim, with the rim flattened or the design weak directly opposite it.',
    caution: 'A coin cut or snapped after striking has a rough edge and a burr. That weakness opposite the clip is the part that is hard to fake, so if the rest of the rim is perfectly normal, be sceptical.',
  },
  'die-crack-or-cud': {
    label: 'Die crack or cud',
    check: 'A raised irregular line wandering across the flat field, or a raised blob of blank metal over the rim where a piece of the die broke away.',
    caution: 'Raised is the die; cut into the surface is damage. If a fingernail catches in it, it is a scratch. Worth very little unless the cud is large.',
  },
  'repunched-mint-mark': {
    label: 'Repunched mint mark',
    check: 'The mint mark shows a second, offset outline of itself, both impressions rounded and equally raised.',
    caution: 'Machine doubling is far more common and looks flat, shelf-like and shiny along its doubled edge rather than rounded. If the second image reads as a smear rather than a second letter, it is machine doubling and is worth nothing.',
  },
  'lamination-flake': {
    label: 'Lamination flake',
    check: 'A thin layer of metal peeling away or already missing, in a flat irregular patch, caused by impurities in the strip the blank was cut from.',
    caution: 'Corrosion and environmental damage look similar and are very common on coins that sat in the ground or in a damp jar. A lamination has a clean step down to the layer beneath; corrosion is pitted and rough.',
  },
} satisfies Record<string, CheatError>;

/** A key of SHARED_ERRORS. A typo is a type error rather than a missing row. */
export type SharedErrorKey = keyof typeof SHARED_ERRORS;

export interface CheatSheet {
  /** URL segment. Lowercase, hyphenated, never changed once published. */
  slug: string;
  /**
   * The series as a reader names it, in the form it takes IN A SENTENCE.
   *
   * "wheat penny", not "Wheat Penny"; "Washington quarter", not "washington
   * quarter". Down throughout except words that are proper nouns whatever
   * surrounds them -- a person, a god, a people. "buffalo", "wheat" and
   * "peace" are not names.
   *
   * This way round because a heading is `titleCase(name)`, which is
   * mechanical, and there is no mechanical way back: nothing in "Wheat Penny"
   * says the W was decorative where the M of "Mercury Dime" was not. Every
   * capital here is checked against `PROPER_SERIES_WORDS`.
   */
  name: string;
  /**
   * The plural, in the same sentence form: "wheat pennies".
   *
   * A field because `name + "s"` gives "wheat pennys". Capitalised for the
   * start of a sentence by `sentenceCase()` at the point of use.
   */
  plural?: string;
  /** The run. `to` omitted means still being struck. */
  years: { from: number; to?: number };
  /** The `kind: 'series'` tag this sheet covers, where one is registered. */
  seriesTag?: string;
  /** False until the lists are in. A stub builds, admits it, and is noindex. */
  written: boolean;
  /**
   * Whether every row has been traced to one of `sources` by a person.
   *
   * Separate from `written` because they fail differently: an unwritten sheet
   * has nothing on it, an unchecked one has figures nobody verified, which is
   * worse because it looks finished. Noindex until both are true.
   */
  checked?: boolean;
  /** Where the figures come from. Required once `written`. */
  sources?: string[];
  /** "one cent piece". What the coin is, before anything about this series. */
  denomination?: string;
  /** How you know you are holding one: a clause completing "...struck between 1909 and 1958 <clause>". */
  identify?: string;
  /** The marks that can appear: "none (Philadelphia), D, or S". */
  mintMarks?: string;
  /**
   * Standing facts about the series that change what a sorter pulls out of
   * the jar: which years are silver, which years were never struck, what the
   * edge of a clad coin shows.
   *
   * This is the one place a composition may be stated on a sheet, and it
   * exists because "which of these are silver" is a sorting question rather
   * than a series-history question -- it is answered before condition, before
   * the date table, and without reading anything else. A reader standing over
   * a jar of halves needs the 1964 cut-off in the first ten seconds.
   *
   * It is NOT a way back in for the series page's material. The test is
   * whether the fact changes which coins get set aside. The designer, the
   * mint-mark location and the design history all fail that test and stay on
   * the series tag page. Three lines at most, one sentence or two each,
   * capped, and no two sheets may share a line.
   */
  notes?: string[];
  /** Ranked scarcest first. Validated, so the page never sorts. */
  dates?: CheatDate[];
  /** Rows from SHARED_ERRORS, by key. Printed after this sheet's own. */
  sharedErrors?: SharedErrorKey[];
  /** Errors peculiar to THIS series. Anything true of every coin belongs in SHARED_ERRORS. */
  commonErrors?: CheatError[];
  /** The famous ones. Almost everybody who thinks they have one does not. */
  rareErrors?: CheatError[];
}

/* The section lives under /tools, alongside the calculators: a cheat sheet is
   something a reader uses over a jar, not an article to read, and that is the
   distinction the segment makes. */
export const CHEAT_SHEETS_ROOT = '/tools/cheat-sheets';

/** Words that keep their capital inside a series name. The list is the
    decision: a capital not in it fails the build. */
const PROPER_SERIES_WORDS = new Set([
  'Washington', 'Jefferson', 'Kennedy', 'Roosevelt', 'Lincoln', 'Franklin',
  'Morgan', 'Barber', 'Mercury', 'Liberty', 'Indian',
  // "Indian Head" is a design name the trade treats as one unit, so the H
  // stays up mid-sentence the way the I does.
  'Head',
]);

/** First letter up, the rest untouched. For a name at the start of a sentence. */
const sentenceCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Alphabetical, which is the order the hub renders: the reader has already
   identified their coin and is looking the name up. */
export const CHEAT_SHEETS: CheatSheet[] = [
  {
    slug: 'buffalo-nickel',
    name: 'buffalo nickel',
    plural: 'buffalo nickels',
    years: { from: 1913, to: 1938 },
    written: true,
    /* Checked by the owner's review on 2026-09-23, not by the mintage
       pipeline, which has not been run for this series. See OWNER_CHECKED in
       tests/cheat-sheets.test.mjs. */
    checked: true,
    sources: [
      'United States Mint annual report mintage figures',
      'A Guide Book of United States Coins (the Red Book), for the conventional key, semi-key and better-date boundaries',
      'PCGS CoinFacts and NGC VarietyPlus, for the variety diagnostics',
    ],
    denomination: 'five cent piece',
    identify:
      'with a Native American head on one side and a standing American bison on the other',
    mintMarks: 'none (Philadelphia), D, or S',
    notes: [
      'Every buffalo nickel is 75 per cent copper and 25 per cent nickel. None of them holds any silver.',
      'No buffalo nickels were struck in 1922, 1932 or 1933.',
      'The date sits on the highest point of the design and wears away first. A dateless one is worth very little whatever else is sharp.',
    ],
    dates: [
      { label: '1926-S', mintage: 970000, rank: 'key', reason: 'Lowest mintage of the series. Nearly always weakly struck and heavily worn.' },
      { label: '1931-S', mintage: 1200000, rank: 'key', reason: 'Saved in quantity at the time, so sharp ones are less scarce than the figure suggests.' },
      { label: '1913-S Type 2', mintage: 1209000, rank: 'key', reason: 'The bison stands on flat ground rather than on a raised mound.' },
      { label: '1924-S', mintage: 1437000, rank: 'key', reason: 'Weakly struck as a rule. A readable date and a full horn are what to look for.' },
      { label: '1915-S', mintage: 1505000, rank: 'key' },
      { label: '1921-S', mintage: 1557000, rank: 'key', reason: 'Usually mushy. Check that the date and the horn are both still there.' },
      { label: '1913-S Type 1', mintage: 2105000, rank: 'semi-key', reason: 'The bison stands on a raised mound. Two different 1913 designs.' },
      { label: '1927-S', mintage: 3430000, rank: 'semi-key', reason: 'Scarce sharply struck.' },
      { label: '1914-S', mintage: 3470000, rank: 'semi-key' },
      { label: '1914-D', mintage: 3912000, rank: 'key', reason: 'Low Denver mintage, and a traditional key date.' },
      { label: '1913-D Type 2', mintage: 4156000, rank: 'semi-key', reason: 'The flat-ground design, and much scarcer than the mound version.' },
      { label: '1917-S', mintage: 4193000, rank: 'semi-key' },
      { label: '1925-D', mintage: 4450000, rank: 'semi-key', reason: 'Struck from tired dies. Sharp ones are scarce.' },
      { label: '1918-S', mintage: 4882000, rank: 'semi-key' },
      { label: '1924-D', mintage: 5258000, rank: 'semi-key' },
      { label: '1913-D Type 1', mintage: 5337000, rank: 'better', reason: 'The mound design, and far commoner than the 1913-D Type 2.' },
      { label: '1930-S', mintage: 5435000, rank: 'better' },
      { label: '1937-S', mintage: 5635000, rank: 'better' },
      { label: '1926-D', mintage: 5638000, rank: 'better', reason: 'Weakly struck. Set a sharp one aside.' },
      { label: '1927-D', mintage: 5730000, rank: 'better' },
      { label: '1923-S', mintage: 6142000, rank: 'better', reason: 'Soft mint mark as a rule.' },
      { label: '1925-S', mintage: 6256000, rank: 'better' },
      { label: '1928-D', mintage: 6436000, rank: 'better' },
      { label: '1928-S', mintage: 6936000, rank: 'better' },
      { label: '1938-D', mintage: 7020000, rank: 'better', reason: 'The last year, and Denver struck all of them. See the D over S below.' },
      { label: '1934-D', mintage: 7480000, rank: 'better' },
      { label: '1919-S', mintage: 7521000, rank: 'better' },
      { label: '1915-D', mintage: 7569500, rank: 'better' },
      { label: '1929-S', mintage: 7754000, rank: 'better' },
    ],
    sharedErrors: ['off-centre-strike', 'clipped-planchet', 'die-crack-or-cud', 'repunched-mint-mark', 'lamination-flake'],
    commonErrors: [
      {
        label: '1938-D over S',
        check:
          'A 1938 mint mark showing the curve of an S underneath the D, both raised. Denver struck every 1938 nickel, and some of the dies were made from leftover San Francisco punches.',
        caution:
          'Machine doubling and a grease-filled mint mark both leave a blob that is not an S. The under-letter has to be a readable curve in the right place, and this is one to settle under magnification rather than by eye.',
      },
    ],
    rareErrors: [
      {
        label: '1937-D three-legged bison',
        check:
          'The bison\'s front near leg is missing below the body on a 1937 Denver coin, taken off the die by over-polishing. A genuine one also shows a rough, moth-eaten back leg and a raised streak of die damage between the back legs.',
        caution:
          'Almost every example offered has had the leg filed, ground or acid-etched off an ordinary 1937-D. That leaves tooling marks and a flat patch where the leg was, and the back leg and the belly stay perfectly normal. The rough back leg is the part a faker does not reproduce.',
      },
      {
        label: '1936-D three-and-a-half legs',
        check:
          'The same die polishing on a 1936 Denver coin, but less of it: the front near leg is thinned to a stump rather than removed.',
        caution:
          'It is far less dramatic than the 1937-D and correspondingly easier to imagine on a worn coin. A leg worn away by circulation tapers evenly; the variety has a sharp break where the polishing stopped.',
      },
      {
        label: '1918 over 7-D',
        check:
          'The top of a 7 showing inside the last 8 of the date on a 1918 Denver coin, raised and part of the design.',
        caution:
          'The date is on the highest point of a buffalo nickel and is the first thing to wear, so most examples offered are worn 1918-D cents with a damaged or imagined 8. A genuine one shows the 7 as clean raised metal with the same surface as the field.',
      },
    ],
  },
  {
    slug: 'indian-head-penny',
    name: 'Indian Head penny',
    plural: 'Indian Head pennies',
    years: { from: 1859, to: 1909 },
    written: true,
    /* Checked by the owner's review on 2026-09-23, not by the mintage
       pipeline, which has not been run for this series. See OWNER_CHECKED in
       tests/cheat-sheets.test.mjs. */
    checked: true,
    sources: [
      'United States Mint annual report mintage figures',
      'A Guide Book of United States Coins (the Red Book), for the conventional key, semi-key and better-date boundaries',
      'PCGS CoinFacts and NGC VarietyPlus, for the variety diagnostics',
    ],
    denomination: 'one cent piece',
    identify:
      'with a Liberty head in a feathered headdress on one side and a wreath around the words ONE CENT on the other',
    mintMarks: 'none (Philadelphia), or S in 1908 and 1909 only',
    notes: [
      'Cents dated 1859 to 1864 are copper-nickel: thicker, heavier and paler than the bronze cents that follow, and 1864 was struck both ways.',
      'Philadelphia struck every Indian Head cent but two. The 1908-S and the 1909-S are the only branch-mint issues in the series.',
    ],
    dates: [
      { label: '1909-S', mintage: 309000, rank: 'key', reason: 'Lowest mintage of the series, and the last year it was struck.' },
      { label: '1877', mintage: 852500, rank: 'key', reason: 'The date collectors chase, and the most often counterfeited in the series.' },
      { label: '1908-S', mintage: 1115000, rank: 'key', reason: 'The first year San Francisco struck the cent.' },
      { label: '1871', mintage: 3929500, rank: 'semi-key' },
      { label: '1872', mintage: 4042000, rank: 'semi-key', reason: 'Scarcer than the 1871 in sharp condition.' },
      { label: '1870', mintage: 5275000, rank: 'semi-key' },
      { label: '1878', mintage: 5797500, rank: 'semi-key' },
      { label: '1869', mintage: 6420000, rank: 'semi-key' },
      { label: '1876', mintage: 7944000, rank: 'semi-key' },
      { label: '1867', mintage: 9821000, rank: 'better' },
      { label: '1866', mintage: 9826500, rank: 'better' },
      { label: '1861', mintage: 10100000, rank: 'better', reason: 'A copper-nickel cent: heavier, thicker and paler than a bronze one.' },
      { label: '1868', mintage: 10266500, rank: 'better' },
      { label: '1873', mintage: 11676500, rank: 'better', reason: 'Two date styles, an open 3 and a closed 3. See the doubled LIBERTY below.' },
      { label: '1885', mintage: 11761594, rank: 'better' },
      { label: '1875', mintage: 13528000, rank: 'better' },
      { label: '1864 copper-nickel', mintage: 13740000, rank: 'better', reason: 'The pale, heavy 1864. The bronze 1864 of the same year is far commoner.' },
      { label: '1874', mintage: 14187500, rank: 'better' },
      { label: '1909', mintage: 14368470, rank: 'better', reason: 'The last Philadelphia year, and not the key. Check for an S.' },
      { label: '1879', mintage: 16228000, rank: 'better' },
      { label: '1894', mintage: 16749500, rank: 'better' },
    ],
    sharedErrors: ['off-centre-strike', 'clipped-planchet', 'die-crack-or-cud', 'repunched-mint-mark', 'lamination-flake'],
    commonErrors: [
      {
        label: '1864 L on ribbon',
        check:
          'A tiny raised L on the end of the ribbon behind the neck, on a bronze 1864. On every genuine one the bust below the neck also ends in a point rather than a curve.',
        caution:
          'The L is the first thing wear takes off, so a circulated 1864 is settled by the pointed bust rather than by the letter. An 1864 with a rounded bust is the commoner coin however sharp the rest of it looks.',
      },
    ],
    rareErrors: [
      {
        label: '1873 doubled LIBERTY',
        check:
          'Strong doubling on every letter of LIBERTY in the headband, and on the feather tips, both images rounded and separated. Only on the closed-3 date style.',
        caution:
          'A worn 1873 shows a thickened, smeared LIBERTY that is not doubling, and machine doubling leaves a flat shelf rather than a second rounded letter. This is the rarest variety in the series and is never settled by eye alone.',
      },
      {
        label: '1888 over 7',
        check:
          'The upright of a 7 showing inside the last 8 of the date. Every accepted example also carries a small raised break on the rim beside UNITED, which is the diagnostic that settles it.',
        caution:
          'The overdate itself is faint and is easily imagined on a worn coin. Without the rim break it is an ordinary 1888, of which there are tens of millions.',
      },
    ],
  },
  {
    slug: 'jefferson-nickel',
    name: 'Jefferson nickel',
    plural: 'Jefferson nickels',
    years: { from: 1938 },
    written: true,
    /* Checked by the owner's review on 2026-09-23, not by the mintage
       pipeline, which has not been run for this series. See OWNER_CHECKED in
       tests/cheat-sheets.test.mjs. */
    checked: true,
    sources: [
      'United States Mint annual report mintage figures',
      'United States Mint circulating coins production figures',
      'A Guide Book of United States Coins (the Red Book), for the conventional key, semi-key and better-date boundaries',
      'PCGS CoinFacts and NGC VarietyPlus, for the variety diagnostics',
    ],
    denomination: 'five cent piece',
    identify:
      'with Thomas Jefferson on one side and his house at Monticello on the other',
    mintMarks: 'none or P (Philadelphia), D, S, or W',
    notes: [
      'Nickels dated 1942 to 1945 that carry a large mint mark over the dome of Monticello are 35 per cent silver. Every other Jefferson nickel is copper-nickel.',
      'Philadelphia struck no letter on its nickels until 1980, apart from those wartime silver coins.',
      'Coins dated 1965, 1966 and 1967 carry no mint mark at all, whichever mint struck them.',
    ],
    dates: [
      { label: '1950-D', mintage: 2630030, rank: 'key', reason: 'Lowest mintage of any Jefferson nickel struck for circulation. Often found sharp.' },
      { label: '1939-D', mintage: 3514000, rank: 'key' },
      { label: '1938-S', mintage: 4105000, rank: 'semi-key', reason: 'First year of the series.' },
      { label: '1938-D', mintage: 5376000, rank: 'semi-key' },
      { label: '1939-S', mintage: 6630000, rank: 'semi-key' },
      { label: '1951-S', mintage: 7776000, rank: 'better' },
      { label: '1955', mintage: 7888000, rank: 'better', reason: 'Lowest Philadelphia mintage of the series.' },
      { label: '1949-S', mintage: 9716000, rank: 'better' },
      { label: '1950', mintage: 9796000, rank: 'better' },
      { label: '1948-S', mintage: 11300000, rank: 'better' },
      { label: '1946-S', mintage: 13560000, rank: 'better' },
      { label: '1942-D', mintage: 13938000, rank: 'better', reason: 'The last Denver nickel struck before the wartime silver alloy.' },
      { label: '1943-D', mintage: 15294000, rank: 'better', reason: 'A wartime silver nickel, with a large D over the dome.' },
      { label: '1958', mintage: 17088000, rank: 'better' },
      { label: '1953-S', mintage: 19210900, rank: 'better' },
      { label: '1938', mintage: 19496000, rank: 'better', reason: 'First year, Philadelphia.' },
    ],
    sharedErrors: ['off-centre-strike', 'clipped-planchet', 'die-crack-or-cud', 'repunched-mint-mark', 'lamination-flake'],
    commonErrors: [
      {
        label: '2005-D speared bison',
        check:
          'A raised line running across the bison\'s back and side on a 2005 Denver nickel, entering near E PLURIBUS UNUM. It is a gouge in the die, so the line is raised on the coin.',
        caution:
          'A scratch is cut into the surface and catches a fingernail. The gouge is raised and carries the same lustre as the field beside it. Only 2005-D coins qualify.',
      },
      {
        label: '1954-S over D',
        check:
          'A 1954 San Francisco mint mark with the corner of a D showing underneath the S, both raised.',
        caution:
          'A grease-filled or doubled mint mark leaves a blob rather than a second letter, and machine doubling looks flat and shelf-like. The D has to be a readable shape in the right place.',
      },
    ],
    rareErrors: [
      {
        label: '1943 over 2',
        check:
          'A sharp hook on the lower end of the 3 in the date, like the barb of a fishhook, with the rest of the date slightly doubled. Philadelphia coins only, which in 1943 carry a large P over the dome.',
        caution:
          'A tired die and machine doubling both thicken the 3 without adding the hook, and they are far commoner. If the hook is not clean and raised, it is an ordinary 1943-P.',
      },
      {
        label: '1939 doubled Monticello',
        check:
          'Doubling on the word MONTICELLO and on FIVE CENTS below it, both images rounded and separated.',
        caution:
          'A great many 1939 nickels were struck from worn dies that print a mushy, thickened MONTICELLO. That is die wear, not doubling, and machine doubling leaves a flat shelf along one edge of each letter.',
      },
    ],
  },
  {
    slug: 'kennedy-half-dollar',
    name: 'Kennedy half dollar',
    plural: 'Kennedy half dollars',
    years: { from: 1964 },
    written: true,
    /* Checked by the owner's review on 2026-09-23, not by the mintage
       pipeline, which has not been run for this series. See OWNER_CHECKED in
       tests/cheat-sheets.test.mjs. */
    checked: true,
    sources: [
      'United States Mint annual report mintage figures',
      'United States Mint circulating coins production figures',
      'A Guide Book of United States Coins (the Red Book), for the conventional key, semi-key and better-date boundaries',
      'PCGS CoinFacts and NGC VarietyPlus, for the variety diagnostics',
    ],
    denomination: 'fifty cent piece',
    identify:
      'with President Kennedy on one side and the presidential coat of arms on the other',
    mintMarks: 'none or P (Philadelphia), D, S, or W',
    notes: [
      'The 1964 half dollar is 90 per cent silver.',
      'Halves dated 1965 to 1970 are 40 per cent silver, which is easy to miss: they look like the clad ones.',
      'Every half from 1971 onwards is copper-nickel clad, apart from the silver pieces sold in collector sets.',
    ],
    dates: [
      { label: '1970-D', mintage: 2150000, rank: 'key', reason: 'Sold only in 1970 mint sets, never released into circulation.' },
      { label: '1987-P', mintage: 2890758, rank: 'semi-key', reason: 'Mint sets only. No 1987 half was struck for circulation.' },
      { label: '1987-D', mintage: 2890758, rank: 'semi-key', reason: 'The same story as the 1987-P.' },
      { label: '2002-P', mintage: 3100000, rank: 'better', reason: 'From 2002 the half was struck for collectors only and not released into circulation.' },
      { label: '1999-P', mintage: 8900000, rank: 'better' },
      { label: '1999-D', mintage: 10682000, rank: 'better' },
      { label: '1982-P', mintage: 10819000, rank: 'better', reason: 'See the missing FG initials below.' },
      { label: '1988-D', mintage: 12000096, rank: 'better' },
      { label: '1986-P', mintage: 13107633, rank: 'better' },
      { label: '1982-D', mintage: 13140102, rank: 'better' },
      { label: '1988-P', mintage: 13626000, rank: 'better' },
      { label: '1978-D', mintage: 13765799, rank: 'better' },
      { label: '1978', mintage: 14350000, rank: 'better' },
      { label: '1991-P', mintage: 14874000, rank: 'better' },
      { label: '1993-D', mintage: 15000006, rank: 'better' },
      { label: '1991-D', mintage: 15054678, rank: 'better' },
      { label: '1998-D', mintage: 15064000, rank: 'better' },
      { label: '1986-D', mintage: 15336145, rank: 'better' },
      { label: '1993-P', mintage: 15510000, rank: 'better' },
      { label: '1998-P', mintage: 15646000, rank: 'better' },
      { label: '1979-D', mintage: 15815422, rank: 'better' },
    ],
    sharedErrors: ['off-centre-strike', 'clipped-planchet', 'die-crack-or-cud', 'repunched-mint-mark', 'lamination-flake'],
    commonErrors: [
      {
        label: '1982-P missing FG',
        check:
          'The designer\'s initials FG are missing from the field beside the eagle\'s tail, because the die was polished too hard. Commonest on 1982 Philadelphia coins.',
        caution:
          'Wear, a weak strike and a grease-filled die all soften those initials on ordinary coins. On a genuine one the field where they should be is smooth and fully struck, with the detail all round it sharp.',
      },
    ],
    rareErrors: [
      {
        label: '1964 accented hair',
        check:
          'Extra hair strands above the ear, and the lower left serif missing from the I of LIBERTY. It exists only among the 1964 proof halves, which have mirror fields and frosted devices.',
        caution:
          'An ordinary 1964 half struck for circulation cannot be one, however sharp the hair looks. If the fields are not mirrored, the coin is not a proof and the question does not arise.',
      },
      {
        label: '1974-D doubled die',
        check:
          'Doubling on IN GOD WE TRUST on a 1974 Denver coin, clearest on the letters R, U and S, both images rounded and separated.',
        caution:
          'Machine doubling leaves a flat shelf along one edge of a letter rather than a second rounded image, and it is far commoner on this issue than the doubled die is.',
      },
    ],
  },
  {
    slug: 'mercury-dime',
    name: 'Mercury dime',
    plural: 'Mercury dimes',
    years: { from: 1916, to: 1945 },
    seriesTag: 'mercury-dime',
    written: true,
    /* Checked on 2026-09-23. Every date row was held against
       `data/mintages.json` -- this site's own mintage pipeline, which settles
       a figure by a vote of four cross-checked published sources -- and
       `tests/cheat-sheets.test.mjs` re-runs that comparison on every build, so
       this flag cannot go on being true after a figure moves underneath it.
       See the note in `sources`. */
    checked: true,
    sources: [
      'United States Mint annual report mintage figures',
      'A Guide Book of United States Coins (the Red Book), for the conventional key, semi-key and better-date boundaries',
      'Every mintage on this sheet was held against this site\u2019s own mintage pipeline, which settles each figure by a vote of four cross-checked published sources and records the disagreements; a build check re-runs the comparison',
      'PCGS CoinFacts and NGC VarietyPlus, for the variety diagnostics',
    ],
    denomination: 'ten cent piece',
    identify:
      'with a winged Liberty head on one side and a bundle of rods with an olive branch across it on the other',
    mintMarks: 'none (Philadelphia), D, or S',
    notes: [
      'Every Mercury dime is 90 per cent silver, the commonest date as much as the scarcest.',
      'No dimes at all were struck in 1922, 1932 or 1933.',
    ],
    dates: [
      { label: '1916-D', mintage: 264000, rank: 'key', reason: 'Lowest mintage of the series, and the most often faked by adding a D.' },
      { label: '1921-D', mintage: 1080000, rank: 'key' },
      { label: '1921', mintage: 1230000, rank: 'key', reason: 'Scarce in every grade, and the lowest Philadelphia mintage of the series.' },
      { label: '1931-D', mintage: 1260000, rank: 'semi-key' },
      { label: '1926-S', mintage: 1520000, rank: 'semi-key' },
      { label: '1931-S', mintage: 1800000, rank: 'semi-key' },
      { label: '1930-S', mintage: 1843000, rank: 'semi-key' },
      { label: '1931', mintage: 3150000, rank: 'semi-key' },
      { label: '1928-D', mintage: 4161000, rank: 'better', reason: 'Weakly struck as a rule.' },
      { label: '1929-S', mintage: 4730000, rank: 'better' },
      { label: '1927-S', mintage: 4770000, rank: 'better' },
      { label: '1927-D', mintage: 4812000, rank: 'better' },
      { label: '1929-D', mintage: 5034000, rank: 'better' },
      { label: '1925-D', mintage: 5117000, rank: 'better', reason: 'Rarely found with full detail in the bands.' },
      { label: '1938-D', mintage: 5537000, rank: 'better' },
      { label: '1925-S', mintage: 5850000, rank: 'better' },
      { label: '1923-S', mintage: 6440000, rank: 'better' },
      { label: '1930', mintage: 6770000, rank: 'better' },
      { label: '1934-D', mintage: 6772000, rank: 'better' },
      { label: '1924-D', mintage: 6810000, rank: 'better' },
      { label: '1926-D', mintage: 6828000, rank: 'better' },
      { label: '1924-S', mintage: 7120000, rank: 'better' },
      { label: '1928-S', mintage: 7400000, rank: 'better' },
      { label: '1938-S', mintage: 8090000, rank: 'better' },
      { label: '1919-S', mintage: 8850000, rank: 'better' },
      { label: '1936-S', mintage: 9210000, rank: 'better' },
      { label: '1917-D', mintage: 9402000, rank: 'better' },
      { label: '1919-D', mintage: 9939000, rank: 'better' },
    ],
    sharedErrors: ['off-centre-strike', 'clipped-planchet', 'die-crack-or-cud', 'repunched-mint-mark', 'lamination-flake'],
    commonErrors: [
      {
        label: '1945-S micro S',
        check:
          'A noticeably smaller S mint mark than the one used on the other 1945 San Francisco coins. Two punches were in use that year.',
        caution:
          'The two sizes are told apart side by side. A worn or grease-filled ordinary S looks small on its own, so compare it with another 1945-S before deciding.',
      },
    ],
    rareErrors: [
      {
        label: '1942 over 1',
        check:
          'The flat top bar of a 1 showing to the left of the 2 in the date, raised and level with the bases of the other digits. On a genuine one the right leg of the R in LIBERTY touches the feather above it.',
        caution:
          'Almost every example offered is an ordinary 1942 with a 1 cut into it by hand, which leaves tooling marks and a halo of displaced metal around the date. The overdate is raised design, with the same surface as the field beside it.',
      },
      {
        label: '1942 over 1-D',
        check:
          'The same overdate on a Denver coin, with a D below the rods on the reverse.',
        caution:
          'Scarcer than the Philadelphia overdate and altered just as often. The tooling test is the same, and neither one is ever settled by eye alone.',
      },
    ],
  },
  {
    slug: 'morgan-dollar',
    name: 'Morgan dollar',
    plural: 'Morgan dollars',
    years: { from: 1878, to: 1921 },
    seriesTag: 'morgan-dollar',
    written: true,
    /* Checked on 2026-09-23. Every date row was held against
       `data/mintages.json` -- this site's own mintage pipeline, which settles
       a figure by a vote of four cross-checked published sources -- and
       `tests/cheat-sheets.test.mjs` re-runs that comparison on every build, so
       this flag cannot go on being true after a figure moves underneath it.
       See the note in `sources`. */
    checked: true,
    sources: [
      'United States Mint annual report mintage figures',
      'A Guide Book of United States Coins (the Red Book), for the conventional key, semi-key and better-date boundaries',
      'Every mintage on this sheet was held against this site\u2019s own mintage pipeline, which settles each figure by a vote of four cross-checked published sources and records the disagreements; a build check re-runs the comparison',
      'PCGS CoinFacts and NGC VarietyPlus, for the variety diagnostics',
    ],
    denomination: 'one dollar piece',
    identify:
      'with a Liberty head in a coronet on one side and an eagle with spread wings inside a wreath on the other',
    mintMarks: 'none (Philadelphia), CC, O, S, or D in 1921 only',
    notes: [
      'Every Morgan dollar is 90 per cent silver.',
      'None were struck between 1905 and 1920, so the series runs 1878 to 1904 and then the single year 1921.',
      'Carson City struck Morgan dollars from 1878 to 1885 and again from 1889 to 1893, and in no other years.',
    ],
    dates: [
      { label: '1895', mintage: 880, rank: 'key', reason: 'Proofs only. No circulation strike of the Philadelphia 1895 is known.' },
      { label: '1893-S', mintage: 100000, rank: 'key', reason: 'The key of the series, and often faked by adding an S to a Philadelphia coin.' },
      { label: '1894', mintage: 110000, rank: 'key', reason: 'Lowest Philadelphia mintage of any Morgan struck for circulation.' },
      { label: '1885-CC', mintage: 228000, rank: 'semi-key', reason: 'Most of them sat in government vaults until the 1970s, so many are sharp.' },
      { label: '1881-CC', mintage: 296000, rank: 'semi-key' },
      { label: '1893-O', mintage: 300000, rank: 'key' },
      { label: '1889-CC', mintage: 350000, rank: 'key', reason: 'The Carson City key, and scarce in any grade.' },
      { label: '1893', mintage: 378000, rank: 'semi-key' },
      { label: '1895-S', mintage: 400000, rank: 'key' },
      { label: '1895-O', mintage: 450000, rank: 'key' },
      { label: '1880-CC', mintage: 591000, rank: 'semi-key' },
      { label: '1888-S', mintage: 657000, rank: 'better' },
      { label: '1893-CC', mintage: 677000, rank: 'key' },
      { label: '1889-S', mintage: 700000, rank: 'better' },
      { label: '1886-S', mintage: 750000, rank: 'better' },
      { label: '1879-CC', mintage: 756000, rank: 'key', reason: 'Usually found worn, and many have a weak or clashed mint mark.' },
      { label: '1892', mintage: 1036000, rank: 'better' },
      { label: '1882-CC', mintage: 1133000, rank: 'better' },
      { label: '1884-CC', mintage: 1136000, rank: 'better' },
      { label: '1892-S', mintage: 1200000, rank: 'key', reason: 'Common enough worn, and one of the great rarities with full lustre.' },
      { label: '1883-CC', mintage: 1204000, rank: 'better' },
      { label: '1903-S', mintage: 1241000, rank: 'semi-key' },
      { label: '1894-S', mintage: 1260000, rank: 'semi-key' },
      { label: '1892-CC', mintage: 1352000, rank: 'semi-key' },
      { label: '1885-S', mintage: 1497000, rank: 'better' },
      { label: '1902-S', mintage: 1530000, rank: 'better' },
      { label: '1891-CC', mintage: 1618000, rank: 'better' },
      { label: '1894-O', mintage: 1723000, rank: 'semi-key', reason: 'Weakly struck almost without exception.' },
      { label: '1887-S', mintage: 1771000, rank: 'better' },
    ],
    sharedErrors: ['off-centre-strike', 'clipped-planchet', 'die-crack-or-cud', 'repunched-mint-mark', 'lamination-flake'],
    commonErrors: [
      {
        label: '1878 eight tail feathers',
        check:
          'Count the tail feathers under the eagle. The first 1878 Philadelphia dies had eight; every later die in the series has seven.',
        caution:
          'A 7-over-8 also exists, where the tips of the old feathers show underneath the new ones. Eight clean feathers and seven with extra tips beneath them are two different coins, and the second is not the first.',
      },
    ],
    rareErrors: [
      {
        label: '1888-O doubled die obverse',
        check:
          'Strong doubling on Liberty\'s lips, nose and chin on an 1888 New Orleans coin, both images rounded and clearly separated.',
        caution:
          'Machine doubling leaves a flat shelf and is much commoner. The variety is scarce in any grade and very rare with lustre, so it is worth certifying rather than believing.',
      },
      {
        label: 'Micro O mint mark',
        check:
          'A noticeably small O mint mark on an 1896, 1900 or 1902 New Orleans coin.',
        caution:
          'All three were declared contemporary counterfeits in 2004, after it was shown they share a single reverse die. They are a curiosity rather than a mint variety, and they are not the ordinary coins of those dates.',
      },
    ],
  },
  {
    slug: 'peace-dollar',
    name: 'peace dollar',
    plural: 'peace dollars',
    years: { from: 1921, to: 1935 },
    /*
     * The series tag, which is what makes the date rows below link to the
     * catalogue rather than sit as plain text. It could not be set until the
     * Peace dollar was a registered series with coins behind it; it is, so
     * every one of the seventeen rows now resolves to a page.
     */
    seriesTag: 'peace-dollar',
    written: true,
    /*
     * CHECKED, and the first sheet on this site that is -- so what earned it
     * is worth stating rather than assuming.
     *
     * Every mintage below was traced by `npm run mintages`, which reads the
     * Breen table through the Wikipedia article that cites it and checks each
     * figure against Numista type 5580 row by row. All seventeen agree with
     * `data/mintages.json` exactly. Two of them -- the 1927-D and the 1928 --
     * are figures the two sources DISAGREE about, and both are published here
     * at the higher of the pair with the spread recorded against the coin,
     * which is this site's tie rule and not a silent preference.
     *
     * What this flag does NOT assert is that the proofs are covered. No source
     * publishes a mintage for the 1921 and 1922 matte and satin proofs, so
     * there are no rows for them and the sheet does not imply any.
     */
    checked: true,
    sources: [
      'Breen, Encyclopedia of U.S. and Colonial Coins (1988), pp. 461-462, through the mintage table that cites it on the Wikipedia Peace dollar article',
      'Numista type 5580, read against that table row by row by `npm run mintages`; the two differ on the 1927-D and the 1928 alone, and `data/mintages.json` records both figures with the higher taken',
      'A Guide Book of United States Coins (the Red Book), for the conventional key, semi-key and better-date boundaries',
      'PCGS CoinFacts and NGC VarietyPlus, for the variety diagnostics',
    ],
    denomination: 'one dollar piece',
    identify:
      'with a Liberty head wearing a spiked crown on one side and an eagle at rest on a rock on the other',
    mintMarks: 'none (Philadelphia), D, or S',
    notes: [
      'Every peace dollar is 90 per cent silver.',
      'None were struck between 1929 and 1933.',
      'Peace dollars dated 1964 were struck at Denver and then melted. None was ever released and none is known to exist.',
    ],
    dates: [
      { label: '1928', mintage: 360649, rank: 'key', reason: 'Lowest mintage of the series.' },
      { label: '1927', mintage: 848000, rank: 'semi-key' },
      { label: '1927-S', mintage: 866000, rank: 'semi-key' },
      { label: '1934', mintage: 954057, rank: 'semi-key' },
      { label: '1921', mintage: 1006473, rank: 'key', reason: 'Struck in high relief: the design stands noticeably higher than later years.' },
      { label: '1934-S', mintage: 1011000, rank: 'key', reason: 'Common enough worn, and the great rarity of the series with full lustre.' },
      { label: '1927-D', mintage: 1268900, rank: 'semi-key' },
      { label: '1934-D', mintage: 1569500, rank: 'semi-key', reason: 'See the doubled die below.' },
      { label: '1935', mintage: 1576000, rank: 'better' },
      { label: '1925-S', mintage: 1610000, rank: 'better', reason: 'Rarely found well struck.' },
      { label: '1928-S', mintage: 1632000, rank: 'semi-key' },
      { label: '1924-S', mintage: 1728000, rank: 'semi-key' },
      { label: '1926', mintage: 1939000, rank: 'better' },
      { label: '1935-S', mintage: 1964000, rank: 'better' },
      { label: '1926-D', mintage: 2348700, rank: 'better' },
      { label: '1923-D', mintage: 6811000, rank: 'better' },
      { label: '1926-S', mintage: 6980000, rank: 'better' },
    ],
    sharedErrors: ['off-centre-strike', 'clipped-planchet', 'die-crack-or-cud', 'repunched-mint-mark', 'lamination-flake'],
    rareErrors: [
      {
        label: '1934-D doubled die obverse',
        check:
          'Doubling on IN GOD WE TRUST and on the letters of LIBERTY on a 1934 Denver coin, both images rounded and separated.',
        caution:
          'Machine doubling is flat and shelf-like and is far commoner on this issue. The variety needs certifying before it is believed.',
      },
      {
        label: '1922 high relief',
        check:
          'A 1922 struck from the tall 1921 dies, with the whole design standing much higher than on an ordinary 1922.',
        caution:
          'Nearly every one was melted. A single circulation strike and about a dozen matte proofs are known, so a sharply struck ordinary 1922 is still an ordinary 1922, of which more than fifty million were made.',
      },
    ],
  },
  {
    slug: 'roosevelt-dime',
    name: 'Roosevelt dime',
    plural: 'Roosevelt dimes',
    years: { from: 1946 },
    written: true,
    /* Checked by the owner's review on 2026-09-23, not by the mintage
       pipeline, which has not been run for this series. See OWNER_CHECKED in
       tests/cheat-sheets.test.mjs. */
    checked: true,
    sources: [
      'United States Mint annual report mintage figures',
      'United States Mint circulating coins production figures',
      'A Guide Book of United States Coins (the Red Book), for the conventional key, semi-key and better-date boundaries',
      'PCGS CoinFacts and NGC VarietyPlus, for the variety diagnostics',
    ],
    denomination: 'ten cent piece',
    identify:
      'with President Roosevelt on one side and a torch between an olive and an oak branch on the other',
    mintMarks: 'none or P (Philadelphia), D, S, or W',
    notes: [
      'Dimes dated 1964 and earlier are 90 per cent silver. From 1965 they are copper-nickel clad.',
      'Stand a dime on its edge: a clad one shows a copper stripe all the way round and a silver one does not.',
      'Philadelphia struck no letter on its dimes until 1980, and coins dated 1965 to 1967 carry no mint mark at all.',
    ],
    dates: [
      { label: '1996-W', mintage: 1457000, rank: 'key', reason: 'Sold only in the 1996 mint set for the fiftieth anniversary, never released.' },
      { label: '1955', mintage: 12450181, rank: 'semi-key' },
      { label: '1949-S', mintage: 13510000, rank: 'semi-key' },
      { label: '1955-D', mintage: 13959000, rank: 'semi-key' },
      { label: '1955-S', mintage: 18510000, rank: 'better', reason: 'The last year San Francisco struck dimes for circulation.' },
      { label: '1950-S', mintage: 20440000, rank: 'better' },
      { label: '1954-S', mintage: 22860000, rank: 'better' },
      { label: '1949-D', mintage: 26034000, rank: 'better' },
      { label: '1946-S', mintage: 27900000, rank: 'better', reason: 'First year of the series.' },
      { label: '1949', mintage: 30940000, rank: 'better' },
      { label: '1958', mintage: 31910000, rank: 'better' },
      { label: '1947-S', mintage: 34840000, rank: 'better' },
      { label: '1948-S', mintage: 35520000, rank: 'better' },
    ],
    sharedErrors: ['off-centre-strike', 'clipped-planchet', 'die-crack-or-cud', 'repunched-mint-mark', 'lamination-flake'],
    commonErrors: [
      {
        label: '1982 with no P',
        check:
          'A 1982 dime with no mint mark at all above the date. Every other Philadelphia dime from 1980 onwards carries a P.',
        caution:
          'A grease-filled die weakens a P without removing it, so look for any outline, shadow or disturbed metal where the letter should be. A P taken off after striking leaves tooling marks and a flattened patch.',
      },
    ],
    rareErrors: [
      {
        label: 'Proof with no S',
        check:
          'A proof dime of 1968, 1970, 1975 or 1983 struck from a die on which the S was never punched. Proofs have mirror fields and frosted devices and come out of proof sets.',
        caution:
          'Circulation dimes of those years carry no mint mark either, because Philadelphia used no P until 1980, and they are worth ten cents. The mirror field is the whole difference, and the 1975 is known from two coins.',
      },
    ],
  },
  {
    slug: 'washington-quarter',
    name: 'Washington quarter',
    plural: 'Washington quarters',
    years: { from: 1932 },
    seriesTag: 'washington-quarter',
    written: true,
    /* Checked on 2026-09-23. Every date row was held against
       `data/mintages.json` -- this site's own mintage pipeline, which settles
       a figure by a vote of four cross-checked published sources -- and
       `tests/cheat-sheets.test.mjs` re-runs that comparison on every build, so
       this flag cannot go on being true after a figure moves underneath it.
       See the note in `sources`. */
    checked: true,
    sources: [
      'United States Mint annual report mintage figures',
      'United States Mint circulating coins production figures',
      'A Guide Book of United States Coins (the Red Book), for the conventional key, semi-key and better-date boundaries',
      'Every mintage on this sheet was held against this site\u2019s own mintage pipeline, which settles each figure by a vote of four cross-checked published sources and records the disagreements; a build check re-runs the comparison',
      'PCGS CoinFacts and NGC VarietyPlus, for the variety diagnostics',
    ],
    denomination: 'twenty five cent piece',
    identify:
      'with George Washington on one side and, until 1998, an eagle with spread wings on the other',
    mintMarks: 'none or P (Philadelphia), D, S, or W',
    notes: [
      'Quarters dated 1964 and earlier are 90 per cent silver. From 1965 they are copper-nickel clad.',
      'Stand a quarter on its edge: a clad one shows a copper stripe the whole way round and a silver one does not.',
      'There is no quarter dated 1975. Everything struck in 1975 and 1976 carries the double date 1776-1976.',
    ],
    dates: [
      { label: '1932-S', mintage: 408000, rank: 'key', reason: 'Lowest mintage of the series, from its first year.' },
      { label: '1932-D', mintage: 436800, rank: 'key', reason: 'The other 1932 key, and the one more often faked by adding a D.' },
      { label: '1937-S', mintage: 1652000, rank: 'semi-key' },
      { label: '2019-W', mintage: 2000000, rank: 'better', reason: 'Two million of each of the five 2019 designs, put into circulation on purpose.' },
      { label: '2020-W', mintage: 2000000, rank: 'better', reason: 'The same again in 2020, each one carrying a small V75 privy mark.' },
      { label: '1939-S', mintage: 2628000, rank: 'semi-key' },
      { label: '1940-D', mintage: 2797600, rank: 'semi-key' },
      { label: '1938-S', mintage: 2832000, rank: 'semi-key' },
      { label: '1955-D', mintage: 3182400, rank: 'better' },
      { label: '1934-D', mintage: 3527200, rank: 'semi-key' },
      { label: '1936-S', mintage: 3828000, rank: 'better' },
      { label: '1946-S', mintage: 4204000, rank: 'better' },
      { label: '1936-D', mintage: 5374000, rank: 'semi-key', reason: 'Scarce with full lustre, though the mintage is not the lowest.' },
      { label: '1932', mintage: 5404000, rank: 'better', reason: 'The Philadelphia 1932, and not one of the two keys.' },
      { label: '1947-S', mintage: 5532000, rank: 'better' },
      { label: '1935-S', mintage: 5660000, rank: 'better' },
      { label: '1935-D', mintage: 5780000, rank: 'better' },
      { label: '1958', mintage: 6360000, rank: 'better' },
      { label: '1939-D', mintage: 7092000, rank: 'better' },
      { label: '1937-D', mintage: 7189600, rank: 'better' },
      { label: '1940-S', mintage: 8244000, rank: 'better' },
      { label: '1951-S', mintage: 9048000, rank: 'better' },
      { label: '1946-D', mintage: 9072800, rank: 'better' },
      { label: '1949', mintage: 9312000, rank: 'better' },
      { label: '1938', mintage: 9472000, rank: 'better' },
      { label: '1949-D', mintage: 10068400, rank: 'better' },
      { label: '1950-S', mintage: 10284004, rank: 'better' },
      { label: '1954-S', mintage: 11834722, rank: 'better' },
    ],
    sharedErrors: ['off-centre-strike', 'clipped-planchet', 'die-crack-or-cud', 'repunched-mint-mark', 'lamination-flake'],
    commonErrors: [
      {
        label: '1950 over-punched mint mark',
        check:
          'On some 1950-D quarters the curve of an S shows inside the D, and on some 1950-S quarters a D shows underneath the S. Both letters are raised.',
        caution:
          'A repunched or grease-filled mint mark mimics both and is commoner. The under-letter has to be a readable shape in the right place rather than a blob, and machine doubling looks flat and shelf-like.',
      },
      {
        label: '2004-D Wisconsin extra leaf',
        check:
          'An extra leaf on the ear of corn on a 2004 Denver Wisconsin quarter, either curving up or pointing down. It is raised, bold and carries the same lustre as the design around it.',
        caution:
          'A scratch or a scrape is cut into the surface and looks rough at its edges. Only 2004 Denver Wisconsin quarters qualify, so check the year, the mint mark and the design before anything else.',
      },
    ],
    rareErrors: [
      {
        label: '1937 doubled die obverse',
        check:
          'Doubling on IN GOD WE TRUST on a 1937 Philadelphia quarter, both images rounded and fully separated.',
        caution:
          'Machine doubling leaves a flat shelf along one edge of a letter and is far commoner. Doubled dies are also recorded for 1934, 1942-D, 1943 and 1943-S, and every one of them is settled the same way.',
      },
    ],
  },
  {
    slug: 'wheat-penny',
    name: 'wheat penny',
    years: { from: 1909, to: 1958 },
    /*
     * The series tag, which is what makes the date rows below link to the
     * catalogue instead of sitting as plain text. It could not be set until
     * the wheat penny was a registered series with coins behind it.
     */
    seriesTag: 'wheat-penny',
    written: true,
    /*
     * CHECKED. Every one of the thirty-two rows below was traced by
     * `npm run mintages`, which reads the primary table and checks each
     * figure against Numista type 908 row by row; all thirty-two agree with
     * `data/mintages.json` exactly and all thirty-two resolve to a catalogue
     * page, the two VDB rows included.
     *
     * The 1909-S row states 1,825,000, which is the PLAIN reverse and not the
     * year. That is the owner's decision and the catalogue agrees with it:
     * the VDB is a coin of its own with its own page at 484,000, so neither
     * figure is a total and neither page restates the other.
     *
     * What this flag does not assert is that the proofs are here. They are
     * catalogue coins but not cheat-sheet rows, because a proof was bought
     * rather than found and this sheet is read standing over a jar.
     */
    checked: true,
    sources: [
      'Breen, Encyclopedia of U.S. and Colonial Coins (1988), and the Mint\u2019s annual reports, through the mintage tables that cite them on the Wikipedia Lincoln cent article',
      'Numista type 908, read against those tables row by row by `npm run mintages`',
      'A Guide Book of United States Coins (the Red Book), for the conventional key, semi-key and better-date boundaries',
    ],
    plural: 'wheat pennies',
    denomination: 'one cent piece',
    identify:
      'with two ears of wheat on the reverse that run down the sides of the words ONE CENT',
    mintMarks: 'none (Philadelphia), D, or S',
    notes: [
      'Cents dated 1943 are zinc-coated steel and jump to a magnet. Every other wheat cent is bronze or brass and does not.',
      'Cents dated 1944 to 1946 were struck from brass made with salvaged shell cases, with no tin in it.',
      'Philadelphia struck no letter on its cents, so a wheat cent with nothing under the date came from there.',
    ],
    dates: [
      { label: '1909-S VDB', mintage: 484000, rank: 'key', reason: 'Lowest mintage in the series. "VDB" initials at the bottom of the reverse.' },
      { label: '1931-S', mintage: 866000, rank: 'key', reason: 'Depression-year San Francisco. Many were saved, so often sharp.' },
      { label: '1914-D', mintage: 1193000, rank: 'key', reason: 'Most often faked, by adding a D to a Philadelphia cent.' },
      { label: '1909-S', mintage: 1825000, rank: 'key', reason: '1909-S without the VDB.' },
      { label: '1924-D', mintage: 2520000, rank: 'semi-key', reason: 'Struck from tired dies. Sharp ones are scarce.' },
      { label: '1911-S', mintage: 4026000, rank: 'semi-key' },
      { label: '1914-S', mintage: 4137000, rank: 'semi-key', reason: 'Scarce sharply struck.' },
      { label: '1912-S', mintage: 4431000, rank: 'semi-key' },
      { label: '1931-D', mintage: 4480000, rank: 'semi-key', reason: 'Far more common than the 1931-S.' },
      { label: '1926-S', mintage: 4550000, rank: 'semi-key', reason: 'Weakly struck. Set a sharp one aside.' },
      { label: '1915-S', mintage: 4833000, rank: 'semi-key' },
      { label: '1910-S', mintage: 6045000, rank: 'semi-key' },
      { label: '1913-S', mintage: 6101000, rank: 'semi-key', reason: 'Easily confused with the more common 1913-D.' },
      { label: '1933-D', mintage: 6200000, rank: 'semi-key' },
      { label: '1922-D', mintage: 7160000, rank: 'semi-key', reason: 'The only cent struck in 1922. See the 1922 plain error below.' },
      { label: '1923-S', mintage: 8700000, rank: 'semi-key', reason: 'Mushy mint mark as a rule.' },
      { label: '1932', mintage: 9062000, rank: 'better' },
      { label: '1912-D', mintage: 10411000, rank: 'better' },
      { label: '1932-D', mintage: 10500000, rank: 'better', reason: 'Often an indistinct mint mark.' },
      { label: '1924-S', mintage: 11696000, rank: 'better', reason: 'Weakly struck.' },
      { label: '1911-D', mintage: 12672000, rank: 'better' },
      { label: '1927-S', mintage: 14276000, rank: 'better' },
      { label: '1933', mintage: 14360000, rank: 'better' },
      { label: '1939-D', mintage: 15160000, rank: 'better', reason: 'Lowest Denver mintage of the late thirties.' },
      { label: '1938-S', mintage: 15180000, rank: 'better' },
      { label: '1921-S', mintage: 15274000, rank: 'better', reason: 'Rarely full detail in the wheat ears.' },
      { label: '1913-D', mintage: 15804000, rank: 'better' },
      { label: '1928-S', mintage: 17266000, rank: 'better' },
      { label: '1938-D', mintage: 20010000, rank: 'better' },
      { label: '1915-D', mintage: 22050000, rank: 'better' },
      { label: '1916-S', mintage: 22510000, rank: 'better' },
      { label: '1909 VDB', mintage: 27995000, rank: 'better', reason: 'Philadelphia, not the key date. Check the mint mark.' },
    ],
    /* Five of this series' six common errors happen to every coin ever
       struck, so they live in SHARED_ERRORS and are named here. BIE is the
       one that is only a Lincoln cent's. */
    sharedErrors: ['off-centre-strike', 'clipped-planchet', 'die-crack-or-cud', 'repunched-mint-mark', 'lamination-flake'],
    commonErrors: [
      {
        label: 'BIE die break',
        check: 'A small raised vertical bar between the B and the E of LIBERTY, so the word appears to read BIE. Raised, because it is metal that flowed into a crack in the die.',
        caution: 'A scratch or a gouge is cut into the coin and sits below the surface. If a fingernail catches in it, it is damage rather than a die break.',
      },
    ],
    rareErrors: [
      {
        label: '1943 bronze cent',
        check: 'A magnet. Every ordinary 1943 cent is zinc-coated steel and jumps to a magnet; a bronze one does not, and weighs about 3.1 grams against 2.7 for the steel.',
        caution: 'This is the most faked coin in the series. Almost every non-magnetic 1943 cent is an ordinary steel cent that has been copper-plated, which a magnet still catches, or a 1948 cent with the 8 reshaped into a 3. Fewer than two dozen genuine examples are known and one is never settled by eye.',
      },
      {
        label: '1944 steel cent',
        check: 'A magnet again, the other way round. The cent went back to bronze in 1944, so a 1944 that sticks to a magnet and weighs about 2.7 grams is the one to look at.',
        caution: 'A plated 1944, or a genuine 1943 steel cent with a reshaped last digit, accounts for very nearly every example anybody brings in. Weigh it before believing it.',
      },
      {
        label: '1955 doubled die',
        check: 'Strong, fully separated doubling on the date and on the words LIBERTY and IN GOD WE TRUST, clear without magnification. Both images are equally sharp and rounded.',
        caution: 'Two more common things are mistaken for it. Machine doubling leaves a flat shelf rather than a second rounded image; and the 1955 “poor man’s” version is die wear showing on the 5s alone, which is a different coin and worth very little.',
      },
      {
        label: '1922 plain, no D',
        check: 'A 1922 cent with no mint mark at all. Denver was the only mint striking cents that year, so a genuine one comes from a die whose mint mark had been polished away, and the accepted version has a strong, sharp back.',
        caution: 'Weak and partly filled D mint marks from the same year are common and are not the variety. If the back of the coin is soft as well, it is a worn-die 1922-D, which is an ordinary coin.',
      },
      {
        label: 'Wrong planchet strike',
        check: 'A scale. A cent struck on a blank meant for another denomination comes out the wrong weight, and usually the wrong colour or diameter — a cent on a dime blank is silver-coloured and about 2.5 grams.',
        caution: 'A cent that has been plated, acid-treated or run through a novelty press accounts for almost all of these. The weight settles it, and it has to be right for the denomination the blank came from rather than merely wrong for a cent.',
      },
    ],
  },
];

/* ===========================================================================
   Lookups
   =========================================================================== */

export const cheatSheetPath = (s: CheatSheet) => `${CHEAT_SHEETS_ROOT}/${s.slug}`;

/** Both flags, not either. One function, so the page's `noindex` prop and the
    sitemap filter cannot disagree. */
export const cheatSheetIndexable = (s: CheatSheet): boolean => s.written && s.checked === true;
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

/* ---------------------------------------------------------------------------
   The copy formulas. Derived, because ten becomes forty and nobody measures
   three dozen strings against meta.ts by hand. Each names its own series, so
   no two pages can ship one sentence.
   --------------------------------------------------------------------------- */

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

/** A stub's description says it is a stub: promising dates a reader will not
    find spends a click to disappoint somebody. */
export const cheatSheetDescription = (s: CheatSheet): string => {
  if (!s.written) {
    return `The ${s.name} ran ${cheatSheetRun(s)}. This cheat sheet of its key dates, mint marks and varieties is not written yet.`;
  }
  return fit(
    [
      `Which ${s.name} dates to set aside, ${cheatSheetRun(s)}: ${countDates(s)} dates ranked scarcest first with their mintages, plus the errors to check for. No prices.`,
      `Which ${s.name} dates to set aside, ${cheatSheetRun(s)}: ${countDates(s)} dates ranked scarcest first, with their mintages.`,
      `Which ${s.name} dates to set aside: the scarce dates, their mintages and the errors to check for.`,
    ],
    DESCRIPTION_MAX,
  );
};

/** How many dated issues the sheet ranks. A fact about the coins, not a count of the site. */
const countDates = (s: CheatSheet): number => s.dates?.length ?? 0;

/** The line under the name on a card. A stub's says the run and stops: ten
    cards apologising for themselves is the count rule in a different font.
    The admission is on the sheet's own page, where it is needed. */
export const cheatSheetTeaser = (s: CheatSheet): string =>
  s.written
    ? `${cheatSheetYears(s)}. The dates to set aside, ranked scarcest first.`
    : cheatSheetYears(s);

/** Generated, so each sheet's condition line names its own coin rather than
    repeating one sentence across the section. */
export const cheatSheetCondition = (s: CheatSheet): string => {
  const plural = s.plural ?? `${s.name}s`;
  return `As always, condition matters when it comes to ${plural}. ${sentenceCase(plural)} with all of their features, or with nice original lustre, should be set aside.`;
};

/** "between 1909 and 1958", or "from 1938 to today" for a series still running. */
export const cheatSheetBetween = (s: CheatSheet): string =>
  s.years.to ? `between ${s.years.from} and ${s.years.to}` : `from ${s.years.from} to today`;

/** Two sentences: what the coin is, and what can be punched on it. Generated
    rather than written, so it cannot grow. */
export const cheatSheetOpening = (s: CheatSheet): string =>
  `A ${s.name} is a United States ${s.denomination} struck ${cheatSheetBetween(s)} ${s.identify}. The possible mint marks are ${s.mintMarks}.`;

/**
 * The common error table, as it is printed: this series' own rows first,
 * then the ones every coin can carry. Own first because a reader who came for
 * this series has already read the universal five somewhere else.
 */
export const cheatSheetCommonErrors = (s: CheatSheet): CheatError[] => [
  ...(s.commonErrors ?? []),
  ...(s.sharedErrors ?? []).map((k) => SHARED_ERRORS[k]),
];

/* ---------------------------------------------------------------------------
   A date row and its catalogue page
   ---------------------------------------------------------------------------

   A date on a cheat sheet is an ordinary issue of the series that happens to
   be scarce, so it is a catalogue coin like any other and the row should reach
   it. Varieties and errors are the opposite and stay unlinked -- see the house
   rule; neither has a page and neither ever gets one.

   The link is DERIVED rather than written. A slug typed into the registry is a
   link that is dead until somebody writes the page, stale the day the page is
   renamed, and thirty-two rows of upkeep on one sheet before any of it is
   true. Derived, a row starts linking the moment its coin is added to the
   catalogue and stops the moment it is taken out, with no edit here at all --
   which is also why nothing below can produce a dead link: the only way to get
   a path is to have the coin in hand.

   What must never happen is the WRONG page: "1909-S VDB" reaching the plain
   1909-S cent is worse than no link, because the reader has the rarer coin and
   is being shown the commoner one's page. So a match has to agree on all three
   things the label states -- the year, the mint mark, and the qualifier after
   them -- and an ambiguous match fails the build rather than picking one.

   The catalogue is heading for a page per mint -- 1914-D its own page, 1909-S
   VDB its own page -- while the five quarters written so far cover a year in
   one page that names both mints. Both shapes have to resolve, and they are
   not the same answer: a row for Denver wants Denver's own page the day it
   exists, and the year page only until then. That is why the match is a
   preference and not a filter. The page struck AT that mint and nowhere else
   wins; a page covering several mints answers only for the marks nobody has
   given a page of their own yet. A row with no mark is Philadelphia and lands
   on the generic page, which is the same rule read from the other end.
   --------------------------------------------------------------------------- */

/**
 * Every catalogue coin a date row could be about, and the path of the one it
 * settles on.
 *
 * Both are `dateRowCoins()` in the catalogue module, which is where the rule
 * for reading "1909-S VDB" lives so that a series page's key dates and a
 * sheet's dates cannot come to different conclusions about one label. A sheet
 * with no registered `seriesTag` matches nothing, and most rows on most sheets
 * are undefined today.
 */
const cheatDateMatches = (s: CheatSheet, d: CheatDate): Coin[] =>
  dateRowCoins(s.seriesTag, s.name, d.label);

export const cheatDateHref = (s: CheatSheet, d: CheatDate): string | undefined => {
  const hits = cheatDateMatches(s, d);
  return hits.length === 1 ? coinPath(hits[0]) : undefined;
};

/** "Common Wheat penny Errors". Named, so no two sheets share a heading. */
export const cheatSheetErrorsH2 = (s: CheatSheet): string =>
  `Common ${titleCase(s.name)} Errors`;

/** "Rare Wheat penny Errors". */
export const cheatSheetRareErrorsH2 = (s: CheatSheet): string =>
  `Rare ${titleCase(s.name)} Errors`;

/* ---------------------------------------------------------------------------
   The hub's copy. Hand-written: one page, a bounded editorial act. The
   generator exists for the dozens below it.
   --------------------------------------------------------------------------- */

export const CHEAT_SHEETS_H1 = 'Coin Cheat Sheets';

export const CHEAT_SHEETS_BLUF =
  'These cheat sheets say which years and mint marks in a series are the scarce ones, so you can sort a jar or a roll of coins without learning the whole series first.';

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

/* ---------------------------------------------------------------------------
   Validation. Throws rather than warns: every failure below builds cleanly
   and is invisible in the output.
   --------------------------------------------------------------------------- */

/** A currency figure has no place here. Same rule as SeriesInfo. */
const MONEY = /[$£€]\s?\d/;
/** A date's note is a fragment. Past this it is prose, and prose belongs on the series page. */
const NOTE_MAX = 90;
/** A sheet note is a line or two. Past this it is the paragraph the sheet refuses to carry. */
const NOTE_LINE_MAX = 170;
/** Three. A fourth is a section, and a section is the series page. */
const NOTES_MAX = 3;

export function validateCheatSheets(): void {
  const problems: string[] = [];
  const seen = { slug: new Set<string>(), name: new Set<string>(), tag: new Set<string>() };
  const strings = new Map<string, string>();

  const unique = (value: string, what: string, where: string) => {
    const owner = strings.get(value);
    if (owner) problems.push(`${what} "${value}" is used by both ${owner} and ${where}`);
    else strings.set(value, where);
  };

  /* A shared row is printed on every sheet that names it, so a word true of
     one denomination is a word wrong on the rest. */
  const SERIES_WORD = /\b(cent|penny|pennies|nickel|dime|quarter|dollar|half)s?\b/i;
  for (const [key, e] of Object.entries(SHARED_ERRORS)) {
    const where = `SHARED_ERRORS["${key}"]`;
    if (!e.check.trim()) problems.push(`${where} names no test`);
    if (!e.caution.trim()) problems.push(`${where} carries no caution`);
    if (MONEY.test(e.check) || MONEY.test(e.caution)) problems.push(`${where} states a price`);
    const named = SERIES_WORD.exec(`${e.check} ${e.caution}`);
    if (named) problems.push(`${where} says "${named[0]}", but it is printed on every denomination`);
  }

  for (const s of CHEAT_SHEETS) {
    const where = cheatSheetPath(s);

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug)) {
      problems.push(`cheat sheet "${s.slug}" is not a lowercase hyphenated slug`);
    }
    if (seen.slug.has(s.slug)) problems.push(`two cheat sheets claim the slug "${s.slug}"`);
    seen.slug.add(s.slug);

    if (seen.name.has(s.name)) problems.push(`two cheat sheets are named "${s.name}"`);
    seen.name.add(s.name);

    /* Every capital a decision: a name stored "Wheat Penny" reads "A Wheat
       Penny is..." in the copy and nothing downstream can tell. */
    for (const word of [s.name, s.plural ?? ''].join(' ').split(/[\s-]+/).filter(Boolean)) {
      if (/^[A-Z]/.test(word) && !PROPER_SERIES_WORDS.has(word)) {
        problems.push(
          `${where}: "${word}" is capitalised but is not in PROPER_SERIES_WORDS \u2014 ` +
            'names are stored in sentence form and headings title-case them',
        );
      }
    }
    if (s.plural && s.plural === s.name) {
      problems.push(`${where}: the plural is the same string as the name`);
    }

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

    /* Half a sheet is the failure here: a reader scans, does not find their
       date, and concludes it is common. */
    if (s.written) {
      if (!s.sources || s.sources.length === 0) {
        problems.push(`${where} is written but names no source for its figures`);
      }
      for (const [what, value] of [
        ['plural', s.plural],
        ['denomination', s.denomination],
        ['identify', s.identify],
        ['mintMarks', s.mintMarks],
      ] as const) {
        if (!value || !value.trim()) {
          problems.push(`${where} is written but has no ${what}, so its opening cannot be built`);
        }
      }
      /* The length rule, enforced rather than asked for. */
      if ((s.identify ?? '').length > 160) {
        problems.push(`${where}: \`identify\` is a clause, not a paragraph — ${(s.identify ?? '').length} characters`);
      }
      if ((s.mintMarks ?? '').length > 80) {
        problems.push(`${where}: \`mintMarks\` is a list, not a sentence`);
      }
      if (!s.dates || s.dates.length === 0) {
        problems.push(`${where} is written but ranks no dates, which is the whole point of a sheet`);
      }
    } else {
      for (const [what, filled] of [
        ['sources', s.sources],
        ['identify', s.identify ? [s.identify] : undefined],
        ['dates', s.dates],
        ['commonErrors', s.commonErrors],
        ['sharedErrors', s.sharedErrors],
        ['rareErrors', s.rareErrors],
      ] as const) {
        if (filled && filled.length > 0) {
          problems.push(`${where} has ${what} but is still marked unwritten, so none of it renders`);
        }
      }
      if (s.checked) problems.push(`${where} is marked checked but is not written`);
    }

    /* Validated rather than sorted at render time: sorting would hide a
       mintage typed an order of magnitude wrong. */
    const labels = new Set<string>();
    let previous = -1;
    for (const d of s.dates ?? []) {
      if (d.mintage <= 0 || !Number.isFinite(d.mintage)) {
        problems.push(`${where}: "${d.label}" has no usable mintage`);
      }
      if (previous >= 0 && d.mintage < previous) {
        problems.push(`${where}: "${d.label}" is out of order — the dates run scarcest first`);
      }
      previous = d.mintage;
      if (labels.has(d.label)) problems.push(`${where} lists "${d.label}" twice`);
      labels.add(d.label);
      /* The row links to whichever catalogue coin answers its label. Two
         answers is two pages for one issue, and picking one at render time
         would hide it; the link is silent when there is no answer at all. */
      if (cheatDateMatches(s, d).length > 1) {
        problems.push(`${where}: "${d.label}" matches more than one catalogue coin`);
      }
      /* A note, and a note is short. Empty is fine; a sentence that has grown
         into two is the sheet turning back into an article. */
      if (d.reason !== undefined) {
        if (MONEY.test(d.reason)) problems.push(`${where}: "${d.label}" states a price`);
        if (d.reason.length > NOTE_MAX) {
          problems.push(`${where}: "${d.label}" has a note of ${d.reason.length} characters — notes are fragments, ${NOTE_MAX} at most`);
        }
      }
    }

    /* A note is a line, and there are at most three. This is the field that
       would quietly become the series page again, so the cap is the rule. */
    if (s.notes !== undefined) {
      if (!s.written) problems.push(`${where} has notes but is still marked unwritten, so none of it renders`);
      if (s.notes.length === 0) problems.push(`${where} has an empty notes array; leave the field out instead`);
      if (s.notes.length > NOTES_MAX) {
        problems.push(`${where} has ${s.notes.length} notes — ${NOTES_MAX} at most, or the sheet has grown a section`);
      }
      for (const note of s.notes) {
        if (!note.trim()) problems.push(`${where} has an empty note`);
        if (note.length > NOTE_LINE_MAX) {
          problems.push(`${where}: a note is ${note.length} characters — notes are lines, ${NOTE_LINE_MAX} at most`);
        }
        if (MONEY.test(note)) problems.push(`${where} states a price in a note`);
        /* Same rule as the archives: what the catalogue currently holds is
           not a fact about the coins. */
        if (/\bin the catalogue\b/i.test(note)) problems.push(`${where} describes the catalogue in a note`);
        /* The three the series page owns. A note naming one of them is the
           sheet turning back into the tag page one line at a time. */
        const trespass = /\b(designer|designed by|engraver|mint mark (?:is |sits |appears )|at a glance)\b/i.exec(note);
        if (trespass) {
          problems.push(`${where}: the note says "${trespass[0]}", which belongs on the series page`);
        }
        unique(note, 'note', where);
      }
    }

    /* A row without its caution sends somebody to a dealer to be
       disappointed. Required, not optional. */
    const seenKeys = new Set<string>();
    for (const k of s.sharedErrors ?? []) {
      if (!(k in SHARED_ERRORS)) problems.push(`${where} names "${k}", which is not in SHARED_ERRORS`);
      if (seenKeys.has(k)) problems.push(`${where} names "${k}" twice`);
      seenKeys.add(k);
    }

    for (const e of [...cheatSheetCommonErrors(s), ...(s.rareErrors ?? [])]) {
      if (labels.has(e.label)) problems.push(`${where} lists "${e.label}" twice`);
      labels.add(e.label);
      if (!e.check.trim()) problems.push(`${where}: "${e.label}" names no test`);
      if (!e.caution.trim()) problems.push(`${where}: "${e.label}" carries no caution`);
      if (MONEY.test(e.check) || MONEY.test(e.caution)) {
        problems.push(`${where}: "${e.label}" states a price`);
      }
    }

    for (const p of s.written ? [cheatSheetOpening(s), cheatSheetCondition(s)] : []) {
      if (MONEY.test(p)) problems.push(`${where} states a price in its prose`);
      unique(p, 'paragraph', where);
    }
    unique(cheatSheetErrorsH2(s), 'heading', where);
    unique(cheatSheetRareErrorsH2(s), 'heading', where);

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
  if (MONEY.test(CHEAT_SHEETS_BLUF)) {
    problems.push(`${CHEAT_SHEETS_ROOT} states a price in its copy`);
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
