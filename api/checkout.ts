/**
 * Vercel adapter for checkout and entitlement.
 *
 * Deliberately trivial. All the logic is in `src/server/checkout.ts`, written
 * against the Web `Request`/`Response` interfaces, so moving to Netlify or
 * Cloudflare Pages means writing another file this size rather than porting an
 * implementation.
 *
 * Vercel picks `api/*.ts` up as a Function even though the Astro build itself
 * is `output: 'static'` -- the site stays a static build with a couple of
 * endpoints beside it, which is exactly the shape the no-backend constraint
 * allows.
 */
// No `.ts` extension: Vercel's bundler resolves it, and an explicit extension
// is the kind of thing that builds locally and fails in CI. The test files do
// use the extension, because `node --experimental-strip-types` requires it.
import { handleCheckout } from '../src/server/checkout.js';

export const config = { runtime: 'edge' };

/**
 * Where Stripe should send the buyer back to.
 *
 * Three sources, in order, and the order is the whole point:
 *
 *   1. `SITE_ORIGIN` -- what production must set. Explicit beats clever.
 *   2. `VERCEL_URL` on a **preview** deployment -- Vercel sets this to the
 *      deployment's own hostname. Preview URLs change with every push, so there
 *      is no fixed value anyone could have typed into the dashboard, and
 *      requiring one just means a stale URL that silently strands a test buyer
 *      on a dead page after they have paid.
 *   3. Nothing -- the core handler then falls back to an allowlist check on the
 *      request's own origin.
 *
 * `VERCEL_URL` is used on preview only. In production it is the generated
 * `*.vercel.app` hostname rather than the custom domain, so trusting it there
 * would quietly move real checkout traffic off the real domain.
 *
 * This is Vercel-specific and therefore lives in the adapter. The handler stays
 * host-agnostic.
 */
function siteOrigin(): string | undefined {
  if (process.env.SITE_ORIGIN) return process.env.SITE_ORIGIN;
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return undefined;
}

export default function handler(request: Request): Promise<Response> {
  return handleCheckout(request, {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_ONE_TIME: process.env.STRIPE_PRICE_ONE_TIME,
    STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
    SITE_ORIGIN: siteOrigin(),
    STRIPE_MANAGED_PAYMENTS: process.env.STRIPE_MANAGED_PAYMENTS,
    LICENSE_SIGNING_SECRET: process.env.LICENSE_SIGNING_SECRET,
  });
}
