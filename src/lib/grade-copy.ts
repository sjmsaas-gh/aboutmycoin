/**
 * Every sentence on a grade page, and the checks that keep them honest.
 *
 * `/coin-info/<group>/<type>/<coin>/<grade>` answers one question -- what is
 * this coin worth in this grade -- and it is the first page on this site whose
 * answer is a price somebody else set rather than arithmetic the site did. That
 * changes two things, and both are why this module exists rather than the copy
 * living in the template or in `catalog-copy.ts`.
 *
 * ---------------------------------------------------------------------------
 * WHY NOT catalog-copy.ts
 * ---------------------------------------------------------------------------
 *
 * `validateCatalogCopy()` throws on a currency figure in any generated
 * sentence, and it is right to: the melt section owns the arithmetic and dates
 * it, so a price typed into an archive paragraph has no spot price behind it
 * and no date on it. A grade page states prices in nearly every sentence. The
 * rule it has to satisfy instead is the one the spot price already satisfies --
 * SOURCE THE FIGURE -- so `validateGradeCopy()` throws on a generated sentence
 * carrying a price that does not say where it came from, and `LADDER_BASIS` is
 * this section's `spotBasis()`. It was DATE the figure until 2026-09-22, when
 * the owner dropped the date from both render sites; `valueBasis()` keeps the
 * dated form for `llms.txt`, which ships as a file and cannot say it another
 * way.
 *
 * ---------------------------------------------------------------------------
 * WHY THE TEMPLATE HOLDS NONE OF IT
 * ---------------------------------------------------------------------------
 *
 * The same reason as the archives: a heading typed back into an `.astro` file
 * typechecks, passes the unit tests and quietly stops the generator being the
 * one place a sentence lives. `allGradeCopy()` is the flattened list, the build
 * check compares it against the HTML that shipped, and `/dev` renders it.
 *
 * ---------------------------------------------------------------------------
 * THE DUPLICATION PROBLEM, WHICH IS THE WHOLE DESIGN CONSTRAINT
 * ---------------------------------------------------------------------------
 *
 * A grade page is the shape that becomes a doorway page if it is written the
 * obvious way: seventy grades times a thousand coins, each restating what the
 * coin is and what the grade means. So every paragraph here names the coin AND
 * the grade, and derives its content from that coin's own figures -- the range,
 * the neighbouring grade, the census, the sales. `validateGradeCopy()` fails a
 * paragraph, title, description or question used on two pages, exactly as the
 * archive checks do, and the failure is what tells you the formula has stopped
 * saying anything specific.
 */
import {
  COINS,
  typeBySlug,
  seriesForCoin,
  gradedValue,
  gradedValues,
  ladderFor,
  gradedGrades,
  gradedPairs,
  gradeNeighbours,
  gradePath,
  gradeQuestion,
  gradeDefinition,
  gradeForms,
  normaliseQuestion,
  type Coin,
  type Grade,
  type GradedValue,
} from '../data/coins';
import { coinMetal } from './spot';
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
  article,
  fit,
  renderedTitle,
  titleBudget,
} from './meta';

/* ===========================================================================
   Money, and where the figures came from
   =========================================================================== */

/** "$1,500". Whole dollars: these are ranges, and a range to the cent is false precision. */
export const usd = (amount: number): string => `$${Math.round(amount).toLocaleString('en-GB')}`;

/**
 * "$70 to $125", or "about $29" where the two ends round to one figure.
 *
 * The range is the point of this section -- the site cannot see the coin, so it
 * cannot name a price -- but "worth $29 to $29" is a point wearing a range's
 * clothes, and it reads as a bug to anybody who notices and as false precision
 * to anybody who does not. It happens when two guides land within a dollar of
 * each other, which on a cheap coin is most of the time.
 *
 * `usd()` rounds to whole dollars, so the test is on the RENDERED strings and
 * not on the underlying figures: $28.51 and $29.40 are a real spread and print
 * as one number, and what the reader is owed is the number they can see.
 */
export const rangeText = (value: GradedValue): string => {
  if (!isPriced(value)) return '';
  const low = usd(value.low!);
  const high = usd(value.high!);
  return low === high ? `about ${low}` : `${low} to ${high}`;
};

/**
 * What a range says when the site has not established one: NOTHING.
 *
 * ---------------------------------------------------------------------------
 * WHY THE FIGURE IS ABSENT RATHER THAN MARKED, AND WHAT REPLACED IT
 * ---------------------------------------------------------------------------
 *
 * This slot held `TBD to TBD` from 2026-09-22 until the owner's decision to
 * make the catalogue an information site with a melt calculator attached
 * rather than a price guide. The old reasoning was sound on its own terms --
 * a blank reads as an oversight, a dash reads as "worth nothing", a zero is
 * false and an estimate is the thing this site exists not to do -- and TBD was
 * the only honest mark left. What it could not fix is that there were six and
 * a half thousand of them, in the largest type on the page, in the slot a
 * reader's eye goes to first. A page whose loudest element is a placeholder
 * for a price is a price page that has failed, whatever the placeholder says.
 *
 * So the figure is not marked, it is not rendered. An unpriced rung renders no
 * range, no provenance and no figure block at all, and the page leads with
 * what it does know: what the grade means on this coin, where it sits in the
 * ladder, how it is spelled on a slab, what the metal under it comes to and
 * how to check the market. Every one of those is true without a figure.
 *
 * The blank-reads-as-oversight problem survives in exactly one place -- a
 * ladder TABLE where some rungs are priced and some are not -- and it is
 * answered there by `LADDER_GAP_NOTE` under the table rather than by a mark in
 * every empty cell. One sentence once, instead of a placeholder per row.
 */
export const LADDER_GAP_NOTE =
  'A blank in the value column is a grade this site has not researched, not a grade the coin is worth nothing in.';

/**
 * The same range as a TABLE CELL: "$70 \u2013 $125", or empty.
 *
 * A second form rather than a second implementation. The prose wants "70 to
 * 125" and a column wants an en dash, and both are rendered in two templates --
 * the coin page's ladder and the grade page's -- so the shape of an unpriced
 * cell has to be decided in one place or it drifts between them.
 *
 * Empty is the shape, and `LADDER_GAP_NOTE` under the table is what keeps it
 * from reading as an oversight. The column itself does not render at all
 * unless `ladderHasFigures()` is true, so an empty cell only ever appears
 * beside a full one, which is the only context in which a reader can tell what
 * it means.
 */
export const rangeCell = (value: GradedValue): string =>
  isPriced(value) ? `${usd(value.low!)} \u2013 ${usd(value.high!)}` : '';

/** Whether the site has a researched figure for this rung at all. */
export const isPriced = (value: GradedValue | undefined): boolean =>
  value?.low !== undefined && value?.high !== undefined;

/**
 * Whether a coin's ladder carries a researched figure ANYWHERE.
 *
 * The gate on the value column in both ladder tables -- the coin page's and
 * the grade page's. A column of empty cells with nothing in it is a column
 * that says only that the site has nothing, which is the catalogue-counting
 * failure from the archive rules wearing a table header; on a coin with no
 * figures at all the table is a list of the grades the coin can be given and
 * the certified counts beside them, which is information and stands on its
 * own. 185 of the 444 coins with a ladder are in that case.
 */
export const ladderHasFigures = (coin: Coin): boolean =>
  gradedValues(coin).some((v) => isPriced(v));

/**
 * Whether a coin's ladder carries a certified population ANYWHERE.
 *
 * The same gate on the same table's other column, and it matters for the same
 * reason. `Population` is optional because nobody pays thirty dollars to slab
 * a six-dollar coin, so a rung with no published count renders "Not counted"
 * -- which is the right word for one row beside rows that ARE counted, and is
 * twenty rows of nothing on a coin no service has published a census for. A
 * column whose every cell says the site has no data is a column about the
 * site.
 */
export const ladderHasPopulations = (coin: Coin): boolean =>
  gradedValues(coin).some((v) => v.population !== undefined);

/*
 * `valueAsOfLabel()` and `valueBasis()` stood here and were deleted on
 * 2026-09-22, when the owner dropped the date from the ladder's provenance on
 * the coin pages, the grade pages and llms.txt in turn. A generator with no
 * render site is deleted rather than kept warm -- the same rule that took the
 * card teasers -- and a dated phrase left exported is a dated phrase somebody
 * prints again. `Coin.valueAsOf` stays: `validateTaxonomy()` still throws on a
 * price with no date behind it, because a figure nobody recorded the date of
 * is a figure nobody can re-check. It is a fact kept in the data and not a
 * sentence put on a page.
 */

/**
 * The provenance every visible figure carries: where it came from, that it
 * moves, and what it is not. The owner's decision of 2026-09-22.
 *
 * It is undated, which reverses this section's one exception to the no-dates
 * rule. A single date over a ladder is precision the ladder has not got -- the
 * rungs were read on different days, from sources that are themselves
 * summaries -- and "recorded to 22 September 2026" reads as a measurement
 * taken on a day, which invites a reader to believe the figure to the dollar.
 * "Occasionally updated" is what is actually true of it.
 *
 * The last sentence is the one that matters most and is not decoration. A
 * range against a grade is what somebody about to sell reads as a valuation,
 * and this site never saw their coin. It names no house and no guide, for the
 * same reason `spotBasis()` names no feed: the sources are listed once at the
 * foot, and a phrase repeating them at every figure is one more thing to
 * correct the day a source changes.
 *
 * The gate around it is the part of the old date rule that survives: a rung
 * with no researched figure prints no provenance at all, because a source
 * named over a rung with no figure is a citation for an absence.
 */
export const VALUE_SOURCE = 'from sales and public data';

export const LADDER_BASIS =
  `${VALUE_SOURCE.charAt(0).toUpperCase()}${VALUE_SOURCE.slice(1)}. ` +
  'Figure occasionally updated. ' +
  'Not an appraisal or declaration of worth or value.';

/* ===========================================================================
   Naming the coin
   =========================================================================== */

/** "a, b or c" -- a list folded into a sentence rather than set as bullets. */
const list = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;

/** "1932-D Washington quarter" -- the coin in a sentence. */
const inSentence = (coin: Coin): string => coin.shortName ?? coin.name;

/** "1932-D Quarter" -- the bare stem a title falls back to when the full name will not fit. */
const stem = (coin: Coin): string => {
  const type = typeBySlug(coin.type);
  const year = coin.years.from;
  const mark = coin.mintMark ? `-${coin.mintMark}` : '';
  /*
   * The hub is in the stem, in the word order somebody types it -- "1878 8
   * Tail Feathers Dollar". Without it the two 1878 proof reverses both fall
   * back to "1878 Dollar" and produce one `<title>` for two pages on all
   * eleven proof rungs. `validateGradeCopy()` throws on that, which is how it
   * was found; the fallback existing at all is why a short name is not enough.
   */
  const hub = coin.hub ? ` ${coin.hub}` : '';
  return `${year}${mark}${hub} ${type ? type.name : coin.type}`;
};

/* ===========================================================================
   The page
   =========================================================================== */

/**
 * "1932-D Washington Quarter in MS63".
 *
 * The CODE, not the label, and that is not a style preference. Every
 * uniqueness check on this site runs through `normaliseQuestion()`, which
 * strips parentheticals -- so "in Mint State (MS-60)" and "in Mint State
 * (MS-65)" normalise to the same string, and seven mint state H1s become one.
 * That is also how a crawler reads them: two headings differing only inside
 * brackets are two headings competing for one result. The full label belongs
 * in the body, where the sentence around it differs anyway.
 */
export const gradeH1 = (coin: Coin, grade: Grade): string =>
  `${coin.name} in ${grade.code}`;

/**
 * The `<title>`, which carries the word the query does. One form, priced or
 * not.
 *
 * "1932-D Washington Quarter G4 Value". It split into two forms for a few
 * hours -- "Grade Guide" on the unpriced pages -- on the argument that a title
 * promising a value over a page that states none is the mismatch a meta
 * description commits when it advertises a section the page has not got.
 *
 * The owner's correction, and it is right: the two are not the same mismatch.
 * A missing section is a missing section, but every page in this section
 * answers the value question even when it states no range. It gives the metal
 * floor, it gives the certified census where there is one, it gives the rung
 * either side, and block 5 hands the reader a sold-comps search already
 * filtered to this exact coin in this exact grade -- which is a better answer
 * than a retail guide's row, and is the answer a dealer would give. "How to
 * find out" is a legitimate thing for a page titled "Value" to do.
 *
 * What the page still must not do is STATE a figure it has not got, and that
 * is enforced where it belongs: `gradeAnswer()` states no price, no range
 * block renders, and `tests/build-smoke.test.mjs` fails on a placeholder.
 *
 * The grade code is written the way it is typed into a search box rather than
 * the way it is written in prose -- nobody searches "G-4".
 */
export const gradeSeoTitle = (coin: Coin, grade: Grade): string =>
  fit(
    [
      `${coin.name} ${grade.code} Value`,
      `${stem(coin)} ${grade.code} Value`,
    ],
    TITLE_MAX,
  );

/**
 * The BLUF, and the FAQPage `acceptedAnswer`.
 *
 * Not "this coin is a 1932-D Washington quarter in a grade of G4" -- that
 * sentence tells the reader what they typed and answers nothing. The first
 * sentence is the range and its provenance; the second says what the range
 * means against the rung below, which is the question a reader has the moment
 * they read the first.
 *
 * It must survive being quoted with no page around it, because that is how a
 * model will use it.
 */
export const gradeAnswer = (coin: Coin, grade: Grade): string => {
  const value = gradedValue(coin, grade)!;
  const { below } = gradeNeighbours(coin, grade);

  /*
   * THE UNPRICED ANSWER, which is the first sentence on most pages in this
   * section and therefore the one most worth getting right.
   *
   * It must not pretend, and it must not apologise. Saying "we don't have this
   * yet, sorry" tells a reader holding a coin about this website rather than
   * about their coin, which is the failure the archive copy rule already names.
   * What it does instead is answer a narrower question honestly and hand the
   * reader the two things that ARE known: where the grade sits in the ladder,
   * and the nearest rung on this coin that does have a figure.
   *
   * It has to survive being quoted with no page around it, like every other
   * answer here -- so it names the coin and the grade, and says what the grade
   * IS rather than what this site has not measured.
   */
  if (!isPriced(value)) {
    /*
     * THE WHOLE CHAIN, OUTWARDS, not the two rungs either side.
     *
     * This looked only at `below` and `above` until the Morgan dollar arrived,
     * and on that series the gates leave a coin with one priced rung in twenty
     * -- the 1889-CC keeps MS65 and nothing else, because one of the two guides
     * prices a thousand-dollar coin at thirty-seven. So the immediate
     * neighbours are unpriced almost everywhere the anchor is needed, and the
     * fallback fired: "No grade of this date has a figure behind it here yet"
     * printed on eighteen pages of a coin whose MS65 page states a figure.
     * False, and false in the direction that makes the site look emptier than
     * it is.
     *
     * Walking out from the rung finds the nearest priced grade in the chain
     * whichever side it is on, which is also the more useful sentence: the
     * reader is told where the nearest measured figure is rather than that
     * there is none.
     */
    const chain = gradedGrades(coin).filter((g) => g.chain === grade.chain);
    const at = chain.findIndex((g) => g.slug === grade.slug);
    let nearest: { g: Grade; v: GradedValue } | undefined;
    for (let step = 1; step < chain.length && !nearest; step += 1) {
      for (const candidate of [chain[at - step], chain[at + step]]) {
        if (!candidate) continue;
        const figure = gradedValue(coin, candidate);
        if (isPriced(figure)) {
          nearest = { g: candidate, v: figure! };
          break;
        }
      }
    }
    const anchor = nearest
      ? ` The nearest grade of this date this site does have a researched figure for is ${nearest.g.label}, at ${rangeText(nearest.v)}, ${VALUE_SOURCE}.`
      : ` Where the grade sits against the rungs either side of it, and every way it is written on a slab, are in the table below.`;
    /*
     * THE CODE, NOT THE LABEL, and this is the rule the section already had.
     *
     * `normaliseQuestion()` strips parentheticals, so "Mint State (MS-63)" and
     * "Mint State (MS-66)" both normalise to "Mint State" -- and an unpriced
     * answer carries no figure to tell them apart, so every mint state rung of
     * one coin produced one identical string and `validateGradeCopy()` refused
     * all of them. The priced branch got away with it only because the range
     * happened to differ.
     */
    return `${article(inSentence(coin), true)} ${inSentence(coin)} graded ${grade.code} is that coin in one particular state of preservation \u2014 the date and the mint mark are already fixed, and ${grade.code} is what a grader called the surface that survived. What that looks like on this coin is below.${anchor}`;
  }

  // The code here too, for the reason above: two rungs of one coin at the same
  // range -- which is common at the bottom of a clad ladder -- would otherwise
  // normalise onto one string.
  const opening = `${article(inSentence(coin), true)} ${inSentence(coin)} graded ${grade.code} is worth ${rangeText(value)}, ${VALUE_SOURCE}.`;

  if (!below) {
    /*
     * The bottom of this coin's ladder, and the sentence has to be true of
     * three hundred coins rather than of one.
     *
     * It used to say the figure was "many times what the metal in it is worth",
     * which is true of a 1932-D and false of most of the catalogue: on an
     * ordinary silver quarter the bottom of the ladder IS the melt figure, and
     * on a clad one there is no metal worth naming. Worse, it compared against
     * the spot price inside a sentence the browser cannot rewrite, so it would
     * have gone from true to false on its own with nobody touching the page.
     *
     * What is true at the bottom of every ladder here, and is the more useful
     * thing to say, is why the ladder stops: nothing below this rung has two
     * published figures behind it, which is the test a grade has to pass to be
     * a page at all.
     */
    return `${opening} That is the bottom of the ladder for this date: ${grade.code} is the lowest grade this coin is given, so there is no step down from it to compare against.`;
  }

  const belowValue = gradedValue(coin, below)!;
  /*
   * The rung below exists and has no figure, so there is no step to SIZE.
   * Inventing one would be arithmetic on an absence.
   *
   * It used to say so in those words -- "has no researched figure on this date
   * yet, so this page states what it can" -- which is the site talking about
   * itself in the second sentence of a page that has just answered the
   * question. Same decision as the ladder paragraph below, 2026-09-22. The
   * direction of the step is a fact about coins and can still be stated; only
   * its size is missing, and the table is where a reader looks for that.
   */
  if (!isPriced(belowValue)) {
    return `${opening} The grade below it is ${below.label}, and the same coin in that grade is worth less — how much less varies from date to date.`;
  }
  const ratio = (value.low! + value.high!) / (belowValue.low! + belowValue.high!);
  const big = ratio >= 1.8;
  /*
   * Three bands, not two.
   *
   * The original pair was tuned on the 1932-D, where the steps are either
   * enormous or negligible. Across the silver run most steps are neither: a
   * 1940-S goes from $18 in VG8 to $29 in AU50, which is sixty per cent more
   * and was being described as "a little more". That is the sentence a reader
   * checks against the table directly underneath it, so it is the sentence
   * least able to afford being loose.
   */
  const step = big
    ? `about ${Math.round(ratio)} times what the same coin brings in ${below.label}`
    : ratio >= 1.25
      ? `appreciably more than the same coin brings in ${below.label}`
      : `a little more than the same coin brings in ${below.label}`;
  // The clause has to follow the size of the step rather than the tier, or it
  // recommends a certification fee that is larger than the difference it is
  // supposed to capture -- which is what the first draft of this sentence did
  // at the bottom of the ladder, on the page read by the most readers.
  // The clause follows the money, not the ratio. Sixty per cent more of nine
  // dollars is still nine dollars, and a certification fee is thirty.
  const why = !big
    ? 'which is why a step of one grade is not worth paying to establish down here: the certification fee is a large share of the difference'
    : grade.tier === 'mint-state'
      ? 'so at this grade the price is set by how few survived without wear rather than by how many were struck'
      : 'so the difference between this grade and the one below it is worth establishing before selling';
  return `${opening} That is ${step}, ${why}.`;
};

/** The meta description. Fitted by dropping whole clauses, never truncated. */
export const gradeDescription = (coin: Coin, grade: Grade): string => {
  const value = gradedValue(coin, grade)!;
  const range = rangeText(value);
  // An unpriced page must not advertise a figure it does not have. The
  // description is built from what the page really carries -- the grade, how it
  // is written, where it sits -- which is the same rule the common questions
  // follow: a description assembled from the headings cannot promise a section
  // the page does not have.
  if (!isPriced(value)) {
    return fit(
      [
        `What ${grade.code} means on ${article(inSentence(coin))} ${inSentence(coin)}, where it sits in the grade ladder, and how to check what one is selling for.`,
        `What ${grade.code} means on ${article(inSentence(coin))} ${inSentence(coin)}, and how to check what one is selling for.`,
        `${grade.label} on ${article(inSentence(coin))} ${inSentence(coin)}: what the grade means and how to check the price.`,
      ],
      DESCRIPTION_MAX,
    );
  }
  return fit(
    [
      `What ${article(inSentence(coin))} ${inSentence(coin)} is worth in ${grade.label}: a ${range} range, what the grade looks like on this coin, and what examples have sold for.`,
      `What ${article(inSentence(coin))} ${inSentence(coin)} is worth in ${grade.label}: a ${range} range, and what the grade looks like on this coin.`,
      `What ${article(inSentence(coin))} ${inSentence(coin)} in ${grade.label} is worth: ${range}, and what that grade looks like on this coin.`,
    ],
    DESCRIPTION_MAX,
  );
};

/** The heading over block 3, and the definition under it. */
/**
 * The census line under the range, where there is a census.
 *
 * "and none finer" rather than "with 0 finer": zero at the TOP of a ladder is a
 * real statement -- nothing has ever graded higher -- and printing it as a
 * digit reads like a missing value. Zero at the bottom of a ladder means
 * something else entirely and never reaches this function, because a rung with
 * no published count carries no `population` at all. See `Population`.
 */
export const populationNote = (coin: Coin, grade: Grade): string | undefined => {
  const pop = gradedValue(coin, grade)?.population;
  if (!pop) return undefined;
  const finer =
    pop.finer === 0
      ? 'and none finer'
      : `and ${pop.finer.toLocaleString('en-GB')} finer`;
  return `${pop.service} has graded ${pop.atGrade.toLocaleString('en-GB')} examples of this date at ${grade.code}, ${finer}.`;
};

/**
 * Every way this grade is written, in a sentence that names the coin.
 *
 * The findability half of the block. A reader who learned the British
 * convention types EF45; a reader reading a slab types MS65 RD with a space in
 * it. Neither string appears anywhere else on the page, and a page that never
 * contains the phrase somebody typed is a page that has to be found some other
 * way.
 *
 * It names the coin because every generated paragraph here has to: without
 * that, this exact sentence would ship on the MS65 page of every coin in the
 * catalogue, which is the duplication the whole module is shaped against.
 */
export const gradeFormsNote = (coin: Coin, grade: Grade): string | undefined => {
  const forms = gradeForms(grade).filter((f) => f !== grade.code);
  if (forms.length === 0) return undefined;
  return `A slab, a dealer\u2019s list or a price guide may write this grade ${list(forms)}. They are the same grade and the same ${inSentence(coin)}.`;
};

export const gradeMeaningHeading = (grade: Grade): string => `What ${grade.code} means`;

/**
 * What the grade looks like on THIS coin.
 *
 * Generated from the grade and the series' wear points -- see the header of
 * `grades.ts`. Undefined when the series has no wear points, which cannot
 * happen on a built page: `gradedGrades()` refuses to produce a page for a
 * coin whose series has none.
 */
export const gradeMeaning = (coin: Coin, grade: Grade): string | undefined => {
  const wear = seriesForCoin(coin)?.series?.wear;
  return wear ? gradeDefinition(grade, wear, inSentence(coin)) : undefined;
};

export const LADDER_HEADING = 'Where this grade sits';

/**
 * The line over the ladder table.
 *
 * It says what the table is for -- "what if mine is a point better" -- and it
 * says what is NOT in it, which is the part that matters: a grade with nothing
 * known about it is absent rather than listed at zero. A row saying "MS69:
 * none" invites a reader to wonder whether one might turn up.
 */
export const gradeLadderNote = (coin: Coin, grade: Grade): string => {
  const ladder = gradedGrades(coin);
  const first = ladder[0];
  const last = ladder[ladder.length - 1];
  const { above } = gradeNeighbours(coin, grade);
  /*
   * "this date" was fine when one coin had a ladder and is a collision now.
   *
   * At the TOP of a ladder this paragraph carries no figure -- there is no next
   * rung to price -- so every part of it that varied between coins was the two
   * grade codes, and every 1932, 1932-S and 1935 quarter running VG8 to MS65
   * produced one identical paragraph on three pages. Naming the coin and its
   * own range fixes it, and `validateGradeCopy()` is what found it: the
   * duplicate check is the measure of whether a formula is still saying
   * anything specific.
   */
  /*
   * THE PARAGRAPH DESCRIBES THE COIN, NEVER THIS SITE'S PROGRESS ON IT.
   *
   * The owner's decision of 2026-09-22. It used to count how many rungs
   * carried a researched figure -- "7 of those 20 rungs have a figure behind
   * them so far; the rest read TBD to TBD" -- and say of an unpriced next rung
   * that it "has no figure researched here yet". Both are true and both are
   * the catalogue-counting failure from the archive copy rules arriving in a
   * new section: they tell a reader holding a dollar how much work has been
   * done on this website, which is not what they came to find out, and they
   * read as an apology on a page whose job is to answer a question. The column
   * blank in the value column already says what has not been measured, in the
   * place a reader is looking when they want to know, and `LADDER_GAP_NOTE`
   * under the table says it in words once.
   *
   * What is left is three facts about the coin: the scale it is graded on, the
   * rung above this one, and that grade and price move together. The last is a
   * generality and is worded as one -- `commonality` gates nothing here and
   * grade genuinely does not separate every price, so "in general terms" is
   * doing real work rather than hedging.
   */
  const span = `The grades ${article(inSentence(coin))} ${inSentence(coin)} is given run from ${first.code} to ${last.code}.`;
  const aboveValue = above ? gradedValue(coin, above) : undefined;
  const step = !above
    ? `${grade.code} is the top of that scale, so there is no grade above it to step up to.`
    : isPriced(aboveValue)
      ? `One step up from ${grade.code} is ${above.label}, at ${rangeText(aboveValue!)} — which is what a reader whose coin might grade a point higher is really asking.`
      : `One step up from ${grade.code} is ${above.label}.`;
  /*
   * A sentence shared by every page in the section, inside a paragraph no two
   * pages share. That is the line the no-boilerplate rule actually draws: the
   * span names the coin and the step names the rung, so `validateGradeCopy()`
   * still separates them, and this is the one thing a reader who has just
   * learned what their coin grades needs told and cannot read off the table.
   */
  const trend = `In general terms, the higher the grade the more the coin is worth.`;
  return `${span} ${step} ${trend}`;
};

export const SALES_HEADING = 'What it sold for';

/**
 * Whether block 4 renders at all.
 *
 * A "What it sold for" heading over "no sale is recorded" on a page that also
 * states no range is a heading announcing two absences, and it was on six and
 * a half thousand pages. Where the page HAS a range the section still earns
 * its place unpriced-of-sales, because the sentence under it says how much to
 * trust that range; where the page has neither, the block is cut and the
 * sold-comps link in the next section does the whole job.
 */
export const showsSales = (coin: Coin, grade: Grade): boolean => {
  const value = gradedValue(coin, grade)!;
  return isPriced(value) || (value.sales ?? []).length > 0;
};

/** The line over the sales table, or the honest line where there are none. */
export const gradeSalesNote = (coin: Coin, grade: Grade): string | undefined => {
  const value = gradedValue(coin, grade)!;
  const sales = value.sales ?? [];
  if (!showsSales(coin, grade)) return undefined;
  if (sales.length === 0) {
    /*
     * Two reasons a rung has no recorded sale, and they are not the same thing
     * to a reader.
     *
     * On a cheap coin it is that nobody records the sale of a coin worth less
     * than the fee to certify it. On an expensive one it is that this site has
     * not read an archive that holds it -- the auction houses' own archives are
     * behind a login and cannot be read at the scale of a series. Saying the
     * first about an MS67 worth four hundred dollars is the page telling the
     * reader something plainly untrue about their own coin, which the original
     * wording did, because it was written for the bottom of one ladder.
     */
    const cheap = value.high! < 250;
    const why = cheap
      ? 'which is what you would expect at this price: certifying a coin costs a large share of what this one is worth, so almost all of them change hands raw and unrecorded'
      : 'because the archives that record sales at this level are behind a login and this site does not read them';
    return `No certified sale of ${article(inSentence(coin))} ${inSentence(coin)} in ${grade.code} is recorded in the sources this site reads, ${why}. The range above is what the published guides say rather than what anybody paid, and it is the weakest figure on this page.`;
  }
  return `What examples of this date in ${grade.code} have actually fetched. A realized price is the only figure here that somebody really paid, which is why it leads and the guides follow.`;
};

export const CHECK_HEADING = 'How to check this yourself';

/**
 * Block 6, generated per coin so it is a live link rather than an instruction
 * to perform a search.
 *
 * `LH_Sold=1&LH_Complete=1` are the two parameters that filter eBay to
 * completed sales, which is the mistake the generic advice exists to warn
 * about -- here it is prevented instead of explained.
 */
export const ebaySoldUrl = (coin: Coin, grade: Grade): string => {
  const query = `${coin.name} ${grade.code}`;
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`;
};

/**
 * The link's own text, here rather than in the template.
 *
 * "The templates hold layout, the module holds sentences" -- and this one was
 * in the template, with its article typed as a literal `a`, which put "a 1879
 * Morgan Dollar" on every grade page of every coin struck before 1900.
 */
export const ebaySoldLabel = (coin: Coin, grade: Grade): string =>
  `Completed sales of ${article(coin.name)} ${coin.name} in ${grade.code}`;

export const gradeCheckNote = (coin: Coin, grade: Grade): string => {
  const value = gradedValue(coin, grade)!;
  const guide = coin.pcgsNumber
    ? ` In a price guide, this issue is PCGS number ${coin.pcgsNumber}; the row you want is the one for ${grade.code}, not the one for the date as a whole.`
    : '';
  // With no range of our own there is nothing to tell the reader to compare
  // against, so the sentence stops at the method instead of inventing a
  // benchmark. It is also the most useful block on an unpriced page, which is
  // why it says so.
  if (!isPriced(value)) {
    return `Sold listings, not asking prices. The link below is already filtered to completed sales of ${article(inSentence(coin))} ${inSentence(coin)} in ${grade.code}, which is the difference between what somebody paid and what somebody hoped for.${guide} Until this site has a researched figure for this grade, that search is the answer — take the middle of several recent sales rather than the highest.`;
  }
  return `Sold listings, not asking prices. The link below is already filtered to completed sales of ${article(inSentence(coin))} ${inSentence(coin)} in ${grade.code}, which is the difference between what somebody paid and what somebody hoped for.${guide} If what you find sits outside ${rangeText(value)}, trust what you found: it is newer than this page.`;
};

export const FLOOR_HEADING = 'The metal floor under it';

export const SOURCES_HEADING = 'Where these figures come from';

/**
 * The provenance block: one sentence naming the public sources this site
 * gathers from, each linked.
 *
 * It used to be a bulleted list of the two guides a particular ladder happened
 * to cite, with a clause each saying what that guide's method is. That was
 * right when there were two sources and a rung was only a page if both of them
 * priced it, and it stopped being right on both counts: a third source
 * arrived, the research behind a figure is not only the automated crawl, and a
 * per-ladder list tells a reader which two websites were reachable on the day
 * rather than where the site's figures come from. The owner's decision of
 * 2026-09-22.
 *
 * It is a SENTENCE and not a list, so it is assembled here and interleaved by
 * the template rather than written into the markup. "Including ... and others"
 * is the honest shape: this names the sources worth naming and does not claim
 * to be exhaustive.
 *
 * Every link is external and commercial, so the template marks them
 * `rel="nofollow noopener"` -- the same treatment the eBay sold-comps link one
 * section up already gets.
 */
export const FIGURE_SOURCES: { name: string; url: string }[] = [
  { name: 'eBay', url: 'https://www.ebay.com/' },
  { name: 'PCGS', url: 'https://www.pcgs.com/coinfacts' },
  { name: 'NGC', url: 'https://www.ngccoin.com/price-guide/united-states/' },
  { name: 'Numista', url: 'https://en.numista.com/' },
  { name: 'USA Coin Book', url: 'https://www.usacoinbook.com/' },
  { name: 'PriceCharting', url: 'https://www.pricecharting.com/' },
];

export const SOURCES_NOTE = {
  lead: 'We gather publicly available data from several public sources including ',
  tail: ', and others.',
};

/**
 * Block 7's one sentence. The figure itself is rendered by the template with
 * `data-spot` on it, because it moves with the metal price and the browser
 * rewrites it -- this sentence carries no figure for exactly that reason.
 */
export const gradeFloorNote = (coin: Coin, grade: Grade): string =>
  // The metal is read off the coin, not assumed. This section began on a silver
  // quarter and said "silver" in the sentence and in the heading; the catalogue
  // it now runs over is more than half clad, and a heading naming a metal the
  // coin is not made of is wrong on the page and wrong in the description built
  // from the headings.
  `Whatever the market does, ${article(inSentence(coin))} ${inSentence(coin)} cannot be worth less than the metal in it. That figure is what the premium for ${grade.code} is measured against, and it moves with the metal price rather than with the coin market.`;

/**
 * The one extra sentence a date with several reverses needs.
 *
 * From 1999 a mint strikes five or six designs a year, this catalogue has one
 * page per (year, mark, finish), and a range read off the guides therefore has
 * one design at each end. Left unsaid, the page states a spread as though it
 * were the spread within one coin's condition, which is the same failure
 * `mintageNote` exists to prevent on the coin page one section over: a figure
 * in the slot where a 1950-D prints one striking's is the site changing what a
 * word means halfway down its own catalogue.
 */
export const gradeSpansNote = (coin: Coin, grade: Grade): string | undefined => {
  const spans = ladderFor(coin.slug)?.spans;
  if (!spans || spans < 2) return undefined;
  // Naming the coin is not decoration: 1999-P and 1999-D have the same year and
  // the same five designs, so a sentence built from the year alone would be one
  // paragraph on two pages and `validateGradeCopy()` would be right to throw.
  return `${article(inSentence(coin), true)} ${inSentence(coin)} is one of ${spans} reverse designs struck at that mint that year, and this page covers all ${spans}, so the range above runs from the commonest of them in ${grade.code} to the scarcest. Within a single design the spread is narrower than it looks here; between them it is what decides whether a roll is worth sorting.`;
};

/* ===========================================================================
   The registry of everything this section says
   =========================================================================== */

/**
 * Whether block 7 renders at all.
 *
 * The template draws the metal floor only where there is metal to price, and
 * this predicate is how the copy registry knows the same thing. It reads the
 * coin's own content rather than its composition group, for the reason the melt
 * section already records: a 40% silver clad half is clad by construction and
 * silver by content, and a group slug is not a statement about either.
 */
const hasMeltFloor = (coin: Coin): boolean => coinMetal(coin) !== undefined;

export interface GradeCopyRow {
  path: string;
  what: string;
  h1: string;
  seoTitle: string;
  description: string;
  question: string;
  answer: string;
  /** Every generated paragraph on the page, in render order. */
  paragraphs: string[];
  headings: string[];
}

export const gradeCopyRow = (coin: Coin, grade: Grade): GradeCopyRow => ({
  path: gradePath(coin, grade),
  what: `${coin.slug} in ${grade.code}`,
  h1: gradeH1(coin, grade),
  seoTitle: gradeSeoTitle(coin, grade),
  description: gradeDescription(coin, grade),
  question: gradeQuestion(coin, grade),
  answer: gradeAnswer(coin, grade),
  paragraphs: [
    populationNote(coin, grade),
    gradeMeaning(coin, grade),
    gradeFormsNote(coin, grade),
    gradeLadderNote(coin, grade),
    gradeSpansNote(coin, grade),
    // Undefined on a page with neither a range nor a recorded sale, where the
    // whole block is cut. `showsSales()` is the one predicate the template and
    // this registry both read, so the build check that compares them cannot
    // find a paragraph here that never reached the HTML.
    gradeSalesNote(coin, grade),
    gradeCheckNote(coin, grade),
    // The floor block only renders on a coin with metal worth pricing, so the
    // registry the build check reads has to agree: more than half this
    // catalogue is clad, and a paragraph listed here that never reaches the
    // HTML fails the check that the two are one thing.
    hasMeltFloor(coin) ? gradeFloorNote(coin, grade) : undefined,
  ].filter(Boolean) as string[],
  headings: [
    gradeMeaningHeading(grade),
    LADDER_HEADING,
    ...(showsSales(coin, grade) ? [SALES_HEADING] : []),
    CHECK_HEADING,
    ...(hasMeltFloor(coin) ? [FLOOR_HEADING] : []),
  ],
});

export const allGradeCopy = (): GradeCopyRow[] =>
  gradedPairs().map(({ coin, grade }) => gradeCopyRow(coin, grade));

/** For `faq-registry.ts`: one question per grade page, and it owns it alone. */
export const allGradeFaqQuestions = (): { question: string; path: string }[] =>
  gradedPairs().map(({ coin, grade }) => ({
    question: gradeQuestion(coin, grade),
    path: gradePath(coin, grade),
  }));

/* ===========================================================================
   Build-time validation
   =========================================================================== */

export function validateGradeCopy(): void {
  const problems: string[] = [];
  const rows = allGradeCopy();

  const firstSeen = new Map<string, string>();
  const unique = (kind: string, value: string, where: string) => {
    if (!value) return;
    const key = `${kind}:${normaliseQuestion(value)}`;
    const owner = firstSeen.get(key);
    if (owner) problems.push(`${kind} "${value}" is used by both ${owner} and ${where}`);
    else firstSeen.set(key, where);
  };

  for (const row of rows) {
    if (row.seoTitle.length > titleBudget(row.seoTitle)) {
      problems.push(
        `${row.what} <title> ships as ${renderedTitle(row.seoTitle).length} characters and has room for ${titleBudget(row.seoTitle)}: "${renderedTitle(row.seoTitle)}"`,
      );
    }
    if (row.description.length > DESCRIPTION_MAX || row.description.length < DESCRIPTION_MIN) {
      problems.push(
        `${row.what} meta description is ${row.description.length} characters; ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} is the usable range: "${row.description}"`,
      );
    }
    if (!row.question.endsWith('?')) problems.push(`${row.what} FAQ question is not a question`);

    for (const [i, text] of [row.h1, row.answer, ...row.paragraphs].entries()) {
      // The three ways a template string fails, as on the archive side: a hole
      // where a fact was missing, a double space where a clause rendered empty,
      // and a slot nobody filled.
      if (/\bundefined\b|\bNaN\b|\bnull\b/.test(text)) {
        problems.push(`${row.what} string ${i} has a hole in it: "${text}"`);
      }
      if (/\s{2,}|\s[,.;:?]/.test(text)) {
        problems.push(`${row.what} string ${i} has a gap in it: "${text}"`);
      }
      if (/{\w+}/.test(text)) {
        problems.push(`${row.what} string ${i} has an unfilled slot in it: "${text}"`);
      }
    }

    unique('H1', row.h1, row.path);
    unique('<title>', row.seoTitle, row.path);
    unique('meta description', row.description, row.path);
    unique('FAQ question', row.question, row.path);
    unique('answer', row.answer, row.path);
    for (const p of row.paragraphs) unique('paragraph', p, row.path);
  }

  // Source the figure. Until 2026-09-22 this demanded the DATE beside every
  // price, the second exception to the no-dates rule; the phrase is undated
  // now, so what the check enforces is the half of it that survived -- a price
  // this site states in a sentence says where it came from, in the same
  // sentence, rather than relying on a stamp somewhere else on the page. The
  // fragment is `VALUE_SOURCE`, so a generator that stops printing it or that
  // reaches for its own wording is caught here.
  for (const { coin, grade } of gradedPairs()) {
    const row = gradeCopyRow(coin, grade);
    if (/[$£€]\s?\d/.test(row.answer) && !row.answer.includes(VALUE_SOURCE)) {
      problems.push(`${row.what} states a price in its answer without saying where it came from`);
    }
  }

  // A coin whose priced rows never reached a page. The research happened, the
  // build shipped, and nothing on the site shows it.
  for (const coin of COINS) {
    if (gradedValues(coin).length > 0 && gradedGrades(coin).length === 0) {
      problems.push(`coin "${coin.slug}" has priced grades and builds no grade page`);
    }

  }

  if (problems.length > 0) {
    throw new Error(`Grade copy is invalid:\n  - ${problems.join('\n  - ')}`);
  }
}

validateGradeCopy();
