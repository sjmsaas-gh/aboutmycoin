/**
 * The contact form — server half.
 *
 * Host-agnostic like the rest of `src/server`: plain Web `Request`/`Response`
 * and `fetch`, no SDK, so the Vercel adapter in `api/contact.ts` is a dozen
 * lines and a move to Netlify or Cloudflare Pages is another file that size.
 *
 * Two routes on one path:
 *
 *   GET  /api/contact   -> { token }   a signed timestamp, issued on first
 *                                     interaction with the form
 *   POST /api/contact   -> { sent }    validates, then hands the message to
 *                                     Resend
 *
 * It stores nothing. There is no database on this project and a contact form is
 * not a good enough reason to acquire one, so the mailbox is the only record.
 *
 * ## Where the recipient address lives
 *
 * `CONTACT_TO_EMAIL` is read from the environment and never leaves this
 * module. It is not in `src/lib/contact.ts`, not in the page, and not in any
 * JSON response — those all reach the browser, and an address in a client
 * bundle is an address in a scraper's list within the week. The browser posts a
 * message to an endpoint; it is never told where that message goes.
 *
 * ## Spam prevention, and what it is actually worth
 *
 * Four cheap layers, none of which asks the customer to identify a bicycle:
 *
 *   1. **A signed, timed token.** Issued by the GET route, HMAC'd with
 *      `CONTACT_SIGNING_SECRET`, checked on POST. A bot that POSTs straight at
 *      the endpoint has no token and cannot mint one; a bot that scrapes the
 *      page for a hidden value finds nothing to scrape, because the token is
 *      not in the HTML — the page is static and identical for everyone.
 *   2. **A minimum fill time** (`MIN_FILL_SECONDS`), measured from token issue.
 *      Form-stuffers submit in milliseconds.
 *   3. **A honeypot field** a human never sees. Filled in means bot, and the
 *      reply is a cheerful 200 that sends nothing — a bot told "rejected"
 *      retries with different content, a bot told "sent" moves on.
 *   4. **Field and content limits**, including a cap on links in the body,
 *      which is the one thing every SEO spam run has in common.
 *
 * What this does NOT do, deliberately:
 *
 *   - **No per-IP rate limit.** Edge functions have no shared state, so any
 *     counter here would be per-instance and therefore a lie. Getting a real
 *     one means a KV store, i.e. the database this project does not have.
 *   - **No token single-use.** Same reason: marking a token spent needs
 *     storage. A captured token is replayable until it expires, which is what
 *     the short `TOKEN_MAX_AGE_SECONDS` window is for.
 *
 * If a determined human ever aims a spam run at this form, the answer is
 * Cloudflare Turnstile in front of the POST, not more heuristics here. Until
 * then this is the amount of defence a contact form on a small site earns.
 */
import { SITE } from '../lib/site.js';
import {
  HONEYPOT_FIELD,
  LIMITS,
  MIN_FILL_SECONDS,
  TOKEN_MAX_AGE_SECONDS,
  isEmail,
  isMessageType,
  messageTypeLabel,
  type Reason,
} from '../lib/contact.js';

/** Bytes of HMAC kept in a token. 12 bytes -> 16 base64url characters. */
const TOKEN_SIG_BYTES = 12;

/**
 * Hard ceiling on the POST body, checked before it is read.
 *
 * The fields together cannot legitimately exceed a few kilobytes; this stops
 * a megabyte of JSON being pushed through the function on every request.
 */
const MAX_BODY_BYTES = 16 * 1024;

export interface ContactEnv {
  /**
   * Resend API key. Absent means the form is not configured and the endpoint
   * says so with a 503 — unlike the licence email, which is a backup delivery
   * path and is allowed to be silently absent. A contact form that accepts a
   * message and drops it is worse than one that admits it is broken.
   */
  RESEND_API_KEY?: string;
  /**
   * Where the mail goes, e.g. `someone@example.com`.
   *
   * **Required, with no default in the source.** A default would put a real
   * inbox address into git, which is the same mistake as putting it in the
   * page, only slower to notice.
   */
  CONTACT_TO_EMAIL?: string;
  /**
   * Envelope sender, e.g. `Example <contact@example.com>`. Must be on a domain
   * verified in Resend, or the mail is accepted and then filed as spam.
   */
  CONTACT_FROM_EMAIL?: string;
  /**
   * HMAC secret for form tokens. Any long random string.
   *
   * Rotating it invalidates tokens already issued, which costs at most one
   * "please try again" for anyone mid-message at the moment of deploy.
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

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(mac).slice(0, TOKEN_SIG_BYTES));
}

/** Mints a token that says "a form was opened at this second". */
export async function mintToken(
  secret: string,
  issuedAt = Math.floor(Date.now() / 1000),
): Promise<string> {
  return `${issuedAt}.${await sign(String(issuedAt), secret)}`;
}

export type TokenVerdict = 'ok' | 'bad_token' | 'expired' | 'too_fast';

/**
 * Checks a token's signature and its age.
 *
 * The three failure modes are kept distinct because they mean different things
 * to the person at the keyboard: a bad signature is a bot or a tampered page,
 * an expired one means "reload and try again", and too-fast means "press send
 * once more". Collapsing them into one error would make the friendliest of the
 * three impossible to word correctly.
 */
export async function verifyToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<TokenVerdict> {
  const match = /^(\d{10,13})\.([A-Za-z0-9_-]{16})$/.exec(token.trim());
  if (!match) return 'bad_token';
  const issuedAt = Number(match[1]);

  const expected = await sign(String(issuedAt), secret);
  const given = match[2]!;
  // Constant time. The value compared is a MAC rather than a secret, so a
  // timing leak here is not catastrophic, but a variable-time compare on a
  // signature check is the kind of thing that is only ever wrong.
  if (expected.length !== given.length) return 'bad_token';
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  if (diff !== 0) return 'bad_token';

  const age = nowSeconds - issuedAt;
  // A token from the future is a clock skew or a forgery attempt against the
  // fill-time check; either way it is not usable.
  if (age < 0 || age > TOKEN_MAX_AGE_SECONDS) return 'expired';
  if (age < MIN_FILL_SECONDS) return 'too_fast';
  return 'ok';
}

/** Counts things that look like links, however they are spelled. */
function countLinks(text: string): number {
  return (text.match(/\b(?:https?:\/\/|www\.)\S+|\[url[=\]]/gi) ?? []).length;
}

/**
 * Flattens a value for use in a mail header.
 *
 * This is load-bearing. The customer's name goes into the Subject and their
 * address into Reply-To, and a newline in either is a header-injection
 * primitive: `Name\nBcc: everyone@example.com`. Resend's JSON API is not
 * obviously vulnerable to it, but "the provider probably escapes this" is not a
 * reason to hand it something that needs escaping.
 */
function headerSafe(value: string, max: number): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
}

/** HTML-escapes a value bound for the email body. */
function esc(value: string): string {
  return value.replace(/[&<>"]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
  );
}

export interface ContactMessage {
  name: string;
  email: string;
  messageType: string;
  message: string;
}

/**
 * Validates the four real fields.
 *
 * Returns a field -> reason map rather than sentences: the page owns the
 * wording, and this module stays out of the business of writing copy. The
 * reason is what makes the copy possible to write at all — `too_short` and
 * `too_many_links` both land on `message` and want opposite advice.
 */
export function validate(msg: ContactMessage): Record<string, Reason> {
  const bad: Record<string, Reason> = {};

  if (!msg.name) bad.name = 'required';
  else if (msg.name.length > LIMITS.NAME_MAX) bad.name = 'too_long';

  if (!msg.email) bad.email = 'required';
  else if (!isEmail(msg.email)) bad.email = 'bad_email';

  if (!isMessageType(msg.messageType)) bad.messageType = 'unknown_type';

  if (!msg.message) bad.message = 'required';
  else if (msg.message.length < LIMITS.MESSAGE_MIN) bad.message = 'too_short';
  else if (msg.message.length > LIMITS.MESSAGE_MAX) bad.message = 'too_long';
  else if (countLinks(msg.message) > LIMITS.LINKS_MAX) bad.message = 'too_many_links';

  return bad;
}

/**
 * The subject line.
 *
 * The name is in there for one specific reason: Gmail collapses consecutive
 * messages with an identical subject into a single thread, so a fixed subject
 * would file every stranger's first message as a reply to the last one's.
 * Varying it per sender keeps them as separate conversations.
 */
export function subjectFor(name: string): string {
  return `${SITE.domain} - Contact Form (${headerSafe(name, 60)})`;
}

function bodyHtml(msg: ContactMessage): string {
  const rows: [string, string][] = [
    ['Name', msg.name],
    ['Email', msg.email],
    ['Type', messageTypeLabel(msg.messageType)],
  ];
  return [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#222">',
    '<table style="border-collapse:collapse;margin-bottom:16px">',
    ...rows.map(
      ([k, v]) =>
        `<tr><td style="padding:2px 12px 2px 0;color:#666">${k}</td><td style="padding:2px 0"><strong>${esc(v)}</strong></td></tr>`,
    ),
    '</table>',
    // pre-wrap, not <br> substitution: the message is text the sender typed and
    // their line breaks and indentation are part of what they wrote.
    `<div style="white-space:pre-wrap;border-left:3px solid #e2ded7;padding-left:12px">${esc(msg.message)}</div>`,
    `<p style="color:#666;font-size:13px;margin-top:20px">Sent from the contact form on ${SITE.domain}. Reply to this email to answer the sender directly.</p>`,
    '</div>',
  ].join('');
}

function bodyText(msg: ContactMessage): string {
  return [
    `Name:  ${msg.name}`,
    `Email: ${msg.email}`,
    `Type:  ${messageTypeLabel(msg.messageType)}`,
    '',
    msg.message,
    '',
    '--',
    `Sent from the contact form on ${SITE.domain}.`,
    'Reply to this email to answer the sender directly.',
  ].join('\n');
}

/**
 * Hands the message to Resend. The only provider-specific code here.
 *
 * Unlike the licence email, a failure is reported to the caller: the sender is
 * standing in front of the form waiting to know whether their message went
 * anywhere, and "thanks, sent!" over a rejected send is a lie that loses the
 * message and the customer at once.
 */
async function send(msg: ContactMessage, env: ContactEnv): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM_EMAIL,
      to: env.CONTACT_TO_EMAIL,
      // So that hitting Reply in the inbox answers the customer rather than
      // our own sending address. The value is a sender-supplied address that
      // passed `isEmail`, and is flattened again here because it lands in a
      // header.
      reply_to: headerSafe(msg.email, LIMITS.EMAIL_MAX),
      subject: subjectFor(msg.name),
      html: bodyHtml(msg),
      text: bodyText(msg),
    }),
  });

  if (!res.ok) {
    // Resend's body carries the actual reason — almost always an unverified
    // `from` domain or a key without send permission. Logged in full, because
    // the sender is told only that it failed.
    const detail = await res.text().catch(() => '');
    console.error(`[contact] Resend rejected the send: ${res.status} ${detail}`);
    return false;
  }
  return true;
}

export async function handleContact(request: Request, env: ContactEnv): Promise<Response> {
  const secret = env.CONTACT_SIGNING_SECRET;

  if (request.method === 'GET') {
    // The token is the only thing the GET route exists for, so a missing secret
    // is fatal here rather than degrading to an unsigned one.
    if (!secret) return json({ error: 'not_configured' }, 503);
    return json({ token: await mintToken(secret) });
  }

  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  if (!secret || !env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
    console.error('[contact] endpoint hit while unconfigured; message not delivered.');
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

  // The honeypot comes first, and its answer is a fake success. See the note at
  // the top of the file: a bot that is told it failed comes back.
  const trap = typeof body?.[HONEYPOT_FIELD] === 'string' ? body[HONEYPOT_FIELD].trim() : '';
  if (trap !== '') {
    /*
     * Logged, and this line is the whole reason it is not a bare `return`.
     *
     * A honeypot trip is the only outcome in this endpoint that discards a
     * message while telling the sender it arrived. That is correct for a bot
     * and catastrophic for a human, and the risk of a human tripping it is not
     * zero -- a password manager that decides to fill the trap field would bin
     * real mail silently, forever, with nobody on either end any the wiser.
     *
     * So the trap value goes to the logs (autofill leaves something plausible;
     * spam leaves a URL), along with enough of the sender's details to reach
     * them and ask for the message again. Deliberately NOT the message body:
     * the point is to notice a false positive and recover the person, not to
     * keep a copy of what everyone writes in application logs.
     */
    console.warn(
      `[contact] honeypot filled -- message discarded. trap=${JSON.stringify(trap.slice(0, 80))} ` +
        `name=${JSON.stringify(String(body?.name ?? '').slice(0, 40))} ` +
        `email=${JSON.stringify(String(body?.email ?? '').slice(0, 80))}`,
    );
    return json({ sent: true });
  }

  const verdict = await verifyToken(String(body?.token ?? ''), secret);
  if (verdict !== 'ok') return json({ error: verdict }, verdict === 'too_fast' ? 429 : 400);

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const msg: ContactMessage = {
    name: str(body?.name),
    email: str(body?.email),
    messageType: str(body?.messageType),
    message: str(body?.message),
  };

  const bad = validate(msg);
  // `fields` for the page's focus handling, `reasons` for its wording. Both,
  // rather than one derived from the other, so neither half has to guess.
  const fields = Object.keys(bad);
  if (fields.length) return json({ error: 'invalid', fields, reasons: bad }, 400);

  try {
    if (!(await send(msg, env))) return json({ error: 'send_failed' }, 502);
  } catch (err) {
    // A network failure reaching Resend. Same answer as a rejection: the
    // message did not arrive, and saying otherwise would lose it silently.
    console.error(`[contact] send threw: ${err}`);
    return json({ error: 'send_failed' }, 502);
  }

  return json({ sent: true });
}
