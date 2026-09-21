/**
 * The contact form's vocabulary and limits, shared by both halves.
 *
 * The page (`src/pages/contact.astro`) renders the select options and the
 * client-side checks from this file; the endpoint (`src/server/contact.ts`)
 * validates against the same file. That is the whole reason it exists: a
 * message type present in the dropdown but missing from the server's allow-list
 * is a form that looks fine and rejects one option, and that bug is invisible
 * until a customer picks it.
 *
 * Nothing secret lives here -- this module is imported by a page and therefore
 * reaches the browser. The recipient address and the signing secret are read
 * from the environment inside `src/server/contact.ts` and never appear in any
 * shared module for exactly that reason.
 */

/**
 * The message types, in the order they are offered.
 *
 * `id` is what crosses the wire and what appears in the email; `label` is what
 * a human picks. Ids are stable -- renaming one silently invalidates any
 * bookmarked or prefilled link and changes what the inbox filters see, so add a
 * new id rather than editing an old one.
 *
 * The first entry is what the select opens on -- there is no blank "choose
 * one" option, because a dropdown that starts unanswered is the one required
 * field nobody understands the error for. So the order is not cosmetic: the
 * message that arrives unread-and-unchanged is a `technical`, which is the one
 * worth seeing first in the inbox.
 */
export const MESSAGE_TYPES = [
  { id: 'technical', label: 'Technical issue' },
  { id: 'coin-request', label: 'Ask for a coin to be added' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'suggestion', label: 'Suggestion' },
  { id: 'correction', label: 'Something on a page is wrong' },
  { id: 'other', label: 'Other' },
] as const;

export type MessageTypeId = (typeof MESSAGE_TYPES)[number]['id'];

/** Label for an id, or the id itself if it is not one we know. */
export function messageTypeLabel(id: string): string {
  return MESSAGE_TYPES.find((t) => t.id === id)?.label ?? id;
}

export function isMessageType(id: unknown): id is MessageTypeId {
  return typeof id === 'string' && MESSAGE_TYPES.some((t) => t.id === id);
}

/**
 * Field limits. Enforced on the server; mirrored into `maxlength` on the inputs
 * so the browser stops someone a character short of a rejection instead of
 * letting them write a wall of text and then refusing it.
 *
 * `MESSAGE_MIN` is 10, and it is low on purpose. Count what real messages to a
 * contact form look like:
 *
 *     "Love it, thank you!"  19
 *     "The app crashes"      15
 *     "HEIC will not open"   18
 *
 * A testimonial is naturally short, and so is the first line of a bug report,
 * and a floor that tells someone to pad one out is pedantry at the worst
 * possible moment. On the site this came from it was, by a wide margin, the
 * largest source of rejected genuine messages: a bigger one than every bot
 * check combined. Ten still catches "hi" and "test", which is all it was ever
 * for. Do not raise it without counting again.
 */
export const LIMITS = {
  NAME_MAX: 80,
  EMAIL_MAX: 254,
  MESSAGE_MIN: 10,
  MESSAGE_MAX: 4000,
  /** Links in the message body. Six is generous for a genuine bug report. */
  LINKS_MAX: 6,
  /**
   * Remaining characters at which the counter appears.
   *
   * The counter exists because `maxlength` truncates a longer PASTE silently:
   * without it, someone pasting 6,000 characters sends 4,000 and is told
   * nothing about the 2,000 that went missing.
   */
  COUNTER_SHOWS_AT: 400,
} as const;

/**
 * Deliberately loose email check: one @, something either side, a dot in the
 * domain, no whitespace.
 *
 * A stricter regex is a liability, not an improvement. The only authority on
 * whether an address exists is the mail server, and every "clever" pattern in
 * circulation rejects some real address -- usually a new TLD or a plus tag --
 * which turns a typo-catcher into a wall between you and a paying customer. The
 * cost of accepting a bad address here is one bounced reply.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isEmail(value: string): boolean {
  return value.length <= LIMITS.EMAIL_MAX && EMAIL_RE.test(value);
}

/**
 * Name of the honeypot field.
 *
 * Not `website`, `url` or `phone`: browsers autofill those, and a honeypot that
 * the customer's own password manager fills in silently discards real mail. The
 * prefix makes a collision with anything a browser recognises unlikely -- if
 * you change it, keep a nonsense prefix for the same reason.
 */
export const HONEYPOT_FIELD = 'hp_ref_url';

/**
 * Seconds a human needs, at minimum, to fill this in.
 *
 * Measured from when the form token is issued (first interaction), not from
 * page load, so someone who reads the page for a while and then types quickly
 * is not punished. Tripping it is not fatal -- the endpoint says "too fast" and
 * the same token works on a second press a moment later.
 */
export const MIN_FILL_SECONDS = 3;

/**
 * How long a form token stays valid.
 *
 * Long enough to write a considered bug report and go make coffee; short enough
 * that a captured token is not a lasting asset (nothing here can mark a token
 * spent -- see the note on storage in `src/server/contact.ts`).
 *
 * Lives in the shared module because both halves need it: the server enforces
 * it, and the page uses it to work out when to quietly replace a token it is
 * still holding.
 */
export const TOKEN_MAX_AGE_SECONDS = 2 * 60 * 60;

/**
 * Age at which the page swaps a token for a fresh one, before submitting.
 *
 * The token carries its issue time in the clear, so the page can read its own
 * age and act before the server has to refuse anything. This is what keeps the
 * "this page has been open a while, reload it" message off the screen of
 * someone who started a message, was interrupted for two hours, and came back
 * to finish it -- the one failure path where the fix cost them their text.
 *
 * Must stay comfortably below TOKEN_MAX_AGE_SECONDS; there is a test.
 */
export const TOKEN_REFRESH_SECONDS = 90 * 60;

/**
 * Why a field was refused.
 *
 * Distinct reasons rather than one per field, because "too short" and "too many
 * links" both land on `message` and want opposite advice -- a single string
 * covering both once told someone who had written three thousand characters to
 * "write at least 20".
 */
export type Reason =
  | 'required'
  | 'too_long'
  | 'bad_email'
  | 'unknown_type'
  | 'too_short'
  | 'too_many_links';

/** The issue time carried in a token, or null if it is not one. */
export function tokenIssuedAt(token: string | null): number | null {
  const match = /^(\d{10,13})\./.exec(token ?? '');
  return match ? Number(match[1]) : null;
}
