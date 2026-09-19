/**
 * The checkout and entitlement endpoint, with Stripe stubbed out.
 *
 * What is worth testing here is not "does Stripe work" but the decisions that,
 * if broken, either give the product away or take money for nothing:
 *
 *   1. The price comes from the environment, never from the request.
 *   2. Managed Payments is actually switched on -- that is the whole
 *      merchant-of-record decision, and it is one easily-dropped parameter.
 *   3. A cancelled subscriber's key stops working, and a revoked one says so.
 *   4. The return URL cannot be chosen by the caller.
 *   5. Garbage input is refused before it costs a Stripe call.
 *
 * Run: node --experimental-strip-types --no-warnings tests/checkout.test.mjs
 */
import assert from 'node:assert/strict';
import { handleCheckout } from '../src/server/checkout.ts';
import { mintKey, KEY_PREFIX, NONCE_FIELD } from '../src/server/license.ts';
import { SITE } from '../src/lib/site.ts';

const ORIGIN = SITE.url;
const ENV = {
  STRIPE_SECRET_KEY: 'sk_test_stub',
  STRIPE_PRICE_ONE_TIME: 'price_stub',
  SITE_ORIGIN: ORIGIN,
};

let calls = [];
const realFetch = globalThis.fetch;

/** Stands in for Stripe. `reply` decides what the fake API returns. */
function stubStripe(reply) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? Object.fromEntries(new URLSearchParams(init.body)) : null;
    calls.push({ url: String(url), method: init.method ?? 'GET', body, headers: init.headers });
    const { status = 200, data } = reply({ url: String(url), body });
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
}

const post = (body, url = `${ORIGIN}/api/checkout`) =>
  new Request(url, { method: 'POST', body: JSON.stringify(body) });

const session = () => ({ data: { id: 'cs_test_1', url: 'https://checkout.stripe.com/x' } });

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('creating a session sends our price, not the client’s', async () => {
  stubStripe(session);
  const res = await handleCheckout(post({ price: 'price_attacker', amount: 1 }), ENV);
  assert.equal(res.status, 200);
  const sent = calls[0].body;
  assert.equal(sent['line_items[0][price]'], 'price_stub');
  assert.equal(sent['line_items[0][quantity]'], '1');
  // Nothing the client sent may appear in what we ask Stripe to charge.
  assert.ok(!JSON.stringify(sent).includes('price_attacker'));
});

test('Managed Payments is enabled — Stripe is the merchant of record', async () => {
  stubStripe(session);
  await handleCheckout(post({}), ENV);
  assert.equal(calls[0].body['managed_payments[enabled]'], 'true');
  assert.equal(calls[0].headers['stripe-version'], '2026-04-22.dahlia');
  // `hosted`, the old spelling, was retired in this same API version and is
  // rejected outright. Pinned here because the two must move together: bumping
  // the version without checking this parameter breaks checkout entirely.
  assert.equal(calls[0].body.ui_mode, 'hosted_page');
});

test('Managed Payments defaults ON when the variable is unset or junk', async () => {
  // The direction of this default is the point: forgetting the variable must
  // leave Stripe carrying the tax liability, never us.
  for (const value of [undefined, '', 'true', 'yes', 'FALSE', '0']) {
    stubStripe(session);
    await handleCheckout(post({}), { ...ENV, STRIPE_MANAGED_PAYMENTS: value });
    assert.equal(
      calls[0].body['managed_payments[enabled]'],
      'true',
      `STRIPE_MANAGED_PAYMENTS=${JSON.stringify(value)} must not disable merchant of record`,
    );
  }
});

test('only the exact string "false" turns Managed Payments off', async () => {
  stubStripe(session);
  const res = await handleCheckout(post({}), { ...ENV, STRIPE_MANAGED_PAYMENTS: 'false' });
  assert.ok(!('managed_payments[enabled]' in calls[0].body));
  assert.equal((await res.json()).managedPayments, false);
});

test('an unapproved account gets a named error, not a generic one', async () => {
  stubStripe(() => ({
    status: 400,
    data: { error: { message: 'managed_payments is not enabled for this account.' } },
  }));
  const res = await handleCheckout(post({}), ENV);
  const data = await res.json();
  assert.equal(data.error, 'managed_payments_unavailable');
  assert.match(data.hint, /STRIPE_MANAGED_PAYMENTS=false/);
});

test('livemode is reported from Stripe, not guessed from the key', async () => {
  // Checked from the outside before going live. A test-mode session on the real
  // domain is indistinguishable from a live one to the naked eye, and the
  // failure is silent in the worst direction: customers who believe they paid.
  for (const livemode of [true, false]) {
    stubStripe(() => ({ data: { id: 'cs_1', url: 'https://x', livemode } }));
    const res = await handleCheckout(post({}), ENV);
    assert.equal((await res.json()).livemode, livemode);
  }
  // Absent means false, never "probably live".
  stubStripe(session);
  assert.equal((await (await handleCheckout(post({}), ENV)).json()).livemode, false);
});

test('the charged amount is echoed so it can be checked against the displayed price', async () => {
  stubStripe(() => ({
    data: { id: 'cs_1', url: 'https://x', amount_total: 900, currency: 'usd' },
  }));
  const data = await (await handleCheckout(post({}), ENV)).json();
  assert.equal(data.amountTotal, 900);
  assert.equal(data.currency, 'usd');
});

test('a missing amount is null, never a guess at the displayed price', async () => {
  stubStripe(session);
  assert.equal((await (await handleCheckout(post({}), ENV)).json()).amountTotal, null);
});

test('kind=pro buys the subscription price, on a subscription session', async () => {
  stubStripe(session);
  await handleCheckout(post({ kind: 'pro' }), { ...ENV, STRIPE_PRICE_PRO_MONTHLY: 'price_pro' });
  assert.equal(calls[0].body.mode, 'subscription');
  assert.equal(calls[0].body['line_items[0][price]'], 'price_pro');
});

test('an unrecognised kind falls back to the one-time price, never the wrong one', async () => {
  stubStripe(session);
  await handleCheckout(post({ kind: 'PRO; DROP' }), { ...ENV, STRIPE_PRICE_PRO_MONTHLY: 'price_pro' });
  assert.equal(calls[0].body.mode, 'payment');
  assert.equal(calls[0].body['line_items[0][price]'], 'price_stub');
});

test('a missing price id reads as misconfiguration, not a decline', async () => {
  stubStripe(session);
  const res = await handleCheckout(post({ kind: 'pro' }), ENV);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'not_configured');
  assert.equal(calls.length, 0);
});

test('a cancelled subscription unlocks nothing, however it was paid once', async () => {
  // payment_status stays 'paid' forever on the original session, which is
  // exactly the trap: the subscription's own status is the only truth.
  stubStripe(({ url }) =>
    url.includes('/subscriptions/')
      ? { data: { id: 'sub_1', status: 'canceled' } }
      : { data: { id: 'cs_1', mode: 'subscription', subscription: 'sub_1', payment_status: 'paid' } },
  );
  const data = await (await handleCheckout(new Request(`${ORIGIN}/api/checkout?session_id=cs_1`), ENV)).json();
  assert.equal(data.paid, false);
  assert.equal(data.reason, 'inactive_subscription');
});

test('a trialing subscription counts as active', async () => {
  stubStripe(({ url }) =>
    url.includes('/subscriptions/')
      ? { data: { id: 'sub_1', status: 'trialing' } }
      : { data: { id: 'cs_1', mode: 'subscription', subscription: 'sub_1' } },
  );
  const res = await handleCheckout(new Request(`${ORIGIN}/api/checkout?session_id=cs_1`), ENV);
  assert.equal((await res.json()).paid, true);
});

test('an unpaid one-time session stays locked', async () => {
  stubStripe(() => ({ data: { id: 'cs_1', payment_status: 'unpaid' } }));
  const res = await handleCheckout(new Request(`${ORIGIN}/api/checkout?session_id=cs_1`), ENV);
  assert.equal((await res.json()).paid, false);
});

test('an unknown session is a plain no, not an error', async () => {
  stubStripe(() => ({ status: 404, data: { error: { message: 'No such session' } } }));
  const res = await handleCheckout(new Request(`${ORIGIN}/api/checkout?session_id=cs_gone`), ENV);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).reason, 'unknown_session');
});

test('malformed input never reaches Stripe', async () => {
  const bad = [
    ['GET', `${ORIGIN}/api/checkout?session_id=../../evil`, null],
    ['GET', `${ORIGIN}/api/checkout?session_id=`, null],
    ['GET', `${ORIGIN}/api/checkout`, null],
  ];
  for (const [method, url, body] of bad) {
    stubStripe(() => ({ data: {} }));
    const res = await handleCheckout(new Request(url, method === 'POST' ? { method, body } : {}), ENV);
    assert.equal(res.status, 400, `${method} ${url} should be rejected`);
    assert.equal(calls.length, 0, `${method} ${url} must not call Stripe`);
  }
});

test('a body that is not JSON still buys the one-time product, not nothing', async () => {
  // The client sends `{kind}` and nothing else, so an unparseable body is a bug
  // in our own page rather than an attack -- and defaulting to the cheaper
  // product is the safe direction.
  stubStripe(session);
  const res = await handleCheckout(
    new Request(`${ORIGIN}/api/checkout`, { method: 'POST', body: 'not json' }),
    ENV,
  );
  assert.equal(res.status, 200);
  assert.equal(calls[0].body.mode, 'payment');
});

test('answers are never cached', async () => {
  stubStripe(() => ({ data: { id: 'cs_1', payment_status: 'paid' } }));
  const res = await handleCheckout(new Request(`${ORIGIN}/api/checkout?session_id=cs_1`), ENV);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('a licence key is issued only for a live subscription', async () => {
  stubStripe(({ url }) =>
    url.includes('/subscriptions?')
      ? { data: { data: [{ status: 'active' }] } }
      : { data: { id: 'cs_1', mode: 'subscription', customer: 'cus_ABC123' } },
  );
  const res = await handleCheckout(
    new Request(`${ORIGIN}/api/checkout?session_id=cs_1&issue=key`),
    { ...ENV, LICENSE_SIGNING_SECRET: 'sekrit' },
  );
  const data = await res.json();
  assert.equal(data.issued, true);
  assert.ok(data.key.startsWith(`${KEY_PREFIX}-`));
});

test('a cancelled customer cannot re-open the success URL to mint a key', async () => {
  stubStripe(({ url }) =>
    url.includes('/subscriptions?')
      ? { data: { data: [{ status: 'canceled' }] } }
      : { data: { id: 'cs_1', mode: 'subscription', customer: 'cus_ABC123' } },
  );
  const res = await handleCheckout(
    new Request(`${ORIGIN}/api/checkout?session_id=cs_1&issue=key`),
    { ...ENV, LICENSE_SIGNING_SECRET: 'sekrit' },
  );
  const data = await res.json();
  assert.equal(data.issued, false);
  assert.equal(data.reason, 'inactive_subscription');
});

test('a valid key unlocks while the subscription is live, and stops when it is not', async () => {
  const secret = 'sekrit';
  const key = await mintKey('cus_ABC123', secret);
  for (const [status, expected] of [['active', true], ['canceled', false], ['past_due', false]]) {
    stubStripe(() => ({ data: { data: [{ status }] } }));
    const res = await handleCheckout(
      new Request(`${ORIGIN}/api/checkout`, { headers: { 'x-license-key': key } }),
      { ...ENV, LICENSE_SIGNING_SECRET: secret },
    );
    assert.equal((await res.json()).valid, expected, `status ${status}`);
  }
});

test('a forged key never reaches Stripe', async () => {
  stubStripe(() => ({ data: {} }));
  const res = await handleCheckout(
    new Request(`${ORIGIN}/api/checkout`, {
      headers: { 'x-license-key': `${KEY_PREFIX}-Y3VzX0FCQzEyMw-AAAAAAAAAAAAAAAA` },
    }),
    { ...ENV, LICENSE_SIGNING_SECRET: 'sekrit' },
  );
  const data = await res.json();
  assert.equal(data.valid, false);
  assert.equal(data.reason, 'bad_key');
  assert.equal(calls.length, 0, 'an unsigned key must not cost a Stripe call');
});

test('a licence key is never accepted from the query string', async () => {
  // The whole point of the header: a key in a URL is a key in a request log.
  // If this ever starts returning a verdict again, the transport has regressed.
  const key = await mintKey('cus_ABC123', 'sekrit');
  stubStripe(() => ({ data: { data: [{ status: 'active' }] } }));
  const res = await handleCheckout(
    new Request(`${ORIGIN}/api/checkout?key=${encodeURIComponent(key)}`),
    { ...ENV, LICENSE_SIGNING_SECRET: 'sekrit' },
  );
  const data = await res.json();
  assert.equal(data.valid, undefined, 'a key in the URL must not be honoured');
  assert.equal(calls.length, 0, 'and must not cost a Stripe call');
});

test('a key minted at an old nonce is revoked, not merely wrong', async () => {
  // The shared-key remedy: the customer's nonce is moved in the Stripe
  // dashboard, and every key carrying the previous one stops verifying --
  // without touching LICENSE_SIGNING_SECRET, which would break everyone's.
  const secret = 'sekrit';
  const old = await mintKey('cus_ABC123', secret, 'r1');
  stubStripe(({ url }) =>
    url.includes('/subscriptions?')
      ? { data: { data: [{ status: 'active' }] } }
      : { data: { id: 'cus_ABC123', metadata: { [NONCE_FIELD]: 'r2' } } },
  );
  const res = await handleCheckout(
    new Request(`${ORIGIN}/api/checkout`, { headers: { 'x-license-key': old } }),
    { ...ENV, LICENSE_SIGNING_SECRET: secret },
  );
  const data = await res.json();
  assert.equal(data.valid, false);
  // Not 'inactive_subscription': the subscription here is perfectly live, and
  // telling the subscriber otherwise sends them to support about billing.
  assert.equal(data.reason, 'revoked');
});

test('a key minted at the current nonce still works', async () => {
  const secret = 'sekrit';
  const current = await mintKey('cus_ABC123', secret, 'r2');
  stubStripe(({ url }) =>
    url.includes('/subscriptions?')
      ? { data: { data: [{ status: 'active' }] } }
      : { data: { id: 'cus_ABC123', metadata: { [NONCE_FIELD]: 'r2' } } },
  );
  const res = await handleCheckout(
    new Request(`${ORIGIN}/api/checkout`, { headers: { 'x-license-key': current } }),
    { ...ENV, LICENSE_SIGNING_SECRET: secret },
  );
  assert.equal((await res.json()).valid, true);
});

test('a re-issued key is minted at the current nonce, not the empty one', async () => {
  // Otherwise revocation would be undone by the buyer simply re-opening their
  // success URL, which is the one action the page tells them they can take.
  const secret = 'sekrit';
  stubStripe(({ url }) => {
    if (url.includes('/subscriptions?')) return { data: { data: [{ status: 'active' }] } };
    if (url.includes('/customers/')) return { data: { metadata: { [NONCE_FIELD]: 'r2' } } };
    return { data: { id: 'cs_1', mode: 'subscription', customer: 'cus_ABC123' } };
  });
  const res = await handleCheckout(
    new Request(`${ORIGIN}/api/checkout?session_id=cs_1&issue=key`),
    { ...ENV, LICENSE_SIGNING_SECRET: secret },
  );
  assert.equal((await res.json()).key, await mintKey('cus_ABC123', secret, 'r2'));
});

test('the return URL is never taken from an attacker-supplied host', async () => {
  // Without SITE_ORIGIN configured, the request's own host is the only other
  // source -- and on most hosts that is whatever the caller put in `Host`. An
  // unchecked one lands in success_url and sends the buyer, and their session
  // id, to a domain someone else chose.
  stubStripe(session);
  const { SITE_ORIGIN, ...noOrigin } = ENV;
  const res = await handleCheckout(post({}, 'https://evil.example.com/api/checkout'), noOrigin);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'not_configured');
  assert.equal(calls.length, 0, 'nothing may reach Stripe on an unknown origin');
});

test('the configured origin wins over the request host', async () => {
  stubStripe(session);
  await handleCheckout(post({}, 'https://evil.example/api/checkout'), ENV);
  assert.equal(
    calls[0].body.success_url,
    `${ORIGIN}/checkout-complete?session_id={CHECKOUT_SESSION_ID}`,
  );
});

test('a Vercel preview host is still allowed to build its own return URL', async () => {
  // Preview URLs change every push, so there is no fixed value anyone could
  // have configured. Refusing them would strand every test buyer.
  stubStripe(session);
  const { SITE_ORIGIN, ...noOrigin } = ENV;
  const res = await handleCheckout(
    post({}, 'https://site-git-abc123.vercel.app/api/checkout'),
    noOrigin,
  );
  assert.equal(res.status, 200);
  assert.match(calls[0].body.success_url, /^https:\/\/site-git-abc123\.vercel\.app\//);
});

test('another site cannot drive checkout from a visitor’s browser', async () => {
  stubStripe(session);
  const res = await handleCheckout(
    new Request(`${ORIGIN}/api/checkout`, {
      method: 'POST',
      headers: { origin: 'https://someone-elses-site.example' },
      body: JSON.stringify({}),
    }),
    ENV,
  );
  assert.equal(res.status, 403);
  assert.equal(calls.length, 0);
});

test('a session id Stripe has disowned is not re-asked about', async () => {
  // Each ask costs a Stripe call, and Stripe rate-limits per account -- so an
  // id that will never exist must not be a free way to spend that budget.
  stubStripe(() => ({ status: 404, data: { error: { message: 'No such session' } } }));
  const id = `cs_test_${Math.random().toString(36).slice(2)}`;
  const ask = () => handleCheckout(new Request(`${ORIGIN}/api/checkout?session_id=${id}`), ENV);
  assert.equal((await (await ask()).json()).reason, 'unknown_session');
  const afterFirst = calls.length;
  assert.equal((await (await ask()).json()).reason, 'unknown_session');
  assert.equal(calls.length, afterFirst, 'the second ask must be answered from memory');
});

test('a flood from one address is throttled before it reaches Stripe', async () => {
  stubStripe(() => ({ data: { id: 'cs_1', payment_status: 'unpaid' } }));
  const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
  let limited = null;
  for (let i = 0; i < 200 && !limited; i++) {
    const res = await handleCheckout(
      new Request(`${ORIGIN}/api/checkout?session_id=cs_flood${i}`, {
        headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` },
      }),
      ENV,
    );
    if (res.status === 429) limited = res;
  }
  assert.ok(limited, 'a sustained flood must eventually be refused');
  assert.ok(Number(limited.headers.get('retry-after')) > 0, 'and must say when to come back');
});

test('an ordinary client is nowhere near the throttle', async () => {
  // If this ever trips, the limit has been tightened past what the site's own
  // pages do.
  stubStripe(() => ({ data: { id: 'cs_1', payment_status: 'unpaid' } }));
  const ip = '198.51.100.7';
  for (let i = 0; i < 40; i++) {
    const res = await handleCheckout(
      new Request(`${ORIGIN}/api/checkout?session_id=cs_poll`, {
        headers: { 'x-forwarded-for': ip },
      }),
      ENV,
    );
    assert.equal(res.status, 200, `call ${i} must not be throttled`);
  }
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
globalThis.fetch = realFetch;
console.log(failed ? `\n${failed} checkout check(s) failed.` : '\nAll checkout checks passed.');
process.exit(failed ? 1 : 0);
