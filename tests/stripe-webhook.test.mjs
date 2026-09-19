/**
 * Stripe webhook signature verification.
 *
 * This endpoint mints and emails a working licence key, so a forged POST is a
 * free subscription for anyone who knows the URL. The signature check is the
 * only thing standing there, and these are its failure modes.
 *
 * Run: node --experimental-strip-types --no-warnings tests/stripe-webhook.test.mjs
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyStripeSignature, handleStripeWebhook } from '../src/server/stripe-webhook.ts';
import { KEY_PREFIX } from '../src/server/license.ts';
import { SITE } from '../src/lib/site.ts';

const ORIGIN = SITE.url;

const SECRET = 'whsec_test';
const BODY = JSON.stringify({ type: 'ping' });
const NOW = 1_800_000_000;

const sig = (body, secret = SECRET, t = NOW) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('a genuine signature verifies', async () => {
  assert.equal(await verifyStripeSignature(BODY, sig(BODY), SECRET, NOW), true);
});

test('a signature from the wrong secret does not', async () => {
  assert.equal(await verifyStripeSignature(BODY, sig(BODY, 'whsec_other'), SECRET, NOW), false);
});

test('a body altered after signing does not', async () => {
  // The attack this exists to stop: keep a real signature, swap the payload.
  const header = sig(BODY);
  const tampered = JSON.stringify({ type: 'checkout.session.completed' });
  assert.equal(await verifyStripeSignature(tampered, header, SECRET, NOW), false);
});

test('re-serialising the body breaks it — the raw bytes matter', async () => {
  // Documents why the handler must never JSON.parse then re-stringify.
  const header = sig(BODY);
  const reserialised = JSON.stringify(JSON.parse(BODY), null, 2);
  assert.equal(await verifyStripeSignature(reserialised, header, SECRET, NOW), false);
});

test('an old delivery is refused however valid its signature', async () => {
  // Replay protection: a captured payload stays correctly signed forever.
  assert.equal(await verifyStripeSignature(BODY, sig(BODY, SECRET, NOW - 600), SECRET, NOW), false);
  assert.equal(await verifyStripeSignature(BODY, sig(BODY, SECRET, NOW - 60), SECRET, NOW), true);
});

test('one valid signature among several passes — secret rotation', async () => {
  const good = createHmac('sha256', SECRET).update(`${NOW}.${BODY}`).digest('hex');
  const header = `t=${NOW},v1=${'0'.repeat(64)},v1=${good}`;
  assert.equal(await verifyStripeSignature(BODY, header, SECRET, NOW), true);
});

test('malformed headers are refused, not thrown on', async () => {
  for (const h of ['', 'garbage', 't=,v1=', 't=abc,v1=def', 'v1=nope']) {
    assert.equal(await verifyStripeSignature(BODY, h, SECRET, NOW), false, `header ${JSON.stringify(h)}`);
  }
});

test('an unsigned POST is rejected and sends no email', async () => {
  let sent = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { sent++; return new Response('{}'); };
  const res = await handleStripeWebhook(
    new Request(`${ORIGIN}/api/stripe-webhook`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: { mode: 'subscription', customer: 'cus_X', customer_details: { email: 'a@b.c' } } },
      }),
      headers: { 'stripe-signature': 't=1,v1=deadbeef' },
    }),
    { STRIPE_WEBHOOK_SECRET: SECRET, LICENSE_SIGNING_SECRET: 's', RESEND_API_KEY: 'k', LICENSE_FROM_EMAIL: 'x@y.z' },
  );
  globalThis.fetch = realFetch;
  assert.equal(res.status, 400);
  assert.equal(sent, 0, 'a forged webhook must never send a licence key');
});

test('a signed subscription event emails the key', async () => {
  const body = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { mode: 'subscription', customer: 'cus_ABC123', customer_details: { email: 'seller@example.com' } } },
  });
  let payload = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => { payload = JSON.parse(init.body); return new Response('{}'); };
  const res = await handleStripeWebhook(
    new Request(`${ORIGIN}/api/stripe-webhook`, {
      method: 'POST',
      body,
      headers: { 'stripe-signature': sig(body, SECRET, Math.floor(Date.now() / 1000)) },
    }),
    { STRIPE_WEBHOOK_SECRET: SECRET, LICENSE_SIGNING_SECRET: 's', RESEND_API_KEY: 'k', LICENSE_FROM_EMAIL: 'x@y.z' },
  );
  globalThis.fetch = realFetch;
  assert.equal(res.status, 200);
  assert.equal(payload.to, 'seller@example.com');
  assert.ok(payload.text.includes(`${KEY_PREFIX}-`));

  // The HTML part must carry the key as one unbreakable run. Mail clients wrap
  // at hyphens, and a key split across two lines reads as two values even
  // though it copies correctly -- which is a support email, not a bug report.
  const key = payload.text.match(new RegExp(`${KEY_PREFIX}-[A-Za-z0-9_-]+-[A-Za-z0-9_-]{16}`))[0];
  assert.ok(payload.html.includes(key), 'the HTML part carries the same key');
  const around = payload.html.slice(0, payload.html.indexOf(key));
  const tag = around.slice(around.lastIndexOf('<code'));
  assert.match(tag, /white-space:nowrap/, 'the key sits in a nowrap element');
});

test('a one-time purchase gets no key email', async () => {
  const body = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { mode: 'payment', customer: 'cus_ABC123', customer_details: { email: 'seller@example.com' } } },
  });
  let sent = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { sent++; return new Response('{}'); };
  const res = await handleStripeWebhook(
    new Request(`${ORIGIN}/api/stripe-webhook`, {
      method: 'POST',
      body,
      headers: { 'stripe-signature': sig(body, SECRET, Math.floor(Date.now() / 1000)) },
    }),
    { STRIPE_WEBHOOK_SECRET: SECRET, LICENSE_SIGNING_SECRET: 's', RESEND_API_KEY: 'k', LICENSE_FROM_EMAIL: 'x@y.z' },
  );
  globalThis.fetch = realFetch;
  assert.equal(res.status, 200);
  assert.equal(sent, 0, 'a one-time purchase has no licence key to send');
});

test('a rejected send is logged, and still answers 200', async () => {
  // Stripe retries non-2xx for days, and a retry cannot fix a bad address or an
  // unverified domain. But it must not vanish either.
  const body = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { mode: 'subscription', customer: 'cus_ABC123', customer_details: { email: 'seller@example.com' } } },
  });
  const realFetch = globalThis.fetch;
  const realError = console.error;
  let logged = '';
  console.error = (m) => { logged += String(m); };
  globalThis.fetch = async () => new Response('{"message":"domain not verified"}', { status: 403 });
  const res = await handleStripeWebhook(
    new Request(`${ORIGIN}/api/stripe-webhook`, {
      method: 'POST',
      body,
      headers: { 'stripe-signature': sig(body, SECRET, Math.floor(Date.now() / 1000)) },
    }),
    { STRIPE_WEBHOOK_SECRET: SECRET, LICENSE_SIGNING_SECRET: 's', RESEND_API_KEY: 'k', LICENSE_FROM_EMAIL: 'x@y.z' },
  );
  globalThis.fetch = realFetch;
  console.error = realError;
  assert.equal(res.status, 200, 'a failed send must not trigger Stripe retries');
  assert.match(logged, /domain not verified/, 'a failed send must be visible in the logs');
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}\n     ${err.message}`);
  }
}
console.log(failed ? `\n${failed} webhook check(s) failed.` : '\nAll webhook checks passed.');
process.exit(failed ? 1 : 0);
