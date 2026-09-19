/**
 * Checkout and entitlement -- the only stateful-looking code in the project,
 * and it holds no state of its own.
 *
 * Written against the Web `Request`/`Response` interfaces with `fetch` and no
 * Stripe SDK, so it runs unchanged on a Vercel Function, a Netlify Function or
 * a Cloudflare Pages Function. The host adapter (`api/checkout.ts`) is a dozen
 * lines; this module is the whole implementation. That is what keeps the
 * README's "moving hosts is a DNS change and a redeploy" claim true.
 *
 * Four routes on one path:
 *
 *   POST  { kind }                 -> creates a Checkout Session, returns its
 *                                     id and hosted URL
 *   GET   ?session_id=             -> asks Stripe whether that session is paid
 *   GET   ?session_id=&issue=key   -> mints the licence key for a finished
 *                                     subscription checkout
 *   GET   + x-license-key header   -> says whether a pasted licence key is
 *                                     currently entitled. The key travels in a
 *                                     header, never the URL: see LICENSE_HEADER.
 *
 * Stripe's Checkout Session is the record, so there is no database to breach.
 */

import { customerFromKey, mintKey, normaliseNonce, NONCE_FIELD } from './license.js';
import { SITE } from '../lib/site.js';

/**
 * Stripe API version, pinned.
 *
 * Managed Payments does not exist before this one. Pin it rather than tracking
 * the account default: a Stripe version change is a breaking change that would
 * otherwise arrive on its own schedule rather than yours.
 */
const STRIPE_API_VERSION = '2026-04-22.dahlia';

const STRIPE_API = 'https://api.stripe.com/v1';

/**
 * Where a licence key is read from.
 *
 * A header, never the query string, and that is the entire reason this constant
 * exists. A licence key is a bearer credential that may be checked on every
 * page load; in a URL it would be written verbatim into the platform's request
 * logs, any CDN log in front of them, and the `Referer` of anything the page
 * later loaded. Request headers are not logged by any of those by default.
 */
const LICENSE_HEADER = 'x-license-key';

/** Longest licence key we will even look at, before any work is done. */
const MAX_KEY_LENGTH = 256;

export interface CheckoutEnv {
  /** Stripe secret key. Test keys (`sk_test_…`) work end to end. */
  STRIPE_SECRET_KEY?: string;
  /** The `price_…` id of the one-time price. Never taken from the client. */
  STRIPE_PRICE_ONE_TIME?: string;
  /**
   * The `price_…` id of the recurring monthly price.
   *
   * Its absence is what makes the subscribe button report `not_configured`
   * rather than charging something wrong.
   */
  STRIPE_PRICE_PRO_MONTHLY?: string;
  /** Origin used to build the return URL, e.g. `https://example.com`. */
  SITE_ORIGIN?: string;
  /**
   * Merchant-of-record switch. **Defaults to on** -- only the exact string
   * 'false' turns it off.
   *
   * The default is deliberate and the direction matters: forgetting this
   * variable in production must leave Stripe carrying the VAT/sales-tax
   * liability, because the failure mode of the other default is silently
   * becoming the merchant of record in 80 countries without noticing.
   *
   * It exists at all because Managed Payments is approval-gated and may not be
   * available in a sandbox, and being unable to take a test payment is a bad
   * reason to be blocked. Set it to 'false' locally if the sandbox rejects it,
   * and leave it unset everywhere else.
   */
  STRIPE_MANAGED_PAYMENTS?: string;
  /**
   * HMAC secret for licence keys. Any long random string.
   *
   * Rotating it invalidates every key ever issued -- keys are derived, not
   * stored, so there is nothing to re-sign. Treat it as permanent.
   */
  LICENSE_SIGNING_SECRET?: string;
}

/**
 * Origins we are willing to send a paying customer back to.
 *
 * `SITE_ORIGIN` is the configured answer and always wins. Everything else is a
 * fallback for the deployments where no fixed value can be typed in advance --
 * a Vercel preview, or a local `vercel dev` -- and it is an allowlist rather
 * than "whatever the request said" because on most hosts the request's own host
 * is attacker-supplied. That value ends up in `success_url`, so an unchecked
 * one lets someone create a session whose completion redirects the buyer to a
 * domain they chose, carrying the session id with them.
 */
const PREVIEW_ORIGIN_RE = /^https:\/\/[a-z0-9][a-z0-9-]{0,62}\.vercel\.app$/;
const DEV_ORIGIN_RE = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/;

function resolveOrigin(env: CheckoutEnv, requestOrigin: string): string | null {
  if (env.SITE_ORIGIN) return env.SITE_ORIGIN;
  if (requestOrigin === SITE.url) return requestOrigin;
  if (PREVIEW_ORIGIN_RE.test(requestOrigin)) return requestOrigin;
  if (DEV_ORIGIN_RE.test(requestOrigin)) return requestOrigin;
  return null;
}

/**
 * Best-effort throttle, per edge isolate.
 *
 * Every request on this endpoint costs one or two calls to the Stripe API, and
 * Stripe rate-limits per *account* -- so an unauthenticated flood here does not
 * merely inconvenience the sender, it makes checkout fail for real buyers. That
 * asymmetry is what makes a limit worth having even though it cannot be a
 * strict one.
 *
 * It cannot be strict because edge functions have no shared state: each isolate
 * counts only what it saw, and a spread-out attacker gets a multiple of this
 * budget. It is deliberately not presented as a security control -- it is a
 * cheap ceiling on the accidental and the lazy. If a determined flood ever
 * arrives, the answer is a WAF rule in front of the function, not a bigger
 * number here.
 */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;
/** Bounded so a spray of forged client IPs cannot grow this without limit. */
const RATE_MAX_TRACKED = 5_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function overRateLimit(request: Request): boolean {
  // The first hop is the client on Vercel and every other host that sets this;
  // later hops are appended by proxies and are not the caller.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    '';
  // No IP at all (local `node` runs, some test harnesses) is not something to
  // guess about, and guessing would put every such caller in one shared bucket.
  if (!ip) return false;

  const now = Date.now();
  if (rateBuckets.size > RATE_MAX_TRACKED) {
    for (const [k, v] of rateBuckets) if (v.resetAt <= now) rateBuckets.delete(k);
    if (rateBuckets.size > RATE_MAX_TRACKED) rateBuckets.clear();
  }

  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

/**
 * Session ids Stripe has already told us it does not know.
 *
 * A 404 is permanent -- an id Stripe never issued will never start existing --
 * so re-asking costs a Stripe call to learn something we were told already.
 * Only negatives are remembered, and only this one: every *positive* answer
 * stays uncached, because entitlement has to be whatever Stripe says right now.
 */
const UNKNOWN_SESSION_TTL_MS = 10 * 60_000;
const UNKNOWN_SESSION_MAX = 2_000;
const unknownSessions = new Map<string, number>();

function isKnownUnknown(sessionId: string): boolean {
  const seen = unknownSessions.get(sessionId);
  if (seen === undefined) return false;
  if (Date.now() - seen > UNKNOWN_SESSION_TTL_MS) {
    unknownSessions.delete(sessionId);
    return false;
  }
  return true;
}

function rememberUnknown(sessionId: string): void {
  if (unknownSessions.size >= UNKNOWN_SESSION_MAX) unknownSessions.clear();
  unknownSessions.set(sessionId, Date.now());
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // An entitlement check must never be answered from a cache: the whole
      // point is to ask Stripe what is true right now.
      'cache-control': 'no-store',
    },
  });
}

/** Form-encodes Stripe's nested-bracket parameter style. */
function form(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

async function stripe(
  path: string,
  key: string,
  init?: { method: 'POST'; body: string },
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      authorization: `Bearer ${key}`,
      'stripe-version': STRIPE_API_VERSION,
      ...(init ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: init?.body,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

/**
 * Creates the Checkout Session.
 *
 * The price comes from the environment, never from the request body -- a client
 * that can name its own price can buy the product for a penny.
 *
 * `managed_payments[enabled]=true` is what makes Stripe the merchant of record,
 * so it carries the VAT/sales-tax liability on a digital sale. It is one
 * parameter precisely so it can be turned off again without changing anything
 * else here.
 */
async function createSession(
  kind: 'once' | 'pro',
  env: CheckoutEnv,
  origin: string,
): Promise<Response> {
  const key = env.STRIPE_SECRET_KEY;
  const price = kind === 'pro' ? env.STRIPE_PRICE_PRO_MONTHLY : env.STRIPE_PRICE_ONE_TIME;
  if (!key || !price) {
    // A missing key is a deployment mistake, not a user error, and it must not
    // look like a declined card.
    return json({ error: 'not_configured' }, 503);
  }

  const managed = env.STRIPE_MANAGED_PAYMENTS !== 'false';

  const { ok, status, data } = await stripe('/checkout/sessions', key, {
    method: 'POST',
    body: form({
      mode: kind === 'pro' ? 'subscription' : 'payment',
      'line_items[0][price]': price,
      'line_items[0][quantity]': '1',
      ...(managed ? { 'managed_payments[enabled]': 'true' } : {}),
      // `hosted_page`, not `hosted`: the older value was retired in the
      // 2026-04-22 API version pinned above. The two arrived together, so
      // anything written against an older Stripe example has the wrong one.
      ui_mode: 'hosted_page',
      // {CHECKOUT_SESSION_ID} is substituted by Stripe. It lets the return page
      // ask our own endpoint what was bought and, for a subscription, show the
      // licence key immediately -- so key delivery does not depend on an email
      // arriving. The id is opaque and known only to the buyer, which is the
      // same assumption Stripe's own success-page pattern makes.
      success_url: `${origin}/checkout-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout-complete?cancelled=1`,
    }),
  });

  if (!ok) {
    const message: string = data?.error?.message ?? String(status);
    // Managed Payments is approval-gated, so "your account cannot do this yet"
    // is a likely and very confusing first failure. Name it, rather than
    // letting it read as a generic Stripe outage.
    if (/managed[_ ]?payments/i.test(message)) {
      return json(
        {
          error: 'managed_payments_unavailable',
          detail: message,
          hint: 'This account is not approved for Managed Payments yet. Set STRIPE_MANAGED_PAYMENTS=false to test without merchant-of-record, and unset it once approved.',
        },
        502,
      );
    }
    return json({ error: 'stripe_error', detail: message }, 502);
  }

  // Both flags are echoed so a deployment can be checked from the outside with
  // a single curl, rather than inferred from which key someone believes is set.
  //
  // `managedPayments` is the difference between Stripe owing the VAT and you
  // owing it. `livemode` comes from Stripe itself, not from our own guess at
  // the key prefix, and it is the difference between taking money and only
  // appearing to: a test-mode session on the real domain looks completely
  // normal from the outside, and the failure is silent in the direction that
  // matters -- customers who think they have paid and have not.
  //
  // `amountTotal` is echoed because the displayed price (lib/pricing.ts) and
  // the charged price (the Stripe price id in the environment) are two separate
  // systems with nothing keeping them in step. A mismatch is invisible from the
  // site: the page says one number and the checkout page says another, and the
  // first person to notice is a customer. This makes it one curl.
  return json({
    sessionId: data.id,
    url: data.url,
    managedPayments: managed,
    livemode: data.livemode === true,
    amountTotal: typeof data.amount_total === 'number' ? data.amount_total : null,
    currency: typeof data.currency === 'string' ? data.currency : null,
  });
}

/** Reports whether a session was actually paid. */
async function readSession(sessionId: string, env: CheckoutEnv): Promise<Response> {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) return json({ error: 'not_configured' }, 503);

  const { ok, status, data } = await stripe(
    `/checkout/sessions/${encodeURIComponent(sessionId)}`,
    key,
  );
  if (!ok) {
    // A 404 here is an unknown or expired session, which is a legitimate "no",
    // not an outage. Remembered so the same made-up id cannot be replayed into
    // an unbounded number of Stripe calls.
    if (status === 404) {
      rememberUnknown(sessionId);
      return json({ paid: false, reason: 'unknown_session' });
    }
    return json({ error: 'stripe_error', detail: data?.error?.message ?? status }, 502);
  }

  // For a subscription, `payment_status` only says the first invoice was paid,
  // and would keep saying so for years after a cancellation. What matters is
  // whether the subscription is still running.
  if (data?.mode === 'subscription') {
    const sub = data?.subscription;
    if (typeof sub !== 'string') return json({ paid: false, reason: 'unpaid' });
    const live = await stripe(`/subscriptions/${encodeURIComponent(sub)}`, key);
    // 'trialing' counts: a trial is an active subscription that has not been
    // billed yet, not an unpaid one.
    const active =
      live.ok && (live.data?.status === 'active' || live.data?.status === 'trialing');
    return json({ paid: active, reason: active ? 'subscription' : 'inactive_subscription' });
  }

  const paid = data?.payment_status === 'paid';
  return json({ paid, reason: paid ? 'ok' : 'unpaid' });
}

/**
 * The customer's current licence-key nonce, straight from Stripe.
 *
 * This is the revocation channel: the field is edited in the Stripe dashboard
 * and every key carrying an older value stops verifying. See the long note in
 * `license.ts`.
 *
 * A customer Stripe will not tell us about is the empty nonce, which is the
 * same answer as "no nonce set". That direction is deliberate: the nonce alone
 * never grants anything -- entitlement is the separate live-subscription check
 * -- so failing open here cannot unlock anyone, while failing closed would lock
 * a paying subscriber out over a transient Stripe error.
 */
export async function customerNonce(customerId: string, key: string): Promise<string> {
  const { ok, data } = await stripe(`/customers/${encodeURIComponent(customerId)}`, key);
  return ok ? normaliseNonce(data?.metadata?.[NONCE_FIELD]) : '';
}

/** True when the customer has a subscription Stripe still considers live. */
async function hasLiveSubscription(customerId: string, key: string): Promise<boolean> {
  // `status=all` then filter, rather than status=active, so a trial counts:
  // trialing is an active subscription that has not been billed yet.
  const { ok, data } = await stripe(
    `/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`,
    key,
  );
  if (!ok || !Array.isArray(data?.data)) return false;
  return data.data.some((s: any) => s?.status === 'active' || s?.status === 'trialing');
}

/**
 * Issues the licence key for a completed subscription checkout.
 *
 * Called by the return page with the session id Stripe put in the URL, so the
 * key is on screen the moment payment finishes and delivery never depends on an
 * email arriving.
 *
 * It refuses to issue for a subscription that is not live, so a cancelled
 * customer cannot re-open an old success URL and mint themselves a fresh key.
 */
async function issueKey(sessionId: string, env: CheckoutEnv): Promise<Response> {
  const key = env.STRIPE_SECRET_KEY;
  const secret = env.LICENSE_SIGNING_SECRET;
  if (!key || !secret) return json({ error: 'not_configured' }, 503);

  const { ok, data } = await stripe(
    `/checkout/sessions/${encodeURIComponent(sessionId)}`,
    key,
  );
  if (!ok) return json({ issued: false, reason: 'unknown_session' });
  if (data?.mode !== 'subscription') return json({ issued: false, reason: 'not_a_subscription' });

  const customerId = typeof data?.customer === 'string' ? data.customer : null;
  if (!customerId) return json({ issued: false, reason: 'unpaid' });

  // In parallel: the two questions are independent, and doing them in sequence
  // would double the wait on the one page a buyer stares at after paying.
  const [live, nonce] = await Promise.all([
    hasLiveSubscription(customerId, key),
    customerNonce(customerId, key),
  ]);
  if (!live) return json({ issued: false, reason: 'inactive_subscription' });

  // Minted at the *current* nonce, which is what makes this the re-issue path
  // after a revocation as well as the first-issue path after a purchase.
  return json({ issued: true, key: await mintKey(customerId, secret, nonce) });
}

/**
 * Validates a pasted licence key.
 *
 * Two steps, and the second is the one that matters: the signature only proves
 * we minted the key, and a cancelled subscriber's key stays a valid signature
 * forever. Entitlement is whatever Stripe says right now.
 */
async function checkKey(licenseKey: string, env: CheckoutEnv): Promise<Response> {
  const key = env.STRIPE_SECRET_KEY;
  const secret = env.LICENSE_SIGNING_SECRET;
  if (!key || !secret) return json({ error: 'not_configured' }, 503);

  const claims = await customerFromKey(licenseKey, secret);
  // A bad signature never reaches Stripe -- that is the point of signing.
  if (!claims) return json({ valid: false, reason: 'bad_key' });

  const [live, nonce] = await Promise.all([
    hasLiveSubscription(claims.customerId, key),
    customerNonce(claims.customerId, key),
  ]);
  // Revocation is checked before entitlement, because it is the more specific
  // answer: a revoked key belonging to a live subscriber must say "revoked",
  // not "your subscription is inactive", or the honest half of that pair --
  // the customer whose key was shared -- is told something false about their
  // own billing and contacts support about the wrong thing.
  if (claims.nonce !== nonce) return json({ valid: false, reason: 'revoked' });
  return json({ valid: live, reason: live ? 'ok' : 'inactive_subscription' });
}

/** The whole endpoint. Host adapters call this and return what it returns. */
export async function handleCheckout(
  request: Request,
  env: CheckoutEnv,
): Promise<Response> {
  const url = new URL(request.url);

  if (overRateLimit(request)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'retry-after': String(Math.ceil(RATE_WINDOW_MS / 1000)),
      },
    });
  }

  if (request.method === 'POST') {
    // Cross-site abuse, refused cheaply. Browsers attach `Origin` to every
    // cross-origin POST, so a mismatch is another site driving this endpoint on
    // a visitor's behalf and there is no legitimate case for it. An *absent*
    // header is allowed through: that is curl, and the README's deployment
    // check is a curl.
    const sender = request.headers.get('origin');
    if (sender && sender !== (env.SITE_ORIGIN || url.origin)) {
      return json({ error: 'bad_origin' }, 403);
    }

    // Where Stripe will send the buyer back to. Refusing to guess is the point:
    // the alternative is trusting a header the caller controls.
    const origin = resolveOrigin(env, url.origin);
    if (!origin) return json({ error: 'not_configured', detail: 'origin' }, 503);

    const body = await request.json().catch(() => null);
    // Anything that is not exactly 'pro' buys the one-time product. The client
    // picks which product, but not what it costs: both prices come from the
    // environment.
    const kind = body?.kind === 'pro' ? 'pro' : 'once';
    return createSession(kind, env, origin);
  }

  if (request.method === 'GET') {
    // Validate a pasted licence key. Read from a header rather than the query
    // string so the key never lands in a request log -- see LICENSE_HEADER.
    const licenseKey = request.headers.get(LICENSE_HEADER);
    if (licenseKey !== null) {
      // Bounded before any work, so a megabyte of junk cannot be pasted in.
      if (licenseKey.length > MAX_KEY_LENGTH) return json({ valid: false, reason: 'bad_key' });
      return checkKey(licenseKey, env);
    }

    const sessionId = url.searchParams.get('session_id') ?? '';
    // Stripe session ids are `cs_` plus an opaque token. Bound the length so a
    // pathological value cannot be pasted into a URL we then fetch.
    if (!/^cs_[A-Za-z0-9_]{1,255}$/.test(sessionId)) {
      return json({ error: 'bad_session' }, 400);
    }
    // Already asked, already told no. Answered from memory rather than from
    // another Stripe call -- see the note on `unknownSessions`.
    if (isKnownUnknown(sessionId)) {
      return json({ paid: false, issued: false, reason: 'unknown_session' });
    }
    if (url.searchParams.get('issue') === 'key') {
      return issueKey(sessionId, env);
    }
    return readSession(sessionId, env);
  }

  return json({ error: 'method_not_allowed' }, 405);
}
