/**
 * The United States gold coins, as a sortable list rather than as issues:
 * the rows of /tools/coin-calculators/gold-melt-price.
 *
 * The shape of a row, the arithmetic over it and every check on it live in
 * `melt-rows.ts`, which the silver list uses too. This file is the gold facts
 * and the reasoning behind which of them are here.
 *
 * ---------------------------------------------------------------------------
 * MELT IS A WEAKER ANSWER FOR GOLD THAN FOR SILVER, AND UNEVENLY SO
 * ---------------------------------------------------------------------------
 *
 * This is the thing to understand before adding a row. A common-date double
 * eagle trades a few percent over its metal, so melt is very nearly the number.
 * A gold dollar, a three-dollar piece or a quarter eagle is worth a multiple of
 * its gold to a collector, because the survival rates are low and the demand is
 * not about the metal at all -- so for those, melt is a FLOOR and not an
 * estimate. The page carries the one sentence every melt figure on this site
 * carries -- melt is not what a coin sells for -- and sends the reader to
 * `/coin-info` for the rest of the answer.
 *
 * The rows are all here anyway. Somebody who has just found a quarter eagle
 * still wants the floor, and a floor stated as a floor is an honest number; the
 * alternative is a table that silently stops at $5 and looks incomplete to the
 * one reader who needed the small denominations.
 *
 * ---------------------------------------------------------------------------
 * ONE STANDARD, WHICH IS WHY THE ORDER NEEDS NO TAXONOMY
 * ---------------------------------------------------------------------------
 *
 * Every classic denomination below is 90% fine, struck to the standard the 1837
 * Act set: the weight scales with the face value, so ordering by gold content
 * IS ordering by denomination. That is what lets these rows carry no `type` --
 * the taxonomy registers cents through dollars and nothing above, and
 * registering the quarter eagle and the double eagle would mean adding URL
 * segments to the catalogue in order to decide the order of a list.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS LEFT OUT
 * ---------------------------------------------------------------------------
 *
 * The bars and the private round are here for the same reason they are on the
 * silver page: a drawer with gold in it has some of all three, and sending
 * somebody to a second website halfway through adding up what they have is the
 * failure this page exists to avoid. What is different about them is where the
 * fact comes from, and the rows and the note under the table both say so.
 *
 * Gold struck before 1834, which is a different and lighter standard, and every
 * commemorative and First Spouse issue: those are bought and sold as
 * collectables at multiples of their metal, and a melt figure beside one is the
 * wrong answer rather than an imprecise one.
 *
 * Also left out, and worth naming because somebody will ask: no foreign gold.
 * A Sovereign, a 20 franc Napoleon and a Krugerrand are the three most common
 * gold coins in an American drawer after the Eagle, and every one of them is a
 * different standard. They belong in a list of their own, not smuggled into
 * this one under a name like "gold coin".
 */
import { MINT_SPECS, STAMPED_WEIGHT, validateMeltRows, type MeltRow } from './melt-rows';

/**
 * The rows, in the order the page renders them: the coins struck to circulate
 * first, by denomination, then the bullion, by size.
 *
 * The order is DECLARED and validated, never sorted -- a sort would file a
 * weight typed an order of magnitude wrong into a plausible-looking position.
 */
export const GOLD_COINS: MeltRow[] = [
  {
    slug: 'gold-dollar',
    name: 'Gold dollar',
    dated: 'Liberty Head or Indian Princess, 1849–1889',
    composition: '90% gold',
    metal: 'gold',
    grams: 1.672,
    fineness: 0.9,
    kind: 'circulating',
    sources: [MINT_SPECS],
  },
  {
    slug: 'quarter-eagle',
    name: 'Quarter eagle',
    dated: 'Two and a half dollars, Liberty Head or Indian Head, 1840–1929',
    composition: '90% gold',
    metal: 'gold',
    grams: 4.18,
    fineness: 0.9,
    kind: 'circulating',
    sources: [MINT_SPECS],
  },
  {
    slug: 'three-dollar-piece',
    name: 'Three-dollar piece',
    dated: 'Indian Princess head, 1854–1889',
    composition: '90% gold',
    metal: 'gold',
    grams: 5.015,
    fineness: 0.9,
    kind: 'circulating',
    sources: [MINT_SPECS],
  },
  {
    slug: 'half-eagle',
    name: 'Half eagle',
    dated: 'Five dollars, Liberty Head or Indian Head, 1839–1929',
    composition: '90% gold',
    metal: 'gold',
    grams: 8.359,
    fineness: 0.9,
    kind: 'circulating',
    sources: [MINT_SPECS],
  },
  {
    slug: 'eagle',
    name: 'Eagle',
    dated: 'Ten dollars, Liberty Head or Indian Head, 1838–1933',
    composition: '90% gold',
    metal: 'gold',
    grams: 16.718,
    fineness: 0.9,
    kind: 'circulating',
    sources: [MINT_SPECS],
  },
  {
    slug: 'double-eagle',
    name: 'Double eagle',
    dated: 'Twenty dollars, Liberty Head or Saint-Gaudens, 1850–1933',
    composition: '90% gold',
    metal: 'gold',
    grams: 33.436,
    fineness: 0.9,
    kind: 'circulating',
    sources: [MINT_SPECS],
  },
  /*
   * The bullion. Four sizes of one coin, because the sizes are what somebody
   * holds and the tenth-ounce is the one most often mistaken for a small
   * classic coin -- it is a tenth the gold of the one-ounce and about the
   * diameter of a dime.
   *
   * `troyOunces` on every one of them: the Mint states the GOLD, and the gross
   * weight is what follows from alloying it to 22 carat. 33.931 grams of Gold
   * Eagle carries exactly one troy ounce of gold, which is why the weight looks
   * wrong beside a Buffalo's 31.108.
   *
   * No `type: 'bullion'` on them, although the taxonomy registers that
   * denomination and the Silver Eagle carries it. A list orders by denomination
   * or by content and not by both, and these four ARE one denomination: ranking
   * them by it would collapse the four sizes onto one rung and leave the
   * tie-break -- the richest first -- to stand the run of them on its head.
   * `kind` is what puts them after the circulating coins; content is what
   * orders them among themselves, smallest first, which is how they are sold.
   */
  {
    slug: 'gold-eagle-tenth',
    name: 'Gold Eagle, 1/10 oz',
    dated: 'Five dollars face value, 1986 onwards',
    composition: '22 carat, 91.67% gold',
    metal: 'gold',
    grams: 3.393,
    fineness: 0.9167,
    troyOunces: 0.1,
    kind: 'bullion',
    sources: [MINT_SPECS],
  },
  {
    slug: 'gold-eagle-quarter',
    name: 'Gold Eagle, 1/4 oz',
    dated: 'Ten dollars face value, 1986 onwards',
    composition: '22 carat, 91.67% gold',
    metal: 'gold',
    grams: 8.483,
    fineness: 0.9167,
    troyOunces: 0.25,
    kind: 'bullion',
    sources: [MINT_SPECS],
  },
  {
    slug: 'gold-eagle-half',
    name: 'Gold Eagle, 1/2 oz',
    dated: 'Twenty-five dollars face value, 1986 onwards',
    composition: '22 carat, 91.67% gold',
    metal: 'gold',
    grams: 16.966,
    fineness: 0.9167,
    troyOunces: 0.5,
    kind: 'bullion',
    sources: [MINT_SPECS],
  },
  {
    slug: 'gold-eagle-ounce',
    name: 'Gold Eagle, 1 oz',
    dated: 'Fifty dollars face value, 1986 onwards',
    composition: '22 carat, 91.67% gold',
    metal: 'gold',
    grams: 33.931,
    fineness: 0.9167,
    troyOunces: 1,
    kind: 'bullion',
    sources: [MINT_SPECS],
  },
  {
    slug: 'gold-buffalo',
    name: 'Gold Buffalo, 1 oz',
    dated: 'Fifty dollars face value, 2006 onwards',
    composition: '24 carat, 99.99% gold',
    metal: 'gold',
    grams: 31.108,
    fineness: 0.9999,
    troyOunces: 1,
    kind: 'bullion',
    sources: [MINT_SPECS],
  },
  /*
   * Not coins. A bar, an ingot and a private round are in the same drawer as
   * the coins and are melted the same way, so leaving them off would send
   * somebody adding up what they have to a second website halfway through.
   *
   * What is different about them is where the fact comes from: a Mint
   * specification says what a coin weighs, and a bar is worth what its maker
   * stamped on it -- so every row here cites the stamp, and says "as stamped"
   * on its face. Underweight and plated fakes are common enough at the cheap
   * end that a figure which did not say this would be a figure pretending to
   * know something.
   *
   * Sizes are the ones actually sold: one, five and ten grams, and the one
   * troy ounce round. Ordered by content like the rest of the band, smallest
   * first, which is how they are stacked and sold.
   */
  {
    slug: 'gold-gram-bar-1',
    name: '1 g gold bar',
    dated: 'Bar or ingot, as stamped',
    composition: '99.99% gold',
    metal: 'gold',
    grams: 1,
    fineness: 0.9999,
    kind: 'bar',
    sources: [STAMPED_WEIGHT],
  },
  {
    slug: 'gold-gram-bar-5',
    name: '5 g gold bar',
    dated: 'Bar or ingot, as stamped',
    composition: '99.99% gold',
    metal: 'gold',
    grams: 5,
    fineness: 0.9999,
    kind: 'bar',
    sources: [STAMPED_WEIGHT],
  },
  {
    slug: 'gold-gram-bar-10',
    name: '10 g gold bar',
    dated: 'Bar or ingot, as stamped',
    composition: '99.99% gold',
    metal: 'gold',
    grams: 10,
    fineness: 0.9999,
    kind: 'bar',
    sources: [STAMPED_WEIGHT],
  },
  {
    slug: 'private-gold-round',
    name: '1 oz gold round',
    dated: 'Privately minted, one troy ounce as stamped',
    composition: '99.99% gold',
    metal: 'gold',
    grams: 31.1035,
    fineness: 0.9999,
    // Sold as a troy ounce OF metal, the way an Eagle is, so the stated
    // content leads and the gross weight follows from the fineness.
    troyOunces: 1,
    kind: 'bar',
    sources: [STAMPED_WEIGHT],
  },
];

validateMeltRows(GOLD_COINS, 'GOLD_COINS');
