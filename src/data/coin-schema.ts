/**
 * The shape of the coin catalogue, and nothing else.
 *
 * Types only, plus the two constants the types depend on. No data lives here,
 * because the data has three different lifecycles and this file has none:
 *
 *   coin-schema.ts    the contract           -- changes rarely, by hand
 *   coin-taxonomy.ts  groups, types, tags    -- editorial, always by hand
 *   coin-catalog.ts   the coins themselves   -- seeded by hand, then generated
 *   coins.ts          the API the pages use  -- helpers and validation
 *
 * Splitting them is what makes the catalogue buildable from a database later
 * without touching a route, an editorial paragraph or a test. See the header
 * of coin-catalog.ts for how that is meant to work.
 */


/* ===========================================================================
   Reserved path segments
   =========================================================================== */

/**
 * Segments under /coin-value that are routes rather than groups. A group or
 * type slug colliding with one of these would silently shadow a real page, so
 * `validateTaxonomy()` throws on it at build time.
 *
 * `series` and `country` are reserved ahead of need: both are plausible future
 * routes, and reserving them costs nothing now versus renaming a live URL
 * later.
 */
export const RESERVED_SEGMENTS = ['tagged', 'series', 'country', 'search', 'all'];

/* ===========================================================================
   Types
   =========================================================================== */

/** One source behind a number on a page. SPEC: every valuation shows its working. */
export interface Source {
  name: string;
  url?: string;
  /** What this source was used for, in a few words. */
  used?: string;
}

/** A priced row. Absent until the market-data question in SPEC.md is settled. */
export interface GradedValue {
  /** As collectors write it, e.g. "Good (G-4)" or "Uncirculated (MS-63)". */
  grade: string;
  /** USD. A range, never a point -- condition dominates and we cannot see the coin. */
  low: number;
  high: number;
}

export interface Section {
  heading: string;
  paragraphs: string[];
  steps?: { name: string; text: string }[];
}

/**
 * A composition group: the first segment under /coin-value.
 *
 * Registered here whether or not it has coins yet. A group with no coins gets
 * no page -- an empty archive is thin content with a breadcrumb on it.
 */
export interface Group {
  slug: string;
  /** Sentence-case, singular-ish: "Silver", "Copper and bronze". */
  name: string;
  /** The H1 and the ItemList name. Keyword-led: "Silver Coin Values". */
  h1: string;
  /** The <title>. Under ~60 characters. */
  seoTitle: string;
  /** BLUF. First sentence on the page and the FAQ `acceptedAnswer`. Must stand alone. */
  bluf: string;
  /** Meta description. Distinct from `bluf`; this one may sell a little. */
  description: string;
  /** One phrase. Not three. */
  primaryKeyword: string;
  /**
   * The question this page is marked up as answering, in FAQPage schema.
   *
   * Explicit rather than derived from the heading, for two reasons. Google
   * wants a given question to carry FAQPage markup on ONE page only, and a
   * derivation quietly produces collisions as the catalogue grows --
   * `validateTaxonomy()` throws on a duplicate, which only works if a person
   * chose the words. And a derived question reads like a derived question,
   * which is the opposite of how people search.
   */
  faqQuestion: string;
  /** Phrasings that belong in H2s and body copy on THIS page. Never a second page. */
  secondaryKeywords: string[];
  /** Body copy under the BLUF, before the listing. */
  intro: string[];
  /** Whether metal content is the dominant term in this group's values. */
  meltDriven: boolean;
  updated: string;
}

/**
 * A denomination or format: the second segment. Global, not per-group -- the
 * (group, type) page is generated only where real coins sit at that pair.
 */
export interface CoinType {
  slug: string;
  /** Singular: "Quarter". */
  name: string;
  /** Plural, for headings and listings: "Quarters". */
  namePlural: string;
  /** BLUF for the type, reused across groups with the group named around it. */
  bluf: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  /** Face value in the coin's own currency, when the type fixes one. */
  faceNote?: string;
  updated: string;
}

/**
 * A cross-cutting label. Series, country, theme, format, condition-of-interest.
 *
 * Every tag a coin uses must be registered here, so that every tag page has
 * copy a person wrote. An unregistered tag throws at build time. That is the
 * whole defence against tag sprawl, which is how a tag system becomes a
 * doorway-page generator.
 */
export interface Tag {
  slug: string;
  name: string;
  kind: 'series' | 'country' | 'format' | 'theme' | 'composition';
  h1: string;
  seoTitle: string;
  bluf: string;
  description: string;
  primaryKeyword: string;
  /**
   * The question this page is marked up as answering, in FAQPage schema.
   *
   * Explicit rather than derived from the heading, for two reasons. Google
   * wants a given question to carry FAQPage markup on ONE page only, and a
   * derivation quietly produces collisions as the catalogue grows --
   * `validateTaxonomy()` throws on a duplicate, which only works if a person
   * chose the words. And a derived question reads like a derived question,
   * which is the opposite of how people search.
   */
  faqQuestion: string;
  intro: string[];
  updated: string;
}

export interface Coin {
  /** Final path segment. Lowercase, hyphenated, NEVER changed once published. */
  slug: string;
  /** Composition group slug. A fact about this issue, not about its series. */
  group: string;
  /** Denomination or format slug. */
  type: string;
  /** Registered tag slugs. The series tag is required -- see the header note. */
  tags: string[];

  /** Display name and H1 stem: "1964 Washington Quarter". */
  name: string;
  /**
   * The name without a parenthetical year range, for breadcrumbs and for the
   * generated FAQ question. "Mercury Dime (1916-1945)" is a good H1 and a
   * terrible sentence; this is what goes in the sentence.
   */
  shortName?: string;
  /** The <title>, keyword-led and under ~60 characters where possible. */
  seoTitle: string;
  /**
   * The complete answer in one or two sentences, plain text.
   *
   * Rendered as the opening paragraph AND used as the FAQPage `acceptedAnswer`,
   * so it must read correctly with no page around it. This is the sentence an
   * answer engine will quote; if it is not true standing alone, it is wrong.
   */
  bluf: string;
  description: string;
  primaryKeyword: string;
  secondaryKeywords: string[];

  /** Single year, or an inclusive run when the issues are identical. */
  years: { from: number; to?: number };
  /** As struck on the coin. Omit for Philadelphia issues that carry none. */
  mintMark?: string;
  /** Country of issue. Drives the country tag and the visible spec table. */
  country: string;
  /** Plain-language composition, as a person would read it off a spec sheet. */
  composition: string;
  weightGrams?: number;
  diameterMm?: number;
  /** Actual silver weight, troy ounces. Feeds the melt calculator. */
  silverOzt?: number;
  /** Actual gold weight, troy ounces. */
  goldOzt?: number;
  /** Face value in the issuing currency, as text: "$0.25", "50p". */
  faceValue: string;
  /** Mintage, when it is a published figure and it matters to the answer. */
  mintage?: number;

  /**
   * How easy this is to find. Drives the honest "most coins are worth face
   * value" line, which SPEC.md calls the single most useful thing the site
   * does for someone who has just found a coin.
   */
  commonality: 'very-common' | 'common' | 'scarce' | 'key-date';

  /** How to tell you have this exact coin. Rendered as a checklist AND HowTo schema. */
  identify: string[];

  sections: Section[];

  /** Priced rows. Absent for now -- see the header note. */
  values?: GradedValue[];
  /** The date the priced rows were observed. Required whenever `values` is set. */
  valueAsOf?: string;
  sources?: Source[];

  published: string;
  updated: string;
  /** Slugs of sibling coins, rendered as in-cluster links. */
  related?: string[];
}


/**
 * The honest one-liner about scarcity, generated so it cannot drift from the
 * `commonality` field the rest of the page is filtered by.
 */
export const COMMONALITY_NOTE: Record<Coin['commonality'], string> = {
  'very-common': 'Very common. Large numbers were struck and large numbers survive.',
  common: 'Common. Easy to find, and priced accordingly.',
  scarce: 'Scarce. Fewer survive than the mintage suggests, and demand exceeds supply.',
  'key-date': 'Key date. The scarcest issue in its series, and the one most often counterfeited.',
};
