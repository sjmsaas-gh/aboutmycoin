/**
 * Licence keys, with no database.
 *
 * A key is a signed statement that a particular Stripe customer bought a
 * subscription. It carries the customer id and a revocation nonce in the open,
 * and an HMAC over both:
 *
 *     KEY-<base64url(customerId[.nonce])>-<base64url(HMAC-SHA256(secret, body))[0..15]>
 *
 * Nothing is stored anywhere *by us*. The key is derived from the customer id
 * and the nonce every time, so the same customer always gets the same key until
 * the nonce moves, and validation is:
 *
 *   1. Check the signature. Cheap, offline, and it stops junk keys from
 *      reaching Stripe at all.
 *   2. Ask Stripe whether that customer has a live subscription, and whether
 *      the nonce in the key is still the customer's current one. This is the
 *      real answer, and it is why both a cancellation and a revocation take
 *      effect without us recording anything.
 *
 * ## The nonce, and why it exists
 *
 * A key is a bearer credential with no device binding: one subscriber can post
 * theirs publicly and unlock the product for everyone. Without a per-customer
 * nonce the only remedy is rotating LICENSE_SIGNING_SECRET, which invalidates
 * every key ever issued -- punishing every honest subscriber for one leak.
 *
 * The nonce is held where the customer record already lives: Stripe customer
 * metadata, under NONCE_FIELD. **Revoking one shared key is editing that field
 * in the Stripe dashboard** -- set it to anything new (a date, a counter) and
 * every key carrying the old value stops verifying within one check. The
 * subscriber gets a working key again from the licence email or by re-opening
 * their checkout success URL, both of which mint against the current nonce.
 *
 * An absent nonce means the empty nonce, and a key minted then omits the
 * `.nonce` half entirely. That is what makes this backwards compatible with
 * keys issued before the field existed: they keep working until the day you
 * first set a nonce for that customer, which is exactly the moment you meant to
 * revoke them.
 *
 * **The signature alone proves nothing about entitlement.** It proves only that
 * we minted the key. A cancelled subscriber's key stays perfectly valid as a
 * signature forever, which is exactly why step 2 is not optional and must never
 * be cached beyond minutes.
 *
 * Why not a random key in a database: there is no database, and adding one to
 * hold a single boolean per customer would be the first crack in the whole
 * no-backend constraint. Stripe already knows who is subscribed.
 */

/**
 * RENAME: the visible prefix on every key, e.g. 'ACME'.
 *
 * It is interpolated into a regular expression below, so keep it to letters and
 * digits. Changing it after keys have been issued invalidates all of them.
 */
export const KEY_PREFIX = 'AMC';

/** Bytes of HMAC kept in the key. 12 bytes -> 16 base64url chars. */
const SIG_BYTES = 12;

/**
 * Shape of a key, checked before anything is decoded.
 *
 * Deliberately strict: the middle segment is fed to atob and the result is used
 * to build a Stripe URL, so anything that is not base64url is rejected here
 * rather than sanitised later.
 */
const KEY_RE = new RegExp(`^${KEY_PREFIX}-([A-Za-z0-9_-]{4,255})-([A-Za-z0-9_-]{16})$`);

/**
 * What a nonce may contain, checked on the way in and on the way out.
 *
 * Deliberately narrow: the value is typed into a Stripe dashboard field by a
 * human, travels inside the key, and is split back out on a '.' -- so the one
 * character it must never contain is a dot, and the simplest way to guarantee
 * that is to allow only this set. Anything else is treated as no nonce at all
 * rather than silently producing keys nobody can validate.
 */
const NONCE_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** The Stripe customer metadata field holding the current nonce. */
export const NONCE_FIELD = 'license_key_nonce';

/**
 * Normalises whatever Stripe hands back for the nonce field.
 *
 * Anything unusable -- absent, wrong type, too long, containing a dot -- is the
 * empty nonce. The direction matters: an unreadable nonce must fall back to the
 * value that keeps existing keys working, never to a random one that locks a
 * paying subscriber out because someone typed a space in the dashboard.
 */
export function normaliseNonce(raw: unknown): string {
  return typeof raw === 'string' && NONCE_RE.test(raw.trim()) ? raw.trim() : '';
}

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
}

/**
 * The signed message. The nonce is separated by a character it cannot itself
 * contain, so `cus_A` + nonce `Bc` and `cus_AB` + nonce `c` cannot collide into
 * one signature.
 */
function body(customerId: string, nonce: string): string {
  return nonce ? `${customerId}.${nonce}` : customerId;
}

async function sign(customerId: string, secret: string, nonce: string): Promise<string> {
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
    new TextEncoder().encode(body(customerId, nonce)),
  );
  return b64url(new Uint8Array(mac).slice(0, SIG_BYTES));
}

/**
 * Mints the key for a customer at a given nonce.
 *
 * Deterministic: same customer and same nonce, same key -- which is what makes
 * a lost key re-issuable with nothing stored. Moving the nonce is therefore
 * both the revocation and the re-issue.
 */
export async function mintKey(
  customerId: string,
  secret: string,
  nonce: unknown = '',
): Promise<string> {
  const n = normaliseNonce(nonce);
  const encoded = b64url(new TextEncoder().encode(body(customerId, n)));
  return `${KEY_PREFIX}-${encoded}-${await sign(customerId, secret, n)}`;
}

/** What a key says about itself, once its signature has been checked. */
export interface KeyClaims {
  customerId: string;
  /** The nonce the key was minted at. Empty for a key minted before any. */
  nonce: string;
}

/**
 * Recovers the customer id and nonce from a key, or null if the signature does
 * not match.
 *
 * Wholly offline, and that is the point: a forged or mistyped key is refused
 * here without costing a Stripe call, so this route cannot be turned into a way
 * to hammer the Stripe API. Note what it does NOT establish -- whether the
 * nonce is still current, and whether the subscription is live. Both are
 * Stripe's to answer, and both are checked by the caller.
 *
 * Compared in constant time. The comparison is over a MAC rather than a secret,
 * so a timing leak here is not catastrophic, but a variable-time compare on a
 * signature check is the kind of thing that is only ever wrong.
 */
export async function customerFromKey(
  key: string,
  secret: string,
): Promise<KeyClaims | null> {
  const match = KEY_RE.exec(key.trim());
  if (!match) return null;

  let decoded: string;
  try {
    decoded = unb64url(match[1]!);
  } catch {
    return null;
  }
  // Split on the first dot: customer ids never contain one, and the nonce
  // charset excludes it, so there is exactly one way to read this.
  const dot = decoded.indexOf('.');
  const customerId = dot === -1 ? decoded : decoded.slice(0, dot);
  const nonce = dot === -1 ? '' : decoded.slice(dot + 1);
  // Stripe customer ids are `cus_` plus an opaque token. Checked because this
  // value goes into a URL path.
  if (!/^cus_[A-Za-z0-9]{1,64}$/.test(customerId)) return null;
  // A nonce that could never have been minted cannot have a valid signature
  // either, but rejecting it here keeps the malformed shapes in one place.
  if (nonce !== '' && !NONCE_RE.test(nonce)) return null;

  const expected = await sign(customerId, secret, nonce);
  const given = match[2]!;
  if (expected.length !== given.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0 ? { customerId, nonce } : null;
}
