/**
 * The `api/*` edge functions, served by `astro dev`. Development only.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 *
 * The build is static and the endpoints are edge functions, so `astro dev`
 * serves the pages and nothing under `/api`. That is correct and it is also
 * the reason the contact form could not be tried in a browser without
 * `vercel dev`: the page fetches `/api/contact` for its anti-spam token, gets
 * a 404, and reports that it could not reach the server. The form looked
 * broken while being perfectly fine.
 *
 * This is a Vite plugin with `apply: 'serve'`, so it exists only while the dev
 * server is running. `npm run build` never loads it and `dist/` never contains
 * anything from it -- the same guarantee, by the same mechanism, as the `/dev`
 * workbench in `src/pages/dev/[...tool].astro`.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT IS NOT
 * ---------------------------------------------------------------------------
 *
 * Not a second implementation of anything. It reads `src/server/*.ts` through
 * Vite's own module loader and calls the exact function the Vercel adapter in
 * `api/*.ts` calls, with the same environment variables. A handler that
 * behaves one way here and another in production would be worse than no local
 * testing at all, so the only code below is the plumbing between Node's
 * `IncomingMessage` and the Web `Request`/`Response` the handlers are written
 * against.
 *
 * Two endpoints are deliberately absent: `/api/checkout` and
 * `/api/stripe-webhook`. Both talk to Stripe, a webhook is delivered by Stripe
 * rather than requested by a page, and neither can be exercised usefully by
 * opening a page locally. `stripe listen --forward-to` is the tool for that.
 *
 * ---------------------------------------------------------------------------
 * THIS SENDS REAL MAIL
 * ---------------------------------------------------------------------------
 *
 * The environment comes from `.env`, so a real `RESEND_API_KEY` means a
 * submitted form really is delivered to `CONTACT_TO_EMAIL` and a real address
 * really is added to the list. That is the point -- a local test that stubs
 * the send proves the form and not the delivery -- but it is worth knowing
 * before pressing the button twenty times. Comment the key out in `.env` to
 * exercise the unconfigured path instead: every endpoint but `/api/spot` then
 * answers 503, which is what the page's "not accepting messages" copy is for.
 */
import { loadEnv } from 'vite';

/**
 * Route -> the module and export the Vercel adapter uses.
 *
 * The path is matched exactly, without a trailing slash, because that is what
 * the pages fetch and what Vercel routes.
 */
const ROUTES = {
  '/api/contact': ['/src/server/contact.ts', 'handleContact'],
  '/api/subscribe': ['/src/server/subscribe.ts', 'handleSubscribe'],
  '/api/spot': ['/src/server/spot.ts', 'handleSpot'],
};

/** Node's request, as the Web `Request` the handlers take. */
async function toWebRequest(req, origin) {
  const url = new URL(req.url, origin);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.set(k, v);
    else if (Array.isArray(v)) for (const one of v) headers.append(k, one);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody
    ? await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      })
    : undefined;

  // `content-length` is dropped on purpose only where it would lie; here the
  // body is passed through whole, so the header stays -- `/api/contact`
  // checks it before reading the body and a missing one would skip that path
  // locally while it runs in production.
  return new Request(url, { method: req.method, headers, body });
}

/** The handler's `Response`, written back out through Node. */
async function writeWebResponse(res, out) {
  res.statusCode = out.status;
  for (const [k, v] of out.headers) res.setHeader(k, v);
  res.end(Buffer.from(await out.arrayBuffer()));
}

export function devApiRoutes() {
  return {
    name: 'dev-api-routes',
    // The whole guard. `serve` is `astro dev`; `build` never calls this.
    apply: 'serve',
    configureServer(server) {
      // Every variable in `.env`, prefix or no prefix -- these are server-side
      // names (RESEND_API_KEY, CONTACT_TO_EMAIL) which by design carry no
      // PUBLIC_ prefix, because a prefixed one would reach the browser.
      const env = loadEnv(server.config.mode, process.cwd(), '');

      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0].replace(/\/+$/, '');
        const route = ROUTES[path];
        if (!route) return next();

        const [modulePath, exportName] = route;
        try {
          const mod = await server.ssrLoadModule(modulePath);
          const request = await toWebRequest(req, 'http://localhost');
          await writeWebResponse(res, await mod[exportName](request, env));
        } catch (err) {
          // Loudly, and as a 500 rather than a fall-through to the 404 the
          // page would read as "the endpoint is not deployed". The two
          // failures want different fixes and look identical from the browser.
          server.config.logger.error(`[dev-api] ${path} threw: ${err?.stack ?? err}`);
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'dev_handler_threw' }));
        }
      });

      const mounted = Object.keys(ROUTES).join(', ');
      server.config.logger.info(`[dev-api] serving ${mounted} from src/server/ (dev only)`);
    },
  };
}
