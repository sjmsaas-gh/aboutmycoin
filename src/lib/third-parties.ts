/**
 * Every third party that touches a visit, derived from configuration.
 *
 * One source per fact. /privacy lists these, and anything else that counts or
 * names them (an "only N outside services" line on /about, say) must read this
 * array too. On memorialprintkit.com /about said "four" while GA4 was switched
 * on and /privacy was, correctly, listing five.
 *
 * Derived rather than typed, so setting or clearing `SITE.ga4` or
 * `SITE.assetOrigin` changes the list without anyone remembering to.
 *
 * RENAME: reword each `role` for what this product actually sends each one.
 * Adding a service to the product means adding it here in the same change.
 */
import { SITE } from './site';

export interface ThirdParty {
  name: string;
  /** What it does, as a sentence fragment that follows " — ". */
  role: string;
}

/*
 * Widened to `string` because SITE is `as const`: with a value set, the literal
 * type narrows one branch below to `never`.
 */
const assetOrigin: string = SITE.assetOrigin;
const ga4: string = SITE.ga4;

export const THIRD_PARTIES: ThirdParty[] = [
  {
    name: 'The host',
    role: 'serves the pages and keeps server logs.',
  },
  {
    name: 'Stripe',
    role: 'payment, and the record of who is subscribed.',
  },
  {
    name: 'Resend',
    role: 'sends the contact-form email and the license key email.',
  },
  ...(assetOrigin
    ? [
        {
          name: `${assetOrigin.replace(/^https?:\/\//, '')} (Cloudflare R2)`,
          role: 'our asset host. It sends large files to your browser. Files come from it; nothing of yours goes to it.',
        },
      ]
    : []),
  ...(ga4
    ? [
        {
          name: 'Google Analytics 4',
          role: 'page views, after your first interaction.',
        },
      ]
    : []),
];

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** "three", for prose. Falls back to digits past nine. */
export const THIRD_PARTY_COUNT_WORD = WORDS[THIRD_PARTIES.length] ?? String(THIRD_PARTIES.length);
