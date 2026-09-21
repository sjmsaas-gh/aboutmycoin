/**
 * GENERATED FILE -- do not edit by hand. `npm run spot` rewrites it.
 *
 * The built-in spot prices: what the BUILD renders, and what `/api/spot` falls
 * back to when the cache it reads is empty or unreachable.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE FALLBACK, NOT THE UPDATE PATH
 * ---------------------------------------------------------------------------
 *
 * The live path is a cache that `/api/spot` reads and that something outside
 * this repository writes -- see the header of `src/server/spot.ts`. A reader's
 * figure comes from there within the hour. This file exists because a static
 * build has to render a number before any browser has asked for one:
 *
 *   - it is what a crawler indexes and what a reader with no JavaScript keeps;
 *   - it is what every page shows until `/api/spot` answers, which is why it
 *     should be a real reading rather than a guess;
 *   - it is what the endpoint serves when the cache has nothing in it, so the
 *     site has a correct, dated answer on its first day and on a day the cache
 *     is down.
 *
 * `npm run spot` refreshes it from metals.dev. There is no obligation to run
 * it on any schedule -- a stale fallback is not a wrong figure, because every
 * page states the time the prices it is showing were read. Run it when the
 * numbers here have drifted far enough that the pre-JavaScript rendering looks
 * silly, and commit the result.
 *
 * ---------------------------------------------------------------------------
 * THE PRICES ARE NOT ROUNDED
 * ---------------------------------------------------------------------------
 *
 * Full precision as the feed gave it. Rounding happens once, at the point of
 * display, in `formatUsd()` -- so a figure rounded for the page is rounded from
 * the same number the arithmetic used, and a weight times a price is never a
 * rounded price times a weight.
 */

/**
 * USD per troy ounce, as read, unrounded.
 *
 * The keys are checked against `METALS` where `src/lib/spot.ts` assigns this
 * to a `SpotSnapshot`: adding a metal there fails the typecheck here until
 * `npm run spot` has run again and filled it in.
 */
export const SPOT_SNAPSHOT = {
  prices: {
    silver: 66.2985,
    gold: 4373.005,
    platinum: 1800.295,
  },
  /**
   * When these prices were read, as a full ISO timestamp.
   *
   * A timestamp and not a day, because it is printed: every figure worked from
   * these says "based on spot prices at 20 September 2026 23:27 UTC". A
   * reader who knows the minute knows how much to trust the number.
   */
  asOf: '2026-09-20T23:27:11.568Z',
  /**
   * Where the numbers came from.
   *
   * Carried on the wire and never printed. It travels with the prices so a
   * snapshot is self-describing -- `/api/spot` answers with it, and
   * `parseSpot()` refuses a snapshot that does not name a source -- but no page
   * renders it: a reader deciding whether to trust a melt figure needs the
   * time it was read, not a vendor's name.
   */
  source: 'metals.dev',
  /**
   * Whether this claims to be a real-time quote. It is not: it is a reading
   * taken at `asOf`, and the wording on every page says so.
   */
  live: false,
};
