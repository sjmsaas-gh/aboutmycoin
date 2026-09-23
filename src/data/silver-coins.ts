/**
 * The United States silver coins, as a sortable list rather than as issues:
 * the rows of /tools/coin-calculators/silver-melt-price.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT THE CATALOGUE
 * ---------------------------------------------------------------------------
 *
 * `coin-catalog.ts` holds ISSUES: one dated coin from one mint, researched, with
 * its mintages and its own page. A row here is a COMPOSITION AND A
 * DENOMINATION -- "90% silver quarter", "40% silver half dollar" -- which is
 * the unit somebody sorting a jar actually has. They do not have a 1962-D;
 * they have eleven silver quarters, and every one of them contains the same
 * silver whatever the date. A calculator built on the catalogue would ask for a
 * quantity of 1960 quarters, then of 1961 quarters, and would be missing the
 * dimes entirely until somebody wrote ten more coin pages.
 *
 * So the two files answer two questions and neither is a subset of the other.
 * What they must not do is disagree: `validateMeltRows()` checks every United
 * States coin in the catalogue that carries a silver weight against the row for
 * its denomination, and throws if the two figures differ. A quarter cannot hold
 * 0.1808 troy ounces on its own page and something else in the calculator.
 *
 * The shape of a row, the arithmetic over it and every check on it live in
 * `melt-rows.ts`, which the gold list uses too. This file is the silver facts
 * and the reasoning behind which of them are here.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS IN THE LIST, AND WHAT IS LEFT OUT
 * ---------------------------------------------------------------------------
 *
 * Every silver coin the United States struck for circulation in the twentieth
 * century, the two 40% silver denominations that only ever came in collector
 * sets, the bullion Eagle, and the bar and round sizes that are sold by the
 * gram. That is the list somebody with a jar, an inherited drawer or a proof
 * set can actually be holding -- and the bars are in it because a drawer with
 * silver in it usually has some of all three, not because they are coins.
 *
 * Left out deliberately: everything struck before 1873. Seated coinage, the
 * twenty-cent piece, the three-cent silver, the Trade dollar and the half dime
 * all carry weights of their own, and every one of them is worth multiples of
 * its metal -- so a melt figure is the wrong answer for them, not just an
 * imprecise one. The page says so in one line rather than listing them.
 *
 * Barber, Mercury, Walking Liberty, Standing Liberty and their Washington and
 * Roosevelt successors are NOT separate rows: the 1873 standard held until
 * 1964, so a Barber dime and a Roosevelt dime contain the same silver, and one
 * row carrying one figure is what stops a reader wondering which of two
 * identical rows to type a number into.
 *
 * The dollars ARE separate rows, and the note above them says why: they are the
 * coins people ask for by name. That is the line this list draws -- the metal
 * decides the figure, and the name decides whether a reader can find the row
 * that holds it.
 *
 * What findability costs everywhere else, `dated` pays: every row leads with
 * the names its coins are known by, so a reader scanning for "Mercury" finds
 * the silver dime rather than concluding the coin is missing.
 */
import { MINT_SPECS, STAMPED_WEIGHT, validateMeltRows, type MeltRow } from './melt-rows';

/**
 * The rows, in the order the page renders them: by denomination ascending, and
 * within a denomination by silver content descending, so the 90% coin sits
 * above the 40% coin it is mistaken for.
 *
 * The order is DECLARED and validated, never sorted -- the same rule the cheat
 * sheets follow. A sort would quietly file a weight typed an order of
 * magnitude wrong into a plausible-looking position; a validated order fails
 * the build instead.
 */
export const SILVER_COINS: MeltRow[] = [
  {
    slug: 'war-nickel',
    name: 'War nickel',
    dated: 'Jefferson, 1942–1945, large mint mark over the dome',
    composition: '35% silver',
    metal: 'silver',
    grams: 5,
    fineness: 0.35,
    kind: 'circulating',
    type: 'nickel',
    sources: [MINT_SPECS],
  },
  {
    slug: 'silver-dime',
    name: 'Silver dime',
    dated: 'Barber, Mercury or Roosevelt, 1964 or earlier',
    composition: '90% silver',
    metal: 'silver',
    grams: 2.5,
    fineness: 0.9,
    kind: 'circulating',
    type: 'dime',
    sources: [MINT_SPECS],
  },
  {
    /*
     * The modern proof quarter, and the one row on this page a reader is
     * holding because somebody bought it rather than because it turned up in a
     * jar. It is here for the same reason the 40% coins are: it exists, people
     * inherit the sets, and a page that lists every silver quarter except this
     * one sends its reader away to find out why their coin weighs too much.
     *
     * HEAVIER than the 90% coin, which is the part that surprises people. The
     * dimensions did not change in 2019 and pure silver is denser than the
     * 90/10 alloy, so the same disc came out at 6.343 g rather than 6.25 -- and
     * it holds 0.2037 troy ounces against the older coin's 0.1808, about
     * thirteen per cent more silver. Anyone weighing a proof quarter against
     * the "silver quarter" row above will find it over by a tenth of a gram and
     * think their scale is wrong.
     */
    slug: 'silver-proof-quarter',
    name: '99.9% silver quarter',
    dated: 'Silver proof sets, 2019 onwards, S mint mark',
    composition: '99.9% silver',
    metal: 'silver',
    grams: 6.343,
    fineness: 0.999,
    kind: 'circulating',
    type: 'quarter',
    sources: [MINT_SPECS],
  },
  {
    slug: 'silver-quarter',
    name: 'Silver quarter',
    dated: 'Barber, Standing Liberty or Washington, 1964 or earlier, and the 1992\u20132018 silver proofs',
    composition: '90% silver',
    metal: 'silver',
    grams: 6.25,
    fineness: 0.9,
    kind: 'circulating',
    type: 'quarter',
    sources: [MINT_SPECS],
  },
  {
    slug: 'silver-clad-quarter',
    name: 'Silver-clad quarter',
    dated: 'Washington Bicentennial, 1976-S, from collector sets only',
    composition: '40% silver',
    metal: 'silver',
    grams: 5.75,
    fineness: 0.4,
    kind: 'circulating',
    type: 'quarter',
    sources: [MINT_SPECS],
  },
  {
    slug: 'silver-half-dollar',
    name: 'Silver half dollar',
    dated: 'Barber, Walking Liberty, Franklin or 1964 Kennedy',
    composition: '90% silver',
    metal: 'silver',
    grams: 12.5,
    fineness: 0.9,
    kind: 'circulating',
    type: 'half-dollar',
    sources: [MINT_SPECS],
  },
  {
    slug: 'silver-clad-half-dollar',
    name: 'Silver-clad half dollar',
    dated: 'Kennedy, 1965–1970, and 1976-S from collector sets',
    composition: '40% silver',
    metal: 'silver',
    grams: 11.5,
    fineness: 0.4,
    kind: 'circulating',
    type: 'half-dollar',
    sources: [MINT_SPECS],
  },
  /*
   * Three rows, one figure. The dollars are the exception to "a row is a
   * composition and a denomination", and the exception is deliberate: the
   * Morgan and the Peace are the two coins on this page that people ask for by
   * name rather than by denomination, and a row called "Silver dollar" is a row
   * somebody searching for a Morgan reads straight past. They hold identical
   * silver -- 26.73 g at 90% was the standard from 1878 to 1935 -- so the three
   * figures below will always agree, and the cost of that is a reader who has
   * to know which of their dollars is which before typing. That is a trade the
   * owner made knowingly; do not "tidy" it back into one row.
   */
  {
    slug: 'morgan-dollar',
    name: 'Morgan dollar',
    dated: '1878–1904 and 1921, eagle with spread wings',
    composition: '90% silver',
    metal: 'silver',
    grams: 26.73,
    fineness: 0.9,
    kind: 'circulating',
    type: 'dollar',
    sources: [MINT_SPECS],
  },
  {
    slug: 'peace-dollar',
    name: 'Peace dollar',
    dated: '1921–1935, eagle perched on a rock',
    composition: '90% silver',
    metal: 'silver',
    grams: 26.73,
    fineness: 0.9,
    kind: 'circulating',
    type: 'dollar',
    sources: [MINT_SPECS],
  },
  {
    // The gap the split turned up: a 1986 Statue of Liberty dollar is a
    // Morgan's metal and neither a Morgan nor a Peace, and it is the silver
    // coin most likely to be in a drawer rather than a jar.
    slug: 'commemorative-silver-dollar',
    name: 'Commemorative dollar',
    dated: '1983–2018, from Mint and proof sets',
    composition: '90% silver',
    metal: 'silver',
    grams: 26.73,
    fineness: 0.9,
    kind: 'circulating',
    type: 'dollar',
    sources: [MINT_SPECS],
  },
  {
    slug: 'silver-clad-dollar',
    name: 'Silver-clad dollar',
    dated: 'Eisenhower, 1971–1976, from collector sets only',
    composition: '40% silver',
    metal: 'silver',
    grams: 24.59,
    fineness: 0.4,
    kind: 'circulating',
    type: 'dollar',
    sources: [MINT_SPECS],
  },
  {
    slug: 'silver-eagle',
    name: 'American Silver Eagle',
    dated: '1986 onwards, one dollar face value',
    composition: '99.9% silver',
    metal: 'silver',
    grams: 31.103,
    fineness: 0.999,
    // The Mint states the content: one troy ounce of silver. The weight above
    // is the published total, and the validator holds the two together.
    troyOunces: 1,
    kind: 'bullion',
    type: 'bullion',
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
    slug: 'silver-gram-bar-1',
    name: '1 g silver bar',
    dated: 'Bar or ingot, as stamped',
    composition: '99.9% silver',
    metal: 'silver',
    grams: 1,
    fineness: 0.999,
    kind: 'bar',
    sources: [STAMPED_WEIGHT],
  },
  {
    slug: 'silver-gram-bar-5',
    name: '5 g silver bar',
    dated: 'Bar or ingot, as stamped',
    composition: '99.9% silver',
    metal: 'silver',
    grams: 5,
    fineness: 0.999,
    kind: 'bar',
    sources: [STAMPED_WEIGHT],
  },
  {
    slug: 'silver-gram-bar-10',
    name: '10 g silver bar',
    dated: 'Bar or ingot, as stamped',
    composition: '99.9% silver',
    metal: 'silver',
    grams: 10,
    fineness: 0.999,
    kind: 'bar',
    sources: [STAMPED_WEIGHT],
  },
  {
    slug: 'private-silver-round',
    name: '1 oz silver round',
    dated: 'Privately minted, one troy ounce as stamped',
    composition: '99.9% silver',
    metal: 'silver',
    grams: 31.103,
    fineness: 0.999,
    // Sold as a troy ounce OF metal, the way an Eagle is, so the stated
    // content leads and the gross weight follows from the fineness.
    troyOunces: 1,
    kind: 'bar',
    sources: [STAMPED_WEIGHT],
  },
];

validateMeltRows(SILVER_COINS, 'SILVER_COINS');
