/**
 * Tier definitions -- the single source of pricing copy for the whole site.
 *
 * The pricing page, the buy button, the FAQ, the JSON-LD offers and llms.txt
 * all read from here. That is the point: a price change is one edit, and the
 * site cannot end up quoting two different numbers on two different pages.
 *
 * ## Two rules that are not negotiable
 *
 * 1. **Nothing goes in a feature list before it ships.** A list that runs ahead
 *    of the code spends credibility to sell a tier whose real pitch needs no
 *    help, and the first person to notice is a customer who paid for it.
 *
 * 2. **The displayed price and the charged price are two separate systems.**
 *    The numbers here are what the site *says*; what is actually charged comes
 *    from the Stripe price ids in the environment, and nothing enforces that
 *    they agree. The checkout endpoint echoes `amountTotal` so the pair can be
 *    checked from outside with one curl -- see README, "Checking a deployment".
 *
 * RENAME: everything below is placeholder copy. Replace it, keep the shape.
 */

export interface Tier {
  id: 'free' | 'pro';
  name: string;
  price: number;
  priceLabel: string;
  period: string | null;
  tagline: string;
  features: string[];
  /** Rendered with a warning treatment rather than a tick. */
  caveats: string[];
  cta: { label: string; href: string };
  featured: boolean;
}

/**
 * Whether the subscription can be **bought**. Not whether anyone HAS it.
 *
 * Keep this distinction straight. Entitlement is per-visitor and comes from
 * Stripe at runtime; this flag only decides whether a subscribe button is
 * drawn. Computing a feature gate as `PRO_AVAILABLE || unlocked` is the classic
 * way to unlock the paid product for every visitor at once on the day you turn
 * selling on.
 *
 * Requires STRIPE_PRICE_PRO_MONTHLY in the environment, or the button renders
 * and reports not_configured.
 */
export const PRO_AVAILABLE = false;

/** Whether the one-time purchase can be bought yet. */
export const ONE_TIME_AVAILABLE = false;

export const PRO_MONTHLY = 19;
export const PRO_YEARLY = 149;
export const ONE_TIME = 9;

/**
 * How many one-time purchases still cost less than the subscription.
 *
 * Derived, never typed. Every sentence that says "past N of these the monthly
 * plan is cheaper" reads this, so changing a price cannot leave the site making
 * a false arithmetic claim -- which is the one kind of copy error that is most
 * expensive to make.
 */
export const ONE_TIME_UNDER_PRO = Math.floor(PRO_MONTHLY / ONE_TIME);

/** Spelled out, because "more than 2 of them" reads like a spec sheet. */
const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];

/** `ONE_TIME_UNDER_PRO` as an English word, falling back to digits above twelve. */
export const ONE_TIME_UNDER_PRO_WORD =
  NUMBER_WORDS[ONE_TIME_UNDER_PRO] ?? String(ONE_TIME_UNDER_PRO);

export interface OneTimeOffer {
  price: number;
  priceLabel: string;
  name: string;
  /** One sentence, used on the pricing page and in llms.txt alike. */
  tagline: string;
  includes: string[];
  /** The thing it deliberately is not, said plainly rather than buried. */
  limit: string;
}

export const ONE_TIME_OFFER: OneTimeOffer = {
  price: ONE_TIME,
  priceLabel: `$${ONE_TIME}`,
  name: 'One-time',
  tagline:
    'One job to finish and no interest in a subscription. Pay once and the limit comes off for that one piece of work.',
  includes: [
    'Everything the subscription unlocks, for a single use',
    'No account and no subscription to cancel',
    'Does not expire',
  ],
  limit: `It covers the one thing you bought it for. Past ${ONE_TIME_UNDER_PRO_WORD} of them a month the monthly plan costs less.`,
};

/**
 * The endpoint that creates a Checkout Session.
 *
 * Not a static Stripe Payment Link: the session has to be created per purchase
 * so the return URL and any metadata are ours, and so a subscription can be
 * tied back to the page that is waiting on it.
 */
export const CHECKOUT_ENDPOINT = '/api/checkout';

export const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    period: 'forever',
    tagline:
      'Placeholder. Say exactly what the free tier is, including the one thing it does not do — being specific about the limit is what makes the rest believable.',
    features: [
      'Placeholder feature that actually exists',
      'Another one that actually exists',
      'No account, no card, no time limit',
    ],
    caveats: ['Placeholder: the single limit that the paid tier removes'],
    cta: { label: 'Get started', href: '/' },
    featured: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: PRO_MONTHLY,
    priceLabel: `$${PRO_MONTHLY}`,
    period: 'month',
    tagline: `The same thing with the limit removed. $${PRO_YEARLY}/year if you would rather pay once.`,
    features: [
      'Everything in Free',
      'Placeholder: the limit, removed',
      'A license key, still no account',
    ],
    caveats: [],
    cta: { label: 'Subscribe', href: '/pricing' },
    featured: true,
  },
];

export const FREE_TIER = TIERS[0]!;
export const PRO_TIER = TIERS[1]!;

/**
 * The gate, in one paragraph, used verbatim in FAQ answers and llms.txt so the
 * story never contradicts itself between pages.
 */
export const GATE_EXPLAINER =
  `Placeholder. Explain in plain words what the free tier gives away, what the single limit is, and what paying removes. Say it once, here, and quote this constant everywhere else — an explanation that is retyped on three pages drifts into three different stories, and the one a customer reads is whichever contradicts the others.`;
