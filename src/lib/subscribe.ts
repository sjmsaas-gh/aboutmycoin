/**
 * The email list's vocabulary and limits, shared by both halves.
 *
 * Same arrangement as `src/lib/contact.ts` and for the same reason: the form
 * (`src/components/SignupForm.astro`) renders its checks from this file and
 * the endpoint (`src/server/subscribe.ts`) validates against it, so the two
 * cannot drift into disagreeing about what a valid sign-up looks like.
 *
 * Nothing secret lives here -- this module is imported by a component and
 * therefore reaches the browser. The API key and the audience id are read from
 * the environment inside `src/server/subscribe.ts`.
 */
import { EMAIL_RE, LIMITS as CONTACT_LIMITS } from './contact.js';

/** Re-exported so the form has one import, not two. Same regex, same reasons. */
export { EMAIL_RE };

/** Where both halves agree the form posts. */
export const SUBSCRIBE_ENDPOINT = '/api/subscribe';

/**
 * Field limits.
 *
 * `FIRST_NAME_MAX` is 40 and the field asks for a first name only. A mailing
 * list needs a name for one job -- putting a word after "Hi" -- and every
 * extra character asked for at a sign-up box costs sign-ups. The address limit
 * is the contact form's, which is the RFC ceiling.
 */
export const SUBSCRIBE_LIMITS = {
  FIRST_NAME_MAX: 40,
  EMAIL_MAX: CONTACT_LIMITS.EMAIL_MAX,
} as const;

/**
 * Why a field was refused. Same reason-not-sentence arrangement as the contact
 * form: the component owns the wording, this module owns the verdict.
 */
export type SubscribeReason = 'required' | 'too_long' | 'bad_email';

/**
 * The sign-up box's copy, in one place.
 *
 * It lives here rather than in the component because the box is meant to
 * appear on more than one page -- the home page today, probably a coin page
 * later -- and two hand-typed copies of a promise about email is how a site
 * ends up promising two different things. See the "one source per fact" rule
 * in CLAUDE.md.
 *
 * Note what the success line does NOT say. It does not mention a confirmation
 * email, because none is sent: the address goes onto the list and the next
 * thing that arrives is the next real send. Promising a message that no code
 * sends is the failure mode CLAUDE.md names by name. The shortest form of that
 * line is the safest one -- there is nothing in "Thanks for signing up" that
 * can come to be untrue.
 */
export const SUBSCRIBE_COPY = {
  heading: 'Be In The Know',
  body:
    "We barely email, but when we do you'll want to see it. For collectors, " +
    'hobbyists, or people who found an old coin up in the attic.',
  button: 'Sign me up',
  /**
   * Shown in place of the whole box -- pitch included -- once the address is
   * on the list. One line, because every sentence that followed it was
   * answering a question nobody who just succeeded is asking.
   */
  success: 'Thanks for signing up',
  /** Sits under the button. States where the address goes, and stops there. */
  privacy: 'Your address goes on the list and nowhere else.',
} as const;

/**
 * The dock's pitch, and only the pitch.
 *
 * The home page's box sits under a hero that has already said what the site
 * is, so it can afford to talk about the emails themselves. The dock arrives
 * over a coin page uninvited, so it has to name what it is offering in the
 * heading or it is a box asking for an address in exchange for nothing.
 *
 * Two headings, one form: everything else -- the button, the privacy line,
 * the success line, the endpoint, the limits -- is `SUBSCRIBE_COPY` in both
 * places, because those are promises and there is only one of each.
 *
 * What is promised here is a send, not a page: the cheat sheets and the
 * calculators go out to the list. Nothing on the site is gated behind the
 * form, and this copy does not say anything is.
 */
export const SUBSCRIBE_DOCK_COPY = {
  ...SUBSCRIBE_COPY,
  heading: 'Free Cheat Sheet & Tools',
  body:
    "Subscribe and we'll send you our free cheat sheet, tools, and " +
    'calculators. Easily reference the better years in a series, calculate ' +
    'melt prices, and more. Completely free!',
} as const;

/**
 * What a caller may vary: the heading and the paragraph above the fields.
 * Structural, so a new place to put the box cannot invent a new promise --
 * `SignupForm` reads everything else off `SUBSCRIBE_COPY` directly.
 */
export type SubscribePitch = { readonly heading: string; readonly body: string };
