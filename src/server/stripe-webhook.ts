/**
 * Stripe webhook: emails the licence key when someone subscribes.
 *
 * This is the *backup* delivery path, not the primary one. The key is already
 * on screen when checkout finishes (see `/checkout-complete`), so nobody is
 * blocked waiting for an email. What the email is for is the case that actually
 * loses customers: clearing browser data, or moving to a laptop, months later.
 *
 * Host-agnostic like the rest of `src/server`. The email provider is behind one
 * small function, so swapping Resend for Postmark or SES is that function.
 *
 * It stores nothing. The key is derived from the Stripe customer id, so the
 * email is a convenience rather than the only copy in existence.
 */
import { mintKey } from './license.js';
import { customerNonce } from './checkout.js';
import { SITE } from '../lib/site.js';

/** Tolerance on the signature timestamp, matching Stripe's own guidance. */
const TOLERANCE_SECONDS = 300;

export interface WebhookEnv {
  STRIPE_WEBHOOK_SECRET?: string;
  /**
   * Read-only use: fetching the customer's current licence-key nonce so the
   * emailed key matches the one the app will accept. Without it the email would
   * carry a key minted at the empty nonce, which is wrong for any customer
   * whose key has ever been revoked.
   */
  STRIPE_SECRET_KEY?: string;
  LICENSE_SIGNING_SECRET?: string;
  /** Resend API key. Absent means the email step is skipped, not failed. */
  RESEND_API_KEY?: string;
  /** e.g. "Example <keys@example.com>". Must be a verified domain. */
  LICENSE_FROM_EMAIL?: string;
}

/**
 * Verifies Stripe's `stripe-signature` header against the raw body.
 *
 * **The raw body is required, byte for byte.** Parsing and re-serialising the
 * JSON changes whitespace and key order and the signature stops matching, which
 * is the single most common way this is got wrong.
 *
 * Without this check the endpoint is an open door: anyone who knows the URL
 * could POST a fabricated `checkout.session.completed` and have us email a
 * working licence key to an address of their choosing.
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;
  // Replay protection. A captured payload stays validly signed forever, so age
  // is the only thing that stops it being resent.
  if (Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Stripe may send several v1 signatures during a secret rotation; any match
  // is a pass. Compared in constant time.
  return header
    .split(',')
    .filter((p) => p.trim().startsWith('v1='))
    .map((p) => p.trim().slice(3))
    .some((given) => {
      if (given.length !== expected.length) return false;
      let diff = 0;
      for (let i = 0; i < expected.length; i++) {
        diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
      }
      return diff === 0;
    });
}

/** HTML-escapes a value bound for the licence email. */
function esc(value: string): string {
  return value.replace(/[&<>"]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
  );
}

/**
 * The HTML half of the licence email.
 *
 * Deliberately plain: inline styles only, no stylesheet, no images, no layout
 * table wider than the text. Mail clients strip everything else, and this has
 * one job -- show a 45-character key as one unbroken string that can be
 * selected in a single drag.
 */
function keyEmailHtml(key: string): string {
  const safe = esc(key);
  return [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#222">',
    `<p>Thanks for subscribing to ${SITE.name} Pro.</p>`,
    '<p style="margin-bottom:4px">Your license key:</p>',
    // white-space:nowrap is the whole point; the smaller font is what keeps it
    // inside a phone's mail view without wrapping anyway.
    `<p style="margin:0 0 16px"><code style="display:inline-block;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;background:#f4f2ee;border:1px solid #e2ded7;border-radius:6px;padding:10px 12px">${safe}</code></p>`,
    // RENAME: this paragraph is the only site-specific copy in the file. Say
    // what the key unlocks and what happens on cancellation, in two sentences.
    '<p>Paste it into the app to unlock it. There is no account and no password &mdash; this key is the whole thing, so keep this email.</p>',
    '<p>It works on your own computers. If you cancel, it stops working; anything you have already made is unaffected.</p>',
    `<p><a href="${SITE.url}">${SITE.url}</a></p>`,
    '</div>',
  ].join('');
}

/**
 * Sends the key. The only provider-specific code in the project.
 *
 * Failures are logged rather than thrown -- see the note on the handler about
 * why this must not make Stripe retry. But they ARE logged: a wrong API key or
 * an unverified sending domain is rejected by Resend with a perfectly ordinary
 * 4xx, and without this the whole thing looks like it worked. Silence is the
 * worst possible outcome for a delivery channel, because the person who notices
 * is a customer who cannot find their key.
 */
async function sendKeyEmail(
  to: string,
  key: string,
  env: WebhookEnv,
): Promise<void> {
  if (!env.RESEND_API_KEY || !env.LICENSE_FROM_EMAIL) {
    console.warn('[licence] email not configured; key not sent. Customer can still read it on /checkout-complete.');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.LICENSE_FROM_EMAIL,
      to,
      subject: `Your ${SITE.name} license key`,
      // Both parts, and the HTML one exists for exactly one reason: the key
      // contains hyphens, and mail clients break lines at hyphens. A key split
      // across two lines still copies correctly but does not *look* like one
      // value, and the person reading it has no way to know that. `nowrap`
      // keeps it whole on screen; the plain-text part is the fallback for
      // clients that will not render HTML, where the break is unavoidable.
      html: keyEmailHtml(key),
      text: [
        `Thanks for subscribing to ${SITE.name} Pro.`,
        '',
        'Your license key:',
        '',
        `  ${key}`,
        '',
        'Paste it into the app to unlock it. There is no account and no password —',
        'this key is the whole thing, so keep this email.',
        '',
        'It works on your own computers. If you cancel, it stops working; anything',
        'you have already made is unaffected.',
        '',
        SITE.url,
      ].join('\n'),
    }),
  });

  if (!res.ok) {
    // The body carries Resend's actual reason -- almost always an unverified
    // `from` domain or a key without send permission.
    const detail = await res.text().catch(() => '');
    console.error(`[licence] Resend rejected the send: ${res.status} ${detail}`);
  }
}

/**
 * Handles one webhook delivery.
 *
 * Always answers 200 once the signature is good, even if the email fails.
 * Stripe retries non-2xx for days, and a retry cannot fix a bad address — while
 * the key is already on screen and re-issuable, so a lost email is a minor
 * inconvenience rather than something worth a retry storm.
 */
export async function handleStripeWebhook(
  request: Request,
  env: WebhookEnv,
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  const secret = env.STRIPE_WEBHOOK_SECRET;
  const signingSecret = env.LICENSE_SIGNING_SECRET;
  if (!secret || !signingSecret) {
    return new Response('not configured', { status: 503 });
  }

  const header = request.headers.get('stripe-signature');
  if (!header) return new Response('missing signature', { status: 400 });

  // Read as text and never re-serialise -- see verifyStripeSignature.
  const rawBody = await request.text();
  if (!(await verifyStripeSignature(rawBody, header, secret))) {
    return new Response('bad signature', { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('bad json', { status: 400 });
  }

  if (event?.type === 'checkout.session.completed') {
    const session = event?.data?.object;
    const customerId = typeof session?.customer === 'string' ? session.customer : null;
    const email = session?.customer_details?.email;
    // Only subscriptions get a key. A one-time purchase has no key to send.
    if (session?.mode === 'subscription' && customerId && typeof email === 'string') {
      try {
        // The nonce has to come from Stripe rather than be assumed empty: a
        // customer who had a key revoked and then re-subscribed must be emailed
        // the key that is current, not the one that was withdrawn.
        const nonce = env.STRIPE_SECRET_KEY
          ? await customerNonce(customerId, env.STRIPE_SECRET_KEY)
          : '';
        await sendKeyEmail(email, await mintKey(customerId, signingSecret, nonce), env);
      } catch {
        /* See the note above: a failed send must not trigger Stripe retries. */
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
