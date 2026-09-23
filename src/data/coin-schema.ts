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
import type { WearPoints } from './grades';


/* ===========================================================================
   Reserved path segments
   =========================================================================== */

/**
 * Segments under /coin-info that are routes rather than groups. A group or
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

/**
 * One sale of one coin, at a named house on a named date.
 *
 * The site's only measured price other than the metal arithmetic. A realized
 * auction price is better evidence than any guide figure -- it is what somebody
 * actually paid, it dates itself, and it is literally `MARKET_TRUTH` with a
 * number in it -- so the grade pages lead with these and treat the published
 * guides as the second opinion.
 *
 * `when` is written as a person reads it ("August 2026"), not as an ISO date.
 * It is the date of a sale, which is a fact about the coin trade; it is not a
 * date on the page, and nothing here reaches `dateModified` or the sitemap.
 */
export interface Sale {
  /** USD, as realized including any buyer's premium the house publishes it with. */
  price: number;
  /** "August 2026". The month is as precise as these archives are worth quoting to. */
  when: string;
  /** "Heritage Auctions", "Stack's Bowers". Named on the page. */
  house: string;
}

/**
 * How many of this issue are known in this grade, from a grading service's
 * published census.
 *
 * Three jobs, which is why it is worth the column: it gates whether the grade
 * gets a page at all, it explains the value on any coin where condition rarity
 * rather than scarcity drives the price, and it is the one fact a reader cannot
 * get from the grade description or the melt arithmetic.
 *
 * `finer` is the count above this grade, which is what makes `atGrade` mean
 * something: 171 known in Fine is a different statement when 5,545 are finer.
 *
 * THE TRAP: a population of zero means two opposite things depending on where
 * it sits. Above the grade where certification becomes economic, zero means
 * none are known. Below it, zero means nobody pays to slab a six-dollar coin.
 * A naive `atGrade > 0` gate keeps the MS67 page and deletes every circulated
 * page on a key date, which is the exact inversion of what the gate is for --
 * so the field is OPTIONAL and its absence means "not counted", never "none".
 */
export interface Population {
  atGrade: number;
  finer: number;
  /** "PCGS", "NGC". Named on the page; a census is a count by somebody. */
  service: string;
}

/**
 * A priced row: what one issue fetches in one grade.
 *
 * A range, never a point. Condition dominates coin value, the site cannot see
 * the coin, and the sources behind the range disagree with each other by more
 * than rounding -- which is itself the honest answer and the reason the range
 * is what gets printed.
 *
 * A row here is also the declaration that this grade gets a page of its own.
 * See `gradedGrades()` in coins.ts: the fan-out gate reads this list, so a
 * grade with no researched row is a grade with no URL, rather than a URL
 * asserting a coin exists in a grade nobody has ever seen.
 */
export interface GradedValue {
  /** A grade slug from `GRADES` in grades.ts: "g4", "ms63". Validated. */
  grade: string;
  /**
   * USD. A range, never a point -- condition dominates and we cannot see the
   * coin.
   *
   * BOTH ARE OPTIONAL, AND ABSENCE MEANS "NOT YET RESEARCHED" -- never zero and
   * never none. The owner's decision of 2026-09-22: a rung the site has no
   * trustworthy figure for still gets its page, because the rest of it -- what
   * the grade looks like on this coin, where it sits in the ladder, how it is
   * written on a slab, the metal under it and how to check the market -- is
   * worth more to a reader than a 404.
   *
   * WHAT THE PAGE PRINTS IN THE RANGE SLOT IS NOTHING. It printed `TBD to TBD`
   * for the rest of that day, which was the only honest MARK available; the
   * same evening the owner made this an information catalogue rather than a
   * price guide, and a mark is no longer wanted. An unpriced rung renders no
   * range, no provenance and no placeholder, and the page leads with the facts
   * instead. `LADDER_GAP_NOTE` in grade-copy.ts has the whole argument.
   *
   * This is not the same as the melt section's "say None rather than leave a
   * blank". There the figure is genuinely zero; here the figure exists in the
   * world and this site has not established it. Printing a zero, a dash or a
   * guess would all be claims, and so would a number invented downstream --
   * nothing may render an absent range as a figure.
   *
   * Either both are set or neither is. A half-known range is a point wearing a
   * range's clothes and `validateTaxonomy()` throws on one.
   */
  low?: number;
  high?: number;
  /** Recorded sales behind the range. The evidence, and the page leads with it. */
  sales?: Sale[];
  /** The certified census at this grade, where there is a published one. */
  population?: Population;
}

/**
 * One coin's priced ladder: the rows, the date they were read, and where they
 * came from.
 *
 * Separate from the `Coin` on purpose, and the reason is lifecycle. Everything
 * on a `Coin` was settled before this site existed -- what it weighs, what it
 * is made of, how many were struck -- and is typed by hand once. A ladder is
 * the opposite: it moves, it is re-imported, and it arrives from a research
 * sheet rather than from an editor. Keeping it on the coin would mean a
 * generated field inside a hand-written record, which is the one thing the
 * split between `coin-taxonomy.ts` and `coin-catalog.ts` exists to avoid.
 *
 * So the ladders live in `src/data/graded-values.ts`, which is GENERATED from
 * `data/grades/<coin>.tsv` by `npm run grades` and committed. See the header of
 * that file, and `scripts/import-grades.mjs` for the pipeline.
 */
export interface GradedLadder {
  /** The coin slug this ladder belongs to. Validated against the catalogue. */
  coin: string;
  /** The date the rows were read, ISO. Required: no figure ships undated. */
  asOf: string;
  /** Where the figures came from. Required, and printed on every grade page. */
  sources: Source[];
  /**
   * How many reverse designs this coin's range covers, where that is not one.
   *
   * From 1999 a mint strikes five or six reverses of every date and a page here
   * belongs to the (year, mark, finish), so a range read off the guides spans
   * all of them and its ends are two different designs. That is honest and it
   * is not obvious, so the page says it -- the same obligation `mintageNote`
   * carries on the coin page, where a mintage is a sum over the same designs
   * for the same reason.
   *
   * Absent means one design, and the sentence is not rendered.
   */
  spans?: number;
  /** The rows, in ladder order. */
  values: GradedValue[];
}

export interface Section {
  heading: string;
  paragraphs: string[];
  steps?: { name: string; text: string }[];
}

/**
 * A composition group: the first segment under /coin-info.
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
  /**
   * Inclusive years this mint struck the series, when they differ from the run.
   *
   * A LIST of ranges, because a mint's run has holes in it and one range cannot
   * say so. San Francisco struck Washington quarters for circulation from 1932
   * to 1954, struck none at all from 1955 to 1967, and has struck proofs every
   * year since 1968. `{ from: 1932 }` claims it struck them throughout;
   * `{ from: 1932, to: 1954 }` claims it stopped; and both are false in a way a
   * reader turning a 1960-S over in their fingers would be misled by. Two ranges
   * state it exactly.
   */
  years?: { from: number; to?: number }[];
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
  /**
   * The physical facts of this era, for the coins generated inside it.
   *
   * Here rather than on the coin because they are true of every issue of the
   * era and of no issue outside it -- a 1964 quarter weighs 6.25 grams and a
   * 1965 one 5.67, and neither figure is a fact about a particular date. An
   * era with no specs generates no coins; `scripts/import-coins.mjs` says so
   * rather than inventing a weight.
   */
  specs?: {
    weightGrams: number;
    diameterMm: number;
    silverOzt?: number;
    goldOzt?: number;
    faceValue: string;
  };
  /** What each face carries in this era, in one clause each. */
  obverse?: string;
  reverse?: string;
  /**
   * What the edge looks like, as a noun phrase: "a uniform silver-grey edge".
   *
   * The identification checklist needs to tell one era from the one beside it,
   * and that sentence is a COMPARISON -- silver against clad, and the other way
   * round on the other era's pages. Stating what each era looks like separately
   * lets the generator build both directions from one fact each, instead of two
   * hand-written sentences that can drift apart.
   */
  edgeLooks?: string;
  /** Tags every coin of this era carries, beyond the series' own. */
  tags?: string[];
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
   * Override: the catalogue slug of this date's page, for a label that cannot
   * be read as one.
   *
   * ALMOST ALWAYS UNSET. `keyDateCoin()` works the link out of `label` -- it
   * is a year and a mint mark, which is what a catalogue issue is filed under
   * -- so a key date starts linking the day its page is built, on every series
   * page at once, with nothing typed here. Setting this to what the label
   * already derives fails the build: it is a second copy of one fact, and the
   * copy is what goes stale.
   *
   * What it is for is a label with something extra in it -- "1909-S VDB",
   * "1937-D 3-legged" -- which does not parse and reads as plain text until
   * somebody names the page. `validateTaxonomy()` throws on a slug that is not
   * in the catalogue, exactly as it does for `Coin.related`, so there is no
   * placeholder page either way.
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
 * This is also the answer to "should there be a /coin-info/series tree".
 * There should not: a series is already a tag, the tag already has a page,
 * and a second URL for the same subject is the site competing with itself.
 * The series tag page is the series page, and this is what fills it.
 */
export interface SeriesInfo {
  /**
   * Where this design wears, in the words somebody holding one would use.
   *
   * The parameter the grade definitions are filled from -- see the header of
   * `grades.ts` for why a grade description is generated per series rather
   * than written once per grade. Optional, and its absence is the gate: a
   * series with no wear points cannot say anything specific about a grade, and
   * a grade page whose middle block is a generic paragraph about the Sheldon
   * scale is the thin page the fan-out rule exists to not build.
   */
  wear?: WearPoints;
  /** The full run, both ends. `to` omitted means it is still being struck. */
  years: { from: number; to?: number };
  /**
   * The denomination slug and the country, for the coins generated from this
   * series.
   *
   * A series knows what denomination it is; nothing else in the taxonomy did,
   * which is why the first generator had to be handed it in a sheet. Both are
   * required before `npm run coins` generates anything for the series.
   */
  denomination?: string;
  country?: string;
  /** Tags every coin in the series carries. Its own slug is added for you. */
  tags?: string[];
  /**
   * Where the mint mark sits, by era, as a clause continuing "It is ...".
   *
   * `mintMarkLocation` below is the prose a reader gets on the series page and
   * says everything at once, the years no mark was used included. This is the
   * same knowledge in the form a generator can pick ONE of: the Washington
   * quarter's mark is on the reverse to 1964 and on the obverse from 1968, and
   * a checklist naming the wrong face sends somebody to the wrong side of
   * their coin.
   */
  markPositions?: { years: { from: number; to?: number }; where: string }[];
  /**
   * The reverse hubs that get pages of their own, if any.
   *
   * ALMOST ALWAYS EMPTY, and it is meant to be. A variety is listed and never
   * followed -- that rule is what stops a series catalogued by die pairing
   * from fanning out into five hundred pages of the same sentence -- and this
   * field is the owner's exception of 2026-09-22 for the two 1878 Morgan
   * reverses and nothing else.
   *
   * What earns an entry, and all three are required at once:
   *
   *   The sources state a SEPARATE MINTAGE for it, so the page has a figure of
   *   its own rather than the year's repeated.
   *   A reader can tell it apart by counting or reading something, with no
   *   loupe and no judgement. Eight tail feathers or seven. A doubled die is
   *   not this; it is a call somebody makes and gets wrong.
   *   The figures are far enough apart to matter. 749,500 against 9,759,300 is
   *   one coin in fourteen, which is the difference between the page being
   *   useful and being a duplicate of the year's.
   *
   * The year's own coin keeps its page and its combined total either way. A
   * hub never replaces a date; it hangs under one.
   */
  hubs?: {
    /** Matches the `hub` on the issue in data/mintages.json. Permanent: it is a slug token. */
    slug: string;
    /** Title case, for a name and a `<title>`. */
    name: string;
    /** The same thing inside a sentence. */
    noun: string;
    /** The checklist step. Required, because being able to tell them apart is the whole case. */
    identify: string;
  }[];
  /**
   * A mint that struck this series as proofs only, over a range of years.
   *
   * Without it a checklist says "San Francisco struck none of these", which is
   * true of the Washington quarter's silver era and false of its clad era,
   * where San Francisco struck every year and sold them in sets. A reader
   * holding a proof would be told their coin does not exist.
   */
  proofOnly?: { mark: string; years: { from: number; to?: number }; note: string };
  /** The first year mint sets were sold; the premium line cannot cite one before it. */
  mintSetsFrom?: number;
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
  /**
   * Compositions struck in a collector finish only, outside the run's partition.
   *
   * `compositions` above is a TIMELINE: ordered, gapless, covering the whole run,
   * and validated as such, because the series page reads it out as "the metal
   * changed partway through the run" and the date is what tells a reader which
   * era they are holding. That sentence is true of the coins people spend.
   *
   * It is not true of the proofs. San Francisco has struck a 90% silver proof
   * quarter every year since 1992 and a .999 one since 2019, alongside the clad
   * quarter of the same date -- so 1999 is BOTH clad and silver, and folding
   * those eras into the timeline would overlap it, break the validator that
   * keeps it a timeline, and make the series page tell a reader that the date
   * decides the metal when for these years it does not. What decides it is
   * whether the coin was sold in a set.
   *
   * So they live here, they are not ordered and need not be contiguous, and
   * nothing reads them except the importer -- which looks in `compositions`
   * first and falls back to this list, so a clad proof takes the ordinary clad
   * era and only the silver ones need an entry.
   */
  finishCompositions?: CompositionEra[];
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
  /**
   * The reverse hub, title case, on the coins that are one: "8 Tail Feathers".
   *
   * Carried on the coin as well as inside `name` and `shortName` because the
   * TITLE generators build a short fallback stem out of the year, the mint
   * mark and the denomination when the full name will not fit -- and that stem
   * knows nothing about a hub, so the two 1878 proof reverses both fell back
   * to "1878 Dollar PR70 Value". `validateGradeCopy()` caught it, which is
   * what it is for, but a field is the fix rather than a longer name.
   *
   * See `SeriesInfo.hubs` for what earns one. Almost every coin has none.
   */
  hub?: string;
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
   * What the mintage figure COUNTS, when it is not one striking of one design.
   *
   * From 1999 a mint strikes five or six reverse designs a year and this site
   * gives a page to the year and the mint mark rather than to a design, so the
   * figure above is a sum. A sum printed in the slot where a 1950-D page prints
   * one striking's mintage, with nothing over it, is the site changing what a
   * word means halfway down its own catalogue -- and on the 2019-W page it
   * would be a lie about the coin, because ten million is the total and two
   * million is the number that makes anybody look for one.
   *
   * Generated from the figures, never written: see `designClause()`.
   */
  mintageNote?: string;
  /**
   * What the site cannot stand behind about the figure above, when there is
   * something.
   *
   * Either the published figures disagree and this page took the highest, or
   * some of the year's designs have no published figure and there is no total
   * at all. Both are the site showing its working where the working ran out,
   * which is the same instinct as refusing to print a price it cannot support --
   * pointed at the one number a coin page must print.
   *
   * Generated: see `mintageCaveat()`.
   */
  mintageCaveat?: string;

  /**
   * How easy this is to find. Drives the honest "most coins are worth face
   * value" line, which SPEC.md calls the single most useful thing the site
   * does for someone who has just found a coin.
   *
   * Meaningless for a coin that was never in a till -- see `finish`, which
   * suppresses every rendering of this field rather than adding a fifth value
   * to it.
   */
  commonality: 'very-common' | 'common' | 'scarce' | 'key-date';

  /**
   * A coin that was sold rather than spent, and the reason `commonality` is
   * not printed on its page.
   *
   * COMMONALITY IS A STATEMENT ABOUT SURVIVAL, and survival is only a question
   * for a coin that was in circulation. Every proof ever struck was bought by
   * somebody who wanted it and put it in a drawer, so a proof with a mintage of
   * one million is not scarce, it is cheap -- and the thresholds in
   * `commonalityOf()` would call it "Scarce", print the badge, and tell a reader
   * their common coin is hard to find, on roughly ninety pages at once. The same
   * is true of the San Francisco uncirculated coins sold in Mint rolls and bags:
   * 1.4 million is a small number and none of them was ever in change.
   *
   * So a coin with a `finish` renders NO verdict, NO badge and NO market note.
   * It renders the clause below instead, which answers the question those three
   * were there to answer -- "is mine worth more than melt" -- in the terms that
   * actually apply to it.
   *
   * This is a fifth branch rather than a fifth `commonality` value at the
   * owner's instruction, and the reason is that the four values are read as a
   * ladder from the flattest no to the clearest yes. A fifth rung that is not on
   * that ladder would have to be given a position on it, and there is no honest
   * one: a proof is not scarcer than a common date and not commoner than a key
   * date, it is a different question.
   */
  finish?: {
    /** 'proof', 'silver-proof' or 'uncirculated'. */
    kind: string;
    /** The sentence that stands where the verdict would be. One, and it names its own coin. */
    note: string;
  };

  /** How to tell you have this exact coin. Rendered as a checklist AND HowTo schema. */
  identify: string[];

  /**
   * The one thing that is true of this coin and of no other coin here.
   *
   * Optional, and meant to be left off. A coin with nothing of its own to say
   * omits the field and its page ends at the pull quote, which is a complete
   * page: the answer, the metal figure, the specification, the verdict and the
   * series all render above it and none of them came from here.
   *
   * The alternative to omitting is padding, and padding is the failure a
   * catalogue that wants to be thousands of pages long is one careless loop
   * away from. So `validateTaxonomy()` fails the build on two coins sharing a
   * heading or a paragraph, and on a heading with no paragraphs under it. That
   * check is what makes the field safe to leave empty: there is no way to
   * satisfy it by copying the section from the coin next door, so the only
   * moves are to write something true of this issue alone or to write nothing.
   *
   * What does NOT go here is anything already on the page. The mintage is in
   * the verdict block, the metal is in the figure, the specification is in the
   * table and the series is in its own section; restating one of them in prose
   * is the essay-wrapped-round-four-numbers draft this format replaced.
   */
  sections?: Section[];

  /**
   * This issue's number in the grading services' own catalogues.
   *
   * A fact about the issue, like its weight, and the thing a reader needs to
   * find the right row in somebody else's price guide. It is on the coin
   * rather than in a link, because a page that tells a reader to go and verify
   * the figure has to tell them where the row is -- see the "how to check it
   * yourself" block on a grade page.
   */
  pcgsNumber?: string;
  ngcNumber?: string;

  /*
   * No `values`, no `valueAsOf` and no `sources`.
   *
   * The priced ladder is not a fact about the coin in the way its weight is:
   * it moves, it is imported rather than written, and it carries its own date
   * and its own provenance. It lives in `GRADED_VALUES` in
   * `src/data/graded-values.ts` -- generated, committed -- and reaches a page
   * through `gradedValues()` in coins.ts. See `GradedLadder` above.
   */

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
 * has their attention. It is the whole answer: the badge and the mintage
 * beside it are the evidence, and there is no paragraph under it hedging.
 *
 * The four are read as a ladder, from the flattest no to the clearest yes, so
 * the wording of any one of them is a statement about the three beside it as
 * much as about its own coins. Change one and read all four in order.
 */
export const PREMIUM_VERDICT: Record<Coin['commonality'], string> = {
  'very-common': 'Probably not.',
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
 *
 * Each note takes `hasMelt`, because three of the four were written against a
 * coin with a metal figure on the page above them and are wrong without one:
 * "the metal figure above" refers to nothing on a clad page, and a reader who
 * has just been told there is no metal value in the coin cannot be told in the
 * next paragraph that somebody might pay more *than melt* for it. The
 * melt-dependent words are inline rather than a second record of these
 * paragraphs, so there is one place each of them is written and the silver
 * pages read exactly as they did.
 */
export const MARKET_NOTE: Record<Coin['commonality'], (hasMelt: boolean) => string> = {
  'very-common': (hasMelt) =>
    'For an issue this common, that someone is rarely a collector. Anyone filling a set can buy one from any dealer for small change, so no one has to bid for yours'
    + (hasMelt
      ? ', and the metal figure above is close to both the floor and the ceiling.'
      : '.'),
  common: (hasMelt) =>
    `The buyer who pays more${hasMelt ? ' than melt' : ''} for a common date is a collector who wants a sharper example than the one already in their album. That is a real premium and a small one, and it is paid for condition rather than for the date.`,
  scarce: (hasMelt) =>
    `${hasMelt ? 'Above melt, the' : 'The'} price is set by collectors who still need this date. Fewer coins than buyers is the whole of the premium, so what it fetches depends on who is looking that week and how close they are to finishing the run.`,
  'key-date': () =>
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
