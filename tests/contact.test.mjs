/**
 * The contact form endpoint.
 *
 * This endpoint sends mail to a fixed inbox on behalf of anyone who can reach
 * it, so the things worth testing are all about what it must REFUSE: an
 * unsigned or forged token, a form filled in faster than a human could type,
 * a honeypot trip, and a header-injection attempt through the name that ends up
 * in the Subject line.
 *
 * The one positive case that matters as much as any refusal is the last:
 * a rejected send must NOT be reported as a success, because the sender would
 * walk away believing a message arrived that never did.
 *
 * Run: node --experimental-strip-types --no-warnings --import ./tests/ts-resolve.mjs tests/contact.test.mjs
 */
import assert from 'node:assert/strict';
import {
  handleContact,
  mintToken,
  verifyToken,
  subjectFor,
  validate,
} from '../src/server/contact.ts';
import {
  HONEYPOT_FIELD,
  LIMITS,
  MIN_FILL_SECONDS,
  TOKEN_MAX_AGE_SECONDS,
  TOKEN_REFRESH_SECONDS,
  tokenIssuedAt,
} from '../src/lib/contact.ts';
import { SITE } from '../src/lib/site.ts';

const ORIGIN = SITE.url;

const SECRET = 'contact-signing-secret';
const ENV = {
  RESEND_API_KEY: 're_test',
  CONTACT_TO_EMAIL: 'inbox@example.com',
  CONTACT_FROM_EMAIL: 'Example <contact@example.com>',
  CONTACT_SIGNING_SECRET: SECRET,
};

const GOOD = {
  name: 'Dana Example',
  email: 'dana@example.com',
  messageType: 'feedback',
  message: 'The thing on the pricing page is doing something odd in Firefox.',
};

const now = () => Math.floor(Date.now() / 1000);

/** A fixed, realistically sized epoch second. Tokens carry 10-13 digits. */
const T = 1_800_000_000;

/** A token old enough to pass the fill-time floor. */
const usableToken = () => mintToken(SECRET, now() - MIN_FILL_SECONDS - 1);

function post(body) {
  return new Request(`${ORIGIN}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Runs the handler with fetch stubbed, and reports what Resend was handed. */
async function withResend(handler, run) {
  const real = globalThis.fetch;
  let seen = null;
  globalThis.fetch = async (url, init) => {
    seen = { url: String(url), body: JSON.parse(init.body) };
    return handler();
  };
  try {
    const res = await run();
    return { res, seen };
  } finally {
    globalThis.fetch = real;
  }
}

const ok = () => new Response('{"id":"1"}', { status: 200 });
const rejected = () =>
  new Response('{"message":"domain not verified"}', { status: 403 });

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

/* --- tokens ---------------------------------------------------------------- */

test('a freshly minted token verifies once it is old enough', async () => {
  assert.equal(await verifyToken(await mintToken(SECRET, T), SECRET, T + 10), 'ok');
});

test('a token submitted instantly is too fast', async () => {
  // The form-stuffer case: a bot posts in milliseconds.
  assert.equal(await verifyToken(await mintToken(SECRET, T), SECRET, T), 'too_fast');
});

test('a token from another secret is refused', async () => {
  const forged = await mintToken('other-secret', T);
  assert.equal(await verifyToken(forged, SECRET, T + 10), 'bad_token');
});

test('the timestamp cannot be edited while keeping the signature', async () => {
  // The forgery the format invites: the age is readable, so try backdating it
  // to defeat the fill-time floor.
  const token = await mintToken(SECRET, T);
  const [, sig] = token.split('.');
  assert.equal(await verifyToken(`${T - 100}.${sig}`, SECRET, T + 10), 'bad_token');
});

test('an old token expires, and a future one is refused', async () => {
  const token = await mintToken(SECRET, T);
  assert.equal(await verifyToken(token, SECRET, T + 3 * 60 * 60), 'expired');
  assert.equal(await verifyToken(token, SECRET, T - 500), 'expired');
});

test('junk tokens are refused without throwing', async () => {
  for (const t of ['', '.', 'abc', `${T}.`, `${T}.short`, '1000.0123456789abcdef', 'x'.repeat(500)]) {
    assert.equal(await verifyToken(t, SECRET, T + 10), 'bad_token', `token: ${t}`);
  }
});

test('the refresh threshold leaves room before expiry', () => {
  // The page swaps a token at TOKEN_REFRESH_SECONDS. If that were not
  // comfortably below the server's ceiling, the swap would happen after the
  // refusal it exists to prevent.
  assert.ok(TOKEN_REFRESH_SECONDS < TOKEN_MAX_AGE_SECONDS * 0.9);
});

test('a token exposes its own age, so the page can act before the server does', () => {
  assert.equal(tokenIssuedAt(`${T}.0123456789abcdef`), T);
  assert.equal(tokenIssuedAt('nonsense'), null);
  assert.equal(tokenIssuedAt(null), null);
});

/* --- validation ------------------------------------------------------------ */

test('a good message validates', () => {
  assert.deepEqual(validate(GOOD), {});
});

test('every field is required, and the type must be a known one', () => {
  assert.deepEqual(validate({ ...GOOD, name: '' }), { name: 'required' });
  assert.deepEqual(validate({ ...GOOD, email: '' }), { email: 'required' });
  assert.deepEqual(validate({ ...GOOD, email: 'not-an-email' }), { email: 'bad_email' });
  // A type absent from the server's list but present in a tampered dropdown.
  assert.deepEqual(validate({ ...GOOD, messageType: 'freebie' }), { messageType: 'unknown_type' });
  assert.deepEqual(validate({ ...GOOD, message: '' }), { message: 'required' });
});

test('a plus-tagged address is accepted', () => {
  // The regex is loose on purpose: rejecting a real address is worse than
  // accepting a bad one, which costs a single bounced reply.
  assert.deepEqual(validate({ ...GOOD, email: 'dana+tag@example.co.uk' }), {});
});

test('the short messages people actually send are accepted', () => {
  // These are the reason MESSAGE_MIN is 10 rather than 20. A testimonial and
  // the first line of a bug report are both naturally this short, and refusing
  // them was the largest single source of rejected genuine messages -- larger
  // than every bot check combined.
  for (const message of [
    'Love it, thank you!',
    'The app crashes',
    'HEIC will not open',
    'Billing page 404s',
  ]) {
    assert.deepEqual(validate({ ...GOOD, message }), {}, `refused: ${message}`);
  }
});

test('a one-word message is still refused', () => {
  // What the floor was always for.
  for (const message of ['hi', 'test', '?', 'a']) {
    assert.deepEqual(validate({ ...GOOD, message }), { message: 'too_short' }, message);
  }
});

test('too short and too many links are told apart', () => {
  // The whole point of reasons over field names: these two land on the same
  // field and want opposite advice.
  const links = Array.from({ length: 9 }, (_, i) => `https://example.com/${i}`).join(' ');
  assert.deepEqual(validate({ ...GOOD, message: `Great site! ${links}` }), {
    message: 'too_many_links',
  });
  assert.deepEqual(validate({ ...GOOD, message: 'x'.repeat(LIMITS.MESSAGE_MAX + 1) }), {
    message: 'too_long',
  });
  assert.deepEqual(validate({ ...GOOD, name: 'x'.repeat(LIMITS.NAME_MAX + 1) }), {
    name: 'too_long',
  });
});

/* --- the subject line ------------------------------------------------------ */

test('the subject carries the name, so Gmail does not thread strangers together', () => {
  assert.equal(subjectFor('Dana Example'), `${SITE.domain} - Contact Form (Dana Example)`);
});

test('a newline in the name cannot inject a mail header', () => {
  // The attack: `Name\nBcc: everyone@example.com` in the Subject.
  const subject = subjectFor('Dana\r\nBcc: victim@example.com');
  assert.ok(!/[\r\n]/.test(subject), 'subject must be a single line');
  assert.equal(subject, `${SITE.domain} - Contact Form (Dana Bcc: victim@example.com)`);
});

/* --- the endpoint ---------------------------------------------------------- */

test('GET issues a token; other methods are refused', async () => {
  const res = await handleContact(
    new Request(`${ORIGIN}/api/contact`),
    ENV,
  );
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.match(body.token, /^\d{10,13}\.[A-Za-z0-9_-]{16}$/);
  assert.equal(res.headers.get('cache-control'), 'no-store', 'a shared token is not a token');

  const bad = await handleContact(
    new Request(`${ORIGIN}/api/contact`, { method: 'DELETE' }),
    ENV,
  );
  assert.equal(bad.status, 405);
});

test('a well-formed message is sent, with the sender in Reply-To', async () => {
  const { res, seen } = await withResend(ok, async () =>
    handleContact(post({ ...GOOD, token: await usableToken() }), ENV),
  );
  assert.equal(res.status, 200);
  assert.equal((await res.json()).sent, true);
  assert.equal(seen.url, 'https://api.resend.com/emails');
  assert.equal(seen.body.to, ENV.CONTACT_TO_EMAIL);
  assert.equal(seen.body.from, ENV.CONTACT_FROM_EMAIL);
  assert.equal(seen.body.reply_to, GOOD.email);
  assert.equal(seen.body.subject, `${SITE.domain} - Contact Form (Dana Example)`);
  // The label, not the id: the inbox should not have to know the wire format.
  assert.match(seen.body.text, /Type:  Feedback/);
  assert.match(seen.body.text, /Firefox/);
});

test('the message body is escaped, not rendered, in the HTML part', async () => {
  const { seen } = await withResend(ok, async () =>
    handleContact(
      post({
        ...GOOD,
        message: 'Look at this <script>alert(1)</script> & tell me why it broke.',
        token: await usableToken(),
      }),
      ENV,
    ),
  );
  assert.ok(!seen.body.html.includes('<script>'), 'a sender must not inject markup into our inbox');
  assert.match(seen.body.html, /&lt;script&gt;/);
});

test('the recipient address is never returned to the browser', async () => {
  // The whole reason it lives in the environment: a page that is told where the
  // message goes is a page a scraper reads it from.
  const { res } = await withResend(ok, async () =>
    handleContact(post({ ...GOOD, token: await usableToken() }), ENV),
  );
  assert.ok(!(await res.text()).includes('inbox@example.com'));
});

test('a honeypot trip is answered with a fake success and sends nothing', async () => {
  // Told "rejected", a bot retries with different content. Told "sent", it
  // moves on -- so the lie is the useful answer here.
  const realWarn = console.warn;
  console.warn = () => {};
  const { res, seen } = await withResend(ok, async () =>
    handleContact(
      post({ ...GOOD, [HONEYPOT_FIELD]: 'http://spam.example', token: await usableToken() }),
      ENV,
    ),
  );
  console.warn = realWarn;
  assert.equal((await res.json()).sent, true);
  assert.equal(seen, null, 'nothing may reach Resend');
});

test('a honeypot trip is logged, with enough to recover a false positive', async () => {
  /*
   * The one outcome in this endpoint that discards a message while telling the
   * sender it arrived. Correct for a bot, catastrophic for a human -- and the
   * risk of a human tripping it (a password manager filling `ppk_ref_url`) is
   * low but not zero. Without this log a false positive is invisible forever.
   */
  const realWarn = console.warn;
  let logged = '';
  console.warn = (m) => { logged += m; };
  await withResend(ok, async () =>
    handleContact(
      post({ ...GOOD, [HONEYPOT_FIELD]: 'http://spam.example', token: await usableToken() }),
      ENV,
    ),
  );
  console.warn = realWarn;
  assert.match(logged, /honeypot/i);
  assert.match(logged, /spam\.example/, 'the trap value tells autofill from spam');
  assert.match(logged, /dana@example\.com/, 'the sender must be reachable to ask again');
  assert.ok(!logged.includes('Firefox'), 'the message body does not belong in the logs');
});

test('a POST with no token sends nothing', async () => {
  // The bot that skips the page entirely and posts straight at the endpoint.
  const { res, seen } = await withResend(ok, async () => handleContact(post(GOOD), ENV));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'bad_token');
  assert.equal(seen, null);
});

test('an instant submission is refused, and says which failure it was', async () => {
  const { res, seen } = await withResend(ok, async () =>
    handleContact(post({ ...GOOD, token: await mintToken(SECRET) }), ENV),
  );
  assert.equal(res.status, 429);
  assert.equal((await res.json()).error, 'too_fast');
  assert.equal(seen, null);
});

test('invalid fields are named, so the page can mark them', async () => {
  const { res, seen } = await withResend(ok, async () =>
    handleContact(post({ ...GOOD, email: 'nope', message: 'hi', token: await usableToken() }), ENV),
  );
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error, 'invalid');
  assert.deepEqual(body.fields.sort(), ['email', 'message']);
  // The page words the error from the reason, not from the field name.
  assert.deepEqual(body.reasons, { email: 'bad_email', message: 'too_short' });
  assert.equal(seen, null);
});

test('an oversized body is refused before it is parsed', async () => {
  const res = await handleContact(
    post({ ...GOOD, message: 'x'.repeat(20_000), token: await usableToken() }),
    ENV,
  );
  assert.equal(res.status, 413);
});

test('a missing configuration is admitted, not hidden', async () => {
  // A form that accepts a message and drops it is worse than one that says it
  // is broken -- the sender at least knows to try another way.
  const realError = console.error;
  console.error = () => {};
  const res = await handleContact(post({ ...GOOD, token: await usableToken() }), {
    ...ENV,
    CONTACT_TO_EMAIL: undefined,
  });
  console.error = realError;
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'not_configured');
});

test('a rejected send is reported as a failure, never as a success', async () => {
  const realError = console.error;
  let logged = '';
  console.error = (m) => { logged += m; };
  const { res } = await withResend(rejected, async () =>
    handleContact(post({ ...GOOD, token: await usableToken() }), ENV),
  );
  console.error = realError;
  const body = await res.json();
  assert.equal(res.status, 502);
  assert.equal(body.error, 'send_failed');
  assert.notEqual(body.sent, true, 'the sender must not be told a lost message arrived');
  assert.match(logged, /domain not verified/, 'the real reason must be in the logs');
});

test('a network failure reaching Resend is reported the same way', async () => {
  const realError = console.error;
  console.error = () => {};
  const { res } = await withResend(
    () => { throw new Error('econnreset'); },
    async () => handleContact(post({ ...GOOD, token: await usableToken() }), ENV),
  );
  console.error = realError;
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
console.log(failed ? `\n${failed} contact check(s) failed.` : '\nAll contact checks passed.');
process.exit(failed ? 1 : 0);
