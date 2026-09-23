/**
 * Where a grade price comes from, and how each source's page is read.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS SEPARATELY FROM THE FETCHER
 * ---------------------------------------------------------------------------
 *
 * A source is three things: how to enumerate its pages, how to turn one of its
 * page titles into a (year, mint mark, finish, design) key this catalogue can
 * match, and how to read a grade table out of its HTML. Those three change when
 * a site redesigns and nothing else does, so they live together and away from
 * the crawl, the cache and the merge.
 *
 * Adding a fourth source is an entry in `SOURCES` and nothing else.
 *
 * ---------------------------------------------------------------------------
 * WHICH SOURCES, AND WHY NOT THE OBVIOUS ONES
 * ---------------------------------------------------------------------------
 *
 * PCGS, Greysheet/CDN and Heritage all answer 403 to a scripted request, and
 * NGC's price guide renders from an API the page does not name. Those are the
 * four a person would reach for first and none of them can be read at the scale
 * of a series. That is recorded here rather than rediscovered every six months.
 *
 * What is left is two independent retail guides, and two is the minimum this
 * section can run on rather than a comfortable number:
 *
 *   USA Coin Book   exact Sheldon rungs (G4 VG8 F12 VF20 EF40 AU50 MS60 MS65
 *                   PR65), one page per issue.
 *   PriceCharting   a fuller ladder (MS60-MS70, PR60-PR70) but with the
 *                   circulated grades published as BANDS -- "VF (20-35)" is one
 *                   figure covering two of our rungs.
 *
 * They are not the same methodology: USA Coin Book publishes a retail estimate
 * with a live melt floor under it, PriceCharting computes from completed sales.
 * That is the whole reason two of them are worth more than either twice.
 *
 * A BAND IS ONE FIGURE FOR EVERY RUNG IT COVERS, and that is deliberate: the
 * source priced the band, so it is evidence about every rung inside it and no
 * evidence at all about which end of the band a given rung sits at. The merge
 * treats it as one observation per rung and the two-source gate does the rest.
 */

/* ---------------------------------------------------------------------------
   Reading HTML without a DOM
   --------------------------------------------------------------------------- */

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&nbsp;': ' ', '&#43;': '+', '&ndash;': '–', '&mdash;': '—',
};

export const decode = (text) =>
  text
    .replace(/&[a-z]+;|&#\d+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e)
    .replace(/\s+/g, ' ')
    .trim();

/** The text of every `<td>` and `<th>` in a fragment, in document order. */
const cells = (html) =>
  [...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => decode(m[1].replace(/<[^>]*>/g, ' ')));

/**
 * "$16.50" -> 16.5, "-" and "–" -> undefined.
 *
 * A dash is the source saying it has no figure for that rung, which is a
 * different thing from a figure of zero and must not become one: zero would
 * sort below every other rung and fail the ladder's monotonicity check, which
 * is a check about prices and not about gaps.
 */
export const money = (text) => {
  const m = /\$\s*([\d,]+(?:\.\d+)?)/.exec(text ?? '');
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/* ---------------------------------------------------------------------------
   A source's label for a grade -> the rungs it is evidence about
   --------------------------------------------------------------------------- */

/**
 * Every label either source prints, mapped to the slugs in src/data/grades.ts.
 *
 * A label mapping to two slugs is a published BAND and is one observation for
 * each of them. A label mapping to none is a rung this site does not register
 * -- "Ungraded", which is not a grade at all but an
 * average of raw coins in unknown condition and would poison every rung it
 * touched.
 *
 * An UNKNOWN label is not silently dropped: `fetchGradePrices` counts them and
 * the report prints them, because a source adding a rung looks exactly like a
 * parser that has stopped working.
 */
export const LABEL_RUNGS = {
  // USA Coin Book: one column per rung, already in this site's spelling.
  G4: ['g4'],
  VG8: ['vg8'],
  F12: ['f12'],
  VF20: ['vf20'],
  EF40: ['xf40'],
  XF40: ['xf40'],
  AU50: ['au50'],
  MS60: ['ms60'],
  MS63: ['ms63'],
  MS65: ['ms65'],
  // PriceCharting: bands below mint state, single rungs above it.
  'G (4-6)': ['g4'],
  'VG (8-10)': ['vg8'],
  'F (12-15)': ['f12', 'f15'],
  'VF (20-35)': ['vf20', 'vf30'],
  'XF (40-45)': ['xf40'],
  'AU (50-58)': ['au50', 'au58'],
  MS61: [],
  MS62: ['ms62'],
  MS64: ['ms64'],
  MS66: ['ms66'],
  MS67: ['ms67'],
  MS68: ['ms68'],
  MS69: ['ms69'],
  MS70: ['ms70'],
  /*
   * The proof rungs, which are a LADDER OF THEIR OWN and not a continuation.
   *
   * A proof never circulated, so it carries no wear and the Sheldon question
   * does not apply to it: what separates PR65 from PR67 is hairlines and the
   * contrast between frosted devices and mirrored fields. It is graded PR60 to
   * PR70 by one service and PF60 to PF70 by the other, and `grades.ts`
   * registers those as a separate tier for exactly that reason.
   *
   * These were mapped to nothing until 2026-09-22, when every rung of every
   * coin became a page: a proof issue with no ladder at all would have been a
   * hundred and eighteen coins with no grade pages, which is the opposite of
   * what that decision was for.
   */
  PR60: ['pr60'],
  PR61: ['pr61'],
  PR62: ['pr62'],
  PR63: ['pr63'],
  PR64: ['pr64'],
  PR65: ['pr65'],
  PR66: ['pr66'],
  PR67: ['pr67'],
  PR68: ['pr68'],
  PR69: ['pr69'],
  PR70: ['pr70'],
  Ungraded: [],
};

/* ---------------------------------------------------------------------------
   The series, and where each source files it
   --------------------------------------------------------------------------- */

/**
 * Everything about a source that is a fact about the SERIES rather than about
 * the source.
 *
 * This file was hardcoded to the Washington quarter in seven places until the
 * Morgan dollar arrived, and every one of them was a silent failure rather than
 * a loud one: a mint-mark regex that did not know CC parsed `1889 CC` as a
 * Philadelphia coin with a design called "CC", and a variety filter that did
 * not know what a VAM is would have accepted five hundred die pairings as
 * designs. Neither shows up as a miss in the report; both show up as a price.
 *
 * A series is registered here and nowhere else. Adding one is this entry, and
 * for a series with a mint mark of more than one letter it is the `marks`
 * alternation that matters most -- LONGEST FIRST, or `CC` is read as a `C`
 * this site does not register followed by a design called "C".
 */
const SERIES = {
  'washington-quarter': {
    /*
     * A regular-expression ALTERNATION, not a list of letters, because a mint
     * mark is not always one character -- see the Morgan entry below. P, D, S
     * and W and no more here: no United States mint has struck a quarter with a
     * two-letter mark. A bare date is Philadelphia and is normalised to P at
     * the parse, which is what lets one key compare a 1932 with a 1932-D
     * without either side knowing which spelling the other used.
     */
    marks: '[PDSW]',
    /*
     * The series' own name, which appears in both sources' titles -- bracketed
     * in one, bare in the other -- and is not part of an issue's identity.
     * Left in, it parses as a state called Washington.
     */
    noise: /\b(?:washington|state|america the beautiful|american women)\s+quarters?\b/gi,
    priceCharting: {
      /*
       * Four consoles, because this source files the series by reverse
       * programme rather than by denomination, and the singular/plural of each
       * is its own -- `coins-state-quarters` is a 404 and `coins-state-quarter`
       * is the list. There is no index of consoles to discover them from; they
       * were found by searching for a coin from each era and reading the URL.
       */
      consoles: [
        'coins-washington-quarter',
        'coins-state-quarter',
        'coins-america-the-beautiful-quarter',
        'coins-american-women-quarter',
      ],
      pages: 12,
    },
    usaCoinBook: {
      denomination: 'quarters',
      categories: [
        'washington',
        '50-states-and-territories',
        'america-the-beautiful',
        'american-women',
        'semiquincentennial',
      ],
      /*
       * The categories whose issues have NO design segment, so a segment left
       * over after the date is a variety rather than a reverse. The modern
       * programmes always carry one and are not listed here.
       */
      oneDesign: ['washington'],
    },
  },
  'morgan-dollar': {
    /*
     * CC FIRST, and it is the whole reason this is an alternation. A character
     * class would match the first C of a Carson City mark and leave the second
     * at the head of the design, so `1889 CC` would parse as a Philadelphia
     * coin with a design called "C" -- and the same for every New Orleans date,
     * every Carson City date, and therefore for the scarcest coins in the
     * series.
     */
    marks: 'CC|[PDSO]',
    noise: /\b(?:morgan)?\s*(?:silver\s+)?dollars?\b/gi,
    priceCharting: {
      consoles: ['coins-morgan-dollar'],
      // About 690 rows at 150 to a page. Eight is slack, and an exhausted
      // cursor costs one page that adds nothing rather than a wrong figure.
      pages: 8,
      /*
       * THE RULE THAT WOULD OTHERWISE HAVE RUINED THE RUN.
       *
       * The Morgan dollar is catalogued by die pairing under the VAM numbering,
       * and this source lists those beside the ordinary dates -- five or six
       * VAMs for a single 1878 before the plain coin appears, and about five
       * hundred across the series. The design-count rule in
       * `fetch-grade-prices.mjs` cannot catch them: it refuses a source that
       * lists more pages for an issue than the Mint struck DESIGNS, and a
       * Morgan has one design, so it would have refused this source for nearly
       * every date and left the series one-source and therefore entirely TBD.
       *
       * A token list was tried first and is not enough. The names do not stop:
       * `vam-1b3`, `vam-6a1b`, `vam-1aq3`, `vam-dbl`, `micro-s`, `zerbe-proof`,
       * `chapman-proof`, `188079-cc`, `1882-os`, `1900-occ`. Every one of them
       * is a new word or a new shape, and a list of words is a list that is one
       * short of whatever somebody names next.
       *
       * What they all have in common is structural: the series struck ONE
       * design, so anything this source writes in the design slot is not a
       * design. That is the rule, and it cannot be defeated by a new name.
       */
      oneDesign: true,
    },
    usaCoinBook: {
      denomination: 'dollars',
      categories: ['morgan'],
      // One design for the whole run, so every leftover segment is a variety.
      oneDesign: ['morgan'],
    },
  },
  'peace-dollar': {
    /*
     * No CC and no O: the Peace dollar was struck at Philadelphia, Denver and
     * San Francisco and nowhere else, so this is the simple case the Morgan's
     * alternation is not. It stays an alternation rather than a character
     * class all the same, because the shape is what the parser expects and a
     * one-series exception is how the CC bug got written the first time.
     */
    marks: '[PDS]',
    noise: /\b(?:peace)?\s*(?:silver\s+)?dollars?\b/gi,
    priceCharting: {
      consoles: ['coins-peace-dollar'],
      /*
       * The whole series is on ONE listing page -- 88 entries, the 24 dates
       * plus their VAMs and the modern revival issues -- and a cursor of 150
       * returns nothing. Two pages rather than one so a source that grows past
       * the first page is still read; the second costs one fetch that finds
       * nothing rather than a figure quietly missing.
       */
      pages: 2,
      /*
       * The Morgan's rule and the Morgan's reason. The Peace dollar is
       * catalogued by die pairing under the same VAM numbering, this source
       * lists those beside the ordinary dates, and the series struck ONE
       * design -- so anything in the design slot is a variety, and the
       * design-count rule in `fetch-grade-prices.mjs` cannot help, because a
       * series with one design would have the source refused for every date
       * that carries a VAM.
       */
      oneDesign: true,
    },
    usaCoinBook: {
      denomination: 'dollars',
      categories: ['peace'],
      // One design for the whole run, so every leftover segment is a variety.
      oneDesign: ['peace'],
    },
  },
  'wheat-penny': {
    marks: '[PDS]',
    noise: /\b(?:lincoln)?\s*(?:wheat)?\s*(?:cents?|pennies|penny)\b/gi,
    /*
     * The 1909 VDB reverse is a catalogue coin, not a variety, so its figures
     * go to its own page. Both sources spell it `vdb`.
     */
    hubDesigns: { vdb: 'vdb' },
    priceCharting: {
      consoles: ['coins-lincoln-wheat-penny'],
      // About 300 entries on the first listing page: the 160 issues plus the
      // doubled dies, the repunched mintmarks and the VDB pairs.
      pages: 4,
      /*
       * One design for the whole run, so anything in the design slot is a
       * variety -- the Morgan's rule, and here it does a second job. The 1909
       * VDB is a design this catalogue SUMS into the year rather than giving a
       * page, and the VDB coins are worth a large multiple of the plain ones:
       * the 1909-S VDB against the 1909-S is roughly fifty to one. Letting
       * them through would drag the top of the 1909-S range up by that factor
       * and price a page about 2,309,000 coins as though it were about the
       * 484,000 scarce ones.
       */
      oneDesign: true,
    },
    usaCoinBook: {
      /*
       * `small-cents`, not `cents`. The site files the cent under the size of
       * the coin rather than its face value, because it also carries the large
       * cents of 1793-1857; `/coins/cents/` is a 404 and was the first three
       * guesses.
       */
      denomination: 'small-cents',
      categories: ['lincoln-wheat-cent'],
      /*
       * `steel-cent` is the ordinary 1943 coin, not a variety: this source
       * gives that date a design segment because it also carries the bronze
       * error beside it. Anchored, so the doubled-mintmark variety that begins
       * with the same words stays a variety.
       */
      plainDesign: /^steel-cent$/i,
      /*
       * Every leftover segment is a variety, which here covers both the real
       * varieties -- `1909-S/s-over-horizontal-s/` -- and the `vdb` design,
       * for the reason given on PriceCharting above.
       */
      oneDesign: ['lincoln-wheat-cent'],
    },
  },
  'mercury-dime': {
    /*
     * No CC and no O: the Mercury dime was struck at Philadelphia, Denver and
     * San Francisco and nowhere else. An alternation rather than a character
     * class all the same, for the reason the Peace dollar's entry gives -- the
     * shape is what the parser expects, and a one-series exception is how the
     * Morgan's CC bug got written the first time.
     */
    marks: '[PDS]',
    /*
     * "Mercury Dime", "Winged Liberty Head Dime" and the bare denomination, all
     * of which appear in one source's titles or the other's. `mercury` alone is
     * not enough: left in, `Winged Liberty` parses as a design.
     */
    noise: /\b(?:mercury|winged liberty(?: head)?)?\s*dimes?\b/gi,
    priceCharting: {
      consoles: ['coins-mercury-dime'],
      /*
       * 117 entries on the first listing page -- the 77 dates, the 7 proofs and
       * about thirty varieties -- so one page holds the series at a cursor of
       * 150. Two rather than one so a source that grows past the first page is
       * still read; the second costs one fetch that finds nothing.
       */
      pages: 2,
      /*
       * The Morgan's rule, and this series needs it as badly. The source lists
       * the die varieties beside the dates under the Fivaz-Stanton numbering:
       * `1919-double-die-fs-101`, `1942-s-fs-501`, `1945-s-fs-504`,
       * `1945-s-micro-s`, `1942-w-double-die` -- a W that no Mercury dime
       * carries -- and `19421`, which is how it writes the 1942/1 overdate with
       * the slash removed. A token list would be one short of the next one.
       *
       * The design-count rule in `fetch-grade-prices.mjs` cannot do this job:
       * it refuses a source listing more pages than the Mint struck designs,
       * and this series has ONE design, so it would refuse the source for
       * nearly every date and leave the series on one guide.
       *
       * It matters most where the money is. The 1942/1 overdate is worth
       * roughly fifty times the ordinary 1942, so a variety reaching the plain
       * date's ladder would drag its ceiling up by that factor -- the wheat
       * cent's 1909-S VDB problem, on a coin four hundred times commoner.
       */
      oneDesign: true,
    },
    usaCoinBook: {
      denomination: 'dimes',
      categories: ['mercury'],
      // One design for the whole run, so every leftover segment is a variety:
      // `1942-P/42-over-41/` and `1945-S/micro/` are the three this source has.
      oneDesign: ['mercury'],
    },
  },
};

/** A series' configuration, or a refusal naming what would have to be added. */
export const seriesConfig = (series) => {
  const found = SERIES[series];
  if (!found) {
    throw new Error(
      `no price sources are registered for "${series}". Add it to SERIES in scripts/grade-sources.mjs: the mint marks, the series words to strip from a title, and where each source files the run.`,
    );
  }
  return found;
};

/* ---------------------------------------------------------------------------
   Turning a source's own name for an issue into a key this catalogue matches
   --------------------------------------------------------------------------- */

/**
 * `{ year, mark, finish, design }` -- the four facts that identify an issue.
 *
 * `mark` is '' for Philadelphia before the P appeared, exactly as `mintMark` is
 * on the coin. `design` is the state or park or woman named on the reverse from
 * 1999 on, and it is carried rather than discarded because both sources price
 * PER DESIGN while this catalogue has one page per (year, mark, finish). The
 * merge is where those five figures become one range; throwing the design away
 * here would make five observations look like five sources.
 */
const key = (year, mark, finish, design, hub) => ({
  year,
  mark,
  finish,
  design: design || undefined,
  hub: hub || undefined,
});

/*
 * A design segment that names a REVERSE HUB rather than a variety.
 *
 * A hub is a catalogue coin with a page and a mintage of its own, so its
 * figures belong to it and not to the plain coin of the same date. Both price
 * sources spell the 1909 one the same way -- `/1909-s-vdb` and `1909-S/vdb/`
 * -- and without this they are read as varieties and dropped, which leaves the
 * key date of the series with no figures at all while the plain 1909-S keeps
 * the ones a reader would assume were its.
 */
const hubOfDesign = (cfg, design) =>
  design ? cfg.hubDesigns?.[design.toLowerCase().replace(/[\s-]+/g, '')] : undefined;

const FINISH_WORDS = [
  [/\bsilver\s*proof\b/i, 'silver-proof'],
  [/\bproof\b/i, 'proof'],
  [/\bsms\b|\bspecial\s*mint\s*set\b/i, 'sms'],
  [/\buncirculated\b|\bmint\s*set\b/i, 'uncirculated'],
];

/**
 * "1941 S", "1999 P Delaware", "1971 S [PROOF]", "1889 CC", "1884 O".
 *
 * The finish is read before the design, because "Silver Proof" would otherwise
 * be parsed as a state called Silver.
 */
const parseIssueName = (raw, config) => {
  const cfg = typeof config === 'string' ? seriesConfig(config) : config;
  const text = decode(raw)
    .replace(/\([^)]*\)/g, ' ')
    .replace(cfg.noise, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const year = /^(\d{4})\b/.exec(text);
  if (!year) return undefined;
  let rest = text.slice(year[0].length).trim();

  let finish;
  for (const [pattern, name] of FINISH_WORDS) {
    if (pattern.test(rest)) {
      finish = name;
      rest = rest.replace(pattern, ' ');
      break;
    }
  }
  rest = rest.replace(/[[\]()]/g, ' ').replace(/\s+/g, ' ').trim();

  // "1999 S Silver Delaware [PROOF]" and "1999 S Clad Delaware [PROOF]".
  //
  // From 1999 one source writes the metal as a word in the middle of the name
  // rather than as part of the finish at the end, so the bracket says PROOF for
  // both and only this tells the two apart. Left unread, a silver proof matches
  // the clad proof's key and its figures are merged into the wrong coin -- a
  // miss would be visible in the report and this would not be visible anywhere.
  const metal = new RegExp(`^(?:(?:${cfg.marks})\\s+)?(silver|clad)\\b`, 'i').exec(rest);
  if (metal && finish === 'proof') {
    if (metal[1].toLowerCase() === 'silver') finish = 'silver-proof';
    rest = rest.replace(/\b(silver|clad)\b/i, ' ').replace(/\s+/g, ' ').trim();
  }

  // No letter means Philadelphia -- the only mint that struck either of these
  // series without a mark -- and both sources write that date bare.
  // Normalising it to P here rather than at the match is what lets one key
  // compare a 1932 to a 1932-D without either side knowing which spelling the
  // other used.
  const mark = new RegExp(`^(${cfg.marks})\\b`, 'i').exec(rest);
  const design = mark ? rest.slice(mark[0].length).trim() : rest;
  const hub = hubOfDesign(cfg, design);
  return key(
    Number(year[1]),
    mark ? mark[1].toUpperCase() : 'P',
    finish,
    hub ? undefined : design,
    hub,
  );
};

/* ---------------------------------------------------------------------------
   The sources
   --------------------------------------------------------------------------- */

const PRICECHARTING = 'https://www.pricecharting.com';
const USACOINBOOK = 'https://www.usacoinbook.com';

/**
 * The slugs that name a variety rather than an issue, in every series.
 *
 * `fs-<digits>` is the Cherrypickers' numbering and is the reliable marker; the
 * words are for the entries that carry no number. A series adds its own on top
 * of these -- see `variety` on the Morgan entry above, which is the difference
 * between two sources and one.
 */
const VARIETY = /(^|-)(double-die|doubled-die|fs-\d+|no-s|type-[12]|error|overdate|repunched|rpm|omm|off-center|clipped|struck|mule|missing)(-|$)/i;

/**
 * PriceCharting: one or more consoles hold a series, paginated by cursor.
 */
const priceCharting = (series) => {
  const cfg = seriesConfig(series);
  const { consoles, pages } = cfg.priceCharting;
  const link = new RegExp(
    `<a href="(/game/(?:${consoles.join('|')})/[^"]+)"[^>]*>([\\s\\S]*?)</a>`,
    'gi',
  );
  const source = {
    id: 'pricecharting',
    name: 'PriceCharting',
    home: `${PRICECHARTING}/`,
    used: 'a grade ladder computed from completed sales',

    listings: () =>
      consoles.flatMap((c) =>
        Array.from({ length: pages }, (_, i) => `${PRICECHARTING}/console/${c}?cursor=${i * 150}`),
      ),

    /**
     * A slug that names a variety rather than an issue.
     *
     * This source lists the doubled dies beside the ordinary dates -- 176 of
     * them in the first six listing pages of the quarter alone, and on the
     * Morgan the VAMs outnumber the coins -- and a variety is priced at a large
     * multiple of the plain coin. Matched onto the date it shares, it arrives
     * as "another design" of that year and drags the top of the range with it.
     * The house rules say a variety is listed and never followed, and this is
     * the same rule at the other end of the pipeline.
     */
    variety: (url) => {
      const slug = url.split('/').pop();
      return VARIETY.test(slug) || (cfg.variety ? cfg.variety.test(slug) : false);
    },

    /** `[{ url, issue }]` from one listing page. */
    index(html) {
      const found = [];
      for (const m of html.matchAll(link)) {
        if (source.variety(m[1])) continue;
        const title = decode(m[2].replace(/<[^>]*>/g, ' '));
        const issue = parseIssueName(title, cfg);
        if (!issue) continue;
        // A series that struck one design has nothing to put in the design
        // slot, so anything there is a variety. See `oneDesign` above: this is
        // the rule the VAMs cannot get past, and the one a token list cannot
        // be.
        if (cfg.priceCharting.oneDesign && issue.design && !issue.hub) continue;
        found.push({ url: PRICECHARTING + m[1], issue, title });
      }
      return found;
    },

    /**
     * `{ issue, rows: [{ label, price }] }` from one issue page.
     *
     * The heading is read rather than the URL, because a slug redirects to its
     * canonical form and the heading is what the canonical page says it is.
     */
    parse(html) {
      const heading = /<h2>\s*Full Price Guide:\s*([\s\S]*?)<\/h2>/i.exec(html);
      if (!heading) return undefined;
      const table = html.slice(heading.index);
      const body = /<table[^>]*>([\s\S]*?)<\/table>/i.exec(table);
      if (!body) return undefined;
      const flat = cells(body[1]);
      const rows = [];
      for (let i = 0; i + 1 < flat.length; i += 2) rows.push({ label: flat[i], price: money(flat[i + 1]) });
      return { issue: parseIssueName(heading[1], cfg), rows };
    },
  };
  return source;
};

/**
 * USA Coin Book: one index page per category, with every issue of it listed,
 * and each issue page carrying one row of grade columns.
 */
const usaCoinBook = (series) => {
  const cfg = seriesConfig(series);
  const { denomination, categories, oneDesign } = cfg.usaCoinBook;
  const link = new RegExp(
    `https://www\\.usacoinbook\\.com/coins/\\d+/${denomination}/([a-z0-9-]+)/([^"]*?)/?(?=")`,
    'gi',
  );
  const dated = new RegExp(`^(\\d{4})-(${cfg.marks})$`, 'i');

  return {
    id: 'usacoinbook',
    name: 'USA Coin Book',
    home: `${USACOINBOOK}/`,
    used: 'a retail estimate per Sheldon rung, with a live melt floor under it',

    listings: () => categories.map((c) => `${USACOINBOOK}/coins/${denomination}/${c}/`),

    /**
     * `/coins/<id>/<denomination>/<category>/<date>/[<design>/][<finish>/]`
     *
     * The path is read from the right: a trailing segment that names a finish
     * is one, and whatever is left between the date and it is the design. In a
     * category that struck ONE design -- the classic quarter, and every Morgan
     * dollar there has ever been -- there is nothing between them, so a segment
     * there is a VARIETY: "doubled-die", "8-tail-feathers", "80-over-79". The
     * house rules say a variety is listed and never followed, so it is dropped
     * here rather than matched onto the ordinary coin of the same date and
     * quietly priced as it.
     */
    index(html) {
      const found = [];
      const seen = new Set();
      for (const m of html.matchAll(link)) {
        const url = `${m[0].replace(/\/$/, '')}/`;
        if (seen.has(url)) continue;
        seen.add(url);

        const segments = m[2].split('/').filter(Boolean);
        const date = dated.exec(segments[0] ?? '');
        if (!date) continue;

        // "all-varieties" is this source's aggregate page for a date that also
        // has variety pages, and it is the ordinary coin -- on several dates it
        // is the ONLY page, because the plain URL does not exist.
        let rest = segments.slice(1).filter((seg) => seg.toLowerCase() !== 'all-varieties');
        let finish;
        if (rest.length > 0 && /^(silver-proof|proof|uncirculated|sms)$/i.test(rest.at(-1))) {
          finish = rest.at(-1).toLowerCase();
          rest = rest.slice(0, -1);
        }
        if (rest.length > 1) continue;
        let design = rest[0];
        /*
         * A design segment that names the ORDINARY COIN, not a variety, and
         * the 1943 cent is why this exists.
         *
         * This source files that date as `1943-P/steel-cent/` and
         * `1943-P/bronze-copper/`: the first is the coin a billion people have
         * in a jar and the second is the off-metal error, of which about a
         * dozen are known and which sells for six figures. The one-design rule
         * below is right that a leftover segment is usually a variety, and on
         * this date it threw BOTH away -- so the three 1943 cents came back
         * with no figure from this source at all.
         *
         * Letting the segment through unfiltered would have been far worse
         * than dropping it. `bronze-copper` matched onto the plain 1943 would
         * price the commonest steel cent there is as the rarest error in the
         * series, and the spread gate would then refuse the rung and hide the
         * reason. So the ordinary segment is NAMED, anchored, and everything
         * else in the slot stays a variety -- `steel-cent-boldy-doubled-
         * mintmark` included, which is why the pattern is anchored at both
         * ends rather than a substring test.
         */
        const hub = hubOfDesign(cfg, design);
        if (hub) {
          design = undefined;
        } else if (design && cfg.usaCoinBook.plainDesign?.test(design)) {
          design = undefined;
        } else if (design && oneDesign.includes(m[1].toLowerCase())) {
          // A segment left over in a one-design category is a variety.
          continue;
        }

        found.push({
          url,
          issue: {
            year: Number(date[1]),
            mark: date[2].toUpperCase(),
            finish,
            design: design ? design.replace(/-/g, ' ') : undefined,
            hub,
          },
          title: [date[0], hub ?? design, finish].filter(Boolean).join(' '),
        });
      }
      return found;
    },

    /**
     * The chart's caption names the issue, which is the only check that the page
     * fetched is the page asked for -- the ids in the path are not contiguous and
     * a wrong one answers 200 with a different coin on it.
     */
    parse(html) {
      const start = html.indexOf('Coin Value Chart');
      if (start < 0) return undefined;
      const table = /<table[^>]*>([\s\S]*?)<\/table>/i.exec(html.slice(start));
      if (!table) return undefined;
      const caption = /<caption[^>]*>([\s\S]*?)<\/caption>/i.exec(table[1]);
      const head = /<thead[^>]*>([\s\S]*?)<\/thead>/i.exec(table[1]);
      const foot = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(table[1]);
      if (!head || !foot) return undefined;
      const labels = cells(head[1]);
      const prices = cells(foot[1]);
      const rows = labels.map((label, i) => ({ label, price: money(prices[i]) }));
      // The caption is "1938 S Washington Quarter value chart - grades from ...".
      // Everything from "value chart" on is a description of the table rather
      // than a name for the coin, and left in it parses as a design called
      // "Washington Quarter value chart" and a finish of Proof.
      const named = caption ? decode(caption[1]).replace(/\s*value chart[\s\S]*$/i, '') : '';
      return { issue: named ? parseIssueName(named, cfg) : undefined, rows };
    },
  };
};

/** Both sources, bound to one series. */
export const sourcesFor = (series) => [usaCoinBook(series), priceCharting(series)];

export { parseIssueName };
