/**
 * The email sign-up endpoint.
 *
 * The token machinery is the contact form's and is tested there; what is worth
 * testing here is what this endpoint does differently, and every one of those
 * differences is a way to lose somebody's address or to hand Resend something
 * it should not have had:
 *
 *   - an unconfigured list must say so rather than accept the address,
 *   - a rejected write must NOT be reported as a success, because unlike a
 *     failed contact send there is no inbox holding a copy and no address left
 *     to ask again,
 *   - a honeypot trip must look exactly like a success from outside,
 *   - the first name must be flattened before it becomes a merge field that
 *     will one day be interpolated into a subject line.
 *
 * Run: node --experimental-strip-types --no-warnings --import ./tests/ts-resolve.mjs tests/subscribe.test.mjs
 */
import assert from 'node:assert/strict';
import { handleSubscribe, validate } from '../src/server/subscribe.ts';
import { mintToken } from '../src/server/contact.ts';
import { HONEYPOT_FIELD, MIN_FILL_SECONDS } from '../src/lib/contact.ts';
import { SUBSCRIBE_LIMITS } from '../src/lib/subscribe.ts';
import { SITE } from '../src/lib/site.ts';

const ORIGIN = SITE.url;

const SECRET = 'contact-signing-secret';
const SEGMENT = '78261eea-8f8b-4381-83c6-79fa7120f1cf';
const EVENT = 'mailing-list-signup';
const ENV = {
  RESEND_API_KEY: 're_test',
  RESEND_SEGMENT_ID: SEGMENT,
  RESEND_SIGNUP_EVENT: EVENT,
  CONTACT_SIGNING_SECRET: SECRET,
};

const GOOD = { firstName: 'Dana', email: 'dana@example.com' };

const now = () => Math.floor(Date.now() / 1000);

/** A token old enough to pass the fill-time floor. */
const usableToken = () => mintToken(SECRET, now() - MIN_FILL_SECONDS - 1);

function post(body) {
  return new Request(`${ORIGIN}/api/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Runs the handler with fetch stubbed, and reports what Resend was handed.
 *
 * Two endpoints are reached on a good sign-up -- the contact write and the
 * custom event the welcome automation triggers on -- so the calls are kept in
 * order and answered separately. `seen` is the contact write, which most of
 * these tests are about; `calls` is there for the ones that care that the
 * event followed it.
 */
async function withResend(handler, run, eventHandler = accepted) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const call = { url: String(url), body: JSON.parse(init.body) };
    calls.push(call);
    return call.url.includes('/events/') ? eventHandler() : handler();
  };
  try {
    const res = await run();
    return { res, calls, seen: calls.find((c) => !c.url.includes('/events/')) ?? null };
  } finally {
    globalThis.fetch = real;
  }
}

/** Swallows the handler's console noise for the paths that log deliberately. */
async function quietly(run) {
  const realError = console.error;
  const realWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};
  try {
    return await run();
  } finally {
    console.error = realError;
    console.warn = realWarn;
  }
}

const created = () => new Response('{"id":"1"}', { status: 201 });
const rejected = () =>
  new Response('{"message":"missing contacts scope"}', { status: 403 });
const accepted = () => new Response('{"object":"event"}', { status: 202 });

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

/* --- validation ------------------------------------------------------------ */

test('both fields are required', () => {
  assert.deepEqual(validate({ firstName: '', email: '' }), {
    firstName: 'required',
    email: 'required',
  });
});

test('a long first name and a bad address are refused for different reasons', () => {
  const bad = validate({
    firstName: 'a'.repeat(SUBSCRIBE_LIMITS.FIRST_NAME_MAX + 1),
    email: 'dana at example dot com',
  });
  assert.equal(bad.firstName, 'too_long');
  assert.equal(bad.email, 'bad_email');
});

test('an ordinary sign-up passes', () => {
  assert.deepEqual(validate(GOOD), {});
});

/* --- configuration --------------------------------------------------------- */

test('an unconfigured list says so rather than accepting the address', async () => {
  // The failure this exists to prevent: a box that thanks somebody and drops
  // their address, on a site where nobody is waiting for a reply that would
  // reveal it.
  // The event name is in this list on purpose: configured without it, every
  // sign-up succeeds and no welcome email is ever sent to anybody, which is
  // the one failure nobody would notice.
  for (const missing of [
    'RESEND_API_KEY',
    'RESEND_SEGMENT_ID',
    'RESEND_SIGNUP_EVENT',
    'CONTACT_SIGNING_SECRET',
  ]) {
    const env = { ...ENV, [missing]: undefined };
    const res = await quietly(async () =>
      handleSubscribe(post({ ...GOOD, token: await usableToken() }), env),
    );
    assert.equal(res.status, 503, `missing ${missing}`);
    assert.equal((await res.json()).error, 'not_configured');
  }
});

test('GET mints a token, and refuses to without a secret', async () => {
  const res = await handleSubscribe(new Request(`${ORIGIN}/api/subscribe`), ENV);
  assert.equal(res.status, 200);
  assert.match((await res.json()).token, /^\d{10,13}\.[A-Za-z0-9_-]{16}$/);

  const bare = await handleSubscribe(
    new Request(`${ORIGIN}/api/subscribe`),
    { ...ENV, CONTACT_SIGNING_SECRET: undefined },
  );
  assert.equal(bare.status, 503);
});

test('a method that is neither GET nor POST is refused', async () => {
  const res = await handleSubscribe(
    new Request(`${ORIGIN}/api/subscribe`, { method: 'DELETE' }),
    ENV,
  );
  assert.equal(res.status, 405);
});

/* --- refusals -------------------------------------------------------------- */

test('a request with no token is refused', async () => {
  const res = await handleSubscribe(post(GOOD), ENV);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'bad_token');
});

test('a form filled in instantly is told it was too fast, not that it failed', async () => {
  // Distinct codes matter: "too fast" is recoverable by pressing the button
  // again and the page retries it silently, which nothing else here is.
  const res = await handleSubscribe(post({ ...GOOD, token: await mintToken(SECRET) }), ENV);
  assert.equal(res.status, 429);
  assert.equal((await res.json()).error, 'too_fast');
});

test('a honeypot trip is indistinguishable from a success, and sends nothing', async () => {
  const { res, seen } = await quietly(() =>
    withResend(created, async () =>
      handleSubscribe(
        post({ ...GOOD, [HONEYPOT_FIELD]: 'http://spam.example', token: await usableToken() }),
        ENV,
      ),
    ),
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { subscribed: true });
  assert.equal(seen, null, 'nothing should have been sent to Resend');
});

test('an invalid field comes back with a field list and a reason for each', async () => {
  const res = await handleSubscribe(
    post({ firstName: '', email: 'nope', token: await usableToken() }),
    ENV,
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'invalid');
  assert.deepEqual(body.fields.sort(), ['email', 'firstName']);
  assert.deepEqual(body.reasons, { firstName: 'required', email: 'bad_email' });
});

test('an oversized body is refused before it is parsed', async () => {
  const res = await handleSubscribe(
    new Request(`${ORIGIN}/api/subscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...GOOD, firstName: 'a'.repeat(20_000) }),
    }),
    ENV,
  );
  assert.equal(res.status, 413);
});

/* --- what Resend is handed ------------------------------------------------- */

test('a good sign-up reaches the right segment with the right fields', async () => {
  const { res, seen } = await withResend(created, async () =>
    handleSubscribe(post({ ...GOOD, token: await usableToken() }), ENV),
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { subscribed: true });
  assert.equal(seen.url, 'https://api.resend.com/contacts');
  assert.deepEqual(seen.body, {
    email: 'dana@example.com',
    first_name: 'Dana',
    unsubscribed: false,
    // The whole reason the id is configured: a contact created without a
    // segment is loose in the account, indistinguishable from an address that
    // arrived some other way.
    segments: [{ id: SEGMENT }],
  });
});

test('a newline in the first name cannot survive into a merge field', async () => {
  // The first name is destined for a subject line or a salutation, which is a
  // header. "Dana\nBcc: everyone@example.com" must not arrive intact.
  const { seen } = await withResend(created, async () =>
    handleSubscribe(
      post({ ...GOOD, firstName: 'Dana\nBcc: everyone@example.com', token: await usableToken() }),
      ENV,
    ),
  );
  assert.ok(!/[\r\n]/.test(seen.body.first_name));
  assert.ok(seen.body.first_name.length <= SUBSCRIBE_LIMITS.FIRST_NAME_MAX);
});

test('the sign-up event is fired, by address, after the contact lands', async () => {
  const { res, calls } = await withResend(created, async () =>
    handleSubscribe(post({ ...GOOD, token: await usableToken() }), ENV),
  );
  assert.equal(res.status, 200);
  // Order matters: an event fired first would welcome somebody to a list a
  // failed write is about to keep them off.
  assert.deepEqual(
    calls.map((c) => c.url),
    ['https://api.resend.com/contacts', 'https://api.resend.com/events/send'],
  );
  assert.deepEqual(calls[1].body, { event: EVENT, email: 'dana@example.com' });
});

test('a rejected write fires no event', async () => {
  const { calls } = await quietly(() =>
    withResend(rejected, async () =>
      handleSubscribe(post({ ...GOOD, token: await usableToken() }), ENV),
    ),
  );
  assert.equal(calls.length, 1, 'nobody should be welcomed to a list they are not on');
});

test('a refused event still reports the sign-up as the success it was', async () => {
  // The address is on the list by this point. Telling the visitor it failed
  // would be false, and their only recovery -- pressing the button again --
  // would add a contact that is already there.
  const { res } = await quietly(() =>
    withResend(
      created,
      async () => handleSubscribe(post({ ...GOOD, token: await usableToken() }), ENV),
      () => new Response('{"message":"no automation for that event"}', { status: 422 }),
    ),
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { subscribed: true });
});

test('a network failure firing the event is swallowed the same way', async () => {
  const { res } = await quietly(() =>
    withResend(
      created,
      async () => handleSubscribe(post({ ...GOOD, token: await usableToken() }), ENV),
      () => {
        throw new Error('econnreset');
      },
    ),
  );
  assert.equal(res.status, 200);
});

/* --- failures are not dressed up as successes ------------------------------ */

test('a rejected write is reported as a failure', async () => {
  const { res } = await quietly(() =>
    withResend(rejected, async () =>
      handleSubscribe(post({ ...GOOD, token: await usableToken() }), ENV),
    ),
  );
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'signup_failed');
});

test('a network failure reaching Resend is reported the same way', async () => {
  const { res } = await quietly(() =>
    withResend(
      () => {
        throw new Error('econnreset');
      },
      async () => handleSubscribe(post({ ...GOOD, token: await usableToken() }), ENV),
    ),
  );
  assert.equal(res.status, 502);
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
console.log(failed ? `\n${failed} subscribe check(s) failed.` : '\nAll subscribe checks passed.');
process.exit(failed ? 1 : 0);
