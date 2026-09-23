/**
 * The shape of a calculator row, and the arithmetic and the checks over it.
 *
 * One row is A COMPOSITION AND A DENOMINATION -- "90% silver quarter", "$20
 * double eagle" -- or, in the third band, a bar or a private round, which is
 * not a coin at all and is in a drawer beside them anyway.
 * `coin-catalog.ts` holds issues: one dated coin from one mint, researched,
 * with a page of its own. Neither file is a subset of the other, and the whole
 * reasoning for that is in the header of `silver-coins.ts`.
 *
 * This module holds no rows. It exists because the silver list and the gold
 * list are the same shape and would otherwise carry two copies of one
 * validator, and a check that exists twice is a check that is fixed once.
 *
 * ---------------------------------------------------------------------------
 * A WEIGHT AND A FINENESS, NEVER A CONTENT FIGURE
 * ---------------------------------------------------------------------------
 *
 * Every row states the coin's total weight in grams and its fineness, both off
 * the Mint's published specifications, and the metal content is arithmetic:
 * grams times fineness over 31.1034768. The figure the trade quotes as ASW or
 * AGW is therefore derived rather than typed, which is the rule the melt pages
 * already follow -- the site prints no number it cannot show the working for,
 * and a published content figure copied by hand is a number with nobody's
 * arithmetic behind it.
 *
 * `troyOunces` is the exception, for a coin where the Mint states the CONTENT
 * and the total weight is the derived half: a Silver Eagle holds one troy
 * ounce, a Gold Eagle holds one troy ounce in 33.931 grams of 22 carat alloy.
 * The validator holds such a figure against the weight and the fineness beside
 * it anyway, within a percent, so a typo cannot hide behind the override.
 *
 * ---------------------------------------------------------------------------
 * THE ORDER IS DECLARED AND VALIDATED, NEVER SORTED
 * ---------------------------------------------------------------------------
 *
 * A sort would file a weight typed an order of magnitude wrong into a
 * plausible-looking position. A validated order fails the build instead, which
 * is the same rule the cheat sheets follow.
 *
 * The order itself is: coins struck to circulate first, then bullion coins,
 * then bars and private rounds -- a reader sorting a drawer is in one of those
 * three worlds at a time -- and inside a band, by denomination, with the richer
 * composition first where two compositions share one. Denomination comes from `type` where the taxonomy registers it,
 * which is the silver list; where it does not, the order is metal content
 * ascending, and for the classic gold denominations that is the same thing,
 * because all of them are 90% fine and the weight scales with the face value.
 */
import { GRAMS_PER_TROY_OUNCE, type Metal } from '../lib/spot';
import { COINS } from './coin-catalog';
import { TYPES } from './coin-taxonomy';
import type { Source } from './coin-schema';

/**
 * One row of a calculator.
 *
 * No copy fields, no page of its own, no tags. A row is a handful of facts and
 * its sources; everything a reader might want to READ about the coin is on a
 * series page or a coin page, and a quantity box is not a place to go
 * elsewhere from.
 */
export interface MeltRow {
  /** Stable, and the stem of the quantity input's id. Never changed. */
  slug: string;
  /** What the reader looks for. Sentence case, short enough to read down a column. */
  name: string;
  /**
   * The identification, in as few words as possible, and it LEADS WITH THE
   * NAMES the coin is known by: "Morgan or Peace, 1935 or earlier".
   *
   * One row covers every series struck to that standard -- but nobody looks
   * for "the 90% silver dollar", they look for the Morgan, and a reader who
   * cannot find the name they know concludes the coin is missing rather than
   * that it is the row above.
   */
  dated: string;
  /** As the Mint states it: "90% silver", "22 carat". */
  composition: string;
  /** Total coin weight, grams, off the published specification. */
  grams: number;
  /** Metal fraction by weight. 0.9, 0.4, 0.35, 0.9167, 0.999. */
  fineness: number;
  /** The metal the content is. One per row; a row is one metal's arithmetic. */
  metal: Metal;
  /** Content in troy ounces, where the Mint states the content rather than the alloy. */
  troyOunces?: number;
  /**
   * Which band of the list the row is in, and they render in this order:
   *
   *   circulating  a coin struck to spend
   *   bullion      a coin struck to be bought for its metal -- an Eagle
   *   bar          a bar, an ingot or a private round: not a coin at all
   *
   * The third band earns its place because a drawer with silver in it usually
   * has some of all three, and because the epistemics differ: a Mint
   * specification says what a coin weighs, while a bar is worth what its maker
   * stamped on it if the stamp is true. The bands keep that difference visible
   * instead of filing a private round next to an Eagle.
   */
  kind: 'circulating' | 'bullion' | 'bar';
  /**
   * Denomination slug from the taxonomy, where the taxonomy has one.
   *
   * Present on the silver coins and on none of the gold ones: `TYPES` registers
   * cents through dollars and nothing above, and registering the quarter eagle
   * and the double eagle would be adding URL segments to the catalogue to
   * decide the order of a list. Where it is absent the order falls back to
   * metal content, which for 90% gold IS denomination order. A BAND may not mix
   * the two -- the band is the ordering unit, so a list of typed coins can
   * carry untyped bars underneath without either losing its order.
   */
  type?: string;
  /** Where the weight and the fineness came from. Required, like every figure here. */
  sources: Source[];
}

/**
 * What a bar or a private round is: whatever its maker stamped on it.
 *
 * There is no specification to cite, because nobody publishes one -- a bar sold
 * as a gram of .999 silver holds a gram of .999 silver if the stamp is true,
 * and that is the whole of the fact. Naming the source that way rather than
 * leaving it blank is what keeps the row honest: the figure beside it is
 * conditional in a way that a Mint specification is not, and the rows say so on
 * their face.
 */
export const STAMPED_WEIGHT: Source = {
  name: 'The weight and fineness stamped on the piece',
  used: 'weight and fineness, as claimed by its maker',
};

/** The Mint's own specification page, which is the source for nearly all of these. */
export const MINT_SPECS: Source = {
  name: 'United States Mint coin specifications',
  url: 'https://www.usmint.gov/learn/coins-and-medals/coin-specifications',
  used: 'weight and composition',
};

/* ---------------------------------------------------------------------------
   Derived figures
   --------------------------------------------------------------------------- */

/**
 * Metal content of one coin, troy ounces, unrounded.
 *
 * Unrounded on purpose: this is multiplied by a quantity and by a spot price
 * before anything is displayed, and `formatOzt()`/`formatUsd()` round once, at
 * the point of display. A four-decimal figure rounded here and then multiplied
 * by a thousand coins is off by a visible amount.
 */
export const rowOzt = (row: MeltRow): number =>
  row.troyOunces ?? (row.grams * row.fineness) / GRAMS_PER_TROY_OUNCE;

/** The working, as the page prints it: "6.25 g × 90% silver". */
export const rowWorking = (row: MeltRow): string => `${row.grams} g × ${row.composition}`;

/** Metal in a whole list of rows, troy ounces, at the same quantity of each. */
export const rowsOzt = (rows: MeltRow[], quantity = 1): number =>
  rows.reduce((total, row) => total + rowOzt(row) * quantity, 0);

/**
 * The breakdown a `data-spot="sum"` figure carries: "silver=1.9xxx".
 *
 * The same format `spot-dom.ts` parses and rewrites as the quantities change,
 * so the total the build renders and the total the browser renders are one
 * arithmetic. The quantity is passed in rather than assumed: a page ships its
 * boxes at zero, and a total that disagreed with the boxes under it would jump
 * the moment the page became interactive.
 *
 * Per metal, although every list so far is one metal, because the format is
 * what stops a mixed total rescaling gold at the silver price.
 */
export const rowsSumAttr = (rows: MeltRow[], quantity = 1): string => {
  const weights = new Map<Metal, number>();
  for (const row of rows) {
    weights.set(row.metal, (weights.get(row.metal) ?? 0) + rowOzt(row) * quantity);
  }
  return [...weights].map(([metal, ozt]) => `${metal}=${ozt}`).join(';');
};

/** The quantity input's id for one row. One place, so the label, the input and
 *  the figure that reads it cannot disagree. */
export const rowQtyId = (row: MeltRow): string => `qty-${row.slug}`;

/* ---------------------------------------------------------------------------
   Validation
   --------------------------------------------------------------------------- */

/** Where a denomination sits in face-value order, from the taxonomy itself. */
const typeRank = (slug: string): number => TYPES.findIndex((t) => t.slug === slug);

/** The catalogue's weight for this metal, where the coin carries one. */
const catalogueOzt = (coin: (typeof COINS)[number], metal: Metal): number | undefined =>
  metal === 'silver' ? coin.silverOzt : metal === 'gold' ? coin.goldOzt : coin.platinumOzt;

/**
 * Throws on anything that would put a wrong number in front of a reader.
 *
 * Called at the module scope of each list, so a build cannot produce a page
 * without it. The catalogue check is the one worth understanding: a calculator
 * and the coin pages state the same weights, and a reader who works out a
 * figure on one and reads a different one on the other has caught the site
 * contradicting itself.
 *
 * `rows` is a parameter rather than a constant so a test can hand this a wrong
 * row and watch it caught, rather than trusting that it would be.
 */
export function validateMeltRows(rows: MeltRow[], listName: string): void {
  const problems: string[] = [];
  const seen = new Set<string>();

  // Per band, not per list: the band is the ordering unit, so typed coins and
  // untyped bars can sit in one list while neither band loses its order.
  for (const band of new Set(rows.map((r) => r.kind))) {
    const inBand = rows.filter((r) => r.kind === band);
    const typed = inBand.filter((r) => r.type !== undefined).length;
    if (typed !== 0 && typed !== inBand.length) {
      problems.push(
        `${listName}: ${typed} of the ${inBand.length} ${band} rows declare a denomination. A band orders by denomination or by content, not by both`,
      );
    }
  }

  for (const row of rows) {
    const where = `${listName}/${row.slug}`;
    if (seen.has(row.slug)) problems.push(`${where}: duplicate slug`);
    seen.add(row.slug);

    if (!/^[a-z0-9-]+$/.test(row.slug)) problems.push(`${where}: slug is not lowercase-hyphenated`);
    if (row.grams <= 0) problems.push(`${where}: weight is ${row.grams} g`);
    if (row.fineness <= 0 || row.fineness > 1) {
      problems.push(`${where}: fineness is ${row.fineness}, which is not a fraction`);
    }
    if (row.sources.length === 0) problems.push(`${where}: no source for the weight`);
    if (row.type !== undefined && typeRank(row.type) < 0) {
      problems.push(`${where}: unknown denomination "${row.type}"`);
    }

    // A stated content must agree with the weight and the fineness it sits
    // beside, or one of the three is a typo and the page shows two of them.
    if (row.troyOunces !== undefined) {
      const derived = (row.grams * row.fineness) / GRAMS_PER_TROY_OUNCE;
      if (Math.abs(row.troyOunces - derived) / derived > 0.01) {
        problems.push(
          `${where}: states ${row.troyOunces} troy oz, but ${row.grams} g at ${row.fineness} is ${derived.toFixed(4)}`,
        );
      }
    }

    // A price would date the row, and nothing here is dated. Melt figures are
    // arithmetic over a timed spot price and are never stored.
    for (const [field, value] of Object.entries(row)) {
      if (typeof value === 'string' && /[$£€]\s?\d/.test(value)) {
        problems.push(`${where}: \`${field}\` states a price`);
      }
    }
  }

  // Declared order, checked rather than imposed: circulating coins before
  // bullion, then denomination -- registered where the taxonomy has it, metal
  // content where it does not -- then the richer composition first.
  const BAND_ORDER: Record<MeltRow['kind'], number> = { circulating: 0, bullion: 1, bar: 2 };
  const key = (row: MeltRow): number[] => [
    BAND_ORDER[row.kind],
    row.type === undefined ? rowOzt(row) : typeRank(row.type),
    -rowOzt(row),
  ];
  /** Lexicographic, like a sort comparator -- but nothing is sorted with it. */
  const compare = (a: number[], b: number[]): number => {
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  };
  for (let i = 1; i < rows.length; i += 1) {
    if (compare(key(rows[i - 1]), key(rows[i])) > 0) {
      problems.push(
        `${listName}: ${rows[i].slug} is declared after ${rows[i - 1].slug}, which is not the order the page renders` +
          ' (circulating coins first, then denomination, then the richest composition)',
      );
    }
  }

  // The catalogue must not state a different weight for the same coin.
  // Restricted to United States coins: a Canadian dime is a different coin with
  // a different specification and no row here.
  for (const coin of COINS) {
    if (coin.country !== 'United States') continue;
    for (const metal of new Set(rows.map((r) => r.metal))) {
      const weight = catalogueOzt(coin, metal);
      if (!weight) continue;
      // Matched on denomination where the rows have one, so two denominations
      // cannot cover for each other; on content alone where they do not.
      const candidates = rows.filter((r) => r.type === undefined || r.type === coin.type);
      // Half a thousandth of a troy ounce: tight enough that two different
      // denominations can never match each other, loose enough that a published
      // content figure rounded in its last decimal is not a build failure.
      if (!candidates.some((r) => Math.abs(rowOzt(r) - weight) < 0.0005)) {
        problems.push(
          `${coin.slug} holds ${weight} troy oz of ${metal} and no row in ${listName} matches it` +
            ` (rows: ${candidates.map((r) => `${r.slug} ${rowOzt(r).toFixed(4)}`).join(', ') || 'none'})`,
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid melt calculator rows:\n  - ${problems.join('\n  - ')}`);
  }
}
