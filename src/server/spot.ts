/**
 * Spot metal prices — server half.
 *
 *   GET /api/spot -> { prices: { silver, gold, platinum }, asOf, source, live }
 *
 * The one document on this site that is allowed to be younger than the HTML
 * around it. Everything else is static and cached at the edge for a day; this
 * is cached for half an hour, and it is the whole reason a price can change without
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
 * than REFRESH_AFTER_MINUTES ago, it calls the feed once, writes the result back
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
 * The feed (gold-api.com, since 2026-09-24) is unmetered, but its terms ban an
 * IP that sends "multiple requests per second", and a per-request call would
 * do exactly that the first time the page was busy. The metals.dev feed before
 * it allowed a hundred calls a month, and the guards below were built for that;
 * they are kept because the failure they stop is the same shape — a feed
 * hammered until it refuses us — even though the limit is now a ban rather than
 * a bill. So every call has to pass two independent checks:
 *
 *   1. THE CLOCK. `fetchedAt` in the cached document records when WE last
 *      called the feed, and a refresh is only due when that is older than
 *      REFRESH_AFTER_MINUTES. It is a separate field from `asOf` on purpose,
 *      and this is the subtle one: `asOf` is the feed's own reading time, which
 *      barely moves over a weekend when the metals market is shut. Scheduling
 *      off `asOf` would see a Friday timestamp all Sunday, decide a refresh was
 *      overdue on every cache miss, and call the feed on every request all
 *      weekend — each call returning the same Friday timestamp it had just
 *      rejected.
 *   2. THE BUDGET. The document also carries a month-to-date refresh count, and
 *      no refresh happens past MONTHLY_CALL_LIMIT. The clock check alone is
 *      enough in the ordinary case; the budget is what stands between a
 *      mistake — a shortened interval, a cache that has stopped accepting
 *      writes so `fetchedAt` never advances — and a banned IP.
 *
 * Both live in the cached document rather than in memory, because a function
 * instance is not a place to keep state: there are many of them, they are cold
 * most of the time, and none of them sees what the others did.
 *
 * Both guards live in a document the endpoint has to be able to WRITE, which is
 * why `refresh()` writes its bookkeeping before it calls the feed rather than
 * after. With the feed called first, a store that rejects every write spends a
 * call on every request and neither guard can stop it — they are both in the
 * document that is failing to save. Claiming first makes a broken writer cost
 * nothing at all. The full reasoning is on `refresh()`.
 *
 * That still does not make the refresh atomic: two requests arriving in the
 * same moment can both read a stale document and both go on to claim. The cost
 * is one wasted call, rarely. Only fix it if the usage count says it is
 * happening — the tool is `ifMatch` on the claiming write.
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
 * The browser talks to this origin and nothing else, so no feed's domain
 * reaches `connect-src` in the three host configs and `/privacy` needs no new
 * line.
 */
import {
  REFERENCE_SPOT,
  SPOT_CACHE_CONTROL,
  parseSpot,
  type SpotSnapshot,
} from '../lib/spot.js';
import { fetchGoldApi } from './gold-api.js';

/**
 * How old the last feed call may be before a refresh is due, in minutes.
 *
 * Thirty, the owner's choice of 2026-09-24. It is matched by the edge lifetime
 * of this endpoint's own response (`SPOT_MAX_AGE_SECONDS` in `src/lib/spot.ts`):
 * a refresh interval shorter than the edge cache would be work nobody sees.
 */
const REFRESH_AFTER_MINUTES = 30;

/**
 * The hard ceiling on refreshes in a calendar month.
 *
 * A thirty-minute interval is at most 1,488 refreshes in a 31-day month, and
 * only if somebody reads the site every half hour around the clock. This is
 * twice that. It is not a tuning knob, it is a fuse: if it ever trips,
 * something has gone wrong with the clock check and the log line says so,
 * while the site goes on serving the last good figures.
 */
const MONTHLY_CALL_LIMIT = 3_000;

/**
 * How often a refresh may also rebuild the site, in hours.
 *
 * Once a week, the owner's choice of 2026-09-24. The price a reader with
 * JavaScript sees refreshes every half hour through this endpoint and never
 * waits for a build; what a rebuild moves is only the figure baked into the
 * HTML, for crawlers and readers without JavaScript, and a week is fresh
 * enough for that — every page prints the time its figure was read. A deploy is
 * a full build of every page, so rebuilding with every refresh would be
 * forty-eight builds a day. A week less four hours, so the same hour a week
 * later is not turned away by a few minutes. Tracked in the document as
 * `hookedAt`, for the same reason the clock is: no function instance can
 * remember it.
 */
const DEPLOY_HOOK_AFTER_HOURS = 7 * 24 - 4;

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
   * Whether this deployment may call the feed at all. Absent or false means the
   * cache is read but never refreshed, which is what a preview deployment should
   * do: it reads production's cache and never writes over it.
   *
   * This used to be the feed's API key, which only production held. The feed
   * that replaced it has no key, so the decision is now an explicit flag the
   * adapter sets from the host's own notion of production — the default points
   * the safe way.
   */
  feedEnabled?: boolean;
  /**
   * The pause between the per-metal feed calls, in milliseconds. Leave unset:
   * the default is what keeps the feed's rate rule. Tests set it to zero.
   */
  feedGapMs?: number;
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
   * It fires at most once a week (DEPLOY_HOOK_AFTER_HOURS), and only on a refresh
   * that actually happened. It cannot loop:
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
  /** Refreshes so far this calendar month, UTC. */
  month: string;
  calls: number;
  /** When a refresh last poked the deploy hook, or '' if none has. */
  hookedAt: string;
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
  if (/(^|\.)(gold-api\.com|metals\.dev)$/i.test(parsed.hostname)) {
    return 'points at a price feed itself';
  }
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
    hookedAt: typeof body.hookedAt === 'string' ? body.hookedAt : '',
  };
}

/**
 * Whether to spend a feed call, and why not when the answer is no.
 *
 * Separate from the refresh itself so the decision is testable on its own: it
 * is the part that protects the feed, and it has to be correct without a
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

  const ageMinutes = (now.getTime() - last) / 60_000;
  // A fetchedAt in the future is a clock problem somewhere. Refusing is the
  // safe direction: the alternative refreshes on every request until the real
  // time catches up.
  if (ageMinutes < 0) return { refresh: false, reason: `cached fetch time is in the future` };
  if (ageMinutes < REFRESH_AFTER_MINUTES) {
    return { refresh: false, reason: `last fetch was ${ageMinutes.toFixed(0)}m ago` };
  }
  return { refresh: true, reason: `last fetch was ${ageMinutes.toFixed(0)}m ago` };
}

/**
 * Whether this refresh should also rebuild the site. Decided BEFORE the claim,
 * so the claim can record it: a hook that is poked and then fails is not
 * retried for a week, which is the same trade the clock makes for the feed —
 * and a missed rebuild costs only the crawler-facing figure, which is dated.
 */
export function hookDue(doc: SpotCacheDocument | undefined, now = new Date()): boolean {
  const last = Date.parse(doc?.hookedAt ?? '');
  if (Number.isNaN(last)) return true;
  const ageHours = (now.getTime() - last) / 3_600_000;
  return ageHours < 0 ? false : ageHours >= DEPLOY_HOOK_AFTER_HOURS;
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
  const write = env.writeCache;
  if (env.feedEnabled !== true || !write) return undefined;

  const month = monthKey(now);
  const calls = (doc?.month === month ? doc.calls : 0) + 1;
  const poke = hookDue(doc, now);
  const hookedAt = poke ? now.toISOString() : (doc?.hookedAt ?? '');

  // CLAIM THE CALL BEFORE SPENDING IT.
  //
  // The bookkeeping is written first, carrying the OLD prices and a new
  // `fetchedAt`, and only then is the feed called. That ordering is the
  // difference between a bounded system and an unbounded one, and it was
  // learned the hard way: with the feed called first, a write that always
  // fails — a misconfigured store, a revoked token — spends a call on EVERY
  // request. Both guards are inert in that state, because both of them live in
  // the document that cannot be written. There is nothing to notice it, either:
  // the endpoint goes on answering 200 with correct figures while the feed is
  // called on every request until it bans us.
  //
  // Claiming first inverts every one of those failures into a safe one:
  //
  //   - a broken writer now costs ZERO feed calls. It throws here, before the
  //     feed is touched, and the reader is served the figures already on hand.
  //   - a feed that fails after the claim leaves `fetchedAt` advanced, so the
  //     next attempt is half an hour away rather than on the next request.
  //     Slightly older prices are the right price to pay for not hammering a
  //     feed that is down.
  //   - two requests racing are far less likely to both reach the feed, since
  //     the first one writes before it calls.
  //
  // The claim is honest on its own: it carries the prices and the `asOf` that
  // were already true, and `asOf` is what every page prints. A reader served
  // from a claimed-but-not-yet-refreshed document sees the previous reading
  // with the previous time beside it.
  const base = doc ?? REFERENCE_SPOT;
  await write(
    JSON.stringify({
      prices: base.prices,
      asOf: base.asOf,
      source: base.source,
      live: base.live,
      fetchedAt: now.toISOString(),
      month,
      calls,
      hookedAt,
    } satisfies SpotCacheDocument),
  );

  const { snapshot } = await fetchGoldApi(
    env.feedGapMs === undefined ? {} : { gapMs: env.feedGapMs },
  );

  const next: SpotCacheDocument = {
    ...snapshot,
    fetchedAt: now.toISOString(),
    month,
    calls,
    hookedAt,
  };

  await write(JSON.stringify(next));
  console.log(`[spot] refreshed from the feed; ${calls} refresh(es) this month`);

  // Rebuild the static pages so the figure a crawler sees catches up too — once
  // a week, not every refresh. After the write, never before: a deploy that raced
  // the write would read the old document and bake in the price this call just
  // replaced.
  if (poke) await pokeDeployHook(env);

  return snapshot;
}

/**
 * Ask the host to rebuild the site. Best-effort, and never the reader's
 * problem.
 *
 * Deliberately awaited rather than left dangling: a promise not awaited in a
 * serverless function is a promise the runtime may kill when the response is
 * sent, which would make this work on a warm instance and not on a cold one —
 * the worst kind of intermittent. It costs one request, once a week, on the one
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
    // the rebuild, and the next refresh tries again a week later.
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
