/**
 * A coin page written from the four facts that differ between one issue of a
 * series and the next.
 *
 * ---------------------------------------------------------------------------
 * THIS CHANGES A HOUSE RULE, AND HERE IS THE ARGUMENT
 * ---------------------------------------------------------------------------
 *
 * CLAUDE.md said "a coin page's copy is never generated" -- the pattern stops
 * at the archives. That rule was written when the catalogue held eleven coins
 * and it was right for eleven coins. It does not survive contact with the
 * Washington quarter, which is eighty-three issues in silver alone, and the
 * way it fails is the worst available: the work simply stops, because the
 * honest way to add the eighty-fourth is to write it and nobody has the
 * afternoon. What gets added instead is the entry next door with the year
 * changed, which is the thing the duplicate checks exist to refuse, so the
 * refusal lands and the coin never ships.
 *
 * So the rule becomes the one the rest of this site already runs on: GENERATE
 * FROM THE FACTS, OVERRIDE BY HAND WHERE THERE IS SOMETHING TO SAY. A coin
 * with a story -- the 1932-D and its added mint marks, the 1964 and the end of
 * silver coinage -- is written out in full in `coin-seed.ts` and this module
 * never touches it. A coin whose page is its facts is generated here, and the
 * page it gets is the page a writer would have produced, because there is
 * genuinely nothing else true to say about a 1947-S Washington quarter.
 *
 * The thing that makes this safe rather than a licence to print pages is that
 * every sentence below is derived from a figure that differs per issue -- the
 * year, the mint, the mintage, which other mints struck that year, whether the
 * date is scarce. `validateCatalogCopy()` already fails a <title> or a
 * description used twice, coin pages included, and it runs over these.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT GENERATED, EVER
 * ---------------------------------------------------------------------------
 *
 * `sections`. That field holds the one fact true of this coin and of no other,
 * and a generator cannot know one -- if it could, the fact would be derivable
 * and therefore not worth a section. A generated coin has no `sections` and
 * its page ends at the pull quote, which the coin template already treats as
 * complete.
 */
import type { Coin } from '../data/coin-schema';
import { DESCRIPTION_MAX, TITLE_MAX, article, fit } from './meta';

/**
 * A reverse hub that gets a page of its own.
 *
 * The owner's decision of 2026-09-22, and it reverses "a variety is listed and
 * never followed" for exactly two coins. What makes them not varieties: the
 * eight-feather and seven-feather reverses of 1878 are told apart by COUNTING
 * something, with no judgement and no loupe, and the sources state a separate
 * mintage for each -- 749,500 against 9,759,300, which is one coin in fourteen
 * of the year. A VAM is neither of those things, which is why the rule holds
 * everywhere else in this series and this registry is hand-typed rather than
 * derived. A hub read off a catalogue's "1st reverse" comment would fan the
 * Morgan dollar out by die pairing, which is the generated-catalogue failure
 * with a Roman numeral instead of a letter.
 *
 * The hub does NOT replace the year's coin. `1878-morgan-dollar` keeps its
 * page and its combined total, because that is the phrase almost everybody
 * types and the reader who has just found an 1878 does not yet know the
 * question exists. Three pages, and the plain one's checklist sends the reader
 * to count.
 */
export interface Hub {
  /** The slug token, permanent like a finish's. */
  slug: string;
  /** Title case, for a name and a `<title>`: "8 Tail Feathers". */
  name: string;
  /** The same thing inside a sentence: "8 tail feathers". */
  noun: string;
  /** The checklist step that tells them apart. Required: it is the whole point. */
  identify: string;
}

/** One row of a research sheet: the four facts that differ per issue. */
export interface Issue {
  year: number;
  /**
   * The reverse hub, where this coin is one. Absent on all but four coins.
   *
   * A fourth axis beside the year, the mark and the finish, and it is in the
   * slug for the same reason the finish is: two hubs of one year are two coins
   * with two mintages and two markets, and one URL cannot be both.
   */
  hub?: Hub;
  /** As struck: 'D', 'P', 'S', or '' for a coin carrying no mark at all. */
  mark: string;
  /** Absent where no total can be stated. See `coverage`. */
  mintage?: number;
  /**
   * The mints that struck this coin, from the source.
   *
   * Usually one. It is a list because a coin with NO mint mark can have been
   * struck at several -- the Washington quarter of 1965, 1966 and 1967 was
   * struck at all three and marked at none of them, under one combined figure,
   * and 1977 to 1979 were struck at Philadelphia and West Point the same way.
   * Assuming one city here is how a page comes to tell a reader that a blank
   * space means Philadelphia when it means any of three places.
   */
  struckAt: string[];
  commonality: Coin['commonality'];
  /**
   * 'circulation', 'proof', 'silver-proof' or 'uncirculated'.
   *
   * The second axis of an issue, and the reason a year and a mint mark are no
   * longer enough to name one. From 1992 San Francisco has struck TWO quarters
   * of every date -- a clad proof and a silver proof -- and from 2012 a third,
   * the uncirculated coin sold in Mint rolls and bags. They are different
   * objects in different metals with different markets, and the only thing
   * separating them is this field.
   */
  finish: string;
  /**
   * How many reverse designs this figure covers, and what one of them was.
   *
   * From 1999 a mint strikes five or six reverses a year and this site gives a
   * page to the (year, mark, finish) rather than to a design, so `mintage` is a
   * SUM. A sum printed in the slot where a 1950-D page prints one striking's
   * figure is the site changing what a word means halfway down its own
   * catalogue, so every sentence built from it says what it counts.
   *
   * `perDesign` is set only where every design carries the same figure, which
   * is true of every proof -- the figure is the number of sets -- and of the
   * 2019-W and 2020-W issues, two million of each of five designs. Where it is
   * set it is the number the reader's own coin shares, and it is the one the
   * page leads with.
   */
  designs: number;
  perDesign?: number;
  /** How many sources stand behind the weakest part of the figure. */
  sources?: number;
  /**
   * The designs whose figures the sources could not settle.
   *
   * The coin is published anyway and the page says so. Withholding it gave a
   * reader nothing at all about a coin that exists, in order to avoid printing
   * one of two figures half a per cent apart -- and completeness comes first,
   * with correctness a very close second, which means printing the best figure
   * AND the fact that it is contested rather than printing neither.
   */
  disputed?: { design: string; figures: { mintage: number; sources: string[] }[] }[];
  /**
   * Set when no total can be stated, because some designs have no published
   * figure. The coin still gets a page; the page states no mintage.
   */
  coverage?: { designsPriced: number; designsStruck: number };
}

/**
 * A (year, mark, finish) the sources attest, whether or not this site has a
 * figure for it.
 *
 * Existence and price are two questions. See the note in `issueIdentify`.
 */
export interface Attestation {
  year: number;
  mark: string;
  finish: string;
}

/** The facts that are constant across the run, from the sheet's own header. */
export interface SeriesContext {
  /** The series tag slug, which is also the last part of every slug here. */
  series: string;
  /** Display stem, title case, for a name: "Washington Quarter". */
  seriesName: string;
  /**
   * The same thing as it reads INSIDE a sentence: "Washington quarter".
   *
   * Stored rather than derived. Lowercasing the display name gives "washington
   * quarter" and eats a proper noun; lowercasing all but the first word gives
   * "Standing liberty quarter" on the next series along. There is no rule here,
   * only the fact of which words are names, so the sheet states it -- the same
   * reason `PROPER_SERIES_WORDS` exists in cheat-sheets.ts.
   */
  seriesNoun: string;
  group: string;
  type: string;
  /** Short denomination word for titles: "Quarter". */
  denomination: string;
  tags: string[];
  country: string;
  composition: string;
  weightGrams: number;
  diameterMm: number;
  silverOzt?: number;
  goldOzt?: number;
  faceValue: string;
  obverse: string;
  reverse: string;
  /**
   * Where the mark sits, by era, from the series registry.
   *
   * A list because it moves: the Washington quarter's is on the reverse to
   * 1964 and on the obverse from 1968. The generator picks the one covering
   * the issue's year, and writes no mark step at all when none covers it --
   * which is the correct output for a year when no mint used a mark.
   */
  markPositions: { years: { from: number; to?: number }; where: string }[];
  /** Every composition era of the series, for the edge and weight comparisons. */
  eras: {
    years: { from: number; to?: number };
    composition: string;
    group: string;
    edgeLooks?: string;
    specs?: { weightGrams: number };
    /** True for an era outside the run's timeline: see `finishCompositions`. */
    finishOnly?: boolean;
  }[];

  /**
   * The reverse-hub slugs IN REGISTRY ORDER, which is the order they were
   * struck in.
   *
   * Carried only so the two sentences that list them can put the first reverse
   * first. Sorting by slug puts "7-tail-feathers" before "8-tail-feathers",
   * which reverses the history and makes "the mint changed from one to the
   * other" name them backwards; sorting by mintage would be right this once
   * and wrong the moment a series changes to a commoner reverse.
   */
  hubs?: string[];

  /**
   * The mints of the series and the years each struck it, from the registry.
   *
   * Needed so the checklist can tell "this mint did not strike this date" from
   * "this mint has nothing to do with this denomination". See `plausibleMint`.
   */
  mints: { city: string; mark: string; years?: { from: number; to?: number }[] }[];

  /** Mint sets were not sold before this year, so the premium line cannot cite one. */
  mintSetsFrom?: number;
  /**
   * A mint that struck this era as PROOFS ONLY, and the sentence saying so.
   *
   * Without this the checklist tells a reader holding a 1977-S proof that no
   * such coin exists, on fifty pages at once. "San Francisco struck none of
   * these" is true of the silver era, where that mint struck no quarters at
   * all from 1955, and false of the clad era, where it struck every year and
   * sold them in sets. The two eras cannot share one sentence, so the sheet
   * that needs the other one says so.
   */
  proofOnly?: { mark: string; years: { from: number; to?: number }; note: string };
}

const CITY: Record<string, string> = {
  '': 'Philadelphia',
  P: 'Philadelphia',
  D: 'Denver',
  S: 'San Francisco',
  W: 'West Point',
};

const n = (value: number) => value.toLocaleString('en-US');

/** "1947-S", "1947". How the issue is written everywhere. */
export const issueLabel = (issue: Issue) =>
  issue.mark ? `${issue.year}-${issue.mark}` : String(issue.year);

/**
 * The token a finish adds to a slug, and the bare form belongs to the proof.
 *
 * The owner's decision, and it is permanent -- a slug is never changed once
 * published. From 1968 an S on a quarter means a proof and nothing else, so
 * `1999-s-washington-quarter` is the clad proof; the silver proof beside it is
 * `1999-s-silver-washington-quarter` and the Mint-roll coin is
 * `2012-s-uncirculated-washington-quarter`. The 1932-1954 S circulation strikes
 * were published under the bare form before any of this existed and keep it,
 * which they can because no year has both.
 */
const FINISH_SLUG: Record<string, string> = {
  circulation: '',
  proof: '',
  'silver-proof': 'silver',
  uncirculated: 'uncirculated',
};

export const issueSlug = (issue: Issue, ctx: SeriesContext) => {
  /*
   * A PROOF WITH NO MINT MARK TAKES THE TOKEN; a proof with one keeps the bare
   * form. The owner's ruling gave the bare form to the proof, which works
   * wherever a mint struck proofs and nothing else in a year -- San Francisco,
   * every year since 1968 -- and cannot work for Philadelphia, which struck a
   * markless proof AND a markless circulation quarter in every year from 1936 to
   * 1942 and from 1950 to 1964. `1936-washington-quarter` cannot be two coins.
   *
   * The rule is stated on the mark rather than on what else exists, so it is
   * decided by the coin and not by the state of the catalogue. A conditional
   * slug -- take the bare form unless something else has it -- would change the
   * day a source added a sibling, and a slug is never changed once published.
   */
  const bareIsTaken = issue.finish === 'proof' && issue.mark === '';
  const token = bareIsTaken ? 'proof' : (FINISH_SLUG[issue.finish] ?? issue.finish);
  /*
   * The hub comes AFTER the finish, so the tokens read in the order a reader
   * would say them: `1878-proof-8-tail-feathers-morgan-dollar`. It is last
   * because it is the rarest axis and the one a reader is least likely to type
   * -- a slug that opened with it would bury the year.
   */
  const hub = issue.hub ? `-${issue.hub.slug}` : '';
  return `${issue.year}${issue.mark ? `-${issue.mark.toLowerCase()}` : ''}${token ? `-${token}` : ''}${hub}-${ctx.series}`;
};

/**
 * "1878 Morgan dollar with 8 tail feathers", or the plain form where there is
 * no hub.
 *
 * One function, because the phrase has to be identical in the bluf, the name,
 * the description and the link text: three near-identical spellings of one
 * coin is three things a reader has to decide are the same object.
 */
const hubOrder = (ctx: SeriesContext) => (a: Issue, b: Issue) =>
  (ctx.hubs ?? []).indexOf(a.hub?.slug ?? '') - (ctx.hubs ?? []).indexOf(b.hub?.slug ?? '');

const withHub = (issue: Issue, stem: string, title = false) =>
  issue.hub ? `${stem} with ${title ? issue.hub.name : issue.hub.noun}` : stem;

/** 'Proof', 'Silver Proof', 'Uncirculated' -- or nothing, for a coin that circulated. */
const FINISH_NAME: Record<string, string> = {
  circulation: '',
  proof: 'Proof',
  'silver-proof': 'Silver Proof',
  uncirculated: 'Uncirculated',
};

/**
 * The finish, in the NAME rather than in a parenthetical.
 *
 * "1999-S Washington Quarter (Proof)" and "... (Silver Proof)" would be two
 * different coins with one H1, because `normaliseQuestion()` strips
 * parentheticals before every uniqueness check on this site -- which is the
 * same trap the grade pages fell into with "in Mint State (MS-63)". So the word
 * sits in the sentence, where it is also what somebody types.
 */
const withFinish = (finish: string, stem: string, lowerFinish = false) => {
  const word = FINISH_NAME[finish] ?? '';
  if (!word) return stem;
  /*
   * Only the finish word is recased, NEVER the stem. Lowercasing the stem as
   * well is how "2021-S silver proof Washington quarter" became "... washington
   * quarter" on every proof page and on every melt page beside them: the series
   * noun is already stored in sentence form with its proper nouns intact, for
   * the same reason `PROPER_SERIES_WORDS` exists. A caller that wants a
   * lowercase denomination lowercases the denomination.
   */
  return `${lowerFinish ? word.toLowerCase() : word} ${stem}`;
};

/** Whether this issue was ever in a till. Decides the whole verdict block. */
export const wasCirculated = (issue: Issue) => issue.finish === 'circulation';

/** "a, b and c" -- a list folded into a sentence. */
const list = (items: string[], conjunction: 'and' | 'or' = 'and'): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;

/**
 * "a D", but "an S".
 *
 * A mint mark is read aloud as a letter, so the article follows how the LETTER
 * sounds rather than how a word beginning with it would. S, F, L, M, N, R and X
 * all take "an"; of the marks any United States mint has used, only S does.
 */
const letterArticle = (letter: string) => (/^[AEFHILMNORSX]/i.test(letter) ? 'an' : 'a');

const inRange = (year: number, years: { from: number; to?: number }) =>
  year >= years.from && (years.to === undefined || year <= years.to);

/** "1932-1964", "1965 onwards". A range as a reader reads one. */
const rangeLabel = (years: { from: number; to?: number }) =>
  years.to === undefined ? `${years.from} onwards` : `${years.from}\u2013${years.to}`;


/**
 * What this coin is made of, as a clause inside a sentence.
 *
 * Read off the era's own figures rather than written per branch: the module
 * used to say "is 90% silver" whenever a silver weight was present, which was
 * true of every coin in the catalogue on the day it was written and is false of
 * the .999 proofs struck since 2019.
 */
const metalClause = (ctx: SeriesContext) =>
  ctx.silverOzt
    ? `is ${lower(ctx.composition)}, and contains ${ctx.silverOzt} troy ounces of silver`
    : `is ${lower(ctx.composition)} with no silver in it at all`;

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** First letter up, for a string that starts a meta description. */
const cap = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** "five", "six" -- small counts read as words. */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const count = (value: number) => WORDS[value] ?? n(value);

/**
 * What the mintage figure COUNTS, which is the sentence this section exists for.
 *
 * From 1999 a mint struck five or six reverse designs a year and a page belongs
 * to the year and the mint mark, so the figure is a sum. Printing a sum in the
 * slot where a 1950-D page prints one striking's mintage, with no sentence over
 * it, is the site changing what a word means halfway down its own catalogue.
 *
 * Two shapes, and which one is used is decided by the figures rather than by
 * the year. Where every design carries the same number -- every proof, because
 * the figure is the number of sets, and the 2019-W and 2020-W issues at two
 * million apiece -- the PER-DESIGN figure leads, because that is the number the
 * reader's own coin shares and the total is an accounting fact about the mint.
 * Where they differ, only the total is true of the group and the designs are
 * named as a count.
 */
const designClause = (issue: Issue, ctx: SeriesContext, siblings: Issue[] = []): string | undefined => {
  /*
   * A year split by reverse hub, on the year's OWN page. Its figure is the two
   * added together, which is the same obligation a state-quarter year has and
   * the same sentence answers it: say what a mintage counts whenever it is not
   * one striking of one design.
   *
   * Read off the siblings rather than added up here, so this page and the two
   * under it cannot state figures that do not reconcile in front of the reader.
   */
  const hubs = siblings.filter(
    (sibling) =>
      sibling.year === issue.year &&
      sibling.mark === issue.mark &&
      sibling.finish === issue.finish &&
      sibling.hub,
  );
  if (!issue.hub && hubs.length > 1 && issue.mintage) {
    const city = issue.struckAt[0] ?? CITY[issue.mark] ?? CITY[''];
    const split = [...hubs]
      .sort(hubOrder(ctx))
      .filter((h) => h.mintage)
      .map((h) => `${n(h.mintage!)} with ${h.hub!.noun}`);
    return `${city} changed the reverse partway through ${issue.year}, so ${n(issue.mintage)} is the two of them added together — ${list(split)}. They are told apart by counting, and they are not worth the same.`;
  }
  if (issue.designs <= 1 || !issue.mintage) return undefined;
  const city = issue.struckAt[0] ?? CITY[issue.mark] ?? CITY[''];
  const designs = `${count(issue.designs)} reverse designs`;
  if (issue.perDesign !== undefined) {
    return `${city} struck ${designs} in ${issue.year} and ${n(issue.perDesign)} of each, so the figure above is the ${n(issue.mintage)} struck across all of them rather than the number of ${ctx.seriesNoun}s carrying the design on yours.`;
  }
  return `${city} struck ${designs} in ${issue.year}, so ${n(issue.mintage)} is the total across all of them and no single design accounts for it.`;
};

/**
 * The sentence that stands where a scarcity verdict would, on a coin that was
 * never in a till.
 *
 * `commonality` is a statement about SURVIVAL and survival is only a question
 * for a coin that circulated. Every proof was bought by somebody who wanted it
 * and put it in a drawer, so a proof with a mintage of a million is not scarce,
 * it is cheap -- and the thresholds would print "Scarce" on ninety pages. See
 * `Coin.finish` in the schema for the whole argument.
 */
export const finishNote = (issue: Issue, ctx: SeriesContext, siblings: Issue[] = []): string | undefined => {
  /*
   * How many of the coin in the reader's hand were made, and it is NOT the
   * total unless the total is about one design.
   *
   * "7,286,820 of the design on yours" is what the first draft printed on the
   * 2012-S page, where five designs share that figure between them and no
   * design accounts for more than 1.7 million of it. Where the per-design
   * figure is unknown, the sentence has to stop claiming to be one.
   */
  const figure = issue.perDesign ?? issue.mintage;
  const perDesign = issue.perDesign !== undefined;
  const struck = figure ? n(figure) : null;
  const ofDesign = !struck
    ? 'and the Mint has published no figure for how many'
    : perDesign
      ? `${struck} carrying the design on yours`
      : `${struck} across the ${count(issue.designs)} designs of that year`;

  if (issue.finish === 'proof' || issue.finish === 'silver-proof') {
    const survival =
      perDesign && struck
        ? `${struck} were made and very nearly ${struck} survive, most of them untouched`
        : 'nearly every one of them survives, most of them untouched';
    return `This is a proof, not a coin that was ever in a till: it was struck on a polished blank from polished dies, sold in a collector set and almost certainly kept in one. So the mintage says less about it than it would about a circulating date \u2014 ${survival}. What decides the price is the metal, the state of the packaging and whether the surfaces have been fingered or hazed.`;
  }

  if (issue.finish === 'uncirculated') {
    /*
     * How much scarcer than the circulating coins of the same date, WORKED OUT
     * rather than asserted. The first draft said "by a factor of several
     * hundred", which is true of the 2022 issues at three hundred thousand
     * against two hundred and fifty million and wrong by an order of magnitude
     * for the 2012 one.
     */
    const circulating = siblings.filter(
      (sibling) => sibling.year === issue.year && wasCirculated(sibling) && sibling.mintage,
    );
    const largest = Math.max(0, ...circulating.map((sibling) => sibling.mintage ?? 0));
    const ratio = largest > 0 && issue.mintage ? Math.round(largest / issue.mintage) : 0;
    const comparison =
      ratio >= 2 && circulating.length > 0
        ? ` That makes it something like ${n(ratio)} times scarcer than the ${ctx.seriesNoun}s of the same date that went into circulation, and cheap all the same, because the people holding them are the people who want them.`
        : '';
    const joint = struck ? ` \u2014 ${ofDesign}` : `, ${ofDesign}`;
    return `This coin was never released into circulation. The Mint struck it at ${issue.struckAt[0] ?? CITY[issue.mark]} and sold it directly, in rolls and bags, so it will not turn up in change and every one that exists was bought by somebody who meant to keep it${joint}.${comparison}`;
  }

  return undefined;
};

/* ===========================================================================
   The sentences
   =========================================================================== */

/**
 * What the site can and cannot stand behind about this figure, in one sentence.
 *
 * Two cases, and both are the same principle -- show the working, including
 * where the working ran out:
 *
 *   DISPUTED   the published figures disagree. The page states the highest,
 *              because the worst thing it can do to somebody holding an
 *              ordinary coin is tell them it is scarce, and it names the others
 *              so the reader can see the spread for themselves.
 *   NO TOTAL   some of the year's designs have no published figure at all, so
 *              there is no total to print and the page says that instead of
 *              printing a sum of the rest.
 */
export const mintageCaveat = (issue: Issue): string | undefined => {
  if (issue.coverage) {
    const missing = issue.coverage.designsStruck - issue.coverage.designsPriced;
    return `No mintage is stated because none has been published for ${missing === 1 ? 'one' : count(missing)} of the ${count(issue.coverage.designsStruck)} reverse designs struck that year. Adding up the rest would give a figure smaller than the true one and call it a total.`;
  }
  if (!issue.disputed || issue.disputed.length === 0) return undefined;
  const spread = issue.disputed
    .flatMap((d) => d.figures.map((f) => f.mintage))
    .sort((a, b) => a - b);
  const low = spread[0];
  const high = spread[spread.length - 1];
  const which =
    issue.disputed.length === 1 && issue.designs > 1
      ? `the ${issue.disputed[0].design} reverse`
      : issue.designs > 1
        ? `${count(issue.disputed.length)} of its reverse designs`
        : 'this issue';
  return `The published figures for ${which} disagree \u2014 the sources give between ${n(low)} and ${n(high)} \u2014 so the figure above is the highest of them. Where it cannot be settled how many were struck, this page states the number that makes the coin commoner rather than scarcer.`;
};

/**
 * The BLUF, which is also the FAQPage `acceptedAnswer`.
 *
 * Four forms, chosen by whether the coin carries a mint mark and by whether
 * its date is scarce. The branch matters: "the same metal, and the same value,
 * as a 1947 quarter with no mint mark" is true of a common date and false of a
 * key date, and a sentence that is quoted with no page around it cannot afford
 * to be false for the coin somebody is actually holding.
 */
export const issueBluf = (issue: Issue, ctx: SeriesContext, siblings: Issue[]): string => {
  const label = issueLabel(issue);
  // The mints the SOURCE says struck it, not the one its mint mark implies. A
  // coin carrying no mark may have been struck at three.
  const city = list(issue.struckAt);
  const metal = metalClause(ctx);
  /*
   * "An 1878 proof Morgan dollar with 8 tail feathers".
   *
   * The finish word is in it. Left out, the hub branch below opened "An 1878
   * Morgan dollar with 8 tail feathers is 90% silver" on the proof page --
   * a sentence that describes the circulation coin, on the page for a coin
   * that was never in a till, and one a model would quote with nothing around
   * it to correct it.
   */
  const subject = `${article(label, true)} ${withHub(issue, `${label} ${withFinish(issue.finish, ctx.seriesNoun, true)}`)}`;

  /*
   * A reverse hub leads with the split, because the split is the only reason
   * this page exists rather than the year's.
   *
   * It comes BEFORE the scarcity branches deliberately. "One of the scarcer
   * dates in the series" is false of the eight-feather 1878: the date is not
   * scarce at all, ten and a half million were struck, and what is scarce is
   * this reverse of it. A reader quoted that sentence with no page around it
   * would go looking for the wrong thing.
   *
   * The comparison figure is the year's own coin, found among the siblings
   * rather than added up here, so the two pages cannot disagree.
   */
  const whole = siblings.find(
    (sibling) =>
      sibling.year === issue.year &&
      sibling.mark === issue.mark &&
      sibling.finish === issue.finish &&
      !sibling.hub,
  );
  if (issue.hub && issue.mintage && whole?.mintage) {
    /*
     * Scarcer or commoner is DERIVED from the two figures, never typed. It is
     * the one thing a reader wants from this page and the one thing a hub
     * registry must not be allowed to assert: a registry entry saying "the
     * scarce one" would go on saying it the day a source revised the split.
     */
    const rarer = issue.mintage * 2 < whole.mintage;
    const of =
      issue.finish === 'circulation'
        ? `${n(issue.mintage)} of the ${n(whole.mintage)} struck`
        : `${n(issue.mintage)} of the year’s ${n(whole.mintage)} proofs`;
    return `${subject} ${metal} — and it is the ${rarer ? 'scarcer' : 'commoner'} of the two reverses ${city} used that year, ${of}.`;
  }

  /*
   * A proof answers a different question and gets its own opening.
   *
   * "was struck at San Francisco, is clad, the same metal and the same value as
   * a 1999-P" is the circulating branch and every clause of it is wrong here: a
   * proof was sold rather than spent, and it is worth several times what the
   * coin from the roll is worth precisely because it is not the same object.
   */
  const known = issue.perDesign ?? issue.mintage;
  /*
   * "the design on yours" is only true where the year HAS more than one.
   *
   * The clause was written against the quarter from 1999, where a mint strikes
   * five or six reverses a year and a proof figure is the number of sets, so
   * "one of 2,113,390 struck with the design on yours" is the sentence that
   * stops a reader reading the year's total as their coin's. On a year with one
   * design it says nothing and implies something false -- that there were
   * others -- and it went out on all twenty-two of the quarter's 1936-1964
   * proofs before a one-design series arrived to make it obvious. Same trap as
   * `article()`: right on every page on the site, wrong on the next hundred.
   */
  const perDesign = issue.perDesign !== undefined ? ' struck with the design on yours' : ' struck';
  if (issue.finish === 'proof' || issue.finish === 'silver-proof') {
    const what = issue.finish === 'silver-proof' ? 'silver proof' : 'proof';
    const tail = known ? `, and is one of ${n(known)}${perDesign}` : '';
    return `${article(label, true)} ${label} ${what} ${ctx.seriesNoun} ${metal}, was sold in ${article(String(issue.year))} ${issue.year} collector set rather than released into circulation${tail}.`;
  }
  if (issue.finish === 'uncirculated') {
    const tail = known
      ? `, so the ${n(known)}${perDesign} were all bought by collectors`
      : ', so every one of them was bought by a collector rather than spent';
    return `${article(label, true)} ${label} uncirculated ${ctx.seriesNoun} ${metal} and was sold by the Mint in rolls and bags rather than released into circulation${tail}.`;
  }

  // One sentence, in every branch. STYLE.md, and a unit test over the whole
  // catalogue: a second sentence in a BLUF is almost always restating the melt
  // figure that renders directly beneath it.
  if (issue.commonality === 'key-date' && known) {
    return `${article(label, true)} ${label} ${ctx.seriesNoun} is one of the key dates of the series: ${n(known)} were struck, it ${metal}, and even a worn example is worth many times its metal.`;
  }
  if (issue.commonality === 'scarce' && known) {
    const struck =
      issue.perDesign !== undefined ? `${n(issue.perDesign)} of each reverse design` : `${n(known)} struck`;
    return `${article(label, true)} ${label} ${ctx.seriesNoun} was struck at ${city}, ${metal} \u2014 and with ${struck} it is one of the scarcer dates in the series.`;
  }

  /*
   * Common dates. Where the same year exists from another mint, say so: the
   * question behind "what is my 1947-S worth" is usually "does the S matter",
   * and on a common date the answer is no.
   *
   * SAME FINISH ONLY. A 1999-P is not "the same metal and the same value" as
   * the 1999-S silver proof of the same year, and saying so on a page that a
   * model may quote with nothing around it is the worst available sentence.
   */
  /*
   * AND THE SAME VERDICT. "The same metal, and the same value, as an 1878-CC"
   * is what this printed on the 1878 Philadelphia page, and an 1878-CC is a
   * two-million-mintage Carson City dollar worth several times a Philadelphia
   * one. The clause only ever meant "the mint mark does not matter here", and
   * it is only true between coins the thresholds put on the same rung.
   *
   * A hub is excluded outright: the eight-feather and seven-feather 1878 are
   * the same mint and the same year, so `mark` does not separate them, and the
   * whole point of their pages is that they are NOT worth the same.
   */
  const others = siblings.filter(
    (sibling) =>
      sibling.year === issue.year &&
      sibling.mark !== issue.mark &&
      sibling.finish === issue.finish &&
      sibling.commonality === issue.commonality &&
      !sibling.hub,
  );
  const sameValue =
    others.length > 0
      ? ` \u2014 the same metal, and the same value, as ${list(
          others.map((o) =>
            // "a 1947-D", but "a 1947 with no mint mark". A bare year reads as
            // a date rather than as the other coin the reader might be holding,
            // and the whole point of the clause is to name that coin.
            o.mark ? `${article(issueLabel(o))} ${issueLabel(o)}` : `${article(String(o.year))} ${o.year} with no mint mark`,
          ),
        )}.`
      : '.';
  /*
   * "was struck at X, is clad" reads as a list when an em-dash clause follows it
   * and as a comma splice when nothing does -- which is what the 1965, 1966 and
   * 1967 pages got, because no other mint mark exists for those dates to
   * compare them with. So the joint is a comma before a clause and an "and"
   * before a full stop.
   */
  const joint = others.length > 0 ? `, ${metal}` : ` and ${metal}`;
  const opening = issue.mark
    ? `${article(label, true)} ${label} ${ctx.seriesNoun} was struck at ${city}${joint}`
    : `${article(String(issue.year), true)} ${issue.year} ${ctx.seriesNoun} with no mint mark was struck at ${city}${joint}`;
  return `${opening}${sameValue}`;
};

/**
 * The `<title>`, which must name the metal it actually has and must not
 * promise a price.
 *
 * Two corrections, and one of them was then half taken back. It said "90%
 * Silver" on every generated title until the clad era arrived and then went on
 * saying it -- "1980-P Quarter Value: 90% Silver and Price" shipped on
 * sixty-one clad pages, promising a metal the coin does not contain to
 * everybody who saw it in a result list. That one stands: the metal is read
 * off the era.
 *
 * "VALUE" STAYS; "PRICE" DOES NOT, and the difference is what the page can
 * actually do. For a few hours the word "Value" came out of every generated
 * title too, on the argument that a coin page states facts and not a figure.
 * The owner's correction, the same evening: the page DOES carry value --
 * a melt figure worked from a live spot price wherever there is metal, a
 * scarcity verdict, a researched graded range wherever one exists, and a
 * route to looking one up where none does. A title that hides all of that
 * from the one word somebody actually types is a title doing the reader no
 * favours and the site none either.
 *
 * "Price" is the word that does not survive, because it promises a number the
 * page names for a specific coin and this site never sees the coin. "Value"
 * is the question; "Price" is an answer it cannot give.
 *
 * Fitted rather than trimmed, because `Seo.astro` appends " | AboutMyCoin" and
 * a check on the declared string is thirteen characters short of the truth.
 */
export const issueSeoTitle = (issue: Issue, ctx: SeriesContext): string => {
  /*
   * The hub joins the LABEL rather than the subject, so the title reads
   * "1878 8 Tail Feathers Dollar Value" -- which is the word order somebody
   * types -- rather than "1878 Dollar with 8 Tail Feathers Value".
   */
  const label = issue.hub ? `${issueLabel(issue)} ${issue.hub.name}` : issueLabel(issue);
  const subject = withFinish(issue.finish, ctx.denomination);
  /*
   * THE SERIES-NAMED FORMS, AND WHY THEY COME FIRST.
   *
   * The ladder below used to start at the bare denomination -- "1921 Dollar
   * Value: 90% Silver and Mintage" -- and that is a title that belongs to no
   * series, which was invisible while one series held each denomination. The
   * Peace dollar ended it: 1921 is the ONE year both it and the Morgan were
   * struck, both at Philadelphia, both 90% silver, so the two pages generated
   * one `<title>` between them and `validateCatalogCopy()` threw.
   *
   * A longer name is not the fix and an override on one coin is not either --
   * the collision is a fact about the formula, not about 1921, and the next
   * shared denomination would find it again. This is the grade pages' hub
   * lesson one section over: the fallback is the thing that collides, so the
   * distinguishing fact has to be IN the string rather than left to luck.
   *
   * So the series-named forms are tried first and the bare ones stay under
   * them as the fallback for a name too long to fit. The bare rungs are still
   * reachable, and two coins that reach them can still collide -- which the
   * validator still catches, and which is now the rare case rather than the
   * default one.
   */
  const named = withFinish(issue.finish, ctx.seriesName);
  // "90% Silver", "99.9% Silver" -- title case, because it sits in a <title>.
  const metal = ctx.silverOzt
    ? ctx.composition.replace(/,.*$/, '').replace(/\bsilver\b/i, 'Silver')
    : undefined;
  return fit(
    metal
      ? [
          `${label} ${named} Value: ${metal} and Mintage`,
          `${label} ${named} Value: ${metal}`,
          `${label} ${named} Value`,
          `${label} ${subject} Value: ${metal} and Mintage`,
          `${label} ${subject} Value: ${metal}`,
          `${label} ${subject} Value`,
          `${label} ${subject}`,
        ]
      : [
          `${label} ${named} Value: Mintage and Specifications`,
          `${label} ${named} Value: Mintage`,
          `${label} ${named} Value`,
          `${label} ${subject} Value: Mintage and Specifications`,
          `${label} ${subject} Value: Mintage`,
          `${label} ${subject} Value`,
          `${label} ${subject}`,
        ],
    TITLE_MAX,
  );
};

/**
 * The meta description, which carries the mintage.
 *
 * Not decoration: it is what makes every one of eighty-three descriptions
 * different from the other eighty-two, and `validateCatalogCopy()` fails a
 * description used twice whether it was written or generated.
 */
export const issueDescription = (issue: Issue, ctx: SeriesContext): string => {
  const city = issue.struckAt[0] ?? CITY[issue.mark] ?? CITY[''];
  const noun = withFinish(issue.finish, ctx.denomination.toLowerCase(), true);
  const subject = issue.hub
    ? `${article(issueLabel(issue))} ${withHub(issue, `${issueLabel(issue)} ${noun}`)}`
    : issue.mark
      ? `${article(issueLabel(issue))} ${issueLabel(issue)} ${noun}`
      : `${article(String(issue.year))} ${issue.year} ${noun} with no mint mark`;
  const silver = ctx.silverOzt
    ? `${ctx.silverOzt} troy ounces of silver`
    : `${lower(ctx.composition)} and no silver`;
  /*
   * The mintage is what makes each of nearly three hundred descriptions
   * different from the other two hundred and ninety-nine, and
   * `validateCatalogCopy()` fails a description used twice. Where a per-design
   * figure exists it is the one quoted, because two mints in one year can share
   * a proof-set total and would then share a description.
   */
  const known = issue.perDesign ?? issue.mintage;
  const figure =
    issue.perDesign !== undefined
      ? `${n(issue.perDesign)} struck of its design`
      : known
        ? `a mintage of ${n(known)}`
        : 'what is known about how many were struck';
  /*
   * IT DESCRIBES THE COIN, NOT A PRICE. It opened "What a 1980-P quarter is
   * worth" on every page until 2026-09-22, over a body that states a mint, a
   * metal, a mintage and an identification checklist. A description assembled
   * from what a page really carries cannot promise a section the page has not
   * got -- the rule the common questions already follow -- and this is that
   * rule applied to the largest set of pages on the site.
   *
   * The mintage stays where it was and is still load-bearing: it is what makes
   * each of nearly three hundred descriptions different from the other two
   * hundred and ninety-nine, and `validateCatalogCopy()` fails a description
   * used twice.
   */
  const closer = ctx.silverOzt ? ' and what the metal comes to now' : '';
  return fit(
    [
      `${cap(subject)}: struck at ${city}, ${silver}, ${figure}, how to identify one${closer}.`,
      `${cap(subject)}: struck at ${city}, ${silver}, ${figure}${closer}.`,
      `${cap(subject)}: ${silver}, ${figure}${closer}.`,
      `${cap(subject)}: ${silver} and ${figure}.`,
    ],
    DESCRIPTION_MAX,
  );
};

/**
 * The identification checklist.
 *
 * The last step is the one worth the generator existing. A reader looking for a
 * mint mark that was never struck has no way to know that is what they are
 * doing, and the sheet knows -- a missing row is a coin that does not exist, so
 * the pages either side of it can say so by name.
 */
export const issueIdentify = (issue: Issue, ctx: SeriesContext, all: Issue[], attested: Attestation[] = []): string[] => {
  const steps: string[] = [`Read the date. It must say ${issue.year}.`];
  const denom = ctx.denomination.toLowerCase();
  const position = ctx.markPositions.find((p) => inRange(issue.year, p.years));

  if (issue.mark && position) {
    steps.push(
      `Find the ${issue.mark}. It is ${position.where}. Anything else in that spot, or nothing at all, is a different coin of the same date.`,
    );
  } else if (position) {
    // A markless coin in a year when marks WERE used. What the blank means
    // depends on how many mints struck it markless, which the source knows.
    const who =
      issue.struckAt.length === 1
        ? `a blank space is ${issue.struckAt[0]}`
        : `a blank space could be ${list(issue.struckAt, 'or')}, all of which struck this date without marking it`;
    steps.push(`Look ${position.where}. There must be no letter at all in that spot: ${who}.`);
  } else {
    // No position covers this year, which means no mint used a mark at all.
    // The most useful sentence on the page for somebody hunting for a letter.
    steps.push(
      `Do not look for a mint mark. No ${denom} of this date carries one: ${list(issue.struckAt)} all struck it and none of them marked it, so a blank space tells you nothing about where yours was made.`,
    );
  }

  /*
   * The hub step comes straight after the mint mark, because it is the same
   * KIND of step -- look at one place on the coin and read what is there -- and
   * because it is the step that decides which of this year's pages the reader
   * is on. It sits above the physical tests for the same reason the mark does:
   * a test needing a scale is the last thing to reach for, not the first.
   */
  if (issue.hub) steps.push(issue.hub.identify);
  else {
    /*
     * The year's own page has to raise the question, or keeping it was
     * pointless. A reader who has just found an 1878 does not know there are
     * two reverses, and this is the page they land on.
     */
    const hubs = all.filter(
      (sibling) =>
        sibling.year === issue.year &&
        sibling.mark === issue.mark &&
        sibling.finish === issue.finish &&
        sibling.hub,
    );
    if (hubs.length > 1) {
      steps.push(
        `Count the tail feathers on the eagle, below the wreath on the reverse. ${ctx.seriesNoun}s of ${issue.year} were struck with ${list([...hubs].sort(hubOrder(ctx)).map((h) => h.hub!.noun), 'or')}, the mint changed from one to the other partway through the year, and the two are not worth the same.`,
      );
    }
  }

  /*
   * The two physical tests, derived from this era and one of a DIFFERENT METAL
   * rather than from the era beside it.
   *
   * "This one has a uniform silver-grey edge; a quarter dated 1932-1964 has a
   * uniform silver-grey edge" is what comparing against the next era along
   * produces once a series has more than one era per group -- and this series
   * now has four clad eras and three silver ones, because the reverse changed
   * twice inside the clad run and the proofs carry their own alloys. A test
   * that cannot separate two coins is not a test.
   */
  const era = ctx.eras.find((e) => e.group === ctx.group && inRange(issue.year, e.years));
  /*
   * Only the timeline eras, never a finish-only one. An era a reader can be
   * told about by its dates has to be an era ALL of whose coins match the
   * description; the silver proof eras overlap the clad run one coin a year, so
   * "a quarter dated 1992-2018 is silver" is false of all but a few thousand of
   * them.
   */
  const different = ctx.eras.filter(
    (e) => e.group !== ctx.group && !e.finishOnly && e.edgeLooks && e.specs,
  );
  // The era of the OTHER metal covering this same year, where there is one, so
  // a 1999 silver proof is compared with the 1999 clad quarter rather than with
  // one dated 1965-1998 that the reader is not holding and did not ask about.
  const other = different.find((e) => inRange(issue.year, e.years)) ?? different[0];
  if (era?.edgeLooks && other?.edgeLooks) {
    steps.push(
      `Look at the edge. This one has ${era.edgeLooks}; a ${denom} dated ${rangeLabel(other.years)} has ${other.edgeLooks}.`,
    );
  }
  if (era?.specs && other?.specs && era.specs.weightGrams !== other.specs.weightGrams) {
    steps.push(
      `Weigh it if you can. This one weighs ${era.specs.weightGrams} grams and a ${denom} dated ${rangeLabel(other.years)} weighs ${other.specs.weightGrams} grams. A kitchen scale reading to 0.1 grams will separate them.`,
    );
  }

  /*
   * Which mints did NOT strike this date at all, and the rule is the owner's:
   * a mint does not appear on a page unless it struck that coin.
   *
   * Three tests, and the third is the one this section gained when the proofs
   * arrived. A mint may have struck this year's coins WITHOUT marking them,
   * which makes its letter absent from the marks and its name present in
   * `struckAt` -- checking only the marks produced "There is no 1965-D. Denver
   * struck none of these in 1965", which is false. And a mint may have struck
   * this date as a PROOF only, in which case the letter exists, the coin exists,
   * and what a reader needs to be told is what it is: a page that says "there is
   * no 1980-S" to somebody holding one is worse than saying nothing.
   */
  /*
   * Read off what the SOURCES attest rather than off what this catalogue
   * publishes, falling back to the catalogue where no attestation was passed.
   *
   * The difference is a false sentence. A coin withheld because two sources
   * disagree about its mintage is absent from the catalogue and present in the
   * world, and working from the catalogue made the 2012-S page say "There is no
   * 2012-D. Denver struck none of these in 2012" -- about a coin Denver struck
   * five hundred million of. Whether a mint struck a date is not the same
   * question as whether this site has a figure for it.
   */
  const thisYear =
    attested.length > 0
      ? attested.filter((a) => a.year === issue.year)
      : all.filter((i) => i.year === issue.year).map((i) => ({ year: i.year, mark: i.mark, finish: i.finish }));
  const circulating = thisYear.filter((a) => a.finish === 'circulation');
  const struckMarks = new Set(circulating.map((a) => a.mark));
  /*
   * A markless coin may have been struck at several mints, and its cities are a
   * fact about the issue rather than about the year -- so they come from the
   * catalogue's own rows, which carry `struckAt`. Without this the 1965-1967
   * pages said "There is no 1965-D. Denver struck none of these", about eight
   * hundred million coins Denver struck and marked at none.
   */
  const struckCities = new Set(
    all.filter((i) => i.year === issue.year && wasCirculated(i)).flatMap((i) => i.struckAt),
  );
  const candidates = ['D', 'S', 'W'].filter((m) => m !== issue.mark);

  for (const mark of candidates) {
    if (struckMarks.has(mark) || struckCities.has(CITY[mark])) continue;

    // Struck that year, but not for circulation. Name what it is.
    const asFinish = thisYear.find((a) => a.mark === mark && a.finish !== 'circulation');
    if (asFinish) {
      if (ctx.proofOnly && ctx.proofOnly.mark === mark && inRange(issue.year, ctx.proofOnly.years)) {
        steps.push(`There is no ${issue.year}-${mark} that ever circulated. ${ctx.proofOnly.note}`);
      }
      continue;
    }

    /*
     * Struck at no finish at all -- but only say so where the mint could
     * plausibly have struck it. West Point struck quarters in two years of a
     * ninety-year run, so "there is no 1953-W" is true, useless, and would
     * print on every page in the catalogue.
     */
    if (!plausibleMint(mark, issue.year, ctx)) continue;
    steps.push(
      `There is no ${issue.year}-${mark}. ${CITY[mark]} struck none of these in ${issue.year}, so ${letterArticle(mark)} ${mark} on a coin of this date is not something to go looking for.`,
    );
  }

  return steps;
};

/**
 * Whether a mint is worth telling a reader it did NOT strike this date.
 *
 * Only where it struck the series either side of the year in question. A mint
 * that never worked on this denomination, or worked on it for two years out of
 * ninety, is not a letter anybody is hunting for -- and "There is no 1953-W"
 * on nine hundred pages is the generated-catalogue failure in one sentence.
 */
const plausibleMint = (mark: string, year: number, ctx: SeriesContext) =>
  ctx.mints
    .filter((m) => m.mark === mark)
    .some((m) => (m.years ?? []).some((span) => inRange(year, span)));

/* ===========================================================================
   The coin
   =========================================================================== */

export const issueToCoin = (
  issue: Issue,
  ctx: SeriesContext,
  all: Issue[],
  attested: Attestation[] = [],
): Coin => {
  const label = issueLabel(issue);
  const stem = withFinish(issue.finish, ctx.seriesName);
  const stemNoun = withFinish(issue.finish, ctx.seriesNoun, true);
  /*
   * The hub phrase sits OUTSIDE the parenthetical and never inside it.
   * `normaliseQuestion()` strips parentheticals before every uniqueness check
   * on this site, so "1878 Morgan Dollar (8 Tail Feathers)" and the plain 1878
   * would normalise onto one string and three pages would collide silently --
   * the same trap the grade pages' "in Mint State (MS-63)" fell into.
   */
  const name = issue.mark
    ? withHub(issue, `${label} ${stem}`, true)
    : `${withHub(issue, `${issue.year} ${stem}`, true)} (No Mint Mark)`;
  /*
   * A hubbed coin drops the "with no mint mark" tail rather than carrying
   * both. Every Philadelphia Morgan dollar is markless, so that clause
   * distinguishes nothing here and the hub distinguishes everything; two
   * "with" phrases in one link text is a sentence nobody finishes reading.
   */
  const shortName = issue.hub
    ? withHub(issue, `${label} ${stemNoun}`)
    : issue.mark
      ? `${label} ${stemNoun}`
      : `${issue.year} ${stemNoun} with no mint mark`;
  const keywordNoun = withFinish(issue.finish, ctx.denomination.toLowerCase(), true);
  const metalWord = ctx.silverOzt ? 'silver' : 'clad';

  return {
    slug: issueSlug(issue, ctx),
    group: ctx.group,
    type: ctx.type,
    tags: ctx.tags,
    name,
    shortName,
    seoTitle: issueSeoTitle(issue, ctx),
    bluf: issueBluf(issue, ctx, all),
    description: issueDescription(issue, ctx),
    primaryKeyword: `${issue.year}${issue.mark ? ` ${issue.mark.toLowerCase()}` : ''}${issue.hub ? ` ${issue.hub.noun}` : ''} ${keywordNoun} value`,
    /*
     * The metal word is read off the era, not assumed. These said "silver
     * quarter" and "how much silver in a 1980-P quarter" on every clad page in
     * the catalogue, which is a phrase nobody types about a coin that has none.
     */
    secondaryKeywords: [
      `${withHub(issue, `${label} ${keywordNoun}`)} worth`,
      `${label} ${metalWord} ${ctx.denomination.toLowerCase()}`,
      ctx.silverOzt
        ? `how much silver in ${article(label)} ${label} ${ctx.denomination.toLowerCase()}`
        : `is ${article(label)} ${label} ${ctx.denomination.toLowerCase()} silver`,
    ],
    years: { from: issue.year },
    ...(issue.mark ? { mintMark: issue.mark } : {}),
    ...(issue.hub ? { hub: issue.hub.name } : {}),
    country: ctx.country,
    composition: ctx.composition,
    obverse: ctx.obverse,
    reverse: ctx.reverse,
    struckAt: issue.struckAt.map((city) => ({ city, mark: issue.mark })),
    weightGrams: ctx.weightGrams,
    diameterMm: ctx.diameterMm,
    ...(ctx.silverOzt ? { silverOzt: ctx.silverOzt } : {}),
    ...(ctx.goldOzt ? { goldOzt: ctx.goldOzt } : {}),
    faceValue: ctx.faceValue,
    ...(issue.mintage ? { mintage: issue.mintage } : {}),
    commonality: issue.commonality,
    ...(finishNote(issue, ctx, all)
      ? { finish: { kind: issue.finish, note: finishNote(issue, ctx, all)! } }
      : {}),
    ...(designClause(issue, ctx, all) ? { mintageNote: designClause(issue, ctx, all)! } : {}),
    ...(mintageCaveat(issue) ? { mintageCaveat: mintageCaveat(issue)! } : {}),
    identify: issueIdentify(issue, ctx, all, attested),
    // No `sections`. See the header: a generator cannot know the one fact that
    // is true of this coin and of no other, and if it could, the fact would be
    // derivable and would not be worth a section.
  };
};
