/**
 * The catalogue: the hand-written coins and the generated ones, in one list.
 *
 * This file used to BE the catalogue. It is now the join, and the split behind
 * it is the one its own header always predicted -- "seeded by hand, then
 * generated":
 *
 *   coin-seed.ts       the coins somebody wrote. An issue with a story.
 *   coin-generated.ts  the coins the facts wrote. Everything else.
 *   coin-catalog.ts    this file. The two, merged and ordered.
 *
 * Nothing imports the two halves. `coins.ts` imports `COINS` from here, every
 * route imports `coins.ts`, and the split stays invisible to all of them --
 * which is what makes moving a coin from one half to the other a change to two
 * files rather than to the site.
 *
 * ---------------------------------------------------------------------------
 * WHY THE ORDER IS COMPUTED HERE
 * ---------------------------------------------------------------------------
 *
 * Registry order is what every archive lists in: `/coin-info/silver/quarter`
 * renders `coinsInGroupType()` in the order it finds things. Concatenating the
 * two halves would put eleven hand-written coins from 1932 and 1960-1964 at the
 * top of a list of eighty-three, followed by 1934 -- which is not an order, it
 * is a record of which ones somebody happened to write first, and the reader
 * sees it.
 *
 * So the join sorts: year, then mint, Philadelphia before Denver before San
 * Francisco, which is how every mintage table ever printed reads and therefore
 * how a reader expects to scan one. A coin moving between the two halves does
 * not move on the page.
 */
import type { Coin } from './coin-schema';
import { SEEDED_COINS } from './coin-seed';
import { GENERATED_COINS } from './coin-generated';

/**
 * Philadelphia, Denver, San Francisco. Any mark not listed sorts after them,
 * alphabetically, so a series with a mint this does not know about is merely
 * ordered oddly rather than dropped.
 */
const MINT_ORDER = ['', 'D', 'S'];

const rank = (coin: Coin) => {
  const i = MINT_ORDER.indexOf(coin.mintMark ?? '');
  return i === -1 ? MINT_ORDER.length : i;
};

export const COINS: Coin[] = [...SEEDED_COINS, ...GENERATED_COINS].sort(
  (a, b) =>
    a.years.from - b.years.from ||
    rank(a) - rank(b) ||
    (a.mintMark ?? '').localeCompare(b.mintMark ?? '') ||
    a.slug.localeCompare(b.slug),
);
