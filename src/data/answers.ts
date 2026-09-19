/**
 * The programmatic-SEO registry.
 *
 * This is the worked example of the pattern every site in this family reuses: a
 * typed data module that generates a family of long-tail landing pages, each
 * one answering a question somebody actually types, with its own schema and its
 * own sitemap entry carrying its own `lastmod`.
 *
 * The rules that make it work rather than make it spam:
 *
 *   - **One page per question, and the question is real.** If you cannot say
 *     who types this phrase and what they want, the page should not exist.
 *   - **BLUF.** `answer` is the complete answer in one or two sentences, and it
 *     is rendered as the first paragraph on the page. Someone who reads only
 *     that sentence has been served; an answer engine quoting only that sentence
 *     has quoted something true and self-contained.
 *   - **`updated` is real.** It becomes the sitemap `lastmod` and the schema
 *     `dateModified`. Bumping it without editing the page is lying to a crawler
 *     that can check.
 *   - **Sections stand alone.** Each one survives being quoted out of context,
 *     because that is exactly how a model will use it.
 *
 * RENAME: delete these two examples and write your own. Keep the shape, and
 * keep the discipline -- twenty thin pages generated from a keyword list is the
 * failure mode this pattern is one edit away from.
 */

export interface Answer {
  /** URL segment. Lowercase, hyphenated, and never changed once published. */
  slug: string;
  /** The question as people type it. Becomes the H1 and the <title>. */
  question: string;
  /**
   * The <title>, when the question is too long for one. Google truncates
   * around 60 characters; the H1 keeps the full question either way.
   */
  seoTitle?: string;
  /**
   * The complete answer, in one or two sentences, in plain text.
   *
   * Rendered as the opening paragraph AND used as the `acceptedAnswer` in
   * FAQPage schema, so it must read correctly with no page around it.
   */
  answer: string;
  /** Meta description. Distinct from `answer`; this one may sell a little. */
  description: string;
  /** The single search phrase this page exists for. One, not a list. */
  primaryKeyword: string;
  /**
   * `steps`, when a section is a procedure, render as a numbered list AND
   * become the page's HowTo schema, from the same array. Only the first
   * section with steps is used: a page is one procedure or none.
   */
  sections: { heading: string; paragraphs: string[]; steps?: { name: string; text: string }[] }[];
  /** ISO dates. `updated` drives sitemap lastmod and schema dateModified. */
  published: string;
  updated: string;
  /** Slugs of sibling answers, rendered as in-cluster links. */
  related?: string[];
}

export const ANSWERS: Answer[] = [
  {
    slug: 'example-question-one',
    question: 'What does this starter actually give me?',
    answer:
      'A static Astro site with the SEO, security, analytics, contact and payment plumbing already built and commented, so a new site starts at the product rather than at the boilerplate.',
    description:
      'An example programmatic-SEO landing page, generated from a typed data registry with its own schema, breadcrumbs and sitemap entry.',
    primaryKeyword: 'astro saas starter',
    published: '2026-01-01',
    updated: '2026-01-01',
    sections: [
      {
        heading: 'What is already done',
        paragraphs: [
          'Canonical URLs, Open Graph and Twitter cards, JSON-LD for the organisation and the site, breadcrumbs, a sitemap with per-URL lastmod and priority, robots.txt, llms.txt, and a pre-launch lockdown that hides the whole site from crawlers until you flip one flag.',
          'On the security side: a content security policy, HSTS, referrer policy, frame options and permissions policy, written identically into three host configs so moving hosts is a DNS change.',
        ],
      },
      {
        heading: 'What is deliberately not done',
        paragraphs: [
          'The design. The starter ships a neutral token-driven theme precisely so that it is replaced on every site rather than becoming a house style you have to fight.',
          'The product, the copy, and the keyword map. Those are the parts that make a site worth visiting, and no template can supply them.',
        ],
      },
    ],
    related: ['example-question-two'],
  },
  {
    slug: 'example-question-two',
    question: 'How do I add a page like this one?',
    answer:
      'Add an entry to the ANSWERS array in src/data/answers.ts. The route, the schema, the breadcrumb trail, the hub listing and the sitemap entry are all generated from it.',
    description:
      'How the programmatic-SEO route in this starter turns one data entry into a fully optimised landing page.',
    primaryKeyword: 'programmatic seo astro',
    published: '2026-01-01',
    updated: '2026-01-01',
    sections: [
      {
        heading: 'One entry, five outputs',
        paragraphs: [
          'The dynamic route at src/pages/answers/[slug].astro calls getStaticPaths over this array, so a new entry becomes a new statically rendered page at build time. The hub at /answers lists it, the sitemap picks up its updated date, the FAQPage and Article schema are built from the same fields the page renders, and the breadcrumb trail is derived from the route.',
          'Nothing is typed twice. That is the whole point of the pattern: the page and its structured data cannot drift apart, because they are the same object.',
        ],
      },
      {
        heading: 'When not to use it',
        paragraphs: [
          'When you cannot name the person who searches for the phrase. A generated page that exists to hold a keyword is the thing search engines have spent twenty years learning to discount, and it drags the pages that do deserve to rank down with it.',
        ],
      },
    ],
    related: ['example-question-one'],
  },
];

export const answerBySlug = (slug: string) => ANSWERS.find((a) => a.slug === slug);
