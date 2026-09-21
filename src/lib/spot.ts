/**
 * Spot metal prices: the one place the site says what an ounce costs.
 *
 * Every melt figure on the site multiplies a catalogue weight by a number from
 * this file, so there is exactly one number per metal and no page can quote a
 * different one.
 *
 * ---------------------------------------------------------------------------
 * A PRICE IS RENDERED TWICE: ONCE BY THE BUILD, ONCE BY THE BROWSER
 * ---------------------------------------------------------------------------
 *
 * The build is static and the HTML is cached at the edge for a day. A price is
 * not, so a figure baked into that HTML is a figure that goes stale inside the
 * cache and cannot be corrected without a deploy. The arrangement that solves
 * it without giving up a static build:
 *
 *   - the BUILD renders the committed snapshot below, dated and caveated. That
 *     is what a crawler reads, what a reader with no JavaScript sees, and what
 *     the page falls back to when the endpoint is down. It is honest because
 *     it states its own price and date rather than claiming to be current.
 *   - the BROWSER fetches `/api/spot`, which is a small JSON document cached
 *     for an hour at the edge rather than a day, and rewrites every figure on
 *     the page through `src/lib/spot-dom.ts`.
 *
 * Both halves call the functions in THIS file, which is the point: a figure
 * the browser writes and the figure the build wrote came from one
 * implementation, so they cannot round differently or word a caveat two ways.
 * That is why every derived function below takes a `SpotSnapshot` and defaults
 * to the reference one, rather than reading a module-level constant.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE NUMBERS COME FROM, AND WHAT THE PAGE SAYS ABOUT THEM
 * ---------------------------------------------------------------------------
 *
 * `/api/spot` reads a cached snapshot and never calls a price feed itself; the
 * cache is written from outside this repository. `src/data/spot-snapshot.ts` is
 * the built-in fallback the build renders and the endpoint serves when that
 * cache has nothing in it. Both of those are somebody else's headers to read --
 * `src/server/spot.ts` and the data file.
 *
 * What matters HERE is the one sentence every figure on the site carries:
 *
 *     based on spot prices at 20 September 2026 23:27 UTC
 *
 * That is `spotBasis()`, and every other provenance string below is built from
 * it, so the phrase is written once and cannot be reworded on one page and not
 * another. Three things about it are deliberate:
 *
 *   - it states a TIME, not a day. The prices move and the cache is refreshed
 *     on somebody else's schedule, so the minute is what tells a reader how
 *     much to trust the figure. It is also the only date anywhere on this site;
 *     see the rule about dates in CLAUDE.md.
 *   - it names no vendor. A feed's name is provenance for an operator, not for
 *     a reader deciding whether to trust a melt value, and it would be one more
 *     thing to correct on every page the day the feed changes. The source
 *     travels in the snapshot and comes back from `/api/spot`; it is simply not
 *     printed.
 *   - it does not brand itself a caveat. "Based on spot prices at <time>" says
 *     the figure is arithmetic over a reading taken then, which is true and is
 *     all a reader needs; it does not need to be told twice that this is not a
 *     dealer's offer, which `meltBaselineNote()` says once where it belongs.
 *
 * What this keeps intact is the house rule against printing a value the site
 * did not measure. The site is not claiming a current price: it is showing
 * arithmetic over a stated, timed input the reader can substitute. Printing
 * one of these as "the current price" would break it. Do not.

 */

// `.js`, not extensionless, although the rest of `src/lib/` imports without an
// extension and Vite prefers it that way. This module is reachable from
// `api/spot.ts`, which runs on the Node runtime — and the Node runtime does not
// bundle: it ships the compiled files and resolves them with real Node ESM
// rules, which require the extension. The edge runtime hid this, because
// esbuild bundles everything and resolves extensionless specifiers on the way.
// `.js`-meaning-`.ts` is the standard TypeScript ESM convention; Vite, `astro
// check` and `tests/ts-resolve.mjs` all understand it.
//
// The rule, and `tests/spot.test.mjs` enforces it: anything reachable from
// `api/` names its extension, however deep in `src/lib/` it lives.
import { SPOT_SNAPSHOT } from '../data/spot-snapshot.js';

/**
 * Metals the catalogue can carry a weight for.
 *
 * A metal is not a URL. The melt tree is filed by composition group, like the
 * catalogue -- see the header of melt.ts -- and a group's metals are read off
 * its coins rather than off its slug, because the two come apart: a 40%
 * silver clad half is clad by construction and silver by content. Adding a
 * metal is therefore adding a price below, a weight field on the coin, a
 * ladder step further down and usually a composition group in
 * coin-taxonomy.ts, and nothing else.
 */
export type Metal = 'silver' | 'gold' | 'platinum';

/** Every metal the site prices, in the order they are listed. */
export const METALS: Metal[] = ['silver', 'gold', 'platinum'];

/**
 * When the prices were read, as a full ISO timestamp. Rendered, as a time, next
 * to every figure worked from them -- and the only date on the site.
 */
export const SPOT_AS_OF = SPOT_SNAPSHOT.asOf;

/**
 * USD per troy ounce. The only prices the site quotes, and unrounded.
 *
 * Read off the built-in snapshot, never edited here: a figure typed into this
 * file is a figure with no time behind it, and `SPOT_AS_OF` above would go on
 * describing the reading it replaced. To change these, run `npm run spot`.
 *
 * Not rounded, here or anywhere upstream. Rounding happens once, in
 * `formatUsd()`, at the point of display -- so the number a page prints is
 * rounded from the number its arithmetic used, rather than a page multiplying a
 * weight by an already-rounded price and landing a cent away from the figure
 * beside it.
 *
 * Platinum is priced because the taxonomy has a platinum group and a platinum
 * coin needs a price to be worth anything, not because one is in the catalogue
 * yet. The annotation is what pins the snapshot to `METALS`: adding a metal
 * there fails this assignment until the snapshot has been regenerated.
 */
export const SPOT: Record<Metal, number> = SPOT_SNAPSHOT.prices;

/**
 * A set of prices with its provenance attached.
 *
 * The provenance travels WITH the numbers rather than beside them, because
 * the one failure this whole arrangement has to rule out is a page showing a
 * price from one source under a date from another. A snapshot is the unit
 * that crosses the wire, the unit a generator takes, and the unit the DOM
 * layer applies.
 */
export interface SpotSnapshot {
  prices: Record<Metal, number>;
  /** A full ISO timestamp, or a bare ISO date. Both render; see `spotAsOfLabel`. */
  asOf: string;
  /**
   * Where the numbers came from. Carried on the wire, never printed -- see the
   * note on naming no vendor in the header.
   */
  source: string;
  /** Whether this claims to be a real-time quote. Nothing on this site is. */
  live: boolean;
}

/**
 * The built-in snapshot as a `SpotSnapshot`: the default argument everywhere
 * below, what the build renders, what `/api/spot` falls back to when its cache
 * is empty, and what the browser keeps showing when the endpoint cannot be
 * reached.
 */
export const REFERENCE_SPOT: SpotSnapshot = SPOT_SNAPSHOT;

/**
 * Where the browser asks. One path, named once, so the endpoint, the client
 * and the host cache rules cannot disagree about it.
 */
export const SPOT_ENDPOINT = '/api/spot';

/**
 * How long a spot response may be reused at the edge, in seconds.
 *
 * An hour. The point of the endpoint is that it is the one document on the
 * site allowed to be younger than the HTML around it, and an hour is short
 * enough that a figure is never wrong by more than a normal day's drift while
 * still collapsing every visitor in that hour onto one upstream fetch -- which
 * is what keeps a metered feed inside a free tier later.
 */
export const SPOT_MAX_AGE_SECONDS = 3600;

/**
 * How long the BROWSER may reuse it without asking, in seconds.
 *
 * Five minutes, which is what makes a browsing session cost one request rather
 * than one per page. At zero -- where this started -- every navigation
 * revalidates, and since the response carries no ETag every revalidation is a
 * full round trip for a figure that cannot have moved: the edge is only
 * refreshing it hourly.
 *
 * The staleness this buys back is five minutes on top of an hour, against a
 * number the page dates to the day. If that ever stops being an acceptable
 * trade -- a feed that updates by the second, a page that quotes a spread --
 * set it to 0 and every navigation revalidates again.
 */
export const SPOT_BROWSER_MAX_AGE_SECONDS = 300;

/**
 * The entire caching contract for `/api/spot`, as one string.
 *
 * `src/server/spot.ts` sets this on the response and `vercel.json`,
 * `netlify.toml` and `public/_headers` each repeat it; `tests/spot.test.mjs`
 * compares all four against this constant, so the house rule about the three
 * host configs agreeing is enforced rather than remembered.
 *
 * Note what is NOT in it: `must-revalidate`, which every other rule on this
 * site carries. `must-revalidate` forbids a cache from serving a stale
 * response, and `stale-while-revalidate` exists to let it do exactly that; the
 * combination is contradictory, and a strict CDN resolves it by dropping the
 * SWR. That would be the wrong way round here. This endpoint's whole position
 * is that an older answer, labelled with its date, beats no answer -- so when
 * the hour is up and the upstream is slow or down, serving the last good
 * snapshot while it refreshes in the background is the behaviour, not a
 * degradation of it.
 */
export const SPOT_CACHE_CONTROL =
  `public, max-age=${SPOT_BROWSER_MAX_AGE_SECONDS}, s-maxage=${SPOT_MAX_AGE_SECONDS}, stale-while-revalidate=86400`;

/**
 * Display name for a metal, capitalised.
 *
 * The same string reaches the visible spec row and the Product
 * `PropertyValue` name, so they cannot drift -- Google compares them.
 */
export const METAL_LABEL: Record<Metal, 'Silver' | 'Gold' | 'Platinum'> = {
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

/**
 * The label as a type, so a schema field that carries one cannot be widened
 * to any string or left behind when a metal is added.
 */
export type MetalLabel = (typeof METAL_LABEL)[Metal];

/** USD per troy ounce for one metal, out of a snapshot. */
export const spotPrice = (metal: Metal, snap: SpotSnapshot = REFERENCE_SPOT): number =>
  snap.prices[metal];

/**
 * Metal value of one coin: troy ounces times spot. Undefined when the coin
 * carries no precious-metal weight, which is the signal not to render the
 * section at all rather than to render a zero.
 */
export const meltValue = (
  troyOunces: number | undefined,
  metal: Metal,
  snap: SpotSnapshot = REFERENCE_SPOT,
): number | undefined =>
  troyOunces === undefined || troyOunces <= 0 ? undefined : troyOunces * snap.prices[metal];

/**
 * The metal a coin's melt value is driven by, with its weight -- silver first,
 * because no issue in the catalogue carries two of these and silver is the
 * common case.
 */
export const coinMetal = (coin: {
  silverOzt?: number;
  goldOzt?: number;
  platinumOzt?: number;
}): { metal: Metal; troyOunces: number } | undefined =>
  coin.silverOzt
    ? { metal: 'silver', troyOunces: coin.silverOzt }
    : coin.goldOzt
      ? { metal: 'gold', troyOunces: coin.goldOzt }
      : coin.platinumOzt
        ? { metal: 'platinum', troyOunces: coin.platinumOzt }
        : undefined;

/**
 * USD for display. Cents below $100, whole dollars above, because a dealer
 * spread is wider than a dollar and trailing cents on a four-figure number
 * imply a precision this does not have.
 *
 * This runs in the browser as well as in the build -- the same function, not a
 * copy of it -- because the browser rewrites figures the build rendered and a
 * rounding difference would show up as the number changing the instant the
 * page becomes interactive. There used to be a hand-written twin of this in an
 * inline script and a test that lifted it out with a regex to compare them.
 * Both are gone: one implementation cannot disagree with itself.
 */
export const formatUsd = (amount: number): string =>
  amount < 100
    ? `$${amount.toFixed(2)}`
    : `$${Math.round(amount).toLocaleString('en-US')}`;

/**
 * Troy ounces for display.
 *
 * Four decimals under ten ounces because that is the precision mint
 * specifications are published to and the difference between 0.1808 and 0.18
 * is real money at a hundred coins; two above, where the fourth decimal is
 * noise next to the wear on the coins.
 *
 * Here rather than in melt.ts, where it lived, because the browser needs it
 * and melt.ts pulls in the whole catalogue. Re-exported from there so the
 * existing imports still resolve.
 */
export const formatOzt = (troyOunces: number): string =>
  troyOunces < 10 ? troyOunces.toFixed(4) : troyOunces.toFixed(2);

/**
 * When the prices were read, written the way the rest of the site writes dates.
 *
 * "20 September 2026 23:27 UTC" from a timestamp, "20 September 2026" from a
 * bare date. `en-GB`, so the day comes before the month -- STYLE.md writes dates
 * that way everywhere. It renders inside the provenance phrase under every melt
 * figure, which makes it the most-repeated string in the build.
 *
 * The date leads and the time trails it, rather than the other way round. The
 * date is the part a reader is checking -- is this from today or from March --
 * and the time only matters once they have read it. Reversing them puts the
 * least useful half of the stamp in front of the most useful.
 *
 * The time is printed, which is a reversal: this used to render the day only, on
 * the grounds that a price shown to the minute invites the reader to treat it as
 * a live quote. That was the wrong way round. The figures are refreshed on a
 * schedule the site does not control, so the minute is exactly what tells a
 * reader how much to trust the number, and "based on spot prices at" is already
 * saying the reading is historic. UTC is named rather than converted, because a
 * static page cannot know the reader's zone and a time with no zone on it is a
 * time that is wrong for most of the world.
 */
export const spotAsOfLabel = (snap: SpotSnapshot = REFERENCE_SPOT): string => {
  const dateOnly = snap.asOf.length === 10;
  const date = new Date(dateOnly ? `${snap.asOf}T00:00:00Z` : snap.asOf);
  if (Number.isNaN(date.getTime())) return snap.asOf;

  const day = date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  if (dateOnly) return day;

  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
  return `${day} ${time} UTC`;
};

/**
 * The provenance of every figure on this site, in one phrase.
 *
 * "based on spot prices at 20 September 2026 23:27 UTC". Every other
 * provenance string below is built from this one, so the wording exists once.
 * It names no vendor and carries no price of its own: it says when, and the
 * figure it sits beside says what.
 *
 * Lower case and unpunctuated, because it is used mid-sentence as often as it
 * is used alone. The callers that need it to open a sentence capitalise it.
 */
export const spotBasis = (snap: SpotSnapshot = REFERENCE_SPOT): string =>
  `based on spot prices at ${spotAsOfLabel(snap)}`;

/**
 * The one sentence printed under every melt figure on the site.
 *
 * It does the whole job the old two-paragraph treatment did: melt is what the
 * metal is worth, not what a dealer will hand over, and it is still the right
 * number to start from. Anything longer gets skipped, and a reader who skips
 * it is a reader who thinks the figure is an offer.
 *
 * A function rather than a constant only so it names the coin's own metal. It
 * carries no figure, which is why it is the one line on a melt page the
 * browser never rewrites.
 */
export const meltBaselineNote = (metal: Metal): string =>
  `Melt value is what the ${metal} is worth, not necessarily what you can sell it for. But it's a good baseline.`;

/**
 * The provenance of the figure, compressed to one line that sits with the
 * arithmetic rather than with the prose.
 *
 * "$66.30/ozt, based on spot prices at 20 September 2026 23:27 UTC" -- which
 * price, read when. The house rule is that the site never prints a value it did
 * not measure, and this line is the licence for printing a melt value at all.
 * It belongs with the working, as a dateline, not as a warning, which is why it
 * is this terse.
 */
export const spotStamp = (metal: Metal, snap: SpotSnapshot = REFERENCE_SPOT): string =>
  `${formatUsd(snap.prices[metal])}/ozt, ${spotBasis(snap)}`;

/**
 * The sentence that must appear wherever a melt figure appears.
 *
 * The stamp written out: the price, the metal it is a price for, and when it
 * was read. One source per fact -- if this needs rewording, it is reworded here
 * and every page changes with it, including the ones the browser has already
 * rewritten, because the browser calls this function too.
 */
export const spotCaveat = (metal: Metal, snap: SpotSnapshot = REFERENCE_SPOT): string =>
  `${formatUsd(snap.prices[metal])} per troy ounce of ${metal}, ${spotBasis(snap)}.`;

/**
 * The line printed under the prices on the home page strip.
 *
 * Same job as `spotCaveat`, one level up: the strip names every price at once,
 * so the provenance is stated once for all of them rather than once per metal
 * in as many different wordings. It is `spotBasis()` as a sentence of its own,
 * which is the phrase `tests/build-smoke.test.mjs` looks for on every page that
 * prints a per-ounce figure.
 */
export const spotStripNote = (snap: SpotSnapshot = REFERENCE_SPOT): string =>
  `${spotBasis(snap)[0].toUpperCase()}${spotBasis(snap).slice(1)}.`;

/**
 * The provenance phrase as a mid-sentence aside: ", based on spot prices at
 * 20 September 2026 23:27 UTC".
 *
 * It is the one part of a generated sentence that is not a figure and still
 * depends on the snapshot, so it gets a `data-spot` kind of its own rather than
 * being typed into melt.ts -- where it would keep the build's timestamp after
 * the browser had replaced the figure beside it from a newer one.
 */
export const referenceClause = (snap: SpotSnapshot = REFERENCE_SPOT): string =>
  `, ${spotBasis(snap)}`;

/* ---------------------------------------------------------------------------
   The spot-price ladder
   --------------------------------------------------------------------------- */

/**
 * How far either side of the reference price the ladder runs, and what it
 * rounds to. Twenty percent is wide enough to still contain the real price
 * months after `asOf`, which is the whole job: the ladder is what keeps an
 * archive usable on a day the endpoint could not be reached and the page is
 * still showing the built-in reference price.
 *
 * Here rather than in melt.ts because the browser rebuilds the ladder when a
 * new price lands -- a ladder centred on yesterday's price under a figure
 * worked at today's is the one part of that page that would visibly disagree
 * with itself.
 */
const LADDER_SPREAD = [-0.2, -0.1, 0.1, 0.2];
const LADDER_STEP: Record<Metal, number> = { silver: 5, gold: 250, platinum: 100 };

/** Round prices either side of spot, plus spot itself, ascending. */
export const spotLadder = (metal: Metal, snap: SpotSnapshot = REFERENCE_SPOT): number[] => {
  const step = LADDER_STEP[metal];
  const spot = snap.prices[metal];
  const prices = LADDER_SPREAD.map((d) => Math.round((spot * (1 + d)) / step) * step)
    .filter((p) => p > 0)
    .concat(spot);
  return [...new Set(prices)].sort((a, b) => a - b);
};

/* ===========================================================================
   Figures inside a sentence
   =========================================================================== */

/**
 * What a figure inside a generated sentence IS, so the browser can work it
 * out again from a new snapshot.
 *
 * A price is a price; a value is a weight times a price. Nothing else needs
 * recomputing, because no generated sentence contains an amount that is not
 * one of those two.
 */
export type FigureKind = 'price' | 'price-unit' | 'value';

export interface FigureSpec {
  kind: FigureKind;
  metal: Metal;
  /** Troy ounces. Required for `value`, meaningless otherwise. */
  ozt?: number;
}

/**
 * How a generator renders one figure.
 *
 * Every sentence on this site that contains a price is produced ONCE, by a
 * generator in melt.ts, and used twice: as visible HTML and as the plain
 * string inside JSON-LD, a `<title>` or llms.txt. The two used to be the same
 * string, which was safe and static; now the visible one has to be rewritable
 * by the browser and the plain one must stay plain.
 *
 * So a generator takes a `Mark` and asks it to render each amount. `plainUsd`
 * gives back exactly the string the site produced before. `markedUsd` wraps it
 * in a span carrying the spec, which is all `spot-dom.ts` needs to recompute
 * it. One sentence, one generator, two renderings -- rather than a sentence
 * written twice and a regex hunting for dollar signs in the output.
 */
export type Mark = (amount: number, spec: FigureSpec) => string;

/** The plain rendering: the figure and nothing around it. */
export const plainUsd: Mark = (amount, spec) =>
  spec.kind === 'price-unit' ? `${formatUsd(amount)}/ozt` : formatUsd(amount);

/**
 * The rewritable rendering: the same characters, wrapped in a span that says
 * what they are.
 *
 * Safe to interpolate: `kind` is a union of literals, `metal` is a union of
 * literals and `ozt` is a number, so nothing here can carry a quote or an
 * angle bracket out of the catalogue and into the markup.
 */
export const markedUsd: Mark = (amount, spec) =>
  `<span data-spot="${spec.kind}" data-spot-metal="${spec.metal}"${
    spec.ozt === undefined ? '' : ` data-spot-ozt="${spec.ozt}"`
  }>${plainUsd(amount, spec)}</span>`;

/* ===========================================================================
   Reading a snapshot off the wire
   =========================================================================== */

/**
 * Validate an arbitrary JSON body into a snapshot, or give up.
 *
 * The browser runs this on whatever `/api/spot` returned, and the endpoint's
 * own test runs it on what the endpoint produced -- one definition of a
 * well-formed snapshot rather than a parser on one side and an assertion on
 * the other.
 *
 * Every metal must be present and positive. A partial answer is rejected
 * outright rather than merged over the reference table: a page showing a live
 * silver price beside a stale gold one, under a single dateline claiming
 * both, is the one outcome the snapshot type exists to prevent.
 */
export const parseSpot = (body: unknown): SpotSnapshot | undefined => {
  if (!body || typeof body !== 'object') return undefined;
  const raw = body as Record<string, unknown>;
  const prices = raw.prices;
  if (!prices || typeof prices !== 'object') return undefined;

  const table = {} as Record<Metal, number>;
  for (const metal of METALS) {
    const price = (prices as Record<string, unknown>)[metal];
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return undefined;
    table[metal] = price;
  }

  if (typeof raw.asOf !== 'string' || !raw.asOf) return undefined;
  if (typeof raw.source !== 'string' || !raw.source) return undefined;

  return { prices: table, asOf: raw.asOf, source: raw.source, live: raw.live === true };
};
