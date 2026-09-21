/**
 * Vercel adapter for the email sign-up box.
 *
 * Deliberately trivial, like the other three. All the logic is in
 * `src/server/subscribe.ts`, written against the Web `Request`/`Response`
 * interfaces, so moving to Netlify or Cloudflare Pages means writing another
 * file this size. See README, "Hosting".
 *
 * The segment id and the event name arrive from the environment and go
 * straight into the handler. Neither is ever rendered into a page or returned
 * in a response: the segment names a list of other people's addresses, and an
 * id in a client bundle is an id anyone can POST at with the right key one
 * leak later.
 */
// No `.ts` extension: Vercel's bundler resolves it, and an explicit extension
// is the kind of thing that builds locally and fails in CI.
import { handleSubscribe } from '../src/server/subscribe.js';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleSubscribe(request, {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_SEGMENT_ID: process.env.RESEND_SEGMENT_ID,
    RESEND_SIGNUP_EVENT: process.env.RESEND_SIGNUP_EVENT,
    // Shared with the contact form on purpose -- see the note in
    // src/server/subscribe.ts.
    CONTACT_SIGNING_SECRET: process.env.CONTACT_SIGNING_SECRET,
  });
}
