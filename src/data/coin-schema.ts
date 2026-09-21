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
 * `series`, `country` and `graded` are reserved ahead of need: all three are
 * plausible future routes -- `graded` is already spoken for by `gradedPath()`
 * in coins.ts -- and reserving them costs nothing now versus renaming a live
 * URL later.
 */
export const RESERVED_SEGMENTS = ['tagged', 'series', 'country', 'search', 'all', 'graded'];

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
/*
 * ---------------------------------------------------------------------------
 * EVERY COPY FIELD BELOW IS AN OVERRIDE
 * ---------------------------------------------------------------------------
 *
 * `src/lib/catalog-copy.ts` generates an H1, a <title>, a meta description, an
 * FAQ question, an opening answer, section headings and body copy for every
 * archive page from the facts the catalogue already holds. A group or tag
 * therefore needs `slug`, `name` and `kind`/`meltDriven`, and nothing else:
 * registering one is a structural act, not a writing assignment.
 *
 * Fill a copy field when the generated form is genuinely worse for that
 * subject. It then wins for that field alone, and the rest of the page stays
 * generated. `validateCatalogCopy()` throws if what you write is what the
 * generator would have produced anyway, because retyped copy is a second place
 * to drift from.
 *
 * The scale is the argument. Nine groups could be written by hand; hundreds of
 * tags cannot, and the half that would get written are the half that would be
 * believed over the half that did not.
 */
export interface Group {
  slug: string;
  /** Sentence-case, singular-ish: "Silver", "Copper and bronze". */
  name: string;
  /** Override: the H1 and the ItemList name. Keyword-led: "Silver Coin Values". */
  h1?: string;
  /** Override: the <title>. Under ~60 characters, and checked. */
  seoTitle?: string;
  /** Override: BLUF, the first sentence and the FAQ `acceptedAnswer`. Must stand alone. */
  bluf?: string;
  /** Override: meta description. Distinct from `bluf`; this one may sell a little. */
  description?: string;
  /** Override: one phrase. Not three. */
  primaryKeyword?: string;
  /**
   * Override: the question this page is marked up as answering, in FAQPage
   * schema.
   *
   * The generated form is "What are silver coins worth?" or "Are clad coins
   * worth anything?", chosen by `meltDriven`, and every one contains the
   * group's name, which is unique. Write one when the phrase people type is
   * not either of those. Google wants a question marked up once, so
   * `validateCatalogCopy()` fails the build on two pages claiming one
   * question, whether they were written or generated.
   */
  faqQuestion?: string;
  /** Override: phrasings that belong in H2s and body copy on THIS page. Never a second page. */
  secondaryKeywords?: string[];
  /**
   * Override: body copy under the BLUF, REPLACING the generated paragraphs.
   *
   * Rarely what you want. The generated paragraphs say how many coins are in
   * the group, what years they span, which denominations they reach and what
   * the metal contributes, and replacing them throws all of that away. Use
   * `notes` to add a fact instead.
   */
  intro?: string[];
  /**
   * Paragraphs that go AFTER the generated body, for facts the formula cannot
   * derive.
   *
   * This is where hand-written prose belongs: the 1964/1965 cut-off, that
   * melting United States cents is illegal, that a one-ounce Gold Eagle weighs
   * 33.93 grams. The generated paragraphs still render above them, so a page
   * keeps its year span and gains the specifics -- which is the difference
   * between a formula with exceptions and a formula nobody trusts.
   */
  notes?: string[];
  /** Whether metal content is the dominant term in this group's values. */
  meltDriven: boolean;
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
}

/**
 * A cross-cutting label. Series, country, theme, format, condition-of-interest.
 *
 * Every tag a coin uses must be registered here, so that every tag page has
 * copy a person wrote. An unregistered tag throws at build time. That is the
 * whole defence against tag sprawl, which is how a tag system becomes a
 * doorway-page generator.
 */
/**
 * One mint that struck a series, for the "where it was minted" row.
 *
 * `mark` is what is actually punched on the coin, and an empty string is the
 * correct value for Philadelphia on most issues -- it struck no mark at all,
 * and "none" is a fact a reader needs rather than a gap in the data.
 */
export interface Mint {
  /** "Philadelphia", "Denver", "San Francisco". */
  city: string;
  /** As struck: "D", "S", or '' for no mark. */
  mark: string;
  /** Inclusive years this mint struck the series, when it differs from the run. */
  years?: { from: number; to?: number };
  /** One clause, when this mint's issues need a caveat. */
  note?: string;
}

/**
 * A metal era within a series: the reason a series can span two composition
 * groups. Rendered as the "what changed and when" row, which is the single
 * most useful fact about a series that changed alloy mid-run.
 */
export interface CompositionEra {
  years: { from: number; to?: number };
  /** Plain language, matching `Coin.composition` for the issues inside it. */
  composition: string;
  /** The group slug these years file under, so the row can link to the archive. */
  group: string;
}

/**
 * One issue in a series that is worth conspicuously more than the rest.
 *
 * A label and a reason, never a price. Which dates are scarce is settled and
 * has been for a century; what they fetch is true for a week, which is why
 * `why` explains the scarcity rather than quoting a figure. `mintage` is the
 * one number here because it is a published mint total that will not be
 * revised, and because it is the evidence for the claim sitting next to it.
 */
export interface KeyDate {
  /** As collectors and dealers write it: "1932-D", "1916-D", "1893-S". */
  label: string;
  /** Published mintage, when there is one. Circulation strikes unless `note` says otherwise. */
  mintage?: number;
  /** Why this one and not the date beside it. One sentence, standing alone. */
  why: string;
  /**
   * The catalogue slug of this date's own page, once it has one.
   *
   * Left unset until the coin exists -- `validateTaxonomy()` throws on a slug
   * that is not in the catalogue, exactly as it does for `Coin.related`, so a
   * key date links out the day its page is built and reads as plain text
   * until then. That is the whole mechanism; there is no placeholder page.
   */
  coin?: string;
}

/**
 * A die or striking variety within a series.
 *
 * Distinct from a key date: a key date is read off the coin's date and mint
 * mark and needs no judgement, whereas a variety needs the reader to look at
 * a specific feature and decide. That difference is why `lookFor` is required
 * and why `caution` exists -- most people who think they have a doubled die
 * have machine doubling, and a page that lists the variety without saying so
 * is a page that sets someone up for a disappointing trip to a dealer.
 */
export interface Variety {
  /** "1955 doubled die obverse", "1878 8 tail feathers". */
  label: string;
  /** The feature on the coin itself, in one clause. What to put under a loupe. */
  lookFor: string;
  /** The common lookalike, or the reason to have it authenticated. */
  caution?: string;
}

/**
 * A striking or planchet mistake known on this series.
 *
 * Distinct from a variety, and the distinction is mechanical rather than
 * pedantic. A variety is a die: every coin struck from that die pair carries
 * it, which is why `Variety.lookFor` names a feature and the reader decides.
 * An error is one coin going wrong -- a planchet left in a tote bag, a blank
 * of the wrong alloy fed into the press -- and no amount of looking settles
 * one. A scale or a magnet settles it in seconds. That is why `check` is the
 * required field here and there is nothing to look at.
 *
 * `caution` is required, where on a Variety it is optional. Every row in this
 * list is a coin somebody would like to own, so every row is one that gets
 * faked, and the confirmed population is usually in the dozens. A row that
 * states the error without stating what the reader almost certainly has
 * instead is a row that sends somebody to a dealer to be told no.
 *
 * There is no `coin` field, deliberately. Errors and varieties are listed and
 * never linked: each one is a specialty with its own literature, its own
 * authentication problem and an audience this site is not written for, and a
 * page per variety is a divergence that never converges. Key dates link,
 * because a key date is an ordinary issue of the series that happens to be
 * scarce -- it is a catalogue coin like any other.
 */
export interface MintError {
  /** As it is catalogued: "1943 bronze cent", "1965 silver quarter". */
  label: string;
  /** What went wrong at the mint, in one clause. */
  what: string;
  /**
   * The measurement that settles it: a weight, a magnet, the edge.
   *
   * Written so it can be carried out at a kitchen table with no vocabulary,
   * because that is who is reading. A test the reader cannot perform is the
   * same as no test.
   */
  check: string;
  /** The confirmed population, when there is a published census. */
  known?: string;
  /** What the reader almost certainly has instead. Required -- see above. */
  caution: string;
}

/**
 * Structured facts about a series, hung on its tag.
 *
 * Only a `kind: 'series'` tag carries this, and it is optional even then --
 * a series with no researched facts renders its prose intro and nothing else,
 * rather than a table of blanks. Every field here is a published mint fact
 * with a stable answer, which is what makes it safe to render as a bare row
 * with no hedging: unlike a price, none of it moves.
 *
 * This is also the answer to "should there be a /coin-value/series tree".
 * There should not: a series is already a tag, the tag already has a page,
 * and a second URL for the same subject is the site competing with itself.
 * The series tag page is the series page, and this is what fills it.
 */
export interface SeriesInfo {
  /** The full run, both ends. `to` omitted means it is still being struck. */
  years: { from: number; to?: number };
  /** Every mint that struck it. */
  mints: Mint[];
  /**
   * Where the mint mark is, for a reader who cannot find one.
   *
   * A series fact rather than a coin fact, and often the single most useful
   * sentence on the page: a mark that moved mid-series -- the Washington
   * quarter's went from the reverse to the obverse -- is why somebody decides
   * their coin has no mint mark when it does. Say both positions in one
   * sentence when it moved.
   */
  mintMarkLocation?: string;
  /** The metal eras, in order. One entry for a series that never changed. */
  compositions: CompositionEra[];
  designer?: string;
  obverse?: string;
  reverse?: string;
  /** Edge type, as a person would read it: "Reeded", "Plain". */
  edge?: string;
  /**
   * The dates that carry a premium over the common ones.
   *
   * Not prices -- a date is a durable fact, a price is not. Scarcest first,
   * because the list is read from the top and the first row is the one the
   * reader is hoping for.
   */
  keyDates?: KeyDate[];
  /** Die and striking varieties, chronological. See `Variety` on why these are separate. */
  varieties?: Variety[];
  /**
   * Mint errors documented on this series, and only on this series.
   *
   * Off-centre strikes, clipped planchets and die cracks happen to every coin
   * ever struck and belong in a common question, not repeated on every series
   * page as filler. What goes here is the error this series is actually known
   * for -- the 1943 bronze cent, the 1965 silver quarter -- with the census
   * and the test. Most series have none, and then the section does not render.
   */
  errors?: MintError[];
}

/**
 * A cross-cutting view, and the unbounded half of the taxonomy.
 *
 * Two required facts and a date. Everything else is an override -- see the note
 * above `Group` -- because this is the registry that grows to hundreds of
 * entries: every series, every country, every category anyone files coins
 * under. `kind` is not cosmetic, it chooses the shape of the generated copy:
 * a series page answers "which years are silver", a country page answers "what
 * are coins from here worth", and those are not the same page with a word
 * changed.
 */
export interface Tag {
  slug: string;
  name: string;
  kind: 'series' | 'country' | 'format' | 'theme' | 'composition';
  /** Override: the H1. Generated from `name` and `kind` otherwise. */
  h1?: string;
  /** Override: the <title>. */
  seoTitle?: string;
  /** Override: BLUF, the first sentence and the FAQ `acceptedAnswer`. */
  bluf?: string;
  /** Override: meta description. */
  description?: string;
  /** Override: the one phrase this page is for. */
  primaryKeyword?: string;
  /**
   * Override: the question this page is marked up as answering.
   *
   * The generated form for a series whose metal changed mid-run is "Which
   * Washington quarters are silver?", read off `series.compositions`, because
   * that is the question somebody holding one has and the answer is a date
   * rather than a price. Every other kind gets "What are X coins worth?".
   */
  faqQuestion?: string;
  /** Override: body copy under the BLUF, REPLACING the generated paragraphs. See `Group`. */
  intro?: string[];
  /** Paragraphs after the generated body, for facts the formula cannot derive. See `Group`. */
  notes?: string[];
  /** Structured mint facts. `kind: 'series'` only, and optional even there. */
  series?: SeriesInfo;
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
  /**
   * What is on each face of THIS issue, in one clause.
   *
   * Coin-level rather than series-level because a long series outlives its own
   * artwork -- the Washington quarter's reverse is a heraldic eagle in 1964 and
   * a commemorative design in 2005. Describing the coin from its series is how
   * a page ends up confidently wrong about the object in the reader's hand.
   */
  obverse?: string;
  reverse?: string;
  /**
   * The mints that struck this issue, with the mark each one used.
   *
   * Also per-issue, and for the same reason: San Francisco struck the
   * Washington quarter, but not in 1964, so the series mint list is the wrong
   * answer to "where was mine made".
   */
  struckAt?: Mint[];
  weightGrams?: number;
  diameterMm?: number;
  /** Actual silver weight, troy ounces. Feeds the melt calculator. */
  silverOzt?: number;
  /** Actual gold weight, troy ounces. */
  goldOzt?: number;
  /** Actual platinum weight, troy ounces. */
  platinumOzt?: number;
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

  /**
   * The cases where this coin beats its metal.
   *
   * The numismatic answer on a page that has no graded prices, and
   * deliberately not a price: "uncirculated with full lustre carries a
   * premium" is true for years, whereas the size of that premium is true for a
   * week. When `values` is eventually filled, this stays -- it says WHICH coin
   * is worth looking up, which a table of grades does not.
   *
   * Only the positive cases. An earlier draft also listed what does NOT add
   * value -- toning, shine, long ownership -- and it was cut: the page's job
   * is to tell the reader what makes a coin worth more, not to argue with
   * what they were hoping. See COIN-ARTICLE-GUIDE.md.
   *
   * Short lowercase noun phrases with no commas inside them: the page joins
   * them with commas, so an item containing one reads as two items.
   */
  premiumIf?: string[];

  sections: Section[];

  /** Priced rows. Absent for now -- see the header note. */
  values?: GradedValue[];
  /** The date the priced rows were observed. Required whenever `values` is set. */
  valueAsOf?: string;
  sources?: Source[];

  /*
   * No `published` and no `updated`.
   *
   * Nothing on a coin page changes with the calendar. The weight, the metal,
   * the diameter and which dates are scarce were settled before this site
   * existed, so a date here would record only when somebody last saved the
   * file -- noise to a reader and, in a sitemap or an Article, a claim a
   * crawler can check and find worthless. The one figure with a shelf life is
   * the spot price, and `valueAsOf` above dates the only other measured
   * numbers on the page.
   */
  /** Slugs of sibling coins, rendered as in-cluster links. */
  related?: string[];
}


/**
 * The one-line answer to "is it worth more than its metal", derived from
 * `commonality` so that the headline and the badge can never disagree.
 *
 * Blunt on purpose. This is the sentence someone who found a coin in a jar
 * came for, and hedging it into "it depends" wastes the one moment the page
 * has their attention. The nuance is in `premiumIf` directly underneath.
 */
export const PREMIUM_VERDICT: Record<Coin['commonality'], string> = {
  'very-common': 'Almost certainly not.',
  common: 'Usually not.',
  scarce: 'Quite possibly.',
  'key-date': 'Yes \u2014 substantially.',
};

/**
 * The sentence that closes the value question, and the only quotation on the
 * site.
 *
 * Every figure a coin page prints is a floor or a range: the metal arithmetic
 * is exact and the graded table, where there is one, is a record of what other
 * examples fetched. Neither is an offer, and the gap between them and the
 * cheque somebody actually writes is the part a reader who has just found a
 * coin has no way to guess at. This says it in the words the trade says it in.
 *
 * It is one string in one place because it is the same sentence on every coin
 * page; what changes underneath it is `MARKET_NOTE`, which is derived from
 * `commonality` so the quote is never a slogan floating over a page that
 * disagrees with it.
 */
export const MARKET_TRUTH =
  'Ultimately, a coin is worth what someone is willing to pay for it.';

/**
 * What the quotation means for this particular coin: who the someone is, and
 * whether they have any reason to bid.
 *
 * The gap the quote is there to close is the collector who needs this exact
 * date to finish a set. For a very common issue there is no such person --
 * they can buy one anywhere -- and saying so is the honest reading. For a key
 * date that person is the entire market, and melt is beside the point.
 */
export const MARKET_NOTE: Record<Coin['commonality'], string> = {
  'very-common':
    'For an issue this common, that someone is rarely a collector. Anyone filling a set can buy one from any dealer for small change, so no one has to bid for yours, and the metal figure above is close to both the floor and the ceiling.',
  common:
    'The buyer who pays more than melt for a common date is a collector who wants a sharper example than the one already in their album. That is a real premium and a small one, and it is paid for condition rather than for the date.',
  scarce:
    'Above melt, the price is set by collectors who still need this date. Fewer coins than buyers is the whole of the premium, so what it fetches depends on who is looking that week and how close they are to finishing the run.',
  'key-date':
    'Here that someone is the entire market. This is the date missing from most albums, and a collector who needs it in the grade yours is in sets the price on the day — which is why key dates are the coins worth having authenticated before selling.',
};

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
