/**
 * The email list — server half.
 *
 * Host-agnostic like the rest of `src/server`: plain Web `Request`/`Response`
 * and `fetch`, no SDK, so the Vercel adapter in `api/subscribe.ts` is a dozen
 * lines and a move to Netlify or Cloudflare Pages is another file that size.
 *
 *   GET  /api/subscribe  -> { token }      a signed timestamp, issued on first
 *                                          interaction with the form
 *   POST /api/subscribe  -> { subscribed } validates, adds the address to a
 *                                          Resend segment, then fires the
 *                                          custom event the autoresponder
 *                                          triggers on
 *
 * ## Why this stores nothing of its own
 *
 * The list IS the segment in Resend. There is no local copy, no row written
 * anywhere on this side, and therefore nothing to keep in step: the place that
 * sends the email is the same place that holds who it goes to, and an
 * unsubscribe taken in an email is true everywhere the moment it happens. A
 * local mirror of a mailing list is a second answer to "is this person
 * subscribed", and the wrong one always turns out to be the one that sent the
 * mail.
 *
 * ## Why the welcome email is an event and not a send
 *
 * This endpoint never composes mail. It adds the contact and then POSTs a
 * named custom event to Resend, and an automation in the Resend dashboard is
 * what decides that the event means "send the welcome". The alternative --
 * building the welcome email here -- would put the copy of a marketing email
 * in a source file, where changing a sentence is a deploy, and would mean the
 * sign-up box and the automations disagree about which addresses have been
 * welcomed.
 *
 * The event is fired after the contact lands and never before: an event for
 * an address that failed to be added is a welcome email to somebody who is
 * not on the list.
 *
 * ## Spam prevention
 *
 * The same signed-token, minimum-fill-time and honeypot arrangement as the
 * contact form, imported from it rather than reimplemented — including the
 * signing secret, which is deliberately shared. One secret for two forms on
 * one site is one thing to configure and one thing to rotate; separate secrets
 * would buy nothing, because a token from either form proves only the same
 * fact ("a form on this origin was opened N seconds ago").
 *
 * What it does NOT do, for the same reasons set out at length in
 * `contact.ts`: no per-IP rate limit and no single-use tokens, because both
 * need shared state that an edge function does not have.
 *
 * ## What a duplicate does
 *
 * Nothing, loudly. Resend's contacts are global to the account, and a second
 * sign-up for an address already in the segment is accepted, so this returns
 * the same success the first one did. The alternative — telling the visitor
 * "you are already subscribed" — is a membership oracle: anyone could type an
 * address and learn whether its owner is on the list.
 */
import {
  SUBSCRIBE_LIMITS,
  type SubscribeReason,
} from '../lib/subscribe.js';
import { HONEYPOT_FIELD, isEmail } from '../lib/contact.js';
import { mintToken, verifyToken } from './contact.js';

/**
 * Hard ceiling on the POST body, checked before it is read. Two short fields
 * and a token cannot legitimately come close to this.
 */
const MAX_BODY_BYTES = 4 * 1024;

export interface SubscribeEnv {
  /**
   * Resend API key. The same key the contact form uses, and it needs the
   * contacts scope as well as the send scope.
   *
   * Absent means the list is not configured, and the endpoint answers 503 and
   * says so. A sign-up box that takes an address and drops it is the same
   * broken-but-cheerful failure as a contact form that does, except nobody
   * ever finds out, because there is no reply to be waiting for.
   */
  RESEND_API_KEY?: string;
  /**
   * The Resend segment the address is filed under -- what used to be an
   * audience, before Resend made contacts global to the account and turned
   * audiences into segments over them. A contact created with no segment is
   * still a contact, so this is what keeps sign-ups from this box separable
   * from every other address the account has ever seen.
   *
   * **Required, with no default in the source.** A default here would either
   * be a dead id (sign-ups fail in production and nobody notices) or a real
   * one (somebody else's list in git).
   */
  RESEND_SEGMENT_ID?: string;
  /**
   * The name of the Resend custom event fired once the address is on the
   * list, which is what the sign-up automation triggers on. It has to match
   * the event name typed into that automation's trigger step, character for
   * character, or the event is accepted by Resend and nothing happens.
   *
   * **Required, with no default in the source**, for exactly that reason. A
   * default would be a name no automation is listening for, and the failure
   * would be invisible: every sign-up succeeds, the address lands, and the
   * welcome email is never sent to anybody. The endpoint would rather refuse
   * sign-ups until the pair is configured than run half-configured.
   */
  RESEND_SIGNUP_EVENT?: string;
  /**
   * HMAC secret for form tokens — the contact form's, shared on purpose. See
   * the note at the top of this file.
   */
  CONTACT_SIGNING_SECRET?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // A token must never be served from a cache: a shared token is a token
      // whose age — the entire point of it — is somebody else's.
      'cache-control': 'no-store',
    },
  });
}

export interface Signup {
  firstName: string;
  email: string;
}

/**
 * Validates the two real fields.
 *
 * Returns a field -> reason map rather than sentences, so the component owns
 * every word the visitor reads. Same shape as the contact form's `validate`.
 */
export function validate(signup: Signup): Record<string, SubscribeReason> {
  const bad: Record<string, SubscribeReason> = {};

  if (!signup.firstName) bad.firstName = 'required';
  else if (signup.firstName.length > SUBSCRIBE_LIMITS.FIRST_NAME_MAX) {
    bad.firstName = 'too_long';
  }

  if (!signup.email) bad.email = 'required';
  else if (!isEmail(signup.email)) bad.email = 'bad_email';

  return bad;
}

/**
 * Flattens a value before it is handed to Resend.
 *
 * The first name is stored as a merge field and will be interpolated into the
 * subject or the salutation of a future send, which is a header. A newline in
 * it is a header-injection primitive there, so it is flattened here, at the
 * boundary, rather than trusted to whatever writes the broadcast later.
 */
function flatten(value: string, max: number): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
}

/**
 * Adds the address to the segment. The only provider-specific code here.
 *
 * A failure is reported to the caller rather than swallowed: the visitor is
 * standing in front of the box waiting to be told they are on the list, and
 * "you're on the list" over a rejected write is the one outcome that cannot be
 * recovered from — there is no inbox holding a copy and no address to ask
 * again.
 */
async function addToSegment(signup: Signup, env: SubscribeEnv): Promise<boolean> {
  const res = await fetch('https://api.resend.com/contacts', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: flatten(signup.email, SUBSCRIBE_LIMITS.EMAIL_MAX),
      first_name: flatten(signup.firstName, SUBSCRIBE_LIMITS.FIRST_NAME_MAX),
      // Global subscription status, which is what an unsubscribe link flips.
      // Sent explicitly so a re-sign-up by somebody who once unsubscribed
      // does what they just asked for rather than silently failing to.
      unsubscribed: false,
      segments: [{ id: env.RESEND_SEGMENT_ID }],
    }),
  });

  if (!res.ok) {
    // Resend's body carries the actual reason -- almost always a key without
    // contacts scope, or a segment id from a different account. Logged in
    // full, because the visitor is told only that it failed.
    const detail = await res.text().catch(() => '');
    console.error(`[subscribe] Resend rejected the contact: ${res.status} ${detail}`);
    return false;
  }
  return true;
}

/**
 * Fires the custom event the sign-up automation triggers on.
 *
 * Unlike the contact write, a failure here is logged and swallowed. By this
 * point the address is on the list, which is the thing that cannot be
 * recovered if it is lost; the welcome email is a message Resend will or will
 * not send, and nothing the visitor was promised depends on it -- see the
 * note on `SUBSCRIBE_COPY.success` in `src/lib/subscribe.ts`, which says
 * "Thanks for signing up" and deliberately mentions no email. Reporting a
 * failure instead would tell somebody who IS subscribed that they are not,
 * and their only recovery -- pressing the button again -- would re-add a
 * contact that is already there and fire the event a second time.
 */
async function sendSignupEvent(signup: Signup, env: SubscribeEnv): Promise<void> {
  const res = await fetch('https://api.resend.com/events/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      event: env.RESEND_SIGNUP_EVENT,
      // By address rather than by contact id: the id is in the response from
      // the contact write, but that write is an upsert and an address already
      // in the account comes back the same way, so the address is the one
      // identifier that is correct on both paths.
      email: flatten(signup.email, SUBSCRIBE_LIMITS.EMAIL_MAX),
    }),
  });

  if (!res.ok) {
    // Almost always an event name no automation declares, or a key without
    // the scope. Logged in full: this is the only trace, because the visitor
    // is told the sign-up worked -- which it did.
    const detail = await res.text().catch(() => '');
    console.error(
      `[subscribe] Resend refused the "${env.RESEND_SIGNUP_EVENT}" event for a contact that ` +
        `was added successfully: ${res.status} ${detail}`,
    );
  }
}

export async function handleSubscribe(request: Request, env: SubscribeEnv): Promise<Response> {
  const secret = env.CONTACT_SIGNING_SECRET;

  if (request.method === 'GET') {
    // The token is the only thing the GET route exists for, so a missing
    // secret is fatal here rather than degrading to an unsigned one.
    if (!secret) return json({ error: 'not_configured' }, 503);
    return json({ token: await mintToken(secret) });
  }

  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  if (!secret || !env.RESEND_API_KEY || !env.RESEND_SEGMENT_ID || !env.RESEND_SIGNUP_EVENT) {
    console.error('[subscribe] endpoint hit while unconfigured; sign-up not recorded.');
    return json({ error: 'not_configured' }, 503);
  }

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return json({ error: 'too_large' }, 413);
  }
  const raw = await request.text().catch(() => '');
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413);

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  // The honeypot comes first, and its answer is a fake success: a bot told it
  // failed comes back with different content, a bot told it succeeded moves
  // on. Logged for the same reason as the contact form's — this is the one
  // path that discards a real person's sign-up while telling them it worked,
  // and an autofill that starts filling this field would do it silently and
  // forever.
  const trap = typeof body?.[HONEYPOT_FIELD] === 'string' ? body[HONEYPOT_FIELD].trim() : '';
  if (trap !== '') {
    console.warn(
      `[subscribe] honeypot filled -- sign-up discarded. trap=${JSON.stringify(trap.slice(0, 80))} ` +
        `email=${JSON.stringify(String(body?.email ?? '').slice(0, 80))}`,
    );
    return json({ subscribed: true });
  }

  const verdict = await verifyToken(String(body?.token ?? ''), secret);
  if (verdict !== 'ok') return json({ error: verdict }, verdict === 'too_fast' ? 429 : 400);

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const signup: Signup = {
    firstName: str(body?.firstName),
    email: str(body?.email),
  };

  const bad = validate(signup);
  // `fields` for the component's focus handling, `reasons` for its wording.
  const fields = Object.keys(bad);
  if (fields.length) return json({ error: 'invalid', fields, reasons: bad }, 400);

  try {
    if (!(await addToSegment(signup, env))) return json({ error: 'signup_failed' }, 502);
  } catch (err) {
    // A network failure reaching Resend. Same answer as a rejection: the
    // address did not land anywhere, and saying otherwise loses it silently.
    console.error(`[subscribe] add threw: ${err}`);
    return json({ error: 'signup_failed' }, 502);
  }

  try {
    await sendSignupEvent(signup, env);
  } catch (err) {
    // Swallowed for the reason given on `sendSignupEvent`: the address is
    // already on the list, and this request has nothing left to lose.
    console.error(`[subscribe] event threw after a successful add: ${err}`);
  }

  return json({ subscribed: true });
}
