/**
 * Mintages, fetched and parsed rather than typed.
 *
 *   npm run mintages   ->  data/mintages.json (committed)
 *   npm run coins      ->  src/data/coin-generated.ts (offline, deterministic)
 *
 * TWO COMMANDS, AND THE SPLIT IS THE HOUSE RULE. A build never fetches: it
 * must be reproducible, must work offline, and must not depend on somebody
 * else's uptime. So this script touches the network, writes a file, and that
 * file is committed and reviewed like any other. The same shape as
 * `npm run spot`.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS, WHICH IS WORTH RECORDING
 * ---------------------------------------------------------------------------
 *
 * The first eighty-three Washington quarters were added from a hand-typed
 * sheet. It shipped a real error: from 1980 the Philadelphia quarter carries a
 * P mint mark, and nineteen pages went out naming those issues "(No Mint Mark)"
 * and telling the reader there must be no letter in that spot. The source says
 * so in as many words -- "First time the P mint mark was used on the quarter" --
 * in a column a parser reads and an eye skims.
 *
 * That is the whole argument. A hand-typed sheet is a spreadsheet with extra
 * steps and it has one failure mode a machine does not: it is written by
 * somebody who already thinks they know the answer.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE SOURCE ENCODES THAT A PERSON WOULD HAVE TO KNOW
 * ---------------------------------------------------------------------------
 *
 * The mintage tables are far richer than lists of numbers, and every one of
 * these is derived here rather than decided by hand:
 *
 *   (P), (D), (S)   parentheses mean the coin carries NO mint mark. That is
 *                   stated at the top of each page and is why 1965-1967 -- when
 *                   marks were dropped nationwide -- need no special case.
 *   ^               "included in the figure above". Several mints, one coin
 *                   with no mark, one combined total. 1965-1967 again, and
 *                   West Point's 1977-1979 strikes.
 *   Comments        "Proof", "Silver proof", "Uncirculated", "Silver bullion",
 *                   "Satin finish", "Special Mint Set". This column is the
 *                   only thing that separates FOUR different coins sharing one
 *                   year and one mint mark, and getting it wrong folds a proof
 *                   mintage into a circulation figure -- the mistake that put
 *                   proof-inclusive nickel mintages on this site once already.
 *   rowspan         a year, and on one of the pages a MINT, carried down over
 *                   several rows. Read as written, a rowspanned mint leaves a
 *                   row whose first cell is a mintage, which a parser that
 *                   counts cells reads as the name of a mint.
 *   caption         the composition era AND, from 1999, the reverse design.
 *
 * ---------------------------------------------------------------------------
 * ONE COIN PER YEAR AND MINT MARK, WHICH MEANS SUMMING THE DESIGNS
 * ---------------------------------------------------------------------------
 *
 * From 1999 the quarter carries a commemorative reverse and there are five or
 * six of them a year. This site gives a page to a (year, mint mark, finish),
 * never to a design: one page per design would be nearly three hundred pages
 * of the same sentence, which is the generated-catalogue failure CLAUDE.md
 * names. So the figures are summed across the designs, and the sum carries
 * `designs` and a `breakdown` so that the page can say what its number counts
 * and a reviewer can add it up.
 *
 * The breakdown is not decoration. Two cases turn on it:
 *
 *   A PROOF MINTAGE IS PER DESIGN AND IDENTICAL ACROSS THEM, because it is the
 *   number of proof sets. 2009 reads 2,113,390 against each of the six
 *   territory designs, so San Francisco struck 12,680,340 clad proof quarters
 *   that year and the one in the reader's hand is one of 2,113,390.
 *
 *   THE SAME IS TRUE OF THE 2019-W AND 2020-W ISSUES, two million of each of
 *   five designs. Ten million is the total and is a number no reader of a W
 *   quarter should be given on its own: two million is why they are looking.
 *
 * ---------------------------------------------------------------------------
 * SOURCES, AND SAYING WHAT THEY ARE
 * ---------------------------------------------------------------------------
 *
 * Four Wikipedia pages, because the mintage figures for one series live on four
 * of them and each is a different table. That is recorded per page rather than
 * as one claim about the series, and so is the fact that a page's own citation
 * may be the same site another page cites -- the Washington page's mintage
 * column cites washingtonquarters.org, so it and that site are one source
 * wearing two hats. The output says so.
 *
 * The United States Mint's own production figures are the primary source and
 * cannot be automated: usmint.gov answers 403 to anything that is not a
 * browser. Numista is the second opinion that IS reachable -- there is a key in
 * `.env`, it is build-time only, and `--verify` is where a row-by-row
 * comparison belongs rather than in anybody's eye.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { loadNumista, numistaRows, normaliseDesign, sameDesign, pairDesigns } from './numista.mjs';

const OUT = 'data/mintages.json';
const CONSENSUS = 'data/mintage-consensus.json';

/** What to call the source the tables are parsed out of, when counting votes. */
const PRIMARY = 'Wikipedia';

/**
 * How far two quotations of one collector-issue figure may differ and still be
 * the same figure.
 *
 * Half a per cent. See the branch that uses it: a proof's mintage is a sales
 * figure that gets revised, not a production run, and 512,798 against 512,729 is
 * one number either side of a correction. Widening this would start merging
 * figures that really do disagree -- the next gap up in this series is eight per
 * cent, on the 2018-S proof, and that one is a genuine conflict.
 */
const NEAR_ENOUGH = 0.005;

/**
 * How many sources must agree before a coin NO PRIMARY SOURCE CARRIES is built.
 *
 * Two, where a coin the primary carries may stand on that one source. The
 * asymmetry is the point and it is not timidity: a figure the primary states is
 * being checked, and an absence of confirmation is an absence of checking. A
 * figure nothing states is being taken on trust, and one quotation of it cannot
 * be told apart from a typo -- which is the same reasoning as "two sources can
 * only agree or disagree", one step further down.
 */
const MIN_GAP_SOURCES = 2;

/**
 * The third and fourth opinions, if `npm run verify` has been run.
 *
 * Optional on purpose: the series import must work offline and from the
 * committed files alone, and a missing consensus file means fewer votes rather
 * than a failure. What it costs is coins withheld for want of a tiebreaker, and
 * the report says how many.
 */
const loadConsensus = (slug) => {
  if (!existsSync(CONSENSUS)) return [];
  const data = JSON.parse(readFileSync(CONSENSUS, 'utf8'));
  // A flat list already: one row per (source, year, mark, finish, design), with
  // the design named as THAT source names it. The merge pairs the names.
  return (data.series?.[slug]?.figures ?? []).map((row) => ({
    year: row.year,
    mark: row.mark,
    finish: row.finish,
    hub: row.hub ?? '',
    design: row.design,
    mintage: row.mintage,
    source: row.source,
  }));
};
const API = 'https://en.wikipedia.org/w/api.php';

/**
 * The last year this catalogue states figures for.
 *
 * The owner's decision: the catalogue stops where the published figures stop.
 * A page for the current year either states a partial total, which is a wrong
 * number, or states none, which is a page with nothing on it. Raise this the
 * year the source's table is complete, not the year the coins appear.
 */
const LAST_YEAR = 2025;

/* ---------------------------------------------------------------------------
   Finishes
   ---------------------------------------------------------------------------

   The Comments column, turned into the one fact that decides whether two rows
   sharing a year and a mint mark are one coin or two.

   ORDER MATTERS AND IS THE WHOLE OF THE CORRECTNESS HERE. "Silver bullion,
   uncirculated" names a five-ounce bullion coin and not the uncirculated
   quarter sold in Mint rolls, so the excluded patterns are tested first. A
   classifier that tested "uncirculated" first would file fifty-six bullion
   rounds as quarters. */

/**
 * Rows that are not a coin this catalogue holds, with the reason printed.
 *
 * Tested BEFORE the finishes below, which is the whole of the correctness here:
 * "Silver bullion, uncirculated" is a five-ounce bullion round and not the
 * uncirculated quarter sold in Mint rolls, and "Silver reverse proof" is not
 * the silver proof. A classifier reaching the short patterns first would file
 * fifty-six bullion rounds as quarters and give two coins one page.
 *
 * Everything here is a one-off collector finish, which is also why it is out:
 * nobody finds one in change, each needs a sentence of its own, and one year of
 * one finish is not a shape worth teaching the copy generator.
 */
const EXCLUDED = [
  { match: /bullion/i, why: 'a five-ounce silver bullion coin, not a quarter' },
  { match: /satin|special mint set/i, why: 'satin-finish mint-set issue: a third category, and nobody finds one in change' },
  { match: /enhanced/i, why: 'enhanced-uncirculated collector finish, 2017 only: a fourth category, out with the satin issues' },
  { match: /reverse proof/i, why: 'reverse-proof collector finish, 2018 only: a fifth category, out with the satin issues' },
  { match: /silver-clad/i, why: '40% silver-clad Bicentennial issue: hand-write it' },
  { match: /matte|prototype|pattern/i, why: 'not an issued coin' },
];

/**
 * What the source writes where it has no figure yet.
 *
 * Not a parse failure and not a zero. The table says in as many words that the
 * number is not published, which is a different thing from a number this script
 * could not read, and the two must not share a code path: one is a page that
 * cannot be written yet and the other is a page that would ship with the figure
 * from the row above it.
 */
const UNPUBLISHED = /^(TBA|TBD|N\/?A|Unknown|—|-)$/i;

/**
 * The finishes that DO get pages, and the slug token each contributes.
 *
 * A bare token is the one a reader's URL does not have to name: the clad proof
 * keeps `1999-s-washington-quarter` because from 1968 an S on a quarter means a
 * proof and nothing else, and the 1932-1954 S circulation strikes were
 * published under that form before any of this existed. A slug is never
 * changed once published, so the bare form goes to whichever coin already has
 * it.
 */
const FINISHES = [
  { finish: 'silver-proof', match: /silver proof/i, token: 'silver', silver: true },
  { finish: 'proof', match: /proof/i, token: '' },
  { finish: 'uncirculated', match: /uncirculated/i, token: 'uncirculated' },
];

/**
 * The exclusions a SERIES overrides, because the flat list above names one
 * series' problems.
 *
 * `EXCLUDED` was written for the quarter and one of its rules is actively
 * wrong elsewhere: `/matte|prototype|pattern/` is right that a matte-FINISH
 * quarter is a collector oddity nobody finds in change, and it is wrong about
 * the cent, where "Matte proof" is the ONLY proof the series had from 1909 to
 * 1916. Eight real issues -- the 1909 VDB matte proof among them, at 1,194
 * struck -- would have been dropped with the reason "not an issued coin",
 * which is the worst kind of silent failure: a refusal that reads like a
 * decision.
 *
 * So a series may name rules to DROP from the flat list and rules to ADD to
 * it, rather than restating the whole thing. Restating it would be a second
 * copy of five rules that the quarter and the Morgan both still depend on,
 * and the copy is what goes stale. This is the same move `SERIES` made in
 * `grade-sources.mjs` and `SOURCES` in `verify-mintages.mjs`, for the same
 * reason and with the same shape.
 */
const rulesFor = (series) => {
  const dropped = series?.exclusionsOff ?? [];
  const excluded = EXCLUDED.filter((e) => !dropped.includes(e.match.source)).concat(
    series?.exclusionsOn ?? [],
  );
  return { excluded, finishes: series?.finishes ?? FINISHES };
};

/** '' | 'proof' | 'silver-proof' | 'uncirculated', or null when the row is not a coin here. */
const finishOf = (comment, rules) => {
  const { excluded: rejects, finishes } = rules ?? { excluded: EXCLUDED, finishes: FINISHES };
  const excluded = rejects.find((e) => e.match.test(comment));
  if (excluded) return { excluded: excluded.why };
  const found = finishes.find((f) => f.match.test(comment));
  return { finish: found ? found.finish : 'circulation' };
};

/** The slug token a finish adds: '' for a circulation strike and for a clad proof. */
export const finishToken = (finish) =>
  finish === 'circulation' ? '' : (FINISHES.find((f) => f.finish === finish)?.token ?? '');

/* ---------------------------------------------------------------------------
   The series, and where their figures live
   --------------------------------------------------------------------------- */

/** Caption text -> composition group, for the captions that state one. */
const CLAD = { match: /Nickel-clad copper/i, group: 'clad' };
const SILVER = { match: /\(Silver\)/i, group: 'silver' };

const SERIES = [
  {
    slug: 'washington-quarter',
    /*
     * Coins the source carries that this catalogue does not publish.
     *
     * Empty, and it is worth recording why it is empty. It held the twenty-two
     * markless Philadelphia proofs of 1936-1942 and 1950-1964 for one afternoon,
     * because the slug convention could not hold them: the bare form was given
     * to the proof, and every one of those years has a markless proof AND a
     * markless circulation strike, so `1936-washington-quarter` would have been
     * two coins. They are in now, under `1936-proof-washington-quarter`, because
     * the rule was restated on the MARK rather than on the finish alone -- see
     * `issueSlug` in `coin-copy.ts`. The 1936 has a mintage of 3,837, which
     * makes it one of the scarcest Washington quarters there is and much the
     * best reason to have solved this rather than left it.
     */
    outOfScope: [],
    /**
     * Every page holding part of this series' figures, and how to read it.
     *
     * It is a list because the figures really are spread over four pages in
     * four shapes, and pretending otherwise is how 1999-2008 came to be
     * missing: the one page this script used does not carry the 50 State
     * tables at all.
     */
    sources: [
      {
        page: 'Washington_quarter_mintage_figures',
        covers: '1932-1998, the six 2009 territory reverses and the 2021 Crossing the Delaware reverse',
        shape: 'narrow',
        cites: 'washingtonquarters.org',
        composition: [SILVER, CLAD],
        ignore: [
          {
            match: /Bicentennial/i,
            why: 'dual-dated 1776-1976, a different reverse and a 40% silver-clad variant: hand-write it',
          },
        ],
      },
      {
        page: '50_State_quarters',
        covers: '1999-2008, the fifty state reverses',
        shape: 'wide',
        cites: 'statequarterguide.com',
        /*
         * A wide table: one row per DESIGN, one column per mint. The columns
         * are declared here and the header row is checked against them, so a
         * page that gets reordered fails rather than silently filing Denver's
         * figures under Philadelphia.
         */
        columns: {
          year: { index: 0, header: 'Year' },
          design: { index: 2, header: 'State' },
          /*
           * The San Francisco cell holds two figures with their finishes named
           * in brackets -- "3,713,359 (proof)" and "804,565 (silver proof)" --
           * because San Francisco struck no circulation quarters in these
           * years. `labelled` says to read the brackets rather than assume.
           */
          mints: [
            { index: 7, header: 'Philadelphia', mark: 'P', city: 'Philadelphia' },
            { index: 8, header: 'Denver', mark: 'D', city: 'Denver' },
            { index: 9, header: 'San Francisco', mark: 'S', city: 'San Francisco', labelled: true },
          ],
        },
        /*
         * The one caption on the page is the prose line over the table, so the
         * group cannot be read off it. Every 50 State quarter struck for
         * circulation is clad; the silver proofs are labelled in their own
         * cell and `finish` moves them to the silver group.
         */
        group: 'clad',
      },
      {
        page: 'America_the_Beautiful_quarter_mintage_figures',
        covers: '2010-2021, the America the Beautiful reverses',
        shape: 'narrow',
        cites: 'usacoinbook.com',
        composition: [CLAD],
      },
      {
        page: 'American_Women_quarters',
        covers: '2022-2025, the American Women reverses',
        shape: 'wide',
        cites: 'the United States Mint, through the article',
        columns: {
          year: { index: 0, header: 'Year' },
          design: { index: 2, header: 'Woman' },
          /*
           * Denver comes FIRST on this page. It is the only one of the four
           * where it does, which is the whole reason the columns are declared
           * and the header checked.
           *
           * The San Francisco column is NOT the proof. It is the uncirculated
           * coin sold in Mint rolls and bags: the Total column is the three
           * columns added up, 258,200,000 + 237,600,000 + 303,520 for Maya
           * Angelou, and 303,520 is far too small for a proof-set figure in
           * the years either side of it. `total` is checked against the sum on
           * every row, which is what turns that reasoning into a build
           * failure if the column ever means something else.
           */
          mints: [
            { index: 8, header: 'Denver', mark: 'D', city: 'Denver' },
            { index: 9, header: 'Philadelphia', mark: 'P', city: 'Philadelphia' },
            { index: 10, header: 'San Francisco', mark: 'S', city: 'San Francisco', finish: 'uncirculated' },
          ],
          total: { index: 11, header: 'Total' },
        },
        group: 'clad',
        /*
         * The clad proof and the silver proof of these years are not on this
         * page and are not anywhere this script can reach. Recorded rather
         * than guessed: a proof page with a mintage borrowed from the year
         * before is worse than no proof page.
         */
        missing: 'the 2022-2025 clad proof and silver proof mintages are not published in this table',
      },
    ],
  },
  {
    slug: 'morgan-dollar',
    /*
     * One page, one table, one design, one alloy -- the opposite of the
     * quarter in every respect, and worth reading as the shape a series took
     * before 1999.
     */
    /*
     * Nothing is filtered by rule here, and both of the things that could have
     * been are handled where they belong instead.
     *
     * The 2021 and 2023-2025 Morgan dollars are in the same Wikipedia table as
     * the original run and are a different coin -- .999 fine, sold at a
     * premium, never in circulation, a different weight and a different silver
     * content. They are bounded out by `years` on the source below rather than
     * by a rule here, because the reason is the table's, not the catalogue's.
     *
     * The 1878 tail-feather reverses and every VAM are varieties, and a
     * variety is listed and never followed. They are on the series page under
     * `varieties`; the figures below are the year's totals as the source
     * states them.
     */
    outOfScope: [],
    sources: [
      {
        page: 'Morgan_dollar',
        covers: '1878-1904 and 1921, every mint',
        shape: 'wide',
        cites: 'PCGS CoinFacts, through the article',
        /*
         * A wide table with no design column, because the series struck one
         * design for its whole run. `design` names it for the merge, which
         * pairs the two catalogues design by design and would pair a blank
         * with everything.
         */
        design: 'Morgan',
        years: { from: 1878, to: 1921 },
        columns: {
          year: { index: 0, header: 'Year' },
          /*
           * Philadelphia carries NO mint mark on this series, start to finish.
           * That is not the quarter's pre-1980 case with a P waiting at the end
           * of it; there is no marked Philadelphia Morgan dollar.
           */
          mints: [
            { index: 1, header: 'Philadelphia', mark: '', city: 'Philadelphia' },
            { index: 2, header: 'New Orleans', mark: 'O', city: 'New Orleans' },
            { index: 3, header: 'San Francisco', mark: 'S', city: 'San Francisco' },
            { index: 4, header: 'Carson City', mark: 'CC', city: 'Carson City' },
            { index: 5, header: 'Denver', mark: 'D', city: 'Denver' },
          ],
        },
        group: 'silver',
        /*
         * The table carries no proof figures at all except the 1895
         * Philadelphia, which it states as "880 (proof only)". Recorded rather
         * than filled: proofs were struck at Philadelphia every year of the
         * run, and a proof page with a mintage borrowed from anywhere would be
         * worse than no proof page.
         */
        missing: 'the Philadelphia proof mintages of 1878-1904 are not in this table; only the 1895, which the table states because no circulation strike of that date has ever been confirmed',
        /*
         * The machine-readable half of the sentence above, and the thing that
         * lets the other sources build those twenty-six coins.
         *
         * A DECLARED GAP IS NOT AN EXCLUSION, and keeping the two apart is the
         * whole of this field. The merge refuses to invent a coin the primary
         * does not carry, and it is right to: that rule is what stops the 1976
         * Bicentennial, which the primary source is told to ignore and every
         * other catalogue carries, walking back in through the side door. But
         * "this table does not cover proofs" and "this table was told to leave
         * the Bicentennial out" are different claims, and the old rule could
         * not tell them apart, so twenty-six coins that exist, that people
         * search for by name, and that three sources state the same figure
         * for, had no page.
         *
         * The bar for a coin built here is HIGHER than for one the primary
         * carries, not lower -- see `MIN_GAP_SOURCES`. A coin the primary
         * states may stand on that one source; a coin nothing states needs at
         * least two that agree, because with one there is nothing to check it
         * against and no way to tell a figure from a typo.
         */
        gaps: [
          {
            match: (row) => row.finish === 'proof' && row.mark === '' && row.year >= 1878 && row.year <= 1904,
            why: 'a Philadelphia proof of 1878-1904, which the primary source\u2019s table does not carry',
          },
          {
            /*
             * The two 1878 Philadelphia reverse hubs, at the owner's decision
             * of 2026-09-22, which reverses "a variety is listed and never
             * followed" for these two and for nothing else.
             *
             * What makes them different from a VAM: they are not a judgement
             * about a die, they are a feature a reader counts -- eight tail
             * feathers or seven -- and the sources state a separate mintage
             * for each, one of which is one coin in fourteen of the year. The
             * primary's table gives the year as a single total and does not
             * split it, which is a gap of exactly the same kind as the missing
             * proofs: the figures exist and this page does not carry them.
             *
             * The whole coin keeps its page and its total; see `rollUp` in
             * `numista.mjs` for why both are emitted.
             */
            match: (row) => row.hub === '8-tail-feathers' || row.hub === '7-tail-feathers',
            why: 'an 1878 Philadelphia reverse hub, which the primary source\u2019s table states only as the year\u2019s combined total',
          },
        ],
      },
    ],
  },
  {
    slug: 'wheat-penny',
    outOfScope: [],
    /*
     * THE RULE THIS SERIES HAD TO TURN OFF, and the reason `rulesFor` exists.
     *
     * `/matte|prototype|pattern/` is right about the quarter, where a matte
     * FINISH is a collector oddity, and wrong about the cent, where "Matte
     * proof" is the only proof the series had from 1909 to 1916. Eight real
     * issues would have been dropped under the reason "not an issued coin",
     * including the 1909 VDB matte proof at 1,194 struck.
     */
    /*
     * TWO of the flat list's rules are wrong for this series, and both remove
     * real proofs while reporting it as a decision.
     *
     * `matte|prototype|pattern` -- "Matte proof" is the only proof the cent
     * had from 1909 to 1916, eight issues including the 1909 VDB at 1,194.
     *
     * `satin|special mint set` -- written for the quarter's satin-finish MINT
     * SET coins, which are an uncirculated category nobody finds in change.
     * The cent's 1936 row reads "Proof, Satin finish (Type 1)": it is a
     * PROOF whose finish happens to be described with that word, it is the
     * first year proofs resumed after 1916, and at 5,569 struck it is the
     * scarcest of the later proofs. Excluding it left 1936 as the one hole in
     * an otherwise unbroken proof sequence. A Special Mint Set is a 1965-1967
     * thing and cannot arise here at all, so nothing is lost by dropping the
     * pair.
     */
    exclusionsOff: ['matte|prototype|pattern', 'satin|special mint set'],
    exclusionsOn: [
      /* Put back the two thirds of that rule that were never in dispute. */
      { match: /\bpattern\b/i, why: 'a pattern, not an issued coin' },
      { match: /\bprototype\b/i, why: 'not an issued coin' },
      /*
       * A POPULATION IS NOT A MINTAGE, and this table states several of each
       * in the same column. The off-metal errors carry "12 known to exist",
       * "Only 1 known", "Currently unique" -- and their figure cells hold
       * `c40`, `>27`, `c10`, `>1`, which are counts of survivors with a
       * qualifier attached. A mintage is how many were struck; these are how
       * many are left, nobody ever intended to strike one, and the two must
       * not share a column on a page of this site. They are on the series page
       * under `errors`, with the magnet test, which is where a coin settled by
       * measurement belongs.
       */
      { match: /\bknown\b|currently unique/i, why: 'a surviving population rather than a mintage: an off-metal error' },
      /*
       * The 1922 plain. Its figure cell is `^`, meaning "included above", and
       * it is a filled-die error with no mintage of its own -- so it is a
       * `varieties` row on the series page and not a coin here.
       */
      /*
       * ANCHORED ON "Error,", NOT ON "counterfeits", and the difference cost
       * the key date of the series.
       *
       * The 1922 plain's comment is "Error, many counterfeits exist" and the
       * 1914-D's is "Many counterfeits exist". A rule matching the word they
       * SHARE drops both -- and the 1914-D is not an error, it is an ordinary
       * Denver cent with a published mintage of 1,193,000 that happens to be
       * scarce enough to be worth faking. The warning is about the market, not
       * about the coin. It went missing from the catalogue without a trace,
       * because an excluded row is reported as a decision rather than a fault.
       *
       * What actually distinguishes the 1922 row is that the source calls it
       * an error, in that word, at the start of the sentence.
       */
      { match: /^error\b/i, why: 'the 1922 plain, a filled-die error with no mintage of its own' },
      { match: /\bover\s+[PDS]\b/i, why: 'an overmintmark variety, listed on the series page and never followed' },
      { match: /struck illegally/i, why: 'not an authorised issue' },
    ],
    sources: [
      {
        page: 'Lincoln_cent_mintage_figures',
        covers: '1909-1958, the wheat reverse, every mint and the proofs',
        shape: 'narrow',
        cites: 'the Red Book and the Mint’s annual reports, through the article',
        /*
         * Caption to composition group, and this is also what BOUNDS the run.
         * The page carries the Memorial, Bicentennial and Shield cents in the
         * same shape on the same page; a caption that matches nothing here is
         * ignored with a reason, so the six wheat tables are the whole of what
         * this source contributes and 1959 onward needs no rule of its own.
         *
         * 1943 is the only caption that changes the group, and it is what puts
         * those coins under /coin-info/steel/cent/ while every other wheat
         * penny files under copper.
         */
        /*
         * The two design names this series uses on BOTH sides of the merge.
         * "VDB" is the 1909 reverse carrying the designer's initials; "Plain"
         * is every other wheat cent, including 1918 onward where the initials
         * moved to Lincoln's shoulder and stopped being a reverse difference
         * at all. Only 1909 has two, which is why only 1909 sums.
         */
        designs: [
          /*
           * ANCHORED, and it has to be: "No VDB on reverse, 1909-1917"
           * CONTAINS "VDB on reverse, 1909" as a substring, so an unanchored
           * pattern matches both captions and files the plain 1909 reverse
           * under the design of the one that carries the initials. That is
           * not a figure going missing -- it is 1909's two designs collapsing
           * into one name, which would then be the same design twice on one
           * coin, and the sum check exists to catch exactly that.
           */
          /*
           * The 1909 VDB reverse is a COIN, at the owner's decision: the
           * 1909-S page states 1,825,000 for the plain reverse and the VDB
           * gets its own page at 484,000, rather than one page stating the
           * 2,309,000 the two come to. The initials are read off the foot of
           * the reverse with no loupe and the figures are four to one apart,
           * which is what a hub is for.
           */
          { match: /^VDB on reverse, 1909/i, design: 'VDB', hub: 'vdb' },
          { match: /No VDB on reverse/i, design: 'Plain' },
          { match: /VDB on Lincoln's bust/i, design: 'Plain' },
          { match: /Wartime cent/i, design: 'Plain' },
          { match: /Post-war wheat cent/i, design: 'Plain' },
        ],
        composition: [
          /* Anchored for the reason given on `designs` above. */
          { match: /^VDB on reverse, 1909/i, group: 'copper' },
          { match: /No VDB on reverse/i, group: 'copper' },
          { match: /VDB on Lincoln's bust/i, group: 'copper' },
          { match: /Wartime cent, 1943/i, group: 'steel' },
          { match: /Wartime cent, 1944/i, group: 'copper' },
          { match: /Post-war wheat cent/i, group: 'copper' },
        ],
        ignore: [
          {
            match: /Fraser/i,
            why: 'a 1952 pattern by James E. Fraser that was never issued',
          },
        ],
      },
    ],
  },
  {
    slug: 'peace-dollar',
    /*
     * The Morgan's shape exactly: one page, one table, one design, one alloy,
     * and a wide table with a column per mint. Read that entry first -- the
     * only things that differ here are which mints are in the header and what
     * the table carries past the end of the run.
     */
    /*
     * Nothing is filtered by rule, and the three things that could have been
     * are all bounded out by `years` on the source instead, because in every
     * case the reason belongs to the table rather than to the catalogue.
     *
     * The 2021 and 2023-2026 Peace dollars share the table with the original
     * run and are a different coin -- .999 fine, sold at a premium, never in
     * circulation. Same as the Morgan's revival.
     *
     * The 1964-D is NOT that. It is in the table with a figure of 316,106, and
     * it is not a different coin from the 1921-1935 series -- it is no coin at
     * all. Denver struck them and melted every one before any was released;
     * none exists, and none may lawfully be held. A page for it would be a
     * catalogue entry for an object a reader cannot be holding, which is the
     * one thing worse than no page. `years` stops at 1935 and that is what
     * keeps it out. Numista carries the same row, inside the same type, and it
     * is refused there by the merge for the ordinary reason: the primary
     * source does not publish the coin and no declared gap covers it.
     *
     * The West Point column is declared below even though it is empty for the
     * whole run, and that is deliberate -- see the note on `mints`.
     */
    outOfScope: [],
    sources: [
      {
        page: 'Peace_dollar',
        covers: '1921-1935, every mint',
        shape: 'wide',
        cites: 'Breen, Encyclopedia of U.S. and Colonial Coins (1988), pp. 461-462, in the header of every mint column',
        /*
         * One design for the whole run, so there is no design column and the
         * name comes from here. The merge pairs the two catalogues design by
         * design and a blank pairs with everything.
         */
        design: 'Peace',
        years: { from: 1921, to: 1935 },
        columns: {
          year: { index: 0, header: 'Year' },
          /*
           * Philadelphia carries NO mint mark on this series, start to finish.
           * There is no marked Philadelphia Peace dollar of any date.
           *
           * West Point is declared although it struck none of these. It is the
           * last column of the table and it holds figures for 2026, so leaving
           * it out would make a complete row five cells wide against a declared
           * width of four -- and, worse, would take the last heading out of the
           * order check. That check is the only thing standing between this
           * parser and every mint's figures filed one column across, and it is
           * strongest when it covers the whole header row.
           */
          mints: [
            { index: 1, header: 'Philadelphia', mark: '', city: 'Philadelphia' },
            { index: 2, header: 'Denver', mark: 'D', city: 'Denver' },
            { index: 3, header: 'San Francisco', mark: 'S', city: 'San Francisco' },
            { index: 4, header: 'West Point', mark: 'W', city: 'West Point' },
          ],
        },
        group: 'silver',
        /*
         * No proof figures, and unlike the Morgan there is no `gaps` entry
         * beside this sentence -- which is the difference worth reading.
         *
         * The Morgan's Philadelphia proofs were struck to a published annual
         * figure every year of the run, three sources state the same number,
         * and the only reason they had no page was that this table does not
         * carry them. That is a gap: the figures exist and this source does not
         * hold them.
         *
         * The Peace dollar's are not. What exist are the 1921 and 1922 matte
         * and satin proofs, and no mint ever published a mintage for one; what
         * gets quoted is how many are KNOWN, which is a survival estimate and
         * not a mintage at all. Numista carries no proof issue for the series.
         * Declaring a gap here would invite the merge to build a coin out of
         * two quotations of somebody's census, which is exactly what
         * `MIN_GAP_SOURCES` cannot tell from two quotations of a figure.
         *
         * So the absence is stated and left alone. The proofs are on the series
         * page under `varieties`, where a coin settled by authentication rather
         * than by a number belongs.
         */
        missing: 'this table carries no proof mintages for the series, and no source publishes one: the 1921 and 1922 matte and satin proofs are recorded as populations known rather than as coins struck',
      },
    ],
  },
  {
    slug: 'mercury-dime',
    /*
     * THE SERIES WITH NO WIKIPEDIA PAGE, and the first one on this site.
     *
     * The article "Mercury dime" carries no table of any kind -- not a mintage
     * table it could not read, none at all -- and there is no "dime mintage
     * figures" page in the family that holds the cent, the nickel, the quarter
     * and the half dollar. The Roosevelt dime has one and this series does not.
     * So `sources` is empty, and that is a statement about Wikipedia rather
     * than about the figures: five other sources carry the whole run and agree
     * with each other on all but two figures.
     *
     * `primary` names the one that seeds the catalogue. See the long note at
     * its use in `main()` for why it is Numista and not one of the charts.
     */
    primary: {
      via: 'numista',
      covers: '1916-1945, every mint, circulation strikes and the Philadelphia proofs',
      cites: 'the catalogue’s own issue records, which carry a PCGS reference per issue',
      why: 'Wikipedia has no mintage table for this series -- the article carries no table at all and there is no "dime mintage figures" page -- so the catalogue is seeded from Numista and the four collector sources vote on the figures exactly as they do elsewhere',
    },
    /*
     * Empty, and unlike the Washington quarter's there is nothing that was
     * nearly in it. The series struck one design for thirty years in one alloy,
     * with no bullion issue, no satin finish and no dual-dated coin. The 2016
     * gold centennial and the 2026 Semiquincentennial dime both carry the name
     * and neither is an issue of this series; they are kept out by the anchored
     * `titleMatch` in `NUMISTA_SERIES`, which is where a fact about what the
     * catalogue calls a type belongs.
     */
    outOfScope: [],
    sources: [],
  },
];


/* ---------------------------------------------------------------------------
   Adjudications
   --------------------------------------------------------------------------- */

/**
 * Where the two sources disagree and somebody has settled it.
 *
 * JUDGEMENT HERE, MECHANICS IN THE MERGE -- the same split the grade sheets
 * follow. The merge cannot decide which of two figures is right and must not
 * try: neither source is reliably better, and the evidence for that is in this
 * list. Numista is right about the 2000 South Carolina quarter, where Wikipedia
 * has copied the row above it; Wikipedia is right about the 2018 Apostle
 * Islands quarter and the 2009 District of Columbia quarter, where Numista is
 * low by a third. A rule preferring either one would have shipped one of those
 * three wrong.
 *
 * So each entry is a decision a person made, against a THIRD source named in
 * `checked`, and an unadjudicated conflict withholds its coin. That is the
 * evidence rule the grade pages already run on, applied to a mintage.
 *
 *   design   as the PRIMARY source names it, normalised the same way the merge
 *            pairs them, so one entry covers a design both catalogues spell
 *            differently.
 *   finish   REQUIRED, and the reason is a mistake this list made on its first
 *            afternoon: an entry scoped to a year and a design alone silently
 *            settled the 2018-S proof and silver proof as well as the
 *            circulation strike, on the strength of a circulation figure that
 *            says nothing about either. `mark` is optional, because a figure
 *            checked as a P and D pair really does settle both.
 *   take     'primary' or 'second'.
 *   checked  the third source that settled it, and what it said. Not optional:
 *            an entry with nobody behind it is a preference, and a preference
 *            is what this list exists instead of.
 */
const ADJUDICATED = [
  {
    /*
     * The one entry in this list that settles a coin NO PRIMARY SOURCE STATES,
     * and it is settled against the primary source all the same -- by
     * arithmetic rather than by a fourth table.
     *
     * `take` is a figure here rather than the name of a source, which is the
     * one shape this list did not have and needs exactly once: both sources
     * are secondary, so "take the primary" names nothing.
     */
    year: 1878,
    mark: '',
    hub: '8-tail-feathers',
    design: 'Morgan',
    finish: 'circulation',
    take: 749500,
    checked:
      'The primary source states 10,508,800 for the 1878 Philadelphia dollar and both secondary sources agree the seven-feather reverse is 9,759,300. The difference is 749,500 exactly, which is what one of them states for the eight-feather reverse; the other states 750,000, and its own year total is 10,509,300 — the same figure rounded, carried through. So this is not two counts of the coin, it is one count and a rounding of it, and the unrounded one is the one the primary source’s total was built from.',
  },
  {
    year: 2000,
    design: 'South Carolina',
    finish: 'circulation',
    take: 'second',
    checked:
      'PCGS CoinFacts gives 742,576,000 for the 2000-P and 566,208,000 for the 2000-D, a total of 1,308,784,000. The primary source states 373,400,000 and 401,424,000, which are the 1999 Delaware figures from the row five above it, and which would make South Carolina an outlier at half the mintage of every other 2000 state.',
  },
  {
    year: 2018,
    design: 'Apostle Islands',
    mark: 'D',
    finish: 'circulation',
    take: 'primary',
    checked:
      'PCGS CoinFacts gives 213,400,000 for the 2018-D. The second source states 137,800,000, low by a third. This settles the D and nothing else: the 2018-S proof and silver proof of the same design are still contested, and the figure quoted here is no evidence about them.',
  },
  {
    year: 2010,
    design: 'Hot Springs',
    finish: 'circulation',
    take: 'primary',
    checked:
      'CoinNews reported 30,600,000 and 29,000,000 in May 2010 and the final figures as 35,600,000 and 34,000,000; Greysheet and NGC both carry the higher pair. The second source is holding the FIRST announcement rather than a different count, which is worth knowing about the other America the Beautiful conflicts in this list \u2014 but it is not a rule, and each one still needs checking on its own.',
  },
  {
    year: 2009,
    design: 'District of Columbia',
    finish: 'circulation',
    take: 'primary',
    checked:
      'The published total for the 2009 District of Columbia quarter is 172,400,000, which is the primary source\u2019s 83,600,000 and 88,800,000 added up. The second source states 45,000,000 and 42,600,000, totalling 87,600,000.',
  },
];

/** The adjudication covering a conflicted design, if there is one. */
const adjudicationFor = (row, problems) => {
  const found = ADJUDICATED.find(
    (a) =>
      a.year === row.year &&
      normaliseDesign(a.design) === normaliseDesign(row.design) &&
      (a.mark === undefined || a.mark === row.mark) &&
      (a.hub ?? '') === (row.hub ?? '') &&
      a.finish === row.finish,
  );
  if (found && (!found.finish || !found.checked)) {
    problems.push(
      `the adjudication for ${found.year} ${found.design} states no ${found.finish ? 'third source' : 'finish'}. A decision with nothing behind it is a preference.`,
    );
    return undefined;
  }
  return found;
};

/* ---------------------------------------------------------------------------
   Wikitext
   --------------------------------------------------------------------------- */

/**
 * Split on a delimiter at the top level, stepping over `[[...]]` and `{{...}}`.
 *
 * A wikilink contains a pipe -- `[[Georgia (U.S. state)|Georgia]]` -- and so
 * does a file thumbnail and half the templates. Splitting a cell on the last
 * pipe it contains, which is what this script used to do, reads the display
 * half of a link as the whole cell. That was survivable while every cell held
 * a number and is not survivable on a table whose third column is a state.
 */
const splitTop = (text, delimiter) => {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.startsWith('[[', i) || text.startsWith('{{', i)) {
      depth += 1;
      i += 1;
      continue;
    }
    if (text.startsWith(']]', i) || text.startsWith('}}', i)) {
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }
    if (depth === 0 && text[i] === delimiter) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
};

/** Refs, links and markup out; the value a reader sees left behind. */
export const clean = (cell) =>
  cell
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    // `{{sortname|Maya|Angelou}}` is how a name is written in a sortable
    // table, and it is the only template here whose content is wanted.
    /*
     * `{{sortname|Nina|Otero-Warren}}` displays "Nina Otero-Warren". A third
     * parameter is the sort key, not part of the name, so joining every
     * parameter gives "Nina Otero-Warren Adelina Otero-Warren" -- which is what
     * a design would then be called on the page that summed it.
     */
    .replace(/\{\{sortname\|([^}]*)\}\}/gi, (_, args) => args.split('|').slice(0, 2).join(' '))
    .replace(/\[\[File:[^\]]*\]\]/gi, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Whether the text before a cell's first top-level pipe is HTML attributes. */
const looksLikeAttributes = (text) => /=/.test(text) && !/[[\]{}]/.test(text);

/**
 * One cell line into its value and its rowspan.
 *
 * `| rowspan="2" |S` is a value of S carried down two rows; `|(P)` is a value
 * of (P); `|[[Delaware]]` is a value containing a link and no attributes at
 * all. The three are told apart by whether the text before the first top-level
 * pipe reads as attributes, which is the rule MediaWiki itself uses.
 */
const cellOf = (line, keepRaw = false) => {
  const body = line.slice(1);
  const parts = splitTop(body, '|');
  const hasAttributes = parts.length > 1 && looksLikeAttributes(parts[0]);
  const attributes = hasAttributes ? parts[0] : '';
  const raw = hasAttributes ? parts.slice(1).join('|') : body;
  const rowspan = /rowspan\s*=\s*"?(\d+)"?/i.exec(attributes);
  return { value: keepRaw ? raw : clean(raw), rowspan: rowspan ? Number(rowspan[1]) : 1 };
};

/**
 * One wikitable into rows of cells, with rowspans expanded.
 *
 * A rowspanned cell is repeated into every row it covers, at the column it
 * occupies, so every row this returns has the table's full width and a caller
 * can address a column by its index. Read as written instead, the row under a
 * `rowspan="2"` mint is two cells long and its first cell is a mintage --
 * which a parser that destructures by position reads as the name of a mint,
 * reports as unknown, and exits on. That is how the America the Beautiful
 * page, whose figures are otherwise in exactly the shape this script already
 * read, could not be read at all.
 */
export const parseTable = (wikitext, { keepRaw = false } = {}) => {
  const rows = [];
  /** Cells still spanning down, as { column, value, left }. */
  let carried = [];
  let row = null;
  let headers = null;
  let pendingHeaders = [];

  const closeRow = () => {
    if (!row) return;
    // Place the cells still spanning down at the columns they occupy, and fill
    // every other column in order from the cells this row declares itself.
    const out = [];
    const own = [...row];
    const started = [];
    const width = row.length + carried.length;
    while (out.length < width) {
      const held = carried.find((c) => c.column === out.length);
      if (held) {
        out.push(held.value);
        continue;
      }
      const cell = own.shift();
      if (!cell) break;
      if (cell.rowspan > 1) started.push({ column: out.length, value: cell.value, left: cell.rowspan - 1 });
      out.push(cell.value);
    }
    rows.push(out);
    carried = carried
      .map((c) => ({ ...c, left: c.left - 1 }))
      .filter((c) => c.left > 0)
      .concat(started);
  };

  for (const raw of wikitext.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('|-')) {
      closeRow();
      row = [];
      continue;
    }
    if (line.startsWith('|}')) break;
    if (line.startsWith('!')) {
      /*
       * A `!` cell is a header UNLESS it says `scope="row"`, in which case
       * MediaWiki means it as the row's own label and it is data. The Morgan
       * dollar table writes every year that way -- `! scope="row" | 1878` --
       * and read as a header it takes the entire year column out of the rows
       * and pushes it into the header list, leaving five-cell rows whose first
       * figure is Philadelphia's and no year to file any of them under. The
       * quarter pages use no row scopes at all, so this changes nothing there.
       */
      if (/scope\s*=\s*"?row"?/i.test(line) && row) {
        row.push(cellOf(`|${line.slice(1)}`, keepRaw));
        continue;
      }
      // Header cells, for checking that a wide table's columns are where the
      // caller declared them. `!!` puts several on one line, and a header cell
      // carries attributes exactly as a data cell does.
      for (const part of line.slice(1).split('!!')) {
        if (part.trim() === '') continue;
        pendingHeaders.push(cellOf(`|${part}`).value);
      }
      continue;
    }
    if (!row) continue;
    if (line.startsWith('|+') || !line.startsWith('|')) continue;
    // The first data row closes the header: a second header band underneath it
    // is the per-mint row of a wide table and belongs to the columns above.
    if (headers === null && pendingHeaders.length > 0) headers = pendingHeaders;
    row.push(cellOf(line, keepRaw));
  }
  closeRow();
  if (headers === null) headers = pendingHeaders;
  return { rows: rows.filter((r) => r.some((c) => c !== '')), headers };
};

/** Every `{| ... |}` in the page, with its caption. */
export const splitTables = (wikitext) => {
  const tables = [];
  for (const part of wikitext.split('{|').slice(1)) {
    const body = part.split('|}')[0];
    const caption = /^\s*\|\+(.*)$/m.exec(body);
    tables.push({ caption: caption ? clean(caption[1]) : '', body });
  }
  return tables;
};

/**
 * The reverse design a caption names.
 *
 * "Hot Springs reverse, 2010 (Nickel-clad copper...)" is the Hot Springs
 * design. It is worth having because it is what makes a summed figure
 * reviewable: five named designs adding to the total the page prints.
 */
const designOf = (caption) => {
  const match = /^(.*?)\s+reverse,/i.exec(caption);
  return match ? match[1].trim() : caption;
};

/* ---------------------------------------------------------------------------
   Rows into issues
   --------------------------------------------------------------------------- */

/**
 * Every mark any United States mint has struck, because the narrow tables all
 * use the same legend and a series older than this one will reach O and CC.
 *
 * A mark this map does not hold is reported and the run fails. That is the
 * point: a mint nobody has registered is either a page that has changed or a
 * series this script has not been told about, and both are worth a person
 * looking rather than a row quietly going missing.
 */
const CITY = {
  P: 'Philadelphia',
  D: 'Denver',
  S: 'San Francisco',
  W: 'West Point',
  O: 'New Orleans',
  CC: 'Carson City',
  /*
   * Not Charlotte and not Dahlonega. Both struck gold only, both closed in
   * 1861, and Dahlonega's mark was a D -- the same letter Denver has used since
   * 1906. One letter meaning two mints cannot be resolved from a mint cell
   * alone, so a gold series reaching those years needs the year in the
   * decision and this map is the wrong shape for it. Better to fail than to
   * name the wrong building.
   */
};

const readMintage = (cell) => {
  const digits = cell.replace(/[,\s]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 ? value : null;
};

/**
 * A narrow table's rows into the per-design issues a catalogue can hold.
 *
 * Year / Mint / Mintage / Comments, which is the shape of the Washington page
 * and of the America the Beautiful page. Three things are got right here that
 * a person reading the same table gets wrong: a parenthesised mint means no
 * mint mark on the coin; a `^` mintage means this mint's output is inside the
 * figure above, so it is the SAME coin rather than another one; and the
 * Comments column is what separates four coins sharing a year and a mark.
 */
export const narrowIssues = (rows, ctx) => {
  const { problems, excluded, unpublished, where, group, design, hub, rules } = ctx;
  const issues = [];
  let year = null;
  let lastMarkless = null;

  for (const row of rows) {
    // Every row now carries the table's full width, rowspans expanded, so the
    // year and the mint are always in the first two columns.
    const [yearCell, mintCell, mintageCell, comment = ''] = row;
    if (!/^\d{4}$/.test(yearCell)) {
      // A row of a wholly different shape -- a footnote spanning the table.
      if (row.filter((c) => c !== '').length > 1) {
        problems.push(`${where}: cannot read a year from "${yearCell}"`);
      }
      continue;
    }
    if (Number(yearCell) !== year) lastMarkless = null;
    year = Number(yearCell);
    if (mintCell === undefined || mintageCell === undefined) continue;

    const kind = finishOf(comment, rules);
    if (kind.excluded) {
      excluded.push({ where: `${where} ${year} ${mintCell}`, why: kind.excluded });
      continue;
    }

    const markless = /^\(.*\)$/.test(mintCell);
    const letter = mintCell.replace(/[()]/g, '').trim().toUpperCase();
    const city = CITY[letter];
    if (!city) {
      problems.push(`${where} ${year}: "${mintCell}" is not a mint this script knows`);
      continue;
    }

    // "included in the figure above": another mint, the same markless coin.
    if (mintageCell === '^') {
      if (!markless) {
        problems.push(`${where} ${year}-${letter}: a marked coin cannot share another's figure`);
        continue;
      }
      if (!lastMarkless) {
        problems.push(`${where} ${year}: a "^" figure with nothing above it to join`);
        continue;
      }
      if (!lastMarkless.struckAt.includes(city)) lastMarkless.struckAt.push(city);
      continue;
    }

    if (UNPUBLISHED.test(mintageCell)) {
      unpublished.push(`${where} ${year}-${letter}${comment ? ` (${comment})` : ''}: the table states "${mintageCell}"`);
      continue;
    }
    const mintage = readMintage(mintageCell);
    if (mintage === null) {
      problems.push(`${where} ${year}-${letter}: "${mintageCell}" is not a mintage`);
      continue;
    }

    const issue = {
      year,
      mark: markless ? '' : letter,
      finish: kind.finish,
      struckAt: [city],
      group,
      design,
      ...(hub ? { hub } : {}),
      mintage,
      ...(comment && kind.finish === 'circulation' ? { note: comment } : {}),
    };
    issues.push(issue);
    if (markless) lastMarkless = issue;
  }
  return issues;
};

/**
 * A wide table's rows into per-design issues: one row per design, one column
 * per mint.
 *
 * The columns are declared by the caller rather than found, and the header row
 * is checked against the declaration, because the two pages in this shape do
 * not agree on the order of their own mints -- the 50 State table runs
 * Philadelphia, Denver, San Francisco and the American Women table runs
 * Denver, Philadelphia, San Francisco. A parser that guessed would file four
 * years of Denver's figures under Philadelphia and every number would look
 * plausible.
 */
export const wideIssues = (rows, headers, ctx) => {
  const { problems, excluded, unpublished, malformed, where, group, columns, design: only, rules } = ctx;
  /*
   * How wide a complete row is, from the columns the caller declared. A row
   * narrower than this has lost a cell, and every cell after the gap has shifted
   * one column left -- which is not a wrong figure, it is four right figures
   * filed under the wrong headings, and there is no way to tell from the row
   * itself WHICH cell went missing. So the row is refused whole and reported,
   * and the second source supplies that design.
   */
  const width = Math.max(...[columns.year, columns.design, ...columns.mints, columns.total].filter(Boolean).map((c) => c.index)) + 1;
  const issues = [];

  /*
   * Checking the columns are the columns, which is the one thing standing
   * between this function and four years of Denver's figures filed under
   * Philadelphia.
   *
   * It cannot be done by position. Both pages carry a two-band header -- five
   * or six labels spanning two rows, then `colspan="4" | Mintage` over a second
   * band naming the mints -- so a heading's place in the header list is not its
   * place in a data row: on the American Women page, Denver is data column 8
   * and header 10.
   *
   * What IS reliable is ORDER. A page that swaps two mints swaps their headings
   * too, so the check is that every declared heading appears, and appears in
   * the order the data columns are declared in. That catches the one failure
   * worth catching and nothing else. The `total` check below is the other half:
   * it re-adds the mints on every row and compares the page's own sum, which is
   * what makes "the San Francisco column is the uncirculated coin" a build
   * failure the day it stops being true rather than a remembered reading.
   */
  const declared = [columns.year, columns.design, ...columns.mints, columns.total].filter(Boolean);
  let previous = -1;
  for (const column of declared) {
    const at = headers.indexOf(column.header);
    if (at === -1) {
      problems.push(
        `${where}: no column is headed "${column.header}", so data column ${column.index} cannot be read`,
      );
      continue;
    }
    if (at < previous) {
      problems.push(
        `${where}: "${column.header}" now comes before the column declared ahead of it. The table has been reordered and every figure on this page would be filed under the wrong heading.`,
      );
    }
    previous = at;
  }
  if (problems.length > 0) return [];

  for (const row of rows) {
    const yearCell = row[columns.year.index];
    if (!/^\d{4}$/.test(yearCell)) continue;
    const year = Number(yearCell);
    /*
     * A page whose table runs past the series it is registered for. The Morgan
     * dollar article carries the 2021 revival and the 2023-2025 issues in the
     * same table as the original run, and those are .999 fine coins sold at a
     * premium rather than the 90% silver series this catalogue calls the Morgan
     * dollar. Without the bound they would generate pages under the original
     * series' composition era and state the wrong weight and the wrong silver
     * content.
     */
    if (ctx.years && (year < ctx.years.from || year > ctx.years.to)) continue;
    /*
     * `columns.design` is absent on a series that struck one design for its
     * whole run, which is every series before 1999. The name then comes from
     * the source's own `design` field and is the same on every row -- it still
     * has to BE a name, because the merge pairs the two catalogues design by
     * design and a blank would pair with everything.
     */
    const design = columns.design ? row[columns.design.index] || `${year} design` : only;
    if (row.length < width) {
      malformed.push(
        `${where} ${year} ${design}: the row has ${row.length} cells where the table has ${width} columns, so one is missing and every figure after it is under the wrong heading. Refused whole.`,
      );
      continue;
    }
    const found = [];

    for (const mint of columns.mints) {
      const cell = row[mint.index] ?? '';
      if (cell === '') continue;
      if (mint.labelled) {
        // "3,713,359 (proof) 804,565 (silver proof)" -- two coins in one cell,
        // each naming its own finish. Read the brackets; never assume which.
        const parts = [...cell.matchAll(/([\d,]{4,})\s*\(([^)]+)\)/g)];
        if (parts.length === 0) {
          problems.push(`${where} ${year} ${design}: "${cell}" states no figure with a finish beside it`);
          continue;
        }
        for (const [, figure, label] of parts) {
          const kind = finishOf(label, rules);
          if (kind.excluded) {
            excluded.push({ where: `${where} ${year} ${design} ${mint.mark}`, why: kind.excluded });
            continue;
          }
          if (kind.finish === 'circulation') {
            problems.push(
              `${where} ${year} ${design}: "${label}" beside ${figure} is a finish this script does not know`,
            );
            continue;
          }
          const mintage = readMintage(figure);
          if (mintage === null) {
            problems.push(`${where} ${year} ${design} ${mint.mark}: "${figure}" is not a mintage`);
            continue;
          }
          issues.push({ year, mark: mint.mark, finish: kind.finish, struckAt: [mint.city], group, design, mintage });
        }
        continue;
      }
      if (UNPUBLISHED.test(cell)) {
        unpublished.push(`${where} ${year} ${design} ${mint.mark}: the table states "${cell}"`);
        continue;
      }
      /*
       * A figure with its finish named beside it, in a column that was NOT
       * declared `labelled`. The Morgan dollar table states the 1895
       * Philadelphia figure as "880 (proof only)", and read as a plain cell
       * that is a refusal -- which would withhold the most famous date in the
       * series. Read as circulation it is worse: it would publish 880 as the
       * number of 1895 dollars anybody could have found in a till, and not one
       * has ever been confirmed.
       *
       * So a bracket is always read, and the vocabulary is the same one
       * `labelled` uses. `labelled` stays a separate declaration because it
       * means something stronger: that column holds SEVERAL coins per cell and
       * a bare figure in it is an error rather than a circulation strike.
       */
      const named = /^([\d,]{3,})\s*\(([^)]+)\)$/.exec(cell);
      if (named) {
        const kind = finishOf(named[2], rules);
        if (kind.excluded) {
          excluded.push({ where: `${where} ${year} ${design} ${mint.mark}`, why: kind.excluded });
          continue;
        }
        const figure = readMintage(named[1]);
        if (figure === null) {
          problems.push(`${where} ${year} ${design} ${mint.mark}: "${named[1]}" is not a mintage`);
          continue;
        }
        issues.push({ year, mark: mint.mark, finish: kind.finish, struckAt: [mint.city], group, design, mintage: figure });
        // Deliberately not added to `found`: the total column, where a page has
        // one, adds up circulation strikes.
        continue;
      }
      const mintage = readMintage(cell);
      if (mintage === null) {
        problems.push(`${where} ${year} ${design} ${mint.mark}: "${cell}" is not a mintage`);
        continue;
      }
      const finish = mint.finish ?? 'circulation';
      issues.push({ year, mark: mint.mark, finish, struckAt: [mint.city], group, design, mintage });
      found.push(mintage);
    }

    // The page adds its own columns up. Checking the sum is what turns "the S
    // column must be the uncirculated coin" from a reading into a build
    // failure the day it stops being true.
    if (columns.total !== undefined) {
      const stated = readMintage(row[columns.total.index] ?? '');
      const summed = found.reduce((a, b) => a + b, 0);
      if (stated === null) {
        problems.push(`${where} ${year} ${design}: no total to check the mints against`);
      } else if (stated !== summed) {
        problems.push(
          `${where} ${year} ${design}: the mints add to ${summed} and the table's own total is ${stated}. One of the declared columns is not the mint this script thinks it is.`,
        );
      }
    }
  }
  return issues;
};

/* ---------------------------------------------------------------------------
   Per-design rows into one issue per (year, mark, finish)
   --------------------------------------------------------------------------- */

/**
 * Sum the designs, and keep the working.
 *
 * A page belongs to a (year, mint mark, finish), so five state reverses from
 * Philadelphia in 1999 are one coin with one figure. `designs` and `breakdown`
 * are what let the page say WHAT its number counts, which is the difference
 * between a total and a number in the slot where a 1950-D page prints one
 * striking's mintage.
 *
 * `perDesign` is set only when every design carries the SAME figure, which is
 * the case for every proof (the figure is the number of sets) and for the
 * 2019-W and 2020-W issues (two million of each). That is the one number those
 * pages must lead with, and the sum is the one they must not.
 */
export const foldDesigns = (rows, problems, where) => {
  const byKey = new Map();
  for (const row of rows) {
    // The hub is part of the key for the same reason the finish is: two hubs of
    // one year are two coins with two figures, and folding them together would
    // add the 1878 eight-feather mintage into the seven-feather one and print
    // the year's total on both pages.
    const key = `${row.year}|${row.mark}|${row.finish}|${row.hub ?? ''}`;
    const held = byKey.get(key);
    if (!held) {
      byKey.set(key, {
        year: row.year,
        mark: row.mark,
        finish: row.finish,
        hub: row.hub ?? '',
        group: row.group,
        struckAt: [...row.struckAt],
        mintage: row.mintage,
        designs: [{ design: row.design, mintage: row.mintage, sources: row.sources, adjudicated: row.adjudicated, disputed: row.disputed, fromGap: row.fromGap }],
        ...(row.note ? { note: row.note } : {}),
      });
      continue;
    }
    if (held.group !== row.group) {
      problems.push(`${where} ${row.year}-${row.mark} ${row.finish}: two composition groups for one coin`);
      continue;
    }
    if (held.designs.some((d) => d.design === row.design)) {
      problems.push(`${where} ${row.year}-${row.mark} ${row.finish}: the "${row.design}" reverse is priced twice`);
      continue;
    }
    held.mintage += row.mintage;
    held.designs.push({ design: row.design, mintage: row.mintage, sources: row.sources, adjudicated: row.adjudicated, disputed: row.disputed });
    for (const city of row.struckAt) if (!held.struckAt.includes(city)) held.struckAt.push(city);
    if (row.note && !held.note) held.note = row.note;
  }

  return [...byKey.values()]
    .map((issue) => {
      const figures = issue.designs.map((d) => d.mintage);
      const same = figures.every((f) => f === figures[0]);
      return {
        year: issue.year,
        mark: issue.mark,
        finish: issue.finish,
        ...(issue.hub ? { hub: issue.hub } : {}),
        group: issue.group,
        struckAt: issue.struckAt,
        mintage: issue.mintage,
        designs: issue.designs.length,
        /*
         * How well attested the WHOLE figure is, which is the weakest of its
         * parts. A sum of five designs where four were confirmed by two sources
         * and one by one is a figure standing on one source, and saying "2"
         * would be rounding an honesty record up.
         */
        sources: Math.min(...issue.designs.map((d) => d.sources ?? 1)),
        /*
         * The designs whose figures the sources could not settle, carried up so
         * the page can say so. A total built partly on disputed parts is still
         * the best figure available, and a reader is owed both halves of that.
         */
        ...(issue.designs.some((d) => d.disputed)
          ? {
              disputed: issue.designs
                .filter((d) => d.disputed)
                .map((d) => ({ design: d.design, figures: d.disputed })),
            }
          : {}),
        ...(issue.designs.some((d) => d.adjudicated)
          ? { adjudicated: issue.designs.filter((d) => d.adjudicated).map((d) => ({ design: d.design, ...d.adjudicated })) }
          : {}),
        ...(issue.designs.length > 1 && same ? { perDesign: figures[0] } : {}),
        ...(issue.designs.length > 1
          ? { breakdown: issue.designs.map((d) => ({ design: d.design, mintage: d.mintage })) }
          : {}),
        /*
         * Built inside a gap the primary source declares, so every figure under
         * it is a secondary one. Carried onto the issue as well as summarised
         * at the foot of the file, because a reviewer reads a coin rather than
         * a summary, and "no primary source states this" is the first thing
         * worth knowing about one.
         */
        ...(issue.designs.every((d) => d.fromGap) ? { fromGap: issue.designs[0].fromGap } : {}),
        ...(issue.note ? { note: issue.note } : {}),
      };
    })
    .sort(
      (a, b) =>
        a.year - b.year ||
        a.mark.localeCompare(b.mark) ||
        a.finish.localeCompare(b.finish) ||
        (a.hub ?? '').localeCompare(b.hub ?? ''),
    );
};

/* ---------------------------------------------------------------------------
   Running
   --------------------------------------------------------------------------- */

/**
 * A source page's wikitext, cached and committed.
 *
 * The same rule the Numista cache follows and for the same three reasons: a
 * re-run of the import costs nothing, the exact text every figure was read out
 * of is in the repository, and the diff on it is the record of the source
 * moving. It also stops this script being the reason Wikipedia starts answering
 * 429, which it did the third time these four pages were fetched in a minute.
 *
 * `--refresh` is the only thing that goes to the network.
 */
const wikitextPath = (page) => `data/wikitext/${page.replace(/[^\w.-]/g, '_')}.wiki`;

const fetchWikitext = async (page, refresh) => {
  const path = wikitextPath(page);
  if (!refresh && existsSync(path)) return readFileSync(path, 'utf8');

  const url = `${API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2`;
  let text = null;
  // A shared encyclopedia rate-limits, and the honest response to a 429 is to
  // wait rather than to give up on the page or to hammer it.
  for (let attempt = 0; attempt < 4 && text === null; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    const response = await fetch(url, { headers: { 'User-Agent': 'aboutmycoin-build/1.0' } });
    if (response.status === 429) continue;
    if (!response.ok) throw new Error(`${page}: the source answered ${response.status}`);
    const body = await response.json();
    const found = body?.parse?.wikitext;
    if (typeof found !== 'string') throw new Error(`${page}: no wikitext in the response`);
    text = found;
  }
  if (text === null) throw new Error(`${page}: the source answered 429 four times. Try again in a minute.`);

  mkdirSync('data/wikitext', { recursive: true });
  writeFileSync(path, text);
  return text;
};

async function main() {
  const refresh = process.argv.includes('--refresh');
  const problems = [];
  const out = {
    /*
     * No `fetchedAt`. Nothing on this site carries a date, and a timestamp here
     * would be one -- it would land in a diff on every run and say only when
     * somebody ran a script. The mintages do not move; if one ever does, the
     * diff on this file is the record.
     */
    source: {
      name: 'Wikipedia mintage tables, four pages',
      note: 'One family of sources, not four independent ones: each page cites a collector site or the Mint through it, and the Washington page cites washingtonquarters.org, which is where its own figures come from. Each page below records what it cites. The primary source is the United States Mint’s production figures, which answer 403 to anything that is not a browser and so cannot be automated; Numista is the reachable second opinion and belongs behind --verify. A series whose `primary` field names another source has no Wikipedia page at all and says so there.',
      lastYear: LAST_YEAR,
    },
    series: {},
  };

  for (const series of SERIES) {
    const pages = [];
    const ignored = [];
    const excluded = [];
    const unpublished = [];
    const malformed = [];
    const later = [];
    let rows = [];

    /*
     * Fetched before the tables rather than after them, because for a series
     * with no Wikipedia page this IS the tables -- see `series.primary` below.
     * Nothing about the ordinary case changes: the document is read from the
     * committed cache and costs nothing.
     */
    const second = await loadNumista(series.slug, { refresh });

    /*
     * WHICH SOURCE SEEDS THE CATALOGUE, and the whole of the exception.
     *
     * Everywhere else on this site the primary source is a Wikipedia mintage
     * table and every other source votes on top of it. That is not a statement
     * about Wikipedia's authority -- the pages cite collector sites and the
     * header above says so -- it is a statement about SHAPE: the primary is
     * what decides which coins exist, and the secondary sources may confirm a
     * figure, outvote it or fill a declared gap, but may not invent a coin.
     *
     * The Mercury dime has no such page. The article carries no table at all
     * and there is no "dime mintage figures" page to carry one, so under the
     * ordinary rule the series generates nothing -- not because the figures are
     * doubtful but because the source that seeds them does not exist.
     *
     * So a series may name its primary, and the owner's decision of 2026-09-22
     * is that it is Numista rather than one of the collector charts. Numista is
     * already a first-class source in this pipeline, its responses are cached
     * and committed under `data/numista/`, and it is a catalogue with an
     * editorial process rather than a blog with a table on it. The four other
     * sources then vote exactly as they always do, which is the part that
     * matters: the primary decides what exists and the vote decides the figure,
     * and those were never the same job.
     *
     * What it costs is visible on the first run and is the system working.
     * Numista folds the proofs into its Philadelphia totals from 1936 to 1942 --
     * 87,504,130 where the other sources say 87,500,000 and state the 4,130
     * proofs separately -- and this catalogue gives the proof its own page, so
     * the primary's figure would count those coins twice. Three sources outvote
     * it on every one of the seven, and `outvoted` records what was refused.
     */
    if (series.primary?.via === 'numista') {
      rows = numistaRows(second, problems).map((row) => ({
        ...row,
        // The primary rows carry the city; a catalogue states a mint letter.
        struckAt: [CITY[row.mark] ?? CITY.P],
      }));
      pages.push({
        page: `Numista, ${second.types?.length ?? 0} type(s)`,
        url: 'https://en.numista.com/catalogue/',
        covers: series.primary.covers,
        cites: series.primary.cites,
        primary: series.primary.why,
      });
      if (rows.length === 0) {
        problems.push(
          `${series.slug}: the primary source is Numista and it produced no issues at all. Check NUMISTA_SERIES and data/numista/${series.slug}.json.`,
        );
      }
    }

    for (const source of series.sources) {
      const wikitext = await fetchWikitext(source.page, refresh);
      pages.push({
        page: source.page,
        url: `https://en.wikipedia.org/wiki/${source.page}`,
        covers: source.covers,
        cites: source.cites,
        ...(source.missing ? { missing: source.missing } : {}),
      });
      let found = 0;

      for (const table of splitTables(wikitext)) {
        const where = `${series.slug} ${source.page} "${table.caption || '(no caption)'}"`;

        if (source.shape === 'wide') {
          // One table on the page, and it is the one with the declared header.
          const { rows: parsed, headers } = parseTable(table.body);
          // The page holds several tables and only one of them is the figures.
          // It is the one whose first column is headed as declared.
          if (headers[source.columns.year.index] !== source.columns.year.header) continue;
          const issues = wideIssues(parsed, headers, {
            problems,
            excluded,
            unpublished,
            malformed,
            where,
            group: source.group,
            columns: source.columns,
            design: source.design,
            years: source.years,
            rules: rulesFor(series),
          });
          rows = rows.concat(issues);
          found += issues.length;
          continue;
        }

        if (!table.caption) continue;
        const ignore = (source.ignore ?? []).find((i) => i.match.test(table.caption));
        if (ignore) {
          ignored.push({ page: source.page, caption: table.caption, why: ignore.why });
          continue;
        }
        const composition = source.composition.find((c) => c.match.test(table.caption));
        if (!composition) {
          ignored.push({
            page: source.page,
            caption: table.caption,
            why: 'no composition group matches this caption',
          });
          continue;
        }
        const { rows: parsed } = parseTable(table.body);
        const issues = narrowIssues(parsed, {
          problems,
          excluded,
          unpublished,
          malformed,
          where,
          group: composition.group,
          /*
           * A source may NAME its designs rather than have them read off its
           * captions, and the wheat penny is why.
           *
           * `designOf` turns "VDB on reverse, 1909" into "VDB on" and leaves
           * "Post-war wheat cent, 1947-1958 ()" whole, which is serviceable
           * while one source is the only source. It stops being serviceable
           * the moment a second catalogue has to be paired against it design
           * by design: Numista states the same distinction in a comment --
           * `With initials "VDB"` -- and no amount of massaging turns one of
           * those strings into the other. A pairing that fails does not fail
           * loudly; it makes a design look absent from one side, which is then
           * filled as a gap, and the coin comes out with one design more than
           * the mint ever struck.
           *
           * So the source maps its own captions to the names both catalogues
           * will use. Two names here, because two is all this series has: the
           * 1909 VDB reverse and everything else.
           */
          design: source.designs
            ? (source.designs.find((d) => d.match.test(table.caption))?.design ?? designOf(table.caption))
            : designOf(table.caption),
          /*
           * A TABLE MAY NAME A REVERSE HUB, which is how a source that states
           * two reverses of one date as two separate figures produces two
           * coins rather than one summed page.
           *
           * The Morgan's hubs arrive the other way round: its primary states
           * 1878 Philadelphia as a single combined total and the split comes
           * from the secondary sources through a declared gap. This page does
           * the opposite -- it never states a 1909 total at all, it states the
           * VDB reverse and the plain reverse in two tables -- so there is no
           * sum to split and no gap to declare. The hub simply travels with
           * the rows, and the year gets no combined page because no source
           * ever published a combined figure for it.
           */
          hub: source.designs?.find((d) => d.match.test(table.caption))?.hub,
          rules: rulesFor(series),
        });
        rows = rows.concat(issues);
        found += issues.length;
      }

      if (found === 0) {
        problems.push(`${source.page} produced no issues at all. It has moved or been rewritten.`);
      }
    }

    /*
     * The second source, merged design by design.
     *
     * Four outcomes and every one is recorded rather than smoothed over:
     *
     *   BOTH AGREE          the figure is confirmed and carries `sources: 2`.
     *   THE PRIMARY ALONE   used, `sources: 1`. Normal: the second catalogue has
     *                       no figure for most proofs and is missing whole
     *                       designs -- Edith Kanakaʻole in 2023, Ida B. Wells
     *                       in 2025 -- so an absence here is an absence of
     *                       checking, never evidence against the figure.
     *   THE SECOND ALONE    used, but ONLY for a coin the primary already has.
     *                       That is the difference between filling the gap in a
     *                       row whose Philadelphia cell is missing and inventing
     *                       the 1976 Bicentennial, which the primary source
     *                       deliberately ignores and the second catalogues.
     *   THEY DISAGREE       the design is refused, and below it takes its whole
     *                       coin with it.
     *
     * Designs are paired on `normaliseDesign`, because the two catalogues do not
     * call one design by one name. See that function for why the fuzziness is
     * safe: it pairs figures and never writes anything.
     */
    /*
     * Every source, merged design by design, and the figure a MAJORITY agrees on.
     *
     * This was a pairwise comparison between two sources until it became clear
     * what that costs: two sources can only ever agree or disagree, and a
     * disagreement between two is a coin with no page. Thirty-three coins came
     * out of one run that way, including whole years. Three or four sources
     * outvote a transcription slip, and a transcription slip is what most of
     * these turned out to be -- one page repeating the row above it, one
     * catalogue holding a mint's first announcement rather than its audited
     * total, one pair of columns swapped.
     *
     * So: collect what every source says about a design, count the sources
     * behind each distinct figure, and take the figure with strictly the most.
     * A tie goes to `ADJUDICATED` and, failing that, withholds the coin. The
     * count is recorded on the issue, because "three sources agree" and "one
     * source says so" are different claims and the file should not round the
     * second up to the first.
     *
     * A source that has no figure for a design is not a vote against it. The
     * second catalogue has no mintage for most proofs and is missing whole
     * designs; the third and fourth have no page for anything struck in the last
     * two years.
     */
    /*
     * Numista, unless it is already the primary -- in which case its figures
     * are the ones being voted ON and counting them again here would give the
     * primary two votes, making every disagreement a tie it wins.
     */
    const numistaIsPrimary = series.primary?.via === 'numista';
    const secondRows = numistaIsPrimary ? [] : numistaRows(second, problems);
    /** What to call the source that seeded the catalogue, when counting votes. */
    const primaryName = numistaIsPrimary ? second.source.name : PRIMARY;
    const consensus = loadConsensus(series.slug);
    /*
     * A coin is a (year, mark, finish, HUB).
     *
     * The fourth part is empty on all but four coins in this catalogue and is
     * not optional for those: the 1878 Philadelphia dollar was struck with an
     * eight-feather reverse and then with a seven-feather one, the sources
     * state the two mintages separately, and without the hub in the key the
     * second overwrites the first and the page states a mintage thirteen times
     * too small.
     */
    const coinOf = (r) => `${r.year}|${r.mark}|${r.finish}|${r.hub ?? ''}`;
    const agreement = { unanimous: 0, majority: 0, revised: 0, single: 0, adjudicated: 0, tied: 0 };
    const sourceNames = new Set([primaryName, second.source.name]);

    const byCoin = new Map();
    for (const row of rows) {
      const held = byCoin.get(coinOf(row)) ?? { primary: [], others: [] };
      held.primary.push(row);
      byCoin.set(coinOf(row), held);
    }

    /** Every secondary figure, tagged with the source that holds it. */
    const secondary = [
      ...secondRows.map((r) => ({ ...r, source: second.source.name })),
      ...consensus,
    ];
    /*
     * The gaps the primary source declares, flattened across its pages, with
     * the composition group each page states carried along: a secondary source
     * quotes a figure and never a composition, and a row with no group makes
     * `foldDesigns` see two groups for one coin.
     */
    const gaps = series.sources.flatMap((source) =>
      (source.gaps ?? []).map((gap) => ({ ...gap, group: source.group, page: source.page })),
    );
    /** Coins nothing but the secondary sources holds, inside a declared gap. */
    const inGap = new Map();

    for (const row of secondary) {
      sourceNames.add(row.source);
      if (row.year > LAST_YEAR) continue;
      const held = byCoin.get(coinOf(row));
      if (!held) {
        /*
         * Only into a coin the primary source already publishes, UNLESS the
         * primary has declared in writing that it does not cover this kind of
         * coin. Anything else would be this script adding a coin the primary
         * was told to leave out -- the 1976 Bicentennial, which the other
         * catalogues all carry.
         */
        const gap = gaps.find((g) => g.match(row));
        if (!gap) continue;
        const bucket = inGap.get(coinOf(row)) ?? { gap, rows: [] };
        bucket.rows.push(row);
        inGap.set(coinOf(row), bucket);
        continue;
      }
      held.others.push(row);
    }

    const added = [];
    for (const [coin, { primary, others }] of byCoin) {
      /*
       * Group the secondary figures by source first, then pair each source's
       * designs against the primary's. Pairing per source rather than across
       * all of them at once is what keeps `pairDesigns` working in a small
       * closed set, which is the condition its containment matching is safe in.
       */
      const paired = new Map();
      for (const name of new Set(others.map((r) => r.source))) {
        const mine = others.filter((r) => r.source === name);
        const { pairs, unpairedSecond } = pairDesigns(primary, mine, problems, `${series.slug} ${coin} (${name})`);
        for (const [ours, theirs] of pairs) {
          const votes = paired.get(ours) ?? new Map();
          votes.set(name, theirs.mintage);
          paired.set(ours, votes);
        }
        /*
         * A design no source but this one has. The three short American Women
         * rows are exactly this: the cell is not wrong, it is absent.
         *
         * The GROUP comes from the coin it is joining, not from the row -- a
         * secondary source states a figure and not a composition, and a row with
         * no group makes `foldDesigns` see two groups for one coin. And it is
         * deduplicated across sources, because two of them filling the same gap
         * is agreement about one design, not two designs.
         */
        for (const orphan of unpairedSecond) {
          if (primary.some((p) => sameDesign(normaliseDesign(p.design), normaliseDesign(orphan.design)))) continue;
          const already = added.find(
            (a) =>
              coinOf(a) === coin && sameDesign(normaliseDesign(a.design), normaliseDesign(orphan.design)),
          );
          if (already) {
            if (already.mintage === orphan.mintage) {
              already.sources += 1;
              already.only = `${already.only}, ${name}`;
            }
            continue;
          }
          added.push({
            ...orphan,
            group: primary[0]?.group ?? orphan.group,
            struckAt: [CITY[orphan.mark] ?? CITY.P],
            sources: 1,
            only: name,
          });
        }
      }

      for (const ours of primary) {
        const votes = paired.get(ours) ?? new Map();
        const tally = new Map([[ours.mintage, new Set([primaryName])]]);
        for (const [name, mintage] of votes) {
          if (!tally.has(mintage)) tally.set(mintage, new Set());
          tally.get(mintage).add(name);
        }

        const ranked = [...tally.entries()].sort((x, y) => y[1].size - x[1].size);
        const [best, backers] = ranked[0];
        const runnerUp = ranked[1];

        if (ranked.length === 1) {
          ours.sources = backers.size;
          ours.agreedBy = [...backers];
          agreement[backers.size > 1 ? 'unanimous' : 'single'] += 1;
          continue;
        }

        if (runnerUp[1].size < backers.size) {
          // A majority, and the losers are recorded: a figure this site did not
          // print is part of the evidence for the one it did.
          if (best !== ours.mintage) ours.mintage = best;
          ours.sources = backers.size;
          ours.agreedBy = [...backers];
          ours.outvoted = ranked
            .slice(1)
            .map(([mintage, who]) => ({ mintage, sources: [...who] }));
          agreement.majority += 1;
          continue;
        }

        /*
         * A tie between figures that are the SAME COUNT taken at different
         * moments.
         *
         * A proof's "mintage" is not a production run, it is how many were sold,
         * and that figure is revised as the Mint's audits land. So two sources
         * quoting 512,798 and 512,729 are not disagreeing about the coin; they
         * are quoting one number before and after a correction, and the later
         * one is the higher one. Five coins were withheld over differences of a
         * few hundred out of half a million.
         *
         * Narrow on purpose. It applies only to the collector finishes, where
         * the cumulative-sales reasoning holds, and only inside half a per cent.
         * A circulation strike's mintage is a production total that does not
         * drift, so a tie there is one source being wrong and is left to
         * judgement -- the 2014-P figures differ by exactly ten thousand, which
         * is a transcription slip and not a revision, and picking the larger of
         * the two would be a coin toss dressed as a rule.
         */
        if (ours.finish !== 'circulation' && ranked.length > 1) {
          const values = ranked.map(([mintage]) => mintage);
          const spread = (Math.max(...values) - Math.min(...values)) / Math.max(...values);
          if (spread <= NEAR_ENOUGH) {
            const latest = Math.max(...values);
            ours.mintage = latest;
            ours.sources = ranked.reduce((total, [, who]) => total + who.size, 0);
            ours.agreedBy = ranked.flatMap(([, who]) => [...who]);
            ours.revised = {
              spread: Number((spread * 100).toFixed(3)),
              figures: ranked.map(([mintage, who]) => ({ mintage, sources: [...who] })),
              why: 'the same cumulative sales figure quoted before and after a revision; the later one is the higher one',
            };
            agreement.revised += 1;
            continue;
          }
        }

        const settled = adjudicationFor(ours, problems);
        if (settled) {
          const theirs = [...votes.values()][0];
          const rejected = settled.take === 'second' ? ours.mintage : theirs;
          if (settled.take === 'second') ours.mintage = theirs;
          ours.sources = 1;
          ours.adjudicated = { took: settled.take, over: rejected, checked: settled.checked };
          agreement.adjudicated += 1;
          continue;
        }

        /*
         * An even split, and the coin is published anyway with the
         * disagreement stated on its own page.
         *
         * THIS REVERSED, at the owner's instruction: completeness first and
         * correctness a very close second. Withholding gave a reader nothing at
         * all about a coin that exists, in order to avoid printing one of two
         * figures that differ by half a per cent -- and the reader who has just
         * found a 2016-S proof is not helped by the page being absent. What
         * they are owed is the number AND the fact that the published figures
         * disagree, which is what `disputed` renders.
         *
         * The tie goes to the HIGHEST figure, and that is not arbitrary: the
         * worst thing this site can do to somebody holding an ordinary coin is
         * tell them it is scarce, so where the evidence will not settle how many
         * were struck, it states the number that makes the coin commoner. It is
         * the same instinct as refusing to print a price the site cannot stand
         * behind, pointed at the one figure it must print.
         *
         * Note what the ties actually look like before trusting a fifth source
         * to fix them: they are two-against-two between two FAMILIES of sources
         * that agree with each other far too often to be independent.
         */
        const highest = Math.max(...ranked.map(([mintage]) => mintage));
        ours.mintage = highest;
        ours.sources = ranked.find(([mintage]) => mintage === highest)[1].size;
        ours.disputed = ranked
          .map(([mintage, who]) => ({ mintage, sources: [...who] }))
          .sort((x, y) => y.mintage - x.mintage);
        agreement.tied += 1;
      }
    }

    /*
     * The coins inside a declared gap, voted on with nothing to anchor them.
     *
     * Every other figure in this file is a primary-source figure that the other
     * catalogues confirm, outvote or fail to reach. These have no primary
     * figure at all, so the vote is among the secondary sources alone and the
     * bar is raised to match: two sources that agree, at least, and a strict
     * majority if they do not. `NEAR_ENOUGH` applies exactly as it does above,
     * because these are collector issues and a proof mintage is a sales figure
     * that gets revised -- the 1888 proof is 832 to one source and 833 to
     * another, which is one number either side of a correction.
     *
     * A coin that cannot clear the bar is recorded in `gapsRefused` rather than
     * dropped, because "two sources disagree about how many 1890 proofs there
     * were" is a fact worth keeping and the alternative is rediscovering it.
     */
    const gapsFilled = [];
    const gapsRefused = [];
    for (const [coin, { gap, rows: quotes }] of inGap) {
      const [yearText, mark, finish, hub] = coin.split('|');
      const year = Number(yearText);
      const byDesign = new Map();
      for (const quote of quotes) {
        const key = normaliseDesign(quote.design ?? '');
        if (!byDesign.has(key)) byDesign.set(key, { design: quote.design, tally: new Map() });
        const { tally } = byDesign.get(key);
        if (!tally.has(quote.mintage)) tally.set(quote.mintage, new Set());
        tally.get(quote.mintage).add(quote.source);
      }

      for (const { design, tally } of byDesign.values()) {
        const ranked = [...tally.entries()].sort((x, y) => y[1].size - x[1].size);
        const voters = new Set(ranked.flatMap(([, who]) => [...who]));
        const where = `${year}-${mark || 'P'} ${finish}${hub ? ` ${hub}` : ''}`;
        if (voters.size < MIN_GAP_SOURCES) {
          gapsRefused.push({
            coin: where,
            year,
            mark,
            finish,
            hub,
            why: `${gap.why}, and only ${voters.size} source states a figure. A coin no primary source carries needs ${MIN_GAP_SOURCES} that agree, because with one there is nothing to check it against.`,
            figures: ranked.map(([mintage, who]) => ({ mintage, sources: [...who] })),
          });
          continue;
        }

        /*
         * Settled by hand, against the primary source's own total. Checked
         * BEFORE the vote rather than after it, unlike the branch above: there
         * the adjudication breaks a tie the sources could not, and here it is
         * the only thing that can decide at all -- two secondary sources
         * quoting one figure and a rounding of it will never separate, whoever
         * is counted.
         */
        const settled = adjudicationFor({ year, mark, finish, hub, design }, problems);
        if (settled && typeof settled.take === 'number') {
          gapsFilled.push({
            year,
            mark,
            finish,
            ...(hub ? { hub } : {}),
            struckAt: [CITY[mark] ?? CITY.P],
            group: gap.group,
            design,
            mintage: settled.take,
            sources: 1,
            fromGap: gap.why,
            adjudicated: {
              took: settled.take,
              over: ranked.filter(([figure]) => figure !== settled.take).map(([figure]) => figure),
              checked: settled.checked,
            },
          });
          agreement.adjudicated += 1;
          continue;
        }

        const values = ranked.map(([mintage]) => mintage);
        const spread = (Math.max(...values) - Math.min(...values)) / Math.max(...values);
        const near = finish !== 'circulation' && ranked.length > 1 && spread <= NEAR_ENOUGH;
        const decided = ranked.length === 1 || near || ranked[1][1].size < ranked[0][1].size;
        if (!decided) {
          gapsRefused.push({
            coin: where,
            year,
            mark,
            finish,
            hub,
            why: `${gap.why}, and the sources split evenly on the figure. A tie is published where the primary source states one of the figures; here nothing does, so there is no coin to attach the disagreement to.`,
            figures: ranked.map(([mintage, who]) => ({ mintage, sources: [...who] })),
          });
          continue;
        }

        const mintage = near ? Math.max(...values) : ranked[0][0];
        gapsFilled.push({
          year,
          mark,
          finish,
          ...(hub ? { hub } : {}),
          struckAt: [CITY[mark] ?? CITY.P],
          group: gap.group,
          design,
          mintage,
          sources: near ? voters.size : ranked[0][1].size,
          agreedBy: near ? [...voters] : [...ranked[0][1]],
          /*
           * Printed on nothing and read by nobody downstream, and it is here
           * because the file is the record: a coin built with no primary
           * figure behind it should say so where a reviewer will see it.
           */
          fromGap: gap.why,
          ...(near
            ? {
                revised: {
                  spread: Number((spread * 100).toFixed(3)),
                  figures: ranked.map(([figure, who]) => ({ mintage: figure, sources: [...who] })),
                  why: 'the same cumulative sales figure quoted before and after a revision; the later one is the higher one',
                },
              }
            : {}),
          ...(ranked.length > 1 && !near
            ? { outvoted: ranked.slice(1).map(([figure, who]) => ({ mintage: figure, sources: [...who] })) }
            : {}),
        });
        agreement[near ? 'revised' : ranked.length === 1 ? 'unanimous' : 'majority'] += 1;
      }
    }
    rows = rows.concat(added, gapsFilled);



    // A silver proof is in the silver group whatever its table's caption says.
    // Composition belongs to the issue, not to the series and not to the page
    // it was found on.
    for (const row of rows) {
      if (FINISHES.find((f) => f.finish === row.finish)?.silver) row.group = 'silver';
    }

    const outOfScope = [];
    const kept = rows.filter((row) => {
      if (row.year > LAST_YEAR) {
        later.push(`${row.year}-${row.mark || 'P'} ${row.finish}`);
        return false;
      }
      const rule = (series.outOfScope ?? []).find((o) => o.match(row));
      if (rule) {
        outOfScope.push({ coin: `${row.year}-${row.mark || 'P'} ${row.finish}`, why: rule.why });
        return false;
      }
      return true;
    });


    // Two rows for one coin from two different pages is a real risk: the 2021
    // Crossing the Delaware reverse is on the Washington page and the 2021
    // Tuskegee Airmen reverse is on the America the Beautiful page, and they
    // are two designs of one coin. `foldDesigns` adds them and refuses a
    // design counted twice.
    const issues = foldDesigns(kept, problems, series.slug);

    /*
     * A coin is the sum of its designs, so a coin one of whose designs the two
     * sources disagree about has no total anybody can stand behind. It gets no
     * page. Publishing the sum of the four designs that agreed would be a
     * figure that is wrong by a known amount, which is worse than a figure that
     * is missing, and the page would say "five reverse designs" over it.
     */
    const withheld = [];
    const partial = [];
    const publishable = issues;

    /*
     * A total must cover every design that was struck.
     *
     * `designs` counts the designs this figure was built from, which is not the
     * same as the number struck: the 2023-S uncirculated coin lost one design to
     * a source that has no figure for it, and the page would then have summed
     * four and said "San Francisco struck four reverse designs in 2023", which
     * is false -- it struck five. So the count is held against the year's own
     * count, taken from the circulation strikes, which are the complete ones.
     *
     * The alternative is a figure short by a fifth with a sentence over it
     * claiming to be a total. That is the one thing worse than a missing page.
     */
    const designsInYear = new Map();
    for (const issue of publishable) {
      if (issue.finish !== 'circulation') continue;
      designsInYear.set(issue.year, Math.max(designsInYear.get(issue.year) ?? 0, issue.designs));
    }
    const complete = publishable.map((issue) => {
      const expected = designsInYear.get(issue.year);
      if (expected === undefined || issue.designs >= expected) return issue;
      /*
       * The coin exists and its total does not. Published WITHOUT a figure
       * rather than withheld, because the page has plenty else to say -- what
       * the coin is, what it is made of, that it was never in circulation -- and
       * a reader holding one is not served by the page being absent.
       *
       * What must not happen is the sum being printed as though it were the
       * total: `designs` covers fewer reverses than the mint struck, so the
       * sentence over it would claim to count coins it has no figure for.
       */
      const { mintage, perDesign, ...rest } = issue;
      partial.push({
        coin: `${issue.year}-${issue.mark || 'P'} ${issue.finish}`,
        why: `no published figure for ${expected - issue.designs} of the ${expected} reverse designs struck in ${issue.year}, so no total can be stated`,
      });
      return {
        ...rest,
        coverage: { designsPriced: issue.designs, designsStruck: expected },
      };
    });

    /*
     * Every (year, mark, finish) the sources attest, WHETHER OR NOT it got a
     * figure this site will print.
     *
     * This exists because of one false sentence. The generated identification
     * checklist tells a reader which mints did NOT strike their date -- "There is
     * no 1938-D. Denver struck none of these" -- and it worked that out from the
     * coins in the catalogue. The moment a coin was withheld for a source
     * conflict, every other page of its year began denying it existed: the
     * 2012-S page said "There is no 2012-D. Denver struck none of these in 2012"
     * because the 2012-D figure is contested, and Denver struck five hundred
     * million of them.
     *
     * So existence and figures are now two different questions with two
     * different answers, and the checklist asks this one.
     */
    const attested = [
      ...new Set(
        rows
          .filter((row) => row.year <= LAST_YEAR)
          .map((row) => `${row.year}|${row.mark}|${row.finish}`)
          /*
           * A gap coin the sources could not settle is attested too. It has no
           * figure and no page, and it was still struck -- leaving it out is
           * exactly the failure this list was built to stop, one rung further
           * down: the neighbouring pages would tell a reader holding one that
           * Philadelphia struck no proofs that year.
           */
          .concat(gapsRefused.map((g) => `${g.year}|${g.mark}|${g.finish}`)),
      ),
    ]
      .sort()
      .map((key) => {
        const [year, mark, finish] = key.split('|');
        return { year: Number(year), mark, finish };
      });

    out.series[series.slug] = {
      pages,
      attested,
      sources: { names: [...sourceNames], agreement },
      issues: complete,
      ignored,
      ...(excluded.length > 0 ? { excluded: summarise(excluded) } : {}),
      ...(unpublished.length > 0 ? { unpublished } : {}),
      ...(malformed.length > 0 ? { malformed } : {}),
      ...(withheld.length > 0 ? { withheld } : {}),
      ...(partial.length > 0 ? { partial } : {}),
      ...(gapsFilled.length > 0
        ? {
            gapsFilled: summarise(
              [...new Set(gapsFilled.map((g) => g.fromGap))].map((why) => ({
                why: `${why} (${gapsFilled.filter((g) => g.fromGap === why).length} issues, on the secondary sources alone)`,
              })),
            ),
          }
        : {}),
      ...(gapsRefused.length > 0 ? { gapsRefused } : {}),
      ...(later.length > 0 ? { afterLastYear: [...new Set(later)].sort() } : {}),
      ...(outOfScope.length > 0 ? { outOfScope: summarise(outOfScope.map((o) => ({ why: `${o.why} (${outOfScope.filter((x) => x.why === o.why).length} issues: ${[...new Set(outOfScope.filter((x) => x.why === o.why).map((x) => x.coin))].join(', ')})` }))) } : {}),
    };
  }

  if (problems.length > 0) {
    // Refuse rather than write a partial file. A mintage this script could not
    // read is a page that would ship without one, or with the one above it.
    console.error(`The source could not be read cleanly:\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
  }

  if (!existsSync('data')) mkdirSync('data', { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);

  for (const [slug, series] of Object.entries(out.series)) {
    console.log(`${slug}: ${series.issues.length} issues across ${series.pages.length} pages`);
    const byFinish = {};
    for (const issue of series.issues) byFinish[issue.finish] = (byFinish[issue.finish] ?? 0) + 1;
    for (const [finish, count] of Object.entries(byFinish)) console.log(`  ${finish}: ${count}`);
    for (const skip of series.ignored) console.log(`  ignored "${skip.caption}" -- ${skip.why}`);
    for (const skip of series.excluded ?? []) console.log(`  excluded ${skip.count} rows -- ${skip.why}`);
    for (const gap of series.unpublished ?? []) console.log(`  NO FIGURE PUBLISHED: ${gap}`);
    for (const bad of series.malformed ?? []) console.log(`  MALFORMED ROW: ${bad}`);
    for (const out of series.outOfScope ?? []) console.log(`  OUT OF SCOPE: ${out.why}`);
    for (const gap of series.gapsFilled ?? []) console.log(`  FILLED A DECLARED GAP: ${gap.why}`);
    for (const gap of series.gapsRefused ?? []) console.log(`  GAP NOT FILLED: ${gap.coin} -- ${gap.why}`);
    const a = series.sources.agreement;
    console.log(
      `  ${series.sources.names.length} sources: ${a.unanimous} agreed by all that hold one, ${a.majority} on a majority, ${a.revised} on a revised sales figure, ${a.single} on one source alone, ${a.adjudicated} settled by hand, ${a.tied} still evenly split`,
    );
    for (const row of series.partial ?? []) console.log(`  NO TOTAL: ${row.coin} -- ${row.why}`);
    for (const held of series.withheld ?? []) {
      console.log(`  WITHHELD ${held.coin} -- ${held.why}`);
      for (const d of held.designs ?? []) {
        const split = (d.split ?? []).map((o) => `${o.mintage.toLocaleString('en-US')} (${o.sources.join(', ')})`);
        console.log(`      ${d.design}: ${split.join('  vs  ')}`);
      }
    }
    if (series.afterLastYear) console.log(`  after ${LAST_YEAR}, left out: ${series.afterLastYear.join(', ')}`);
  }
  console.log(`Wrote ${OUT}`);
}

/** Excluded rows, by reason, so the report is readable rather than long. */
const summarise = (excluded) => {
  const byWhy = new Map();
  for (const row of excluded) byWhy.set(row.why, (byWhy.get(row.why) ?? 0) + 1);
  return [...byWhy.entries()].map(([why, count]) => ({ why, count })).sort((a, b) => b.count - a.count);
};

if (process.argv[1] && process.argv[1].endsWith('fetch-mintages.mjs')) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
