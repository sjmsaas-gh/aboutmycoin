/**
 * Vercel adapter for the spot price endpoint.
 *
 * All the logic is in `src/server/spot.ts`, written against the Web
 * `Request`/`Response` interfaces. What is here is the two genuinely
 * host-specific things that handler needs: somewhere to write the refreshed
 * snapshot, and — on this runtime — a translation between Node's
 * request/response objects and the Web ones. See README, "Hosting".
 *
 * This is the only endpoint on the site whose response is meant to be cached.
 * The `Cache-Control` it sends is set in the handler; the matching rule in
 * vercel.json, netlify.toml and public/_headers has to agree with it, and all
 * three must be edited together.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS ONE IS ON THE NODE RUNTIME, AND WHAT THAT COST
 * ---------------------------------------------------------------------------
 *
 * Every other endpoint here is `runtime: 'edge'` and exports a Web handler,
 * which is the shape the whole `src/server/` layer is written in. This one
 * cannot be: `@vercel/blob` imports `undici` at module scope and will not
 * bundle for the edge. Node is the default runtime for a file in `api/`, so
 * there is no `runtime` in the config below — naming it explicitly is one more
 * string to get wrong.
 *
 * Two things follow from that, and both of them shipped broken before they
 * were understood. They are written down because neither is visible locally:
 * `astro build`, `astro check` and the whole test suite pass either way.
 *
 *   1. THE NODE RUNTIME DOES NOT BUNDLE. It ships the compiled files and
 *      resolves them with real Node ESM rules, so every relative import in
 *      everything reachable from this file must name its extension — including
 *      inside `src/lib/`, which otherwise imports extensionlessly because Vite
 *      prefers it. The edge runtime hid this: esbuild bundles an edge function
 *      and resolves the specifier on the way through. Missing one is
 *      ERR_MODULE_NOT_FOUND at invocation, in production only.
 *      `tests/spot.test.mjs` walks the import graph from `api/` and fails on
 *      an extensionless specifier.
 *   2. THE NODE RUNTIME HANDS YOU `(req, res)`, not a `Request`. A default
 *      export that takes a `Request` and returns a `Response` is the edge
 *      shape; on Node it is handed an `IncomingMessage`, and the `Response` it
 *      returns is dropped on the floor because nothing ever writes to `res`.
 *      The request then HANGS until the platform times it out — no error, no
 *      log line, nothing to search for. Hence the translation below.
 *
 * The runtime is not a free choice here, but the cost is small: the response is
 * cached for an hour at the edge, so this function runs about once an hour per
 * region and a cold start on that path is invisible next to a figure the page
 * is already displaying.
 *
 * Hand-rolling the Blob write with `fetch` to stay on the edge was considered
 * and rejected. The R2 client in `scripts/r2/` is hand-rolled against AWS
 * SigV4, which is a published, stable specification; Blob's wire format is an
 * internal contract with a version header on it, and reimplementing that for a
 * once-a-day write is a silent breakage waiting for a version bump.
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
import type { IncomingMessage, ServerResponse } from 'node:http';

import { put } from '@vercel/blob';

// No `.ts` extension: Vercel's bundler resolves it, and an explicit extension
// is the kind of thing that builds locally and fails in CI.
import { handleSpot } from '../src/server/spot.js';

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

/**
 * How long to let the write run before giving up, in milliseconds.
 *
 * The SDK retries internally, which is the right default for an upload and the
 * wrong one inside a request a reader is waiting on: unbounded retries against
 * a misconfigured store are indistinguishable from a hang. Everything this
 * endpoint does has a bound on it, and the sum of those bounds has to stay
 * under the platform's own invocation limit or the reader gets a timeout
 * instead of an answer.
 */
const BLOB_WRITE_TIMEOUT_MS = 4_000;

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // Node's request, as a Web one. Only the method, the URL and the headers
  // matter here: this endpoint answers GET and HEAD and refuses everything
  // else, so there is no body to carry across.
  const host = request.headers.host ?? 'localhost';
  const webRequest = new Request(`https://${host}${request.url ?? '/api/spot'}`, {
    method: request.method ?? 'GET',
  });

  const result = await handleSpot(webRequest, {
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
            abortSignal: AbortSignal.timeout(BLOB_WRITE_TIMEOUT_MS),
          });
        }
      : undefined,
  });

  // And the Web response back onto Node's. Written out rather than returned:
  // returning it is the edge shape, and on this runtime it would be discarded
  // and the request would hang.
  response.statusCode = result.status;
  result.headers.forEach((value, key) => response.setHeader(key, value));
  response.end(request.method === 'HEAD' ? undefined : await result.text());
}
