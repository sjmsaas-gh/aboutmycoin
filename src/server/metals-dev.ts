/**
 * The one place this project calls a price feed.
 *
 *   GET https://api.metals.dev/v1/latest?api_key=…&currency=USD&unit=toz
 *
 * Two callers, on purpose: `/api/spot` when the cached snapshot has gone stale
 * (`src/server/spot.ts`), and `npm run spot` when somebody refreshes the
 * built-in fallback (`scripts/fetch-spot.mjs`). One implementation, so the
 * validation, the unit assertion and the mapping cannot differ between the
 * figure a reader gets and the figure committed to the repository.
 *
 * In `src/server/` and not `src/lib/` because it takes an API key. Anything in
 * `src/lib/` reaches the browser; nothing here does.
 *
 * ---------------------------------------------------------------------------
 * THE CALL IS METERED, SO EVERY REFUSAL IS EXPLICIT
 * ---------------------------------------------------------------------------
 *
 * The free tier is a hundred calls a month. This function does not decide when
 * to spend one — its callers do, and both of them check the clock and a budget
 * first — but it does make sure a spent call is never half-used:
 *
 *   - the units are asserted, not assumed. `currency=USD&unit=toz` is asked for
 *     explicitly, and the answer is checked, because an account default
 *     switching to grams would multiply every melt value on the site by 31.
 *   - a partial answer is a failure. Every metal in `METALS` must be present
 *     and positive, and the result goes through `parseSpot()` — the same
 *     validator the browser applies to `/api/spot` — before anybody sees it. A
 *     fresh silver price beside yesterday's gold one, under a single timestamp
 *     claiming both, is what that validator exists to refuse.
 *   - prices are returned UNROUNDED. Rounding happens once, at the point of
 *     display, in `formatUsd()`.
 *   - `asOf` is the feed's own reading time, not the moment of the call. It is
 *     printed, to the minute, beside every figure worked from it.
 *
 * It throws rather than returning undefined, because every caller wants the
 * reason: one logs it and serves the older snapshot, the other prints it and
 * leaves the committed file alone.
 */
import { METALS, parseSpot, type SpotSnapshot } from '../lib/spot.js';

const ENDPOINT = 'https://api.metals.dev/v1/latest';

/** How long to wait for the feed. Short: a reader is waiting behind this. */
const TIMEOUT_MS = 5_000;

export interface MetalsDevReading {
  snapshot: SpotSnapshot;
  /**
   * Calls used this month, from the response's `x-api-usage` header, as the
   * feed reports it. Printed by the script and logged by the endpoint: a budget
   * nobody is shown is a budget nobody notices running out.
   */
  usage?: number;
}

export async function fetchMetalsDev(
  apiKey: string,
  timeoutMs = TIMEOUT_MS,
): Promise<MetalsDevReading> {
  const url = `${ENDPOINT}?api_key=${encodeURIComponent(apiKey)}&currency=USD&unit=toz`;
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  // Read before anything else can throw: the call has been spent either way,
  // and the count is the thing a caller most wants in the log.
  const header = response.headers.get('x-api-usage');
  const usage = header && Number.isFinite(Number(header)) ? Number(header) : undefined;

  if (!response.ok) throw new Error(`metals.dev answered ${response.status}`);

  const body = (await response.json()) as {
    status?: string;
    currency?: string;
    unit?: string;
    metals?: Record<string, unknown>;
    timestamps?: { metal?: unknown };
    error?: unknown;
  };

  if (body?.status !== 'success') {
    throw new Error(`metals.dev answered without success: ${JSON.stringify(body?.error ?? body).slice(0, 200)}`);
  }
  if (body.currency !== 'USD' || body.unit !== 'toz') {
    throw new Error(`metals.dev quoted ${body.currency}/${body.unit}, not USD/toz`);
  }

  // Driven off METALS, so adding a metal to the site is adding it there rather
  // than editing a list here that would silently stay short.
  const prices = {} as Record<(typeof METALS)[number], number>;
  for (const metal of METALS) {
    const price = body.metals?.[metal];
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      throw new Error(`metals.dev returned no usable ${metal} price`);
    }
    prices[metal] = price;
  }

  const asOf = body.timestamps?.metal;
  if (typeof asOf !== 'string' || Number.isNaN(Date.parse(asOf))) {
    throw new Error('metals.dev returned no usable metal timestamp');
  }

  const snapshot = parseSpot({ prices, asOf, source: 'metals.dev', live: false });
  if (!snapshot) throw new Error('the mapped reading does not parse as a snapshot');

  return { snapshot, usage };
}
