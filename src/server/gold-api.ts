/**
 * The one place this project calls a price feed.
 *
 *   GET https://api.gold-api.com/price/XAG   (and XAU, XPT)
 *
 * Two callers, on purpose: `/api/spot` when the cached snapshot has gone stale
 * (`src/server/spot.ts`), and `npm run spot` when somebody refreshes the
 * built-in fallback (`scripts/fetch-spot.mjs`). One implementation, so the
 * validation and the mapping cannot differ between the figure a reader gets
 * and the figure committed to the repository.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FEED
 * ---------------------------------------------------------------------------
 *
 * It replaced metals.dev on 2026-09-24. metals.dev allowed a hundred calls a
 * MONTH, which is what made the whole refresh arrangement a budget exercise.
 * gold-api.com's real-time endpoint takes no key and states "UNLIMITED
 * requests", its terms say "Commercial use of the API is always permitted,
 * including use in web applications ... and third-party websites", and its
 * figure matched Kitco's quote to the tenth of a cent when the two were read in
 * the same minute. What it does not give is a warranty or an SLA, which is what
 * the fallback reading and the always-200 endpoint are for.
 *
 * It has no key, but it stays in `src/server/` all the same: the browser talks
 * to this origin and nothing else, so no feed's domain reaches `connect-src`.
 *
 * ---------------------------------------------------------------------------
 * ONE METAL PER CALL, ONE SECOND APART
 * ---------------------------------------------------------------------------
 *
 * The endpoint prices one symbol per request, and the terms ban an IP that
 * sends "multiple requests per second". So the metals are fetched in sequence
 * with a gap between them rather than in parallel. It costs two seconds on a
 * refresh that happens at most every half hour, behind an edge cache that
 * serves the reader the previous figure while it runs.
 *
 * ---------------------------------------------------------------------------
 * A SPENT REFRESH IS NEVER HALF-USED
 * ---------------------------------------------------------------------------
 *
 *   - a partial answer is a failure. Every metal in `METALS` must come back,
 *     under its own symbol, in USD, positive — and the result goes through
 *     `parseSpot()`, the same validator the browser applies to `/api/spot`. A
 *     fresh silver price beside yesterday's gold one, under a single timestamp
 *     claiming both, is what that validator exists to refuse.
 *   - the unit cannot be asked for, so it is bounded. The feed quotes per troy
 *     ounce and says so nowhere in the response; a switch to grams would divide
 *     every melt value on the site by 31. `PLAUSIBLE` catches that.
 *   - prices are returned UNROUNDED. Rounding happens once, at the point of
 *     display, in `formatUsd()`.
 *   - `asOf` is the feed's own reading time, not the moment of the call — the
 *     OLDEST of the three, because one timestamp claims all three prices and it
 *     may only claim what is true of each of them.
 *
 * It throws rather than returning undefined, because every caller wants the
 * reason: one logs it and serves the older snapshot, the other prints it and
 * leaves the committed file alone.
 */
import { METALS, parseSpot, type Metal, type SpotSnapshot } from '../lib/spot.js';

const ENDPOINT = 'https://api.gold-api.com/price';

/** The name `source` carries on the wire. Never printed; see `spotBasis()`. */
export const FEED_SOURCE = 'gold-api.com';

const SYMBOL: Record<Metal, string> = { silver: 'XAG', gold: 'XAU', platinum: 'XPT' };

/**
 * USD per troy ounce, the widest a real reading could be. A figure outside is a
 * unit change or a broken feed, not a market: silver quoted per gram is about
 * two dollars, gold per gram about a hundred and thirty.
 */
const PLAUSIBLE: Record<Metal, [number, number]> = {
  silver: [5, 1_000],
  gold: [500, 50_000],
  platinum: [200, 20_000],
};

/** How long to wait for each call. Short: a reader may be waiting behind this. */
const TIMEOUT_MS = 3_000;

/** The pause between calls, so the feed never sees two in one second. */
export const FEED_GAP_MS = 1_100;

export interface FeedReading {
  snapshot: SpotSnapshot;
}

export async function fetchGoldApi(
  { timeoutMs = TIMEOUT_MS, gapMs = FEED_GAP_MS }: { timeoutMs?: number; gapMs?: number } = {},
): Promise<FeedReading> {
  const prices = {} as Record<Metal, number>;
  const times: number[] = [];

  // Driven off METALS, so adding a metal to the site is adding it there and to
  // SYMBOL, rather than editing a list here that would silently stay short.
  for (const [i, metal] of METALS.entries()) {
    if (i > 0 && gapMs > 0) await new Promise((r) => setTimeout(r, gapMs));

    const symbol = SYMBOL[metal];
    const response = await fetch(`${ENDPOINT}/${symbol}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`gold-api.com answered ${response.status} for ${symbol}`);

    const body = (await response.json()) as {
      symbol?: unknown;
      currency?: unknown;
      exchangeRate?: unknown;
      price?: unknown;
      updatedAt?: unknown;
    };

    if (body?.symbol !== symbol) {
      throw new Error(`gold-api.com answered ${JSON.stringify(body?.symbol)} when asked for ${symbol}`);
    }
    if (body.currency !== 'USD' || body.exchangeRate !== 1) {
      throw new Error(`gold-api.com quoted ${symbol} in ${JSON.stringify(body.currency)}, not USD`);
    }

    const price = body.price;
    const [low, high] = PLAUSIBLE[metal];
    if (typeof price !== 'number' || !Number.isFinite(price) || price < low || price > high) {
      throw new Error(`gold-api.com returned no usable ${metal} price: ${JSON.stringify(price)}`);
    }
    prices[metal] = price;

    const at = typeof body.updatedAt === 'string' ? Date.parse(body.updatedAt) : NaN;
    if (Number.isNaN(at)) throw new Error(`gold-api.com returned no usable ${metal} timestamp`);
    times.push(at);
  }

  const asOf = new Date(Math.min(...times)).toISOString();
  const snapshot = parseSpot({ prices, asOf, source: FEED_SOURCE, live: false });
  if (!snapshot) throw new Error('the mapped reading does not parse as a snapshot');

  return { snapshot };
}
