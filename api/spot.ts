/**
 * Vercel adapter for the spot price endpoint.
 *
 * All the logic is in `src/server/spot.ts`, written against the Web
 * `Request`/`Response` interfaces. What is here is the one genuinely
 * host-specific thing that handler needs: somewhere to write the refreshed
 * snapshot. On Vercel that is Vercel Blob; on another host it is another dozen
 * lines in another file. See README, "Hosting".
 *
 * This is the only endpoint on the site whose response is meant to be cached.
 * The `Cache-Control` it sends is set in the handler; the matching rule in
 * vercel.json, netlify.toml and public/_headers has to agree with it, and all
 * three must be edited together.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS ONE IS NOT ON THE EDGE RUNTIME
 * ---------------------------------------------------------------------------
 *
 * Every other endpoint here is `runtime: 'edge'`. This one is Node, because
 * `@vercel/blob` imports `undici` at module scope and cannot be bundled for
 * the edge. That is an acceptable trade rather than a defeat: the response is
 * cached for an hour at the edge, so this function runs about once an hour per
 * region and a cold start on that path is invisible next to a figure the page
 * is already displaying.
 *
 * The alternative — hand-rolling the Blob write with `fetch` to stay on the
 * edge — was considered and rejected. The R2 client in `scripts/r2/` is
 * hand-rolled against AWS SigV4, which is a published, stable specification;
 * Blob's wire format is an internal contract with a version header on it, and
 * reimplementing that for a once-a-day write is a silent breakage waiting for
 * a version bump.
 *
 * ---------------------------------------------------------------------------
 * SETTING IT UP
 * ---------------------------------------------------------------------------
 *
 *   1. Create a Blob store in the Vercel dashboard (Storage -> Blob) and
 *      connect it to this project. That injects `BLOB_READ_WRITE_TOKEN`; do not
 *      paste it in by hand.
 *   2. Set `METALS_DEV_API_KEY` in the Production scope.
 *   3. Deploy, then request `/api/spot` once. There is no cached document yet,
 *      so the handler calls the feed, writes `spot.json`, and the response
 *      carries the new figures.
 *   4. Take that object's public URL from the dashboard and set it as
 *      `SPOT_CACHE_URL`. It is stable — the pathname is fixed below and
 *      `addRandomSuffix` is off — so this is a one-time step.
 *
 * Until step 4, every request repeats step 3, so do not leave it half done: the
 * handler cannot read a document whose URL it has not been given, and a
 * document it cannot read is a document whose call count it cannot see.
 */
import { put } from '@vercel/blob';

// No `.ts` extension: Vercel's bundler resolves it, and an explicit extension
// is the kind of thing that builds locally and fails in CI.
import { handleSpot } from '../src/server/spot.js';

export const config = { runtime: 'nodejs' };

/**
 * The object the snapshot is written to. Fixed, and with no random suffix, so
 * the URL in `SPOT_CACHE_URL` stays correct across every write.
 */
const CACHE_PATHNAME = 'spot.json';

/**
 * How long Vercel's CDN may cache the blob itself, in seconds.
 *
 * A minute, which is the shortest the store allows. It has to be set: the
 * default is a MONTH, which would leave the handler reading a copy of the
 * document from before its own last write — seeing an old `fetchedAt`, deciding
 * a refresh was overdue, and spending a call on every invocation for a month.
 * The staleness this endpoint is allowed is expressed once, in
 * `SPOT_CACHE_CONTROL` on its own response; the store must not add another
 * layer of it.
 */
const BLOB_CACHE_SECONDS = 60;

export default function handler(request: Request): Promise<Response> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  return handleSpot(request, {
    SPOT_CACHE_URL: process.env.SPOT_CACHE_URL,
    METALS_DEV_API_KEY: process.env.METALS_DEV_API_KEY,
    // Optional. A Vercel Deploy Hook, so the static pages are rebuilt with the
    // new price after a refresh -- which is the only way the figure a crawler
    // sees ever changes. Absent means the built-in reading stays as old as the
    // last deploy.
    deployHookUrl: process.env.SPOT_DEPLOY_HOOK_URL,
    // Absent when no store is connected, which the handler treats as "read the
    // cache, never refresh it" — the correct behaviour for a preview
    // deployment, which then reads production's document and spends none of the
    // month's allowance.
    writeCache: token
      ? async (body: string) => {
          await put(CACHE_PATHNAME, body, {
            access: 'public',
            token,
            contentType: 'application/json',
            addRandomSuffix: false,
            allowOverwrite: true,
            cacheControlMaxAge: BLOB_CACHE_SECONDS,
          });
        }
      : undefined,
  });
}
