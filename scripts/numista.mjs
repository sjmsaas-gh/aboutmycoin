/**
 * The second opinion on a mintage.
 *
 * ---------------------------------------------------------------------------
 * WHY A SECOND SOURCE IS NOT OPTIONAL HERE
 * ---------------------------------------------------------------------------
 *
 * `data/mintages.json` used to record that its source count was one, and was
 * right to: Wikipedia's Washington mintage column cites washingtonquarters.org,
 * so checking the two against each other compares a table with its own
 * footnote. That was survivable while the figures came from one page that had
 * been read by collectors for twenty years. It stopped being survivable at
 * 1999, where the figures live on three more pages and those pages are
 * demonstrably wrong in ways a single reading cannot catch:
 *
 *   THREE ROWS OF THE AMERICAN WOMEN TABLE ARE MISSING A MINT CELL ENTIRELY.
 *   Jovita Idar, Mary Edwards Walker and Celia Cruz each have eleven cells
 *   where the table has twelve columns, so every figure after the gap is read
 *   one column to the left -- Philadelphia's mintage filed under Denver, the
 *   uncirculated coin's filed under Philadelphia. Nothing about the row looks
 *   wrong. Every number in it is a plausible mintage.
 *
 *   THE 2025 FIGURES ARE NOT SETTLED. This source and that one agree exactly on
 *   three of the five 2025 designs and differ by a factor of three on the
 *   fourth. A figure two sources disagree about is a figure this site does not
 *   print, and without a second source there is no way to know which it is.
 *
 * So this module is the other half of the pair, and what it produces is not a
 * replacement set of figures. It is an AGREEMENT COUNT: `fetch-mintages.mjs`
 * takes a figure only where the two sources say the same thing, uses this one
 * alone where the primary has no figure at all, and refuses to publish a coin
 * where they conflict. That last branch is the one that matters; it is the
 * grade pages' "two figures minimum, or the rung is not a page" rule applied to
 * a mintage.
 *
 * ---------------------------------------------------------------------------
 * A BUILD-TIME CREDENTIAL, AND WHAT THAT MEANS
 * ---------------------------------------------------------------------------
 *
 * `NUMISTA_CLIENT_ID` and `NUMISTA_API_KEY` are research credentials. Nothing
 * under `src/` may read them, no page may call this API, and no numista.com
 * origin belongs in the CSP -- a visitor's request touches a file on a CDN and
 * nothing else, which is the house rule this whole pipeline exists to keep.
 *
 * The allowance is two thousand calls a month and a full enumeration of one
 * series is about two hundred and sixty, so EVERY RESPONSE IS CACHED and the
 * cache is committed. A re-run costs nothing, the numbers a build was made from
 * are in the repository, and `--refresh` is the only thing that spends the
 * allowance again.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

const API = 'https://api.numista.com/api/v3';

/**
 * Where a series lives in somebody else's catalogue.
 *
 * Three lines, the same shape as the `SERIES` registry in
 * `fetch-mintages.mjs`: it says where to look and never what the answer is.
 *
 *   query        the catalogue's own search, which returns types in year order.
 *   titleMatch   what a type of this denomination is called there. The search is
 *                fuzzy and returns dimes and dollars too, and the catalogue
 *                spells one denomination more than one way.
 *   exclude      titles that are not an issued coin. Numista catalogues the
 *                1999 manganese-brass patterns alongside the quarters.
 *   designOf     the reverse design a title names, so a figure here can be
 *                matched to the figure for the same design there.
 */
export const NUMISTA_SERIES = {
  'washington-quarter': {
    query: 'Washington Quarter',
    /*
     * Two spellings of one denomination, and the catalogue uses both: every
     * quarter is "¼ Dollar" EXCEPT the 2024 issues, which are "25 Cents". A
     * single prefix dropped that whole year silently -- the enumeration simply
     * returned nothing for 2024 and the merge read it as a year the second
     * source had not been asked about.
     */
    titleMatch: /^(\u00bc Dollar|25 Cents)\b/,
    /*
     * Not an issued quarter. The catalogue files the 1999 manganese-brass
     * patterns and the five-ounce America the Beautiful bullion rounds under
     * the same denomination, and a five-ounce round is not a quarter whatever
     * its face value says.
     */
    exclude: /;\s*(Pattern|Trial|Piedfort)|Silver\s*\d+\s*oz|Bullion/i,
    /*
     * `¼ Dollar "Washington Quarter" (Delaware)` and, for the silver proof of
     * the same design, `... (Delaware - Silver Proof)`. The suffix is the
     * catalogue's way of splitting one design into two types and is not part of
     * the design's name.
     */
    designOf: (title) => {
      // The catalogue splits one design into several types and says which by
      // appending to the title, sometimes inside the brackets and sometimes
      // after them: "(Delaware - Silver Proof)" and "(Shawnee..., Illinois) -
      // Silver Proof" are the same design twice.
      const trimmed = title.replace(/\s*[-–]\s*Silver(\s+\d+\s*oz)?(\s+Proof|\s+Bullion)?.*$/i, '').trim();
      // Brackets nest -- "(Ellis Island (Statue of Liberty National Monument),
      // New Jersey)" -- so the design is what sits between the FIRST bracket
      // that opens after the series name and the last one that closes.
      const opened = trimmed.indexOf('(');
      if (opened === -1) {
        // No design in the title at all: the base type, which is the series
        // before the commemorative reverses began. The primary source calls
        // that design "Eagle", off its own table captions.
        return /"Washington (Silver )?Quarter"\s*$/.test(trimmed) ? 'Eagle' : null;
      }
      /*
       * The closing bracket may already be gone: the suffix stripped above
       * sometimes sits INSIDE the brackets, and takes the ")" with it.
       */
      const closed = trimmed.lastIndexOf(')');
      return trimmed
        .slice(opened + 1, closed > opened ? closed : undefined)
        .replace(/\s*[-–]\s*Silver(\s+\d+\s*oz)?(\s+Proof|\s+Bullion)?.*$/i, '')
        .trim();
    },
  },
  'morgan-dollar': {
    query: 'Morgan Dollar',
    /*
     * Anchored, which is the whole filter. The catalogue carries a second
     * `1 Dollar "Morgan Dollar" (100th anniversary)` -- the 2021 revival, a
     * .999 fine coin sold at a premium -- and the anchor is what keeps its
     * issues out without a rule about dates.
     */
    titleMatch: /^1 Dollar "Morgan Dollar"$/,
    exclude: /\b(Pattern|Trial|Piedfort)\b/i,
    /*
     * One design for the whole run, named the same on both sides so the merge
     * pairs it. The primary source's table has no design column at all; see
     * `design` on the Morgan source in `fetch-mintages.mjs`.
     */
    designOf: () => 'Morgan',
    /*
     * The catalogue splits a year by REVERSE HUB and by VARIETY, and the two
     * have to be told apart, because they behave differently:
     *
     *   A hub partitions the year's mintage. 1878 Philadelphia is 750,000 on
     *   the first reverse and 9,759,300 on the second, and the year's figure is
     *   the two added up. Dropping either would state a mintage a third too low.
     *
     *   A variety does NOT. Its coins are already counted inside the figure for
     *   the ordinary coin -- the catalogue says so itself, in the comments that
     *   read "mintage included in 2nd reverse" -- so adding it would count those
     *   coins twice. And a variety is listed and never followed here anyway.
     *
     * So varieties are dropped and hubs are summed, by `rollUp` below. The
     * result agrees with the primary source on 87 of the 95 issues both carry;
     * the seven that disagree and the one the catalogue has no plain figure for
     * are what `npm run report` exists to print.
     */
    /*
     * The two reverse hubs of 1878 Philadelphia, which get pages of their own.
     *
     * REGISTERED AND NEVER INFERRED, because "1st reverse" and "2nd reverse"
     * are what this catalogue writes on half the series and they mean a
     * different thing on every date: the 1879-S carries a 2nd and a 3rd
     * reverse, the 1880-CC carries four. Only on the first year of the run do
     * they correspond to a feature a reader can count without a reference, and
     * only there do they partition a mintage the sources state separately.
     * Reading the ordinal as a hub everywhere would fan the series out by die
     * pairing, which is the generated-catalogue failure with a Roman numeral
     * instead of a letter.
     */
    hubOf: (year, mark, comment) => {
      if (year !== 1878 || mark !== '') return null;
      if (/1st reverse/i.test(comment ?? '')) return '8-tail-feathers';
      if (/2nd reverse/i.test(comment ?? '')) return '7-tail-feathers';
      return null;
    },
    finishOf: (comment) => {
      const text = comment ?? '';
      if (/overdate|over ?\d|repunched|doubled|tail bar|tail feathers|included in/i.test(text)) {
        return null;
      }
      if (/reverse proof|enhanced|satin|matte|specimen/i.test(text)) return null;
      // Markless Philadelphia struck proofs every year of the run, and the
      // catalogue carries them. There is one proof of this series, not the
      // quarter's clad-and-silver pair, so it is never 'silver-proof'.
      if (/proof/i.test(text)) return 'proof';
      return 'circulation';
    },
    rollUp: true,
  },
  'peace-dollar': {
    query: 'Peace Dollar',
    /*
     * Anchored, for the Morgan's reason: the catalogue carries a second
     * `1 Dollar "Peace Dollar" (100th anniversary)` -- the 2021 revival and the
     * 2023-2026 issues, .999 fine and sold at a premium -- and the anchor keeps
     * its issues out without a rule about dates.
     *
     * Type 5580 is the one that matters and it spans 1921 to 1964 in a single
     * type, so every issue of the run is an issue of it and there is one
     * design. The 1964-D is inside it, with a figure; the primary source stops
     * at 1935 and the merge refuses a coin nothing primary publishes, which is
     * how a dollar that was struck and then melted entire stays out of the
     * catalogue without a rule of its own.
     */
    titleMatch: /^1 Dollar "Peace Dollar"$/,
    exclude: /\b(Pattern|Trial|Piedfort)\b/i,
    /* One design for the whole run, named as the primary source's `design` is. */
    designOf: () => 'Peace',
    /*
     * No hubs. Nothing in this series partitions a year's mintage the way the
     * 1878 Morgan reverses do, so there is no `hubOf` and `rollUp` is off --
     * see the note on the relief rows below for what that decision rests on.
     */
    finishOf: (comment) => {
      const text = comment ?? '';
      /*
       * THE ONE ROW THAT HAS TO BE DROPPED, AND THE TRAP UNDER IT.
       *
       * The catalogue gives 1922 Philadelphia TWO rows: `normal relief; see
       * comments` at 51,737,000 and `high relief; see comments` at 35,401. The
       * primary source states 51,737,000 for the date, so its figure is the
       * normal-relief row ALONE and the high-relief coins are not inside it.
       * Summing them would put the year 35,401 over every other source and
       * refuse the coin; keeping both unsummed would send two rows for one
       * (year, mark, finish) into a merge that pairs by design and silently
       * drops one. So the variety row goes, here, and 1922 is the ordinary
       * coin -- which is also what the house rule says, because a variety is
       * listed and never followed and this one has no page.
       *
       * THE TRAP: the 1921 row ALSO says `high relief`, and there it is not a
       * variety -- every 1921 Peace dollar was struck in high relief, the
       * comment describes the whole date, and 1,006,473 is the year's entire
       * mintage. A bare /high relief/ test drops the first year of the series
       * and the key date most people ask about, leaving it on the primary
       * source alone with nothing to check it against. The semicolon is what
       * separates them: the catalogue appends `; see comments` on a row that is
       * one of several for its date, and writes the bare phrase where the row
       * is the date.
       *
       * If the catalogue ever rewords that comment this stops matching and the
       * 1922 comes back as two rows. That is a loud failure -- a coin withheld
       * and reported -- rather than a quiet wrong figure, which is the right
       * way round, and `npm run report` is where it would surface.
       */
      if (/high relief;/i.test(text)) return null;
      /*
       * The other variety rows of the series -- the 1934-D doubled die, the
       * large and small mint marks of 1928-S and 1934-D -- need no test at all:
       * the catalogue publishes no mintage for any of them, and a row with no
       * mintage is dropped before this function is reached. The rows that DO
       * carry the figure are the `large "S"` and `large "D"` ones, and their
       * figures are the years' totals, which is why they are kept rather than
       * matched on.
       */
      if (/doubled|double die/i.test(text)) return null;
      /*
       * There is no proof of this series in the catalogue, and no `proof`
       * branch here on purpose. See `missing` on the primary source: what
       * exists for 1921 and 1922 is a census rather than a mintage.
       */
      return 'circulation';
    },
    /*
     * OFF, where the Morgan's is on, and the difference is the whole reason
     * both fields exist. The Morgan needs summing because its catalogue splits
     * 1878 by reverse hub and the year's figure is the parts added up. Nothing
     * here splits a mintage: every multi-row date in this series is one real
     * coin and one variety of it, the variety is dropped above or carries no
     * figure, and summing would add a variety's coins to a total that already
     * excludes them.
     */
    rollUp: false,
  },
  'mercury-dime': {
    query: 'Mercury Dime',
    /*
     * THE ONLY SERIES HERE WHOSE NUMISTA ENTRY IS THE PRIMARY SOURCE, because
     * Wikipedia carries no mintage table for the Mercury dime at all. See the
     * `primary` field on its entry in `fetch-mintages.mjs` for the decision and
     * what it costs; what matters here is that this registration is load-
     * bearing in a way the others are not. Elsewhere a mistake in it costs a
     * vote; here it costs the catalogue.
     *
     * Type 51 spans 1916 to 1945 in a single type, which is the Morgan's shape:
     * every issue of the run is an issue of it and there is one design.
     */
    titleMatch: /^1 Dime "Mercury Dime"$/,
    /*
     * Anchored above, which is what keeps two coins out that carry the name and
     * are not this series: `1 Dime (Mercury Dime Gold Commemorative)`, the 2016
     * centennial struck in gold, and `1 Dime "Mercury Dime" (Semiquincentennial)`
     * for 2026. Both are modern collectables sold at a premium, neither was ever
     * in a till, and the anchor keeps them out without a rule about dates --
     * which matters because a rule about dates is the thing that would need
     * revising the next time the Mint reaches for the design.
     */
    exclude: /\b(Pattern|Trial|Piedfort)\b/i,
    /* One design for the whole run, as the Morgan and the Peace dollar are. */
    designOf: () => 'Mercury',
    finishOf: (comment) => {
      const text = comment ?? '';
      /*
       * The varieties, dropped -- and the trap is the one the Peace dollar's
       * entry warns about, arriving here in a different costume.
       *
       * The rows to drop carry NO mintage and are gone before this function is
       * reached: the 1919 and 1936-1941 doubled dies, the 1942/1 overdates of
       * both mints, the small-S of 1928 and 1941, the very small S of 1945. The
       * rows that DO carry a figure are their siblings -- `Large "S"` on 1928-S
       * and 1941-S, `Larger "S"` on 1945-S -- and those figures are the YEAR's
       * whole mintage, not the large-mark coins' share of it. The catalogue
       * splits the date into two rows to describe a punch and states the total
       * against one of them.
       *
       * So a test on the mark size would delete three dates. What is matched on
       * is the doubling and the overdate alone, both of which appear only on
       * rows the catalogue publishes no figure for -- which means this test
       * changes nothing today and is here to fail loudly rather than quietly if
       * the catalogue ever attaches a figure to one.
       */
      if (/doubled|double die|overdate|over ?\d/i.test(text)) return null;
      if (/reverse proof|enhanced|satin|matte|specimen/i.test(text)) return null;
      /*
       * Philadelphia struck proofs from 1936 to 1942 and the catalogue carries
       * all seven. There is one proof of this series -- no clad-and-silver pair
       * to tell apart, as the modern quarter has -- so it is never
       * 'silver-proof'.
       */
      if (/proof/i.test(text)) return 'proof';
      return 'circulation';
    },
    /*
     * OFF, for the Peace dollar's reason. Nothing in this series partitions a
     * year's mintage the way the 1878 Morgan reverses do: every multi-row date
     * is one real coin and one variety of it, the variety carries no figure,
     * and summing would add a variety's coins to a total that already contains
     * them.
     */
    rollUp: false,
  },
  'wheat-penny': {
    query: 'Wheat Penny',
    /*
     * ONE type spans the whole run -- 908, "1 Cent 'Lincoln - Wheat Ears
     * Reverse'", 1909 to 1958 -- which is the Morgan's shape and not the
     * modern cent's. The Lincoln cent as a whole is one type per design and
     * would need a dozen entries; the wheat reverse alone is one.
     */
    titleMatch: /^1 Cent "Lincoln - Wheat Ears Reverse"$/,
    exclude: /\b(Pattern|Trial|Piedfort)\b/i,
    /*
     * The same two names the primary source's `designs` map produces, derived
     * from the comment rather than from a caption. Both catalogues state the
     * 1909 VDB distinction; neither states it the same way, so each is mapped
     * to one agreed pair of words and the merge pairs on those.
     */
    designOf: () => 'Plain',
    designFromIssue: (comment) => (/with initials "VDB"/i.test(comment ?? '') ? 'VDB' : 'Plain'),
    /*
     * The same split the primary source states in two tables, stated here in
     * a comment. Scoped to 1909 because that is the only year the reverse
     * carried the initials -- from 1918 they are on Lincoln's shoulder, which
     * is not a reverse difference and not a hub.
     */
    hubOf: (year, mark, comment) =>
      year === 1909 && /with initials "VDB"/i.test(comment ?? '') ? 'vdb' : null,
    finishOf: (comment) => {
      const text = comment ?? '';
      /*
       * VARIETIES AND ERRORS, dropped. The catalogue lists the doubled dies,
       * the repunched and over-mintmarks, the large and small mintmark pairs
       * and the off-metal strikes beside the ordinary dates, and most of them
       * say so themselves -- "mintage included with 1955", "only 2 known".
       * A variety is listed and never followed, and a population is not a
       * mintage.
       */
      if (/double die|doubled die|re-?punched|inverted mintmark|over horizontal/i.test(text)) return null;
      /*
       * `modified` is NOT here, and must not come back. This catalogue writes
       * "Modified/unauthentic mintmarks exist" on the 1914-D, which is a
       * warning that the coin is widely counterfeited -- not a statement that
       * the row IS a variety. Dropping it removed the key date of the series
       * from the second source on the same run the primary's own counterfeit
       * rule removed it from the first, so the coin had no page at all and
       * nothing reported a problem.
       */
      if (/large mintmark|small mintmark|without D mintmark|with faint D/i.test(text)) return null;
      if (/known|instead of steel|mintage included/i.test(text)) return null;
      /*
       * Every proof this series had. "Matte Proof" is 1909-1916, "Proof with
       * Satin Finish" and "Brilliant Proof" are the two 1936 types, and a
       * bare "Proof" is 1937 onward. There is no silver proof and no
       * uncirculated finish, so there is no branch for either.
       */
      if (/proof/i.test(text)) return 'proof';
      return 'circulation';
    },
    /*
     * OFF. Nothing in this series partitions a mintage: 1909's two reverses
     * are two DESIGNS that the catalogue sums per (year, mark, finish), which
     * is a different mechanism, and every other multi-row date is one coin
     * and a variety of it that has been dropped above.
     */
    rollUp: false,
  },
};

/** Compositions this catalogue states, mapped to the groups this site files by. */
const GROUP = [
  { match: /silver/i, group: 'silver' },
  { match: /clad|copper-nickel|cupronickel/i, group: 'clad' },
  /*
   * ORDER MATTERS HERE, and these three were added the day a copper series
   * arrived. A type whose composition matches nothing is skipped ENTIRELY --
   * `if (!group) continue` -- so the wheat cent, whose composition this
   * catalogue states as "Bronze", contributed none of its 179 issues and the
   * whole series came out on the primary source alone. It did not look like a
   * failure; it looked like a second source that had never heard of the coin.
   *
   * Steel before copper, because "Zinc plated steel" contains neither word
   * the copper rule wants but would be caught by a looser one. Copper last,
   * and guarded against "copper plated zinc" -- the modern cent, which is a
   * zinc coin wearing a copper coat and is not a copper coin. It is out of
   * scope today and the guard is what stops it arriving as one.
   */
  { match: /steel/i, group: 'steel' },
  { match: /bronze|brass/i, group: 'copper' },
  { match: /copper(?!-?\s?plated)/i, group: 'copper' },
];

/**
 * A type's `comment` on an issue, turned into the same finish vocabulary the
 * primary parser uses.
 *
 * The catalogue writes "Proof", "Uncirculated finish" or nothing at all, and
 * whether a proof is the silver one is a fact about the TYPE's composition
 * rather than about the issue's comment -- which is why this takes both.
 */
const finishOf = (comment, group) => {
  const text = comment ?? '';
  if (/reverse proof|enhanced|satin|matte|specimen/i.test(text)) return null;
  if (/proof/i.test(text)) return group === 'silver' ? 'silver-proof' : 'proof';
  if (/uncirculated/i.test(text)) return 'uncirculated';
  if (text !== '') return null;
  return group === 'silver' ? null : 'circulation';
};

/* ---------------------------------------------------------------------------
   Fetching, and not fetching
   --------------------------------------------------------------------------- */

/**
 * Every key this machine has, in the order they are spent.
 *
 * The catalogue's allowance is per KEY and it is a quota rather than a rate:
 * when it is gone the endpoint answers 429 "Quota exceeded" with no
 * `Retry-After` and no reset header, so there is nothing to back off to and
 * waiting is a guess. A second key is what makes the difference between a
 * run that finishes and a run that stops a series short.
 *
 * `NUMISTA_API_KEY` is spent first and the numbered ones after it, so the
 * behaviour with one key configured is exactly what it was.
 */
const keys = () => {
  const found = [process.env.NUMISTA_API_KEY, process.env.NUMISTA_API_KEY_2, process.env.NUMISTA_API_KEY_3]
    .map((k) => (k ?? '').trim())
    .filter(Boolean);
  if (found.length === 0) {
    throw new Error(
      'NUMISTA_API_KEY is not set. It is a build-time research credential; see .env.example. Run without --refresh to use the committed cache.',
    );
  }
  return found;
};

/**
 * Which key the run is currently spending, as an index into `keys()`.
 *
 * Module state rather than a parameter, because exhausting a key is a fact
 * about the RUN and not about the call that happened to discover it. A
 * hundred calls follow the one that got the 429; asking each of them to
 * rediscover the same thing would spend a failed call per request and, worse,
 * would send the enumeration back to a key already known to be empty.
 */
let spending = 0;

/**
 * A key named the way it is safe to name one: eight characters of a digest.
 *
 * NEVER the key itself. This string goes to a console, and a console goes to
 * a log, a terminal recording and whatever a CI system keeps -- and the same
 * rule already governs the PCGS ledger one directory over, for the same
 * reason and with the same eight characters.
 */
const keyName = (value) => createHash('sha256').update(value).digest('hex').slice(0, 8);

const get = async (path) => {
  const all = keys();
  /*
   * Try every key that has not already been spent THIS RUN, starting at the
   * one in hand. A 429 rotates and retries the same path; any other failure
   * is not a quota problem and is raised at once rather than burning a second
   * key on a request that is going to fail the same way.
   */
  for (; spending < all.length; spending += 1) {
    const response = await fetch(`${API}${path}`, {
      headers: { 'Numista-API-Key': all[spending], 'User-Agent': 'aboutmycoin-build/1.0' },
    });
    if (response.ok) return response.json();
    if (response.status !== 429) {
      throw new Error(`Numista answered ${response.status} for ${path}`);
    }
    if (spending + 1 < all.length) {
      console.log(
        `  Numista key ${keyName(all[spending])} is out of quota; switching to ${keyName(all[spending + 1])}`,
      );
    }
  }
  throw new Error(
    `Numista answered 429 for ${path}: all ${all.length} configured key(s) are out of quota. Add another as NUMISTA_API_KEY_2 or wait for the allowance to reset; a run without --refresh uses the committed cache and needs no key at all.`,
  );
};

/**
 * Every type of a series, and every issue of every type.
 *
 * Paged rather than filtered by date: the catalogue's `date` parameter returns
 * an incomplete set -- it finds eight of 2023's ten quarter types and none of
 * 2024's -- and a source that silently omits a year is worse than no source,
 * because the merge would read the omission as "the primary is alone here"
 * rather than as "this has not been checked".
 */
const enumerate = async (config) => {
  const types = [];
  let total = null;
  for (let page = 1; total === null || types.length < total; page += 1) {
    const body = await get(
      `/types?issuer=etats-unis&category=coin&q=${encodeURIComponent(config.query)}&count=50&page=${page}`,
    );
    total = body.count;
    const batch = body.types ?? [];
    if (batch.length === 0) break;
    for (const type of batch) types.push(type);
    if (page > 40) throw new Error('Numista paging did not terminate');
  }
  return types.filter(
    (t) => config.titleMatch.test(t.title ?? '') && !config.exclude.test(t.title ?? ''),
  );
};

/**
 * The cached document for a series, refreshed only when asked.
 *
 * Committed, so a build is made from numbers that are in the repository and a
 * re-run of the import spends none of the month's allowance.
 */
export const loadNumista = async (series, { refresh = false, cache } = {}) => {
  const path = cache ?? `data/numista/${series}.json`;
  if (!refresh && existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));

  const config = NUMISTA_SERIES[series];
  if (!config) throw new Error(`no Numista query registered for "${series}"`);

  const found = await enumerate(config);
  const types = [];
  for (const summary of found) {
    const type = await get(`/types/${summary.id}`);
    const issues = await get(`/types/${summary.id}/issues`);
    types.push({
      id: type.id,
      title: type.title,
      composition: (type.composition ?? {}).text ?? null,
      weight: type.weight ?? null,
      issues: (issues ?? []).map((i) => ({
        year: i.gregorian_year ?? i.year ?? null,
        mark: i.mint_letter ?? '',
        mintage: typeof i.mintage === 'number' ? i.mintage : null,
        /*
         * The PCGS number for this exact issue, which the catalogue carries on
         * 121 of the Morgan dollar's 144 issues and on every one of the
         * quarter's 124. It is what `npm run pcgs` needs and it is free here,
         * against an allowance this pipeline already spends, where getting it
         * from PCGS would cost a call from a hundred a day.
         *
         * Carried even though nothing in the mintage merge reads it: the
         * alternative is a second enumeration of the same issues for one
         * field.
         */
        pcgs:
          (i.references ?? []).find((r) => (r.catalogue ?? {}).code === 'PCGS')?.number ?? null,
        comment: i.comment ?? '',
      })),
    });
  }

  const document = {
    source: {
      name: 'Numista',
      url: 'https://numista.com',
      note: 'Fetched at build time with a research credential and cached here. Nothing under src/ reads it and no page calls it. Refresh with `npm run mintages -- --refresh`.',
    },
    series,
    types,
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
  return document;
};

/**
 * The cached document, flattened into the same per-design rows the primary
 * parser produces, so the two can be compared without either knowing about the
 * other's shape.
 */
export const numistaRows = (document, problems) => {
  const config = NUMISTA_SERIES[document.series];
  const rows = [];
  for (const type of document.types) {
    // Filtered here as well as when fetching. The cache holds what the
    // catalogue said; which of it is a coin this site files is a decision the
    // code makes, so tightening the rule does not mean spending the allowance
    // again on two thousand calls to re-read the same titles.
    if (config.exclude.test(type.title ?? '') || !config.titleMatch.test(type.title ?? '')) continue;
    const group = GROUP.find((g) => g.match.test(type.composition ?? ''))?.group;
    if (!group) continue;
    const design = config.designOf(type.title);
    if (!design) {
      problems.push(`Numista ${type.id} "${type.title}": no design in the title`);
      continue;
    }
    for (const issue of type.issues) {
      if (issue.mintage === null || issue.year === null) continue;
      const finish = (config.finishOf ?? finishOf)(issue.comment, group);
      if (finish === null) continue;
      rows.push({
        year: issue.year,
        mark: issue.mark.toUpperCase(),
        finish,
        /*
         * A design read off the ISSUE rather than the type, for a series whose
         * catalogue puts two designs inside one type. The wheat cent's 1909
         * VDB reverse is a comment on the issue -- `With initials "VDB"` --
         * where the modern quarter's design is part of the type's own title.
         * Where a series does not declare this, the type's design stands, as
         * it does for every other series here.
         */
        design: config.designFromIssue ? config.designFromIssue(issue.comment) : design,
        group,
        hub: config.hubOf?.(issue.year, issue.mark.toUpperCase(), issue.comment) ?? '',
        mintage: issue.mintage,
      });
    }
  }
  /*
   * Several catalogue rows that are one coin here, added up.
   *
   * Only for a series that declares it, because for the quarter two rows on one
   * (year, mark, finish, design) would be a parsing fault worth seeing rather
   * than something to sum. For a one-design series whose catalogue splits a
   * year by reverse hub it is the only way to get the year's figure -- and the
   * merge downstream pairs DESIGNS, so two rows with one design name reaching
   * it would be one figure silently discarded rather than two compared.
   */
  if (!config.rollUp) return rows;
  const summed = new Map();
  for (const row of rows) {
    const key = `${row.year}|${row.mark}|${row.finish}|${row.design}|${row.group}|${row.hub}`;
    const held = summed.get(key);
    if (held) held.mintage += row.mintage;
    else summed.set(key, { ...row });
  }
  const out = [...summed.values()];
  /*
   * A hub partitions a coin; it does not replace it. So the hubs are summed a
   * second time into the hub-less coin they came from, and BOTH reach the
   * merge: the 1878 Philadelphia dollar is a page stating the year's total and
   * the two tail-feather reverses are pages of their own under it. Emitting
   * only the hubs would delete the page for the phrase almost everybody types,
   * and emitting only the sum is where this started.
   */
  const hubbed = out.filter((row) => row.hub);
  if (hubbed.length === 0) return out;
  const wholes = new Map();
  for (const row of hubbed) {
    const key = `${row.year}|${row.mark}|${row.finish}|${row.design}|${row.group}`;
    const held = wholes.get(key);
    if (held) held.mintage += row.mintage;
    else wholes.set(key, { ...row, hub: '' });
  }
  return [...out, ...wholes.values()];
};

/**
 * A reverse design, reduced to the part two catalogues agree on.
 *
 * They do not agree on the name, and they disagree in both directions. One
 * source's table caption says "National Park" where the other's title says
 * "National Park of American Samoa"; one says "River Of No Return" and the
 * other "Frank Church River of No Return Wilderness, Idaho"; one says "Effigy
 * Mounds" and the other "Effigy Mounds National Monument, Iowa". The design is
 * the same design each time, and a merge matching on the full string reads every
 * one of them as present in one source and absent from the other -- which looks
 * exactly like a gap to be filled, and fills it, and puts SIX reverse designs on
 * the 2019-W page where there were five.
 *
 * So the name is reduced only where reduction is safe -- case, punctuation, a
 * parenthetical gloss, and everything after the state -- and the pairing is done
 * by CONTAINMENT rather than equality. An earlier version stripped a list of
 * generic words instead ("park", "island", "river"), which turned "River of No
 * Return" into "no return" and did not match anything.
 *
 * The fuzziness is one-way and guarded: it PAIRS two figures and never writes
 * anything -- the name a page prints is the primary source's own -- and
 * `pairDesigns` refuses a name that matches two designs in one coin rather than
 * choosing between them.
 */
export const normaliseDesign = (name) =>
  name
    .toLowerCase()
    // A parenthetical is a gloss on the site, never what it is called.
    .replace(/\([^)]*\)/g, ' ')
    // Everything after the first comma is the state or territory it is in.
    .split(',')[0]
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

/**
 * Whether two normalised design names are the same design.
 *
 * Two comparisons, because the sources disagree about spacing as well as about
 * length. The word form is padded so containment is on whole words -- "art" must
 * not match "arts" -- and the space-free form is what pairs "US Virgin Islands"
 * with "U.S. Virgin Islands", where normalising the punctuation away leaves
 * "us virgin islands" against "u s virgin islands" and no word-boundary
 * containment between them. That pair silently put SEVEN reverse designs on the
 * two 2009 pages.
 */
export const sameDesign = (a, b) => {
  const contains = (left, right) => left.includes(right) || right.includes(left);
  if (contains(` ${a} `, ` ${b} `)) return true;
  if (contains(a.replace(/ /g, ''), b.replace(/ /g, ''))) return true;
  /*
   * The shorter name's words, in order, inside the longer one.
   *
   * The primary source abbreviates by dropping words out of the MIDDLE --
   * "Ozark Riverways" for "Ozark National Scenic Riverways" -- which no
   * containment test can reach, and which put six reverse designs on the two
   * 2017 pages. Order is required, so this is a subsequence rather than a set:
   * it pairs "ozark riverways" with "ozark national scenic riverways" and
   * refuses to pair "north carolina" with "carolina north".
   *
   * The FIRST word must be the same word, which is not a tidying-up: without it
   * the 2020 caption "National Park" is an ordered subsequence of three of that
   * year's five designs -- American Samoa's, Salt River Bay's and
   * Marsh-Billings-Rockefeller's -- and a site is named by what it is called
   * rather than by the words "national park" appearing somewhere inside it.
   */
  const short = (a.length <= b.length ? a : b).split(' ');
  const long = (a.length <= b.length ? b : a).split(' ');
  if (short[0] !== long[0]) return false;
  let at = 0;
  for (const word of short) {
    const found = long.indexOf(word, at);
    if (found === -1) return false;
    at = found + 1;
  }
  // Two words at least, so a one-word name cannot pair with anything sharing
  // one word: "Denali" must not match "Denali" and "Mount Denali Preserve"
  // indifferently, and more to the point "Acadia" must not match "Acadia" twice.
  return short.length >= 2;
};

/**
 * Pair one coin's designs across the two sources.
 *
 * Returns the pairs, and the rows of each side that found no partner. It refuses
 * rather than guessing when one name matches two designs of the same coin, which
 * is the one way containment can go wrong.
 */
export const pairDesigns = (primary, second, problems, where) => {
  const pairs = [];
  const unpairedSecond = [...second];
  const unpairedPrimary = [];
  for (const row of primary) {
    const matches = unpairedSecond.filter((other) => sameDesign(normaliseDesign(row.design), normaliseDesign(other.design)));
    if (matches.length === 0) {
      unpairedPrimary.push(row);
      continue;
    }
    if (matches.length > 1) {
      problems.push(
        `${where}: "${row.design}" matches ${matches.length} designs in the second source (${matches.map((m) => `"${m.design}"`).join(', ')}). Two designs of one coin cannot share a name; pair them by hand or make the names distinct.`,
      );
      unpairedPrimary.push(row);
      continue;
    }
    pairs.push([row, matches[0]]);
    unpairedSecond.splice(unpairedSecond.indexOf(matches[0]), 1);
  }
  return { pairs, unpairedPrimary, unpairedSecond };
};
