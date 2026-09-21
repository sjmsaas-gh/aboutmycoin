/**
 * Spot metal prices — server half.
 *
 *   GET /api/spot -> { prices: { silver, gold, platinum }, asOf, source, live }
 *
 * The one document on this site that is allowed to be younger than the HTML
 * around it. Everything else is static and cached at the edge for a day; this
 * is cached for an hour, and it is the whole reason a price can change without
 * a deploy.
 *
 * Host-agnostic like the rest of `src/server`: plain Web `Request`/`Response`,
 * and the one host-specific thing it needs — somewhere to write — arrives as a
 * function on `env`. The Vercel adapter in `api/spot.ts` supplies a Vercel Blob
 * implementation; a move to another host is another adapter that size.
 *
 * ---------------------------------------------------------------------------
 * IT SERVES A CACHED SNAPSHOT AND REFRESHES IT WHEN IT GOES STALE
 * ---------------------------------------------------------------------------
 *
 * There is no cron. The endpoint reads the cached document at `SPOT_CACHE_URL`
 * and serves it; if that document is missing or the last feed call was more
 * than REFRESH_AFTER_HOURS ago, it calls the feed once, writes the result back
 * to the cache, and serves the new figures. Cache-aside, in other words: the
 * reader who happens to arrive after the interval pays for the refresh, and
 * every reader after them is served from the cache.
 *
 * That is deliberately not a scheduled job. A cron on this host is capped at
 * one run a day on the plan this site is on, fires at an unpredictable time,
 * needs its own authenticated route and its own secret, and — the part that
 * decides it — runs whether or not anybody is reading the site. This site is
 * pre-launch. Refreshing on demand spends nothing on the days nobody visits and
 * keeps the whole arrangement in one route with one env var.
 *
 * ---------------------------------------------------------------------------
 * WHY THE FEED IS NOT CALLED PER REQUEST, AND THE TWO GUARDS
 * ---------------------------------------------------------------------------
 *
 * The feed allows a hundred calls a MONTH. Per-request would spend that in
 * minutes and per-edge-region-per-hour would spend it in a day, so every call
 * has to pass two independent checks:
 *
 *   1. THE CLOCK. `fetchedAt` in the cached document records when WE last
 *      called the feed, and a refresh is only due when that is older than
 *      REFRESH_AFTER_HOURS. It is a separate field from `asOf` on purpose, and
 *      this is the subtle one: `asOf` is the feed's own reading time, which
 *      barely moves over a weekend when the metals market is shut. Scheduling
 *      off `asOf` would see a Friday timestamp all Sunday, decide a refresh was
 *      overdue on every cache miss, and spend the month's allowance in a
 *      weekend — each call returning the same Friday timestamp it had just
 *      rejected.
 *   2. THE BUDGET. The document also carries a month-to-date call count, and no
 *      refresh happens past MONTHLY_CALL_LIMIT. The clock check alone is
 *      enough in the ordinary case; the budget is what stands between a
 *      mistake — a shortened interval, a cache that has stopped accepting
 *      writes so `fetchedAt` never advances — and a suspended feed account.
 *
 * Both live in the cached document rather than in memory, because a function
 * instance is not a place to keep state: there are many of them, they are cold
 * most of the time, and none of them sees what the others did.
 *
 * Neither guard makes the refresh atomic. Two requests arriving in the same
 * moment after the interval can both see a stale document and both call the
 * feed; the writes are last-one-wins and the figures are near-identical, so the
 * cost is one wasted call, rarely. Only fix that if the usage count says it is
 * happening — the tool is `ifMatch` on the write, claiming the refresh before
 * spending it.
 *
 * ---------------------------------------------------------------------------
 * IT ALWAYS ANSWERS 200
 * ---------------------------------------------------------------------------
 *
 * Cache unreachable, cache malformed, feed down, feed rate-limited, no
 * configuration at all: every one of those serves the best snapshot on hand —
 * the cached one if it parsed, otherwise `REFERENCE_SPOT`, the reading the build
 * already rendered into the page the reader is looking at. A 503 would blank a
 * figure in every browser on the site over a cache miss. The honest failure for
 * this endpoint is not "no answer" but "an older answer, labelled", and it is
 * labelled: every snapshot carries the time it was read and every page prints
 * it.
 *
 * The API key is read here and never leaves. The browser talks to this origin
 * and nothing else, so no feed's domain reaches `connect-src` in the three host
 * configs and `/privacy` needs no new line.
 */
import {
  REFERENCE_SPOT,
  SPOT_CACHE_CONTROL,
  parseSpot,
  type SpotSnapshot,
} from '../lib/spot.js';
import { fetchMetalsDev } from './metals-dev.js';

/**
 * How old the last feed call may be before a refresh is due, in hours.
 *
 * Twenty: once a day, with four hours of slack so a reader arriving at the same
 * hour on consecutive days is not turned away by a few minutes. ~31 calls a
 * month against an allowance of a hundred.
 *
 * TO REFRESH HOURLY, set this to 1 — and raise MONTHLY_CALL_LIMIT with it, and
 * check the feed's plan first: an hour's interval is about 730 calls a month,
 * which is seven times the free tier. The limit below is what stops that
 * becoming a suspended account rather than a bill.
 */
const REFRESH_AFTER_HOURS = 20;

/**
 * The hard ceiling on feed calls in a calendar month.
 *
 * Sixty against an allowance of a hundred, which is twice what the interval
 * above should ever need. It is not a tuning knob, it is a fuse: if it ever
 * trips, something has gone wrong with the clock check and the log line says
 * so, while the site goes on serving the last good figures.
 */
const MONTHLY_CALL_LIMIT = 60;

/** How long to wait for the cached document. The fallback is already correct. */
const CACHE_TIMEOUT_MS = 2_000;

/** How long to wait for the deploy hook. Nothing a reader sees depends on it. */
const DEPLOY_HOOK_TIMEOUT_MS = 3_000;

export interface SpotEnv {
  /**
   * Where the cached snapshot is published: an absolute https URL returning the
   * document below. Absent is a working state — the built-in reading is served,
   * labelled with its own time, exactly as the build rendered it.
   */
  SPOT_CACHE_URL?: string;
  /**
   * Feed credential. Absent means the cache is read but never refreshed, which
   * is what a preview deployment should do: it reads production's cache and
   * spends none of the allowance.
   */
  METALS_DEV_API_KEY?: string;
  /**
   * Publish a new cache document. Supplied by the adapter, because where a
   * document can be written is the one genuinely host-specific thing here.
   * Absent means no refresh is attempted, and nothing is broken by that.
   */
  writeCache?: (body: string) => Promise<void>;
  /**
   * A deploy hook to poke after a successful refresh, so the static HTML is
   * rebuilt with the new price in it.
   *
   * Why this exists: readers with JavaScript get a current figure from this
   * endpoint, but a crawler and a reader without it keep whatever the last
   * BUILD rendered. That figure only changes when the site is rebuilt, so
   * without this it is as old as the last deploy — months, potentially, and a
   * six-month-old silver price in a search result discredits the page it is on.
   *
   * It fires at most once a day, because it fires only when a refresh actually
   * happened and a refresh is behind the clock and the budget. It cannot loop:
   * the build reads the cached document rather than the feed, and a deploy does
   * not call this endpoint.
   *
   * Treat the URL as a secret. Anyone holding it can trigger deploys, so it is
   * never logged, not even on failure.
   */
  deployHookUrl?: string;
}

/**
 * The cached document: a snapshot plus the bookkeeping the two guards need.
 *
 * It extends `SpotSnapshot`, so `parseSpot()` validates it unchanged and the
 * body served to the browser is the four snapshot fields and nothing else —
 * `parseSpot()` returns only those, so the bookkeeping cannot leak into a
 * response by accident.
 */
export interface SpotCacheDocument extends SpotSnapshot {
  /** When WE last called the feed. Schedules the next refresh; see the header. */
  fetchedAt: string;
  /** Feed calls so far this calendar month, UTC. */
  month: string;
  calls: number;
}

/** The current month as the document records it. */
const monthKey = (now = new Date()): string => now.toISOString().slice(0, 7);

/**
 * Reject a cache URL that is really a price feed.
 *
 * Two shapes of the same mistake: a host that bills per call, and any URL
 * carrying a key — which would put that key in this platform's logs, the CDN's
 * logs and the next request's `Referer`. The refresh path is how the feed is
 * called; the cache URL is never it.
 */
function refuseCacheUrl(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'not an absolute URL';
  }
  if (parsed.protocol !== 'https:') return 'not https';
  if (/(^|\.)metals\.dev$/i.test(parsed.hostname)) return 'points at the price feed itself';
  for (const key of parsed.searchParams.keys()) {
    if (/api[-_]?key|token|secret/i.test(key)) return 'carries a credential in the query string';
  }
  return undefined;
}

/** Fetch the cached document, or undefined for every way that can fail. */
async function readCache(env: SpotEnv): Promise<SpotCacheDocument | undefined> {
  const url = env.SPOT_CACHE_URL;
  if (!url) return undefined;

  const refusal = refuseCacheUrl(url);
  if (refusal) {
    console.error(`[spot] SPOT_CACHE_URL refused: ${refusal}`);
    return undefined;
  }

  // `no-store`: this fetch must see the last write, not a copy of the document
  // from before it. The blob's own cache header is set short by the adapter for
  // the same reason.
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(CACHE_TIMEOUT_MS),
  });
  if (!response.ok) {
    // A 404 is the ordinary first-run state, not a fault: nothing has written
    // the document yet, and the refresh below is what creates it.
    if (response.status !== 404) console.error(`[spot] cache answered ${response.status}`);
    return undefined;
  }

  const body = (await response.json()) as Record<string, unknown>;
  const snapshot = parseSpot(body);
  if (!snapshot) {
    console.error('[spot] cache document did not parse as a snapshot');
    return undefined;
  }

  return {
    ...snapshot,
    // A document written by an older version, or by hand, may carry neither.
    // Treating that as "never fetched, no calls yet" is the safe direction: the
    // clock check then permits one refresh, which writes both fields properly.
    fetchedAt: typeof body.fetchedAt === 'string' ? body.fetchedAt : '',
    month: typeof body.month === 'string' ? body.month : '',
    calls: typeof body.calls === 'number' && Number.isFinite(body.calls) ? body.calls : 0,
  };
}

/**
 * Whether to spend a feed call, and why not when the answer is no.
 *
 * Separate from the refresh itself so the decision is testable on its own: it
 * is the part that protects the allowance, and it has to be correct without a
 * network.
 */
export function refreshDecision(
  doc: SpotCacheDocument | undefined,
  now = new Date(),
): { refresh: boolean; reason: string } {
  if (!doc) return { refresh: true, reason: 'no cached document yet' };

  const calls = doc.month === monthKey(now) ? doc.calls : 0;
  if (calls >= MONTHLY_CALL_LIMIT) {
    return { refresh: false, reason: `monthly call limit reached (${calls})` };
  }

  const last = Date.parse(doc.fetchedAt);
  if (Number.isNaN(last)) return { refresh: true, reason: 'cached document records no fetch time' };

  const ageHours = (now.getTime() - last) / 3_600_000;
  // A fetchedAt in the future is a clock problem somewhere. Refusing is the
  // safe direction: the alternative refreshes on every request until the real
  // time catches up.
  if (ageHours < 0) return { refresh: false, reason: `cached fetch time is in the future` };
  if (ageHours < REFRESH_AFTER_HOURS) {
    return { refresh: false, reason: `last fetch was ${ageHours.toFixed(1)}h ago` };
  }
  return { refresh: true, reason: `last fetch was ${ageHours.toFixed(1)}h ago` };
}

/**
 * Call the feed and publish the result. Returns the new snapshot, or undefined
 * if anything at all went wrong — in which case the caller serves what it had.
 */
async function refresh(
  env: SpotEnv,
  doc: SpotCacheDocument | undefined,
  now = new Date(),
): Promise<SpotSnapshot | undefined> {
  const apiKey = env.METALS_DEV_API_KEY;
  const write = env.writeCache;
  if (!apiKey || !write) return undefined;

  const { snapshot, usage } = await fetchMetalsDev(apiKey);

  const month = monthKey(now);
  const calls = (doc?.month === month ? doc.calls : 0) + 1;
  const next: SpotCacheDocument = {
    ...snapshot,
    fetchedAt: now.toISOString(),
    month,
    calls,
  };

  await write(JSON.stringify(next));
  // The count this site kept and the count the feed reports, together: they
  // should track, and a gap between them is the only visible sign of a second
  // thing spending the allowance.
  console.log(
    `[spot] refreshed from the feed; ${calls} call(s) this month by this site` +
      `${usage === undefined ? '' : `, ${usage} reported by the feed`}`,
  );

  // Rebuild the static pages so the figure a crawler sees catches up too. After
  // the write, never before: a deploy that raced the write would read the old
  // document and bake in the price this call just replaced.
  await pokeDeployHook(env);

  return snapshot;
}

/**
 * Ask the host to rebuild the site. Best-effort, and never the reader's
 * problem.
 *
 * Deliberately awaited rather than left dangling: a promise not awaited in a
 * serverless function is a promise the runtime may kill when the response is
 * sent, which would make this work on a warm instance and not on a cold one —
 * the worst kind of intermittent. It costs one request, once a day, on the one
 * invocation that was already calling a price feed.
 */
async function pokeDeployHook(env: SpotEnv): Promise<void> {
  const url = env.deployHookUrl;
  if (!url) return;

  // The URL is a capability: whoever holds it can deploy. It is never put in a
  // log line, so the messages below describe it rather than print it.
  if (!url.startsWith('https://')) {
    console.error('[spot] the deploy hook URL is not https; not poking it');
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(DEPLOY_HOOK_TIMEOUT_MS),
    });
    console.log(
      response.ok
        ? '[spot] deploy hook poked; the built-in figures will catch up on the next build'
        : `[spot] deploy hook answered ${response.status}`,
    );
  } catch (err) {
    // The prices are refreshed and published either way. All that is lost is
    // the rebuild, and the next refresh tries again a day later.
    console.error(`[spot] deploy hook failed: ${err}`);
  }
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Five minutes in the browser, an hour at the edge, a day of serving
      // stale while it refreshes behind the reader's back. That ratio is what
      // keeps this cheap: one invocation per hour per region however many
      // people are reading coin pages, one request per browsing session rather
      // than one per page. The string is in src/lib/spot.ts, because three host
      // configs repeat it and a test compares all four.
      'cache-control': SPOT_CACHE_CONTROL,
      // No `Vary` and no CORS header. The answer is the same bytes for every
      // caller, so varying on anything would split one cache entry into
      // several for no benefit, and there is no `Access-Control-Allow-Origin`
      // because the only page that asks is a page on this origin.
    },
  });
}

export async function handleSpot(request: Request, env: SpotEnv): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  let doc: SpotCacheDocument | undefined;
  try {
    doc = await readCache(env);
  } catch (err) {
    // A timeout, a DNS failure, a body that is not JSON.
    console.error(`[spot] cache read threw: ${err}`);
  }

  // A HEAD request is a cache or a crawler checking whether the document
  // exists, not a reader who needs a current figure. It never spends a call.
  if (request.method === 'GET') {
    const decision = refreshDecision(doc);
    if (decision.refresh) {
      try {
        const fresh = await refresh(env, doc);
        if (fresh) return json(fresh);
      } catch (err) {
        // The feed is down, rate-limited, or answering nonsense. The reader
        // gets the older figures and their timestamp; the log gets the reason.
        console.error(`[spot] refresh failed, serving what we have: ${err}`);
      }
    } else if (decision.reason.startsWith('monthly call limit')) {
      // The fuse, not the clock. Worth a line in the log every time, because it
      // means the clock check has stopped working.
      console.error(`[spot] not refreshing: ${decision.reason}`);
    }
  }

  // Whatever we have, best first, and always 200.
  return json(doc ? parseSpot(doc) ?? REFERENCE_SPOT : REFERENCE_SPOT);
}
