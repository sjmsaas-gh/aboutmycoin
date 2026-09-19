/**
 * Vercel adapter for the contact form.
 *
 * Deliberately trivial, like the other two. All the logic is in
 * `src/server/contact.ts`, written against the Web `Request`/`Response`
 * interfaces, so moving to Netlify or Cloudflare Pages means writing another
 * file this size. See README, "Hosting".
 *
 * The recipient address arrives here from the environment and goes straight
 * into the handler -- it is never rendered into a page or returned in a
 * response, which is what keeps it off the scrapers' lists.
 */
// No `.ts` extension: Vercel's bundler resolves it, and an explicit extension
// is the kind of thing that builds locally and fails in CI.
import { handleContact } from '../src/server/contact.js';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleContact(request, {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL,
    CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
    CONTACT_SIGNING_SECRET: process.env.CONTACT_SIGNING_SECRET,
  });
}
