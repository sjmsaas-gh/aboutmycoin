/**
 * Licence key minting and verification.
 *
 * The properties that matter are all about what a key must NOT do: it must not
 * be forgeable, must not survive a changed secret, and must not be mistaken for
 * proof of entitlement on its own.
 *
 * Run: node --experimental-strip-types --no-warnings tests/license.test.mjs
 */
import assert from 'node:assert/strict';
import { mintKey, customerFromKey, KEY_PREFIX } from '../src/server/license.ts';

const SECRET = 'test-signing-secret';
const CUS = 'cus_QabcDEF123456';
const P = KEY_PREFIX;

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('a key round-trips to its customer', async () => {
  const key = await mintKey(CUS, SECRET);
  assert.match(key, new RegExp(`^${P}-[A-Za-z0-9_-]+-[A-Za-z0-9_-]{16}$`));
  assert.deepEqual(await customerFromKey(key, SECRET), { customerId: CUS, nonce: '' });
});

test('minting is deterministic — the same customer always gets one key', async () => {
  // This is what makes re-issuing a lost key possible with nothing stored.
  assert.equal(await mintKey(CUS, SECRET), await mintKey(CUS, SECRET));
});

test('different customers get different keys', async () => {
  assert.notEqual(await mintKey(CUS, SECRET), await mintKey('cus_ZZZother9', SECRET));
});

test('a key does not verify under a different secret', async () => {
  const key = await mintKey(CUS, SECRET);
  assert.equal(await customerFromKey(key, 'rotated-secret'), null);
});

test('the customer id cannot be swapped without breaking the signature', async () => {
  // The forgery this format invites: the id is readable in the key, so try
  // editing it and keeping the signature.
  const key = await mintKey(CUS, SECRET);
  const sig = key.split('-').pop();
  const otherBody = Buffer.from('cus_ZZZother9').toString('base64url');
  assert.equal(await customerFromKey(`${P}-${otherBody}-${sig}`, SECRET), null);
});

test('junk is refused without throwing', async () => {
  const junk = [
    '',
    P,
    `${P}--`,
    'not-a-key',
    `${P}-!!!!-????????????????`,
    `${P}-${Buffer.from('cus_x').toString('base64url')}-tooshort`,
    // A well-formed key whose payload is not a Stripe customer id at all. This
    // value would otherwise be interpolated into a Stripe URL path.
    `${P}-${Buffer.from('../../admin').toString('base64url')}-0123456789abcdef`,
  ];
  for (const k of junk) {
    assert.equal(await customerFromKey(k, SECRET), null, `should refuse ${JSON.stringify(k)}`);
  }
});

test('surrounding whitespace is forgiven — keys get pasted', async () => {
  const key = await mintKey(CUS, SECRET);
  assert.deepEqual(await customerFromKey(`  ${key}\n`, SECRET), { customerId: CUS, nonce: '' });
});

test('a key carries the nonce it was minted at', async () => {
  const key = await mintKey(CUS, SECRET, 'r2');
  assert.deepEqual(await customerFromKey(key, SECRET), { customerId: CUS, nonce: 'r2' });
});

test('moving the nonce changes the key — that is the revocation', async () => {
  const before = await mintKey(CUS, SECRET, '');
  const after = await mintKey(CUS, SECRET, 'r2');
  assert.notEqual(before, after);
  // And the old key still verifies as a signature -- it is only stale, not
  // forged. Refusing it is the caller's job, by comparing nonces with Stripe.
  assert.equal((await customerFromKey(before, SECRET)).nonce, '');
});

test('the nonce cannot be edited in a key without breaking the signature', async () => {
  const key = await mintKey(CUS, SECRET, 'r2');
  const sig = key.split('-').pop();
  const forged = Buffer.from(`${CUS}.r3`).toString('base64url');
  assert.equal(await customerFromKey(`${P}-${forged}-${sig}`, SECRET), null);
});

test('an unusable nonce is the empty nonce, never a lockout', async () => {
  // Someone types a space, or a dot, into the Stripe dashboard field. That must
  // degrade to "no nonce" -- which keeps existing keys working -- rather than
  // minting keys against a value that can never be read back.
  const plain = await mintKey(CUS, SECRET);
  for (const junk of ['bad nonce', 'has.dot', 'x'.repeat(65), 42, null, undefined, {}]) {
    assert.equal(await mintKey(CUS, SECRET, junk), plain, `junk nonce ${JSON.stringify(junk)}`);
  }
});

test('customer id and nonce cannot be shuffled between each other', async () => {
  // cus_AB with no nonce must not collide with cus_A + nonce 'B', which is what
  // a separator the nonce could itself contain would allow.
  assert.notEqual(await mintKey('cus_AB', SECRET), await mintKey('cus_A', SECRET, 'B'));
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
console.log(failed ? `\n${failed} licence check(s) failed.` : '\nAll licence checks passed.');
process.exit(failed ? 1 : 0);
