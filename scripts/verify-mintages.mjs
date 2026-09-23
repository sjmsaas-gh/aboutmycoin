/**
 * The third and fourth opinions on a mintage.
 *
 *   npm run verify            # only the figures two sources disagree about
 *   npm run verify -- --all   # every figure in the catalogue
 *   npm run verify -- --refresh
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A SEPARATE COMMAND
 * ---------------------------------------------------------------------------
 *
 * `fetch-mintages.mjs` reads the two catalogues that hold a whole series at
 * once. This reads sources that hold ONE COIN PER PAGE, which is a different
 * shape of job: a page per design, a fetch per page, a slug to guess, and a
 * miss to report rather than to fail on. Keeping it apart means the series
 * import stays fast and offline while the slow crawl runs on its own schedule
 * and writes a file the import then reads.
 *
 * What it writes is `data/mintage-consensus.json`: one row per
 * (year, mark, finish, design), with what each source says. The import merges
 * that in and takes the figure a majority of sources agree on. THE POINT IS TO
 * NEED JUDGEMENT AS RARELY AS POSSIBLE -- two sources can only disagree, and a
 * disagreement between two is a coin with no page. Three or four can outvote a
 * mistake, and most of the mistakes here are one source's transcription slip
 * rather than a genuine uncertainty about the coin.
 *
 * ---------------------------------------------------------------------------
 * WHAT THESE SOURCES ARE, AND WHAT THEY ARE NOT
 * ---------------------------------------------------------------------------
 *
 * They are collector-facing price guides that publish a mintage table. They are
 * not the Mint, and none of them says where its figures came from -- so a
 * majority here is a majority of secondary sources, which is worth exactly what
 * that is worth and is recorded as such. The primary source is the United
 * States Mint's own production report, and it cannot be automated: usmint.gov
 * answers 403 to anything that is not a browser, and so do PCGS and NGC, which
 * are the two that would carry the most weight.
 *
 * So the rule the import applies is deliberately modest: where three or four
 * sources agree and one does not, the one is wrong. Where they split evenly, the
 * coin is withheld or adjudicated by hand against something better. That is the
 * grade pages' evidence rule again -- the site prints what it can stand behind
 * and says nothing where it cannot.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

import { loadNumista, NUMISTA_SERIES, normaliseDesign, sameDesign } from './numista.mjs';

const MINTAGES = 'data/mintages.json';
const OUT = 'data/mintage-consensus.json';
/** Raw pages, kept out of the repository: large, and re-fetchable from the url. */
const CACHE = 'data/verify/.cache';

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

/* ---------------------------------------------------------------------------
   Plain text out of a page
   --------------------------------------------------------------------------- */

const unescape = (text) =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

/**
 * The page as cells, with every tag turned into a separator.
 *
 * Crude on purpose. These are mintage tables inside marketing pages that get
 * rebuilt without notice, and a selector aimed at one of their class names is a
 * parser that breaks silently. A run of `|`-separated cells survives a redesign,
 * and the labels being matched -- "2018 P", "Philadelphia" -- are the page's own
 * content rather than its markup.
 */
const cells = (html) => {
  const stripped = html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '|');
  return unescape(stripped)
    .replace(/[\t\r\n]+/g, ' ')
    .split('|')
    .map((cell) => cell.replace(/\s+/g, ' ').trim())
    .filter((cell) => cell !== '');
};

const readMintage = (text) => {
  if (!/^[\d,]+$/.test(text)) return null;
  const value = Number(text.replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
};

/** "South Carolina" -> "south-carolina". What these sites put in a path. */
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/* ---------------------------------------------------------------------------
   The sources
   --------------------------------------------------------------------------- */

/**
 * A label in one of these tables, turned into the (mark, finish) this site uses.
 *
 * "2018 P", "2000 S Proof", "2000 S Silver Proof". Longest first, for the same
 * reason the primary parser tests its excluded patterns first: "S Silver Proof"
 * contains "S Proof".
 */
const labelToIssue = (label) => {
  const match = /^(\d{4})\s+([PDSW])\b(.*)$/.exec(label.trim());
  if (!match) return null;
  const [, year, mark, rest] = match;
  const tail = rest.trim().toLowerCase();
  if (/reverse proof|enhanced|satin|burnished|bullion/.test(tail)) return null;
  const finish = /silver proof/.test(tail)
    ? 'silver-proof'
    : /proof/.test(tail)
      ? 'proof'
      : /uncirculated/.test(tail)
        ? 'uncirculated'
        : tail === ''
          ? 'circulation'
          : null;
  if (finish === null) return null;
  return { year: Number(year), mark, finish };
};

/**
 * The extra sources, PER SERIES.
 *
 * It was a flat list while there was one series, and every URL in it names a
 * quarter -- an index path, a slug shape, a path regex. A second series does
 * not reach any of them, and a flat list would have gone looking for
 * `1881-morgan-dollar-quarter`. The registry is the same move
 * `SERIES` in `grade-sources.mjs` made for the price guides, for the same
 * reason and on the same day.
 *
 * Three shapes of source now, and which one a series gets is decided by what
 * the source is rather than by which series it holds:
 *
 *   indexes   it enumerates itself: an index page listing every coin it holds,
 *             then one page per coin. Nothing is guessed and nothing is missed.
 *   urls      addressed by a slug built from a design's name. Needs a target
 *             list, and a miss is reported rather than fatal.
 *   pages     the WHOLE SERIES on one page, which is the shape a one-design
 *             series takes: a mintage chart with a row per date. One fetch,
 *             no slug to guess, and no miss possible -- the row is there or the
 *             source does not hold the coin.
 */
const SOURCES = {
  'washington-quarter': [
  {
    name: 'silverrecyclers.com',
    /*
     * One page per reverse design, and the whole table on it: Philadelphia,
     * Denver, the clad proof and the silver proof. The URL is derivable, which
     * is what makes this the third source rather than a fourth -- nothing has to
     * be searched for.
     *
     * Several candidate paths per design, because the sites name a design more
     * briefly than the mintage tables do and not always the same way. A design
     * none of them finds is reported, never guessed at.
     */
    urls: ({ year, design, aliases }) => {
      const path = (tail) => `https://www.silverrecyclers.com/coins/${tail}.aspx`;
      /*
       * The eagle-reverse years are not filed under the design at all -- there
       * was only one for sixty-six years, so the page is just `1964-quarter`.
       */
      if (design === 'Eagle') return [path(`${year}-quarter`)];
      const names = [...new Set([design, ...aliases])];
      return names.flatMap((name) => {
        const slug = slugify(name);
        return [
          path(`${year}-${slug}-quarter`),
          /*
           * "Washington" is a state as well as the series, so the 2007 design
           * cannot be `2007-washington-quarter` -- that would be the 1932-1998
           * coin. The site disambiguates it the way a reader would.
           */
          ...(slug === 'washington' ? [path(`${year}-washington-state-quarter`)] : []),
        ];
      });
    },
    /*
     * "Quantity Minted | 2018 P | Philadelphia | 223,200,000 | 2018 D | ..."
     * A label, a city, a figure, repeating. The city is skipped rather than
     * required: it is the one cell of the three that carries no information the
     * label does not already have.
     */
    parse: (html) => {
      const found = [];
      const list = cells(html);
      const start = list.findIndex((cell) => /^Quantity Minted$/i.test(cell));
      if (start === -1) return found;
      for (let i = start + 1; i < list.length; i += 1) {
        const issue = labelToIssue(list[i]);
        if (!issue) {
          // The table ends at the next heading. Anything that is neither a
          // label, a city nor a figure means we have walked out of it.
          if (/^(Value|Specifications|Description|Related|Melt)/i.test(list[i])) break;
          continue;
        }
        const figure = list
          .slice(i + 1, i + 4)
          .map(readMintage)
          .find((value) => value !== null);
        if (figure !== null && figure !== undefined) found.push({ ...issue, mintage: figure });
      }
      return found;
    },
  },
  {
    name: 'usacoinbook.com',
    /*
     * A page per (design, mint, finish) behind an opaque numeric id, so it
     * cannot be reached by building a URL -- and its own search is a marketplace
     * search that returns nothing for a catalogue query. What it does have is an
     * index per programme listing every coin it holds, so this source ENUMERATES
     * itself: four index pages, then one page per coin, once, cached.
     *
     * That is slower than the third source and more complete: the URL of each
     * page states the year, the mint mark, the design and the finish, so nothing
     * has to be guessed and nothing is missed because a slug was spelled
     * differently.
     */
    indexes: [
      'https://www.usacoinbook.com/coins/quarters/washington/',
      'https://www.usacoinbook.com/coins/quarters/50-states-and-territories/',
      'https://www.usacoinbook.com/coins/quarters/america-the-beautiful/',
      'https://www.usacoinbook.com/coins/quarters/american-women/',
    ],
    /** `/coins/6143/quarters/america-the-beautiful/2018-P/apostle-islands/` */
    links: (html) =>
      [
        ...new Set(
          [...html.matchAll(/\/coins\/\d+\/quarters\/[a-z0-9-]+\/\d{4}-[A-Z]?\/[a-z0-9-]*\/?[a-z-]*\/?/g)].map(
            (m) => m[0],
          ),
        ),
      ].map((path) => `https://www.usacoinbook.com${path}`),
    /*
     * "Mintage: | 223,200,000" in the body, and the coin's identity in the URL.
     * Both halves are needed: the figure alone could belong to any of the four
     * coins of that design.
     */
    parse: (html, url) => {
      const path = /\/coins\/\d+\/quarters\/[a-z0-9-]+\/(\d{4})-([PDSW]?)\/([a-z0-9-]*)\/?([a-z-]*)\/?$/.exec(
        url,
      );
      if (!path) return [];
      const [, year, mark, designSlug, tail] = path;
      if (/reverse-proof|enhanced|satin|burnished|bullion/.test(tail)) return [];
      const finish = /silver-proof/.test(tail)
        ? 'silver-proof'
        : /proof/.test(tail)
          ? 'proof'
          : /uncirculated/.test(tail)
            ? 'uncirculated'
            : tail === ''
              ? 'circulation'
              : null;
      if (finish === null) return [];
      const list = cells(html);
      const at = list.findIndex((cell) => /^Mintage:?$/i.test(cell));
      if (at === -1) return [];
      const figure = list
        .slice(at + 1, at + 3)
        .map(readMintage)
        .find((v) => v !== null && v !== undefined);
      if (figure === null || figure === undefined) return [];
      return [
        {
          year: Number(year),
          mark,
          finish,
          // The design as this source spells it. The merge pairs it against the
          // primary source's own name; it is never used to build anything.
          design: designSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          mintage: figure,
        },
      ];
    },
  },
  ],
  'morgan-dollar': [
    {
      /*
       * A mintage chart with one row per (date, finish), and the reason it is
       * here at all: THE PRIMARY SOURCE HAS NO PROOF FIGURES FOR THIS SERIES.
       * Philadelphia struck proofs every year from 1878 to 1904 and the
       * Wikipedia table states one of them, the 1895, because that date has no
       * confirmed circulation strike. Twenty-six coins were unbuildable on two
       * sources, and two can only agree or disagree.
       *
       * This source and the next were found by looking for the figures rather
       * than by looking for a source, which is the right way round: both were
       * checked against Numista row by row before either was registered, and
       * they agree with it on every Philadelphia proof of the run bar one --
       * 832 against 833 in 1888, which is inside `NEAR_ENOUGH` and settles to
       * the higher figure like any other revised collector total.
       */
      name: 'coinmintages.com',
      pages: ['https://coinmintages.com/morgan-dollars-mintage/'],
      years: { from: 1878, to: 1921 },
      /*
       * Several rows for one coin, added up -- the same roll-up Numista needs
       * on this series and for the same reason. This source splits 1878
       * Philadelphia by reverse hub, circulation AND proof: 749,500 and
       * 9,759,300 struck, 500 and 250 proofs. The year's figure is the pair
       * added up, and taking either alone states a mintage an order of
       * magnitude wrong.
       */
      rollUp: true,
      /*
       * "1879 Proof | 1,100", "1878-CC | 2,212,000", "1878 Proof 8 Tail
       * Feathers | 500". A label then a figure, repeating. The label carries
       * the whole identity of the coin, which is what makes this source cheap
       * to read: there is no column to count and no header to depend on.
       */
      parse: (html) => {
        const list = cells(html);
        const found = [];
        for (let i = 0; i < list.length - 1; i += 1) {
          const issue = morganLabel(list[i]);
          if (!issue) continue;
          const mintage = readMintage(list[i + 1]);
          /*
           * The branch-mint proofs are written as ranges -- the 1879-O as
           * "4-8" -- because what is recorded is how many are known rather
           * than how many were struck. A range is not a figure and is refused
           * here rather than averaged.
           */
          if (mintage === null) continue;
          found.push({ ...issue, design: 'Morgan', mintage });
        }
        return found;
      },
    },
    {
      /*
       * A three-column table -- date, mintage, proof mintage -- which is a
       * different shape from the source above rather than a copy of it, and
       * that is the point of having both. This one states 1878 as one figure
       * where the other splits it by reverse, so the two agree on the year
       * only if the split is read correctly, and disagree loudly if it is not.
       *
       * Its circulation column is rounded on several dates -- 10,500,000 for
       * an 1878 the other sources put at 10,508,800 -- so it is a weak vote on
       * a circulation figure and a strong one on a proof, where it states the
       * exact number. That is recorded rather than corrected: the merge counts
       * votes per figure and a rounded quotation simply loses.
       */
      name: 'landofcoins.com',
      pages: ['https://www.landofcoins.com/morgan_dollar_mintage.php'],
      years: { from: 1878, to: 1921 },
      /*
       * "Year & Mint | Mintage | Proof Mintage", then triples until the table
       * runs out. Anchored on the header cell rather than on a class name, for
       * the reason given over `cells`.
       */
      parse: (html) => {
        const list = cells(html);
        const start = list.findIndex((cell) => /^Proof Mintage$/i.test(cell));
        if (start === -1) return [];
        const found = [];
        for (let i = start + 1; i + 2 < list.length; i += 3) {
          const issue = morganLabel(list[i]);
          if (!issue || issue.finish !== 'circulation') break;
          const struck = readMintage(list[i + 1]);
          if (struck !== null) found.push({ ...issue, design: 'Morgan', mintage: struck });
          /*
           * The proof column holds a mintage for the Philadelphia coins and a
           * SURVIVAL estimate for the branch mints -- "est. 12" for the
           * 1879-O, and a bare "3" for the 1884-CC, of which three are known.
           * The written estimates are refused by `readMintage`; the bare ones
           * are carried into the file as what this source said, and the merge
           * never reaches them because the primary publishes no such coin and
           * no declared gap covers one.
           */
          const proofs = readMintage(list[i + 2]);
          if (proofs !== null) {
            found.push({ ...issue, finish: 'proof', design: 'Morgan', mintage: proofs });
          }
        }
        return found;
      },
    },
  ],
  /*
   * FOUR SOURCES HERE AND NOT TWO, and the reason is structural rather than
   * thoroughness: the Mercury dime has no Wikipedia page, so Numista is the
   * PRIMARY source for this series and everything that checks it is in this
   * list. See `primary` on its entry in `fetch-mintages.mjs`.
   *
   * They fall into two families and it is worth knowing which is which before
   * reading a vote. The two charts below quote identical figures down to the
   * last digit, and coinmintages names MercuryDime.net as its source; treat
   * them as one lineage that happens to be counted twice. silverrecyclers
   * cites the Red Book, and usacoinbook is the one that agrees with Numista
   * where the others do not. So a 3-2 split in this series is usually two
   * families and not three opinions, which is the same caution the quarter's
   * entry records about its own ties.
   */
  'mercury-dime': [
    {
      name: 'coinmintages.com',
      pages: ['https://coinmintages.com/mercury-dimes-mintage/'],
      years: { from: 1916, to: 1945 },
      /*
       * "1916 | 22,180,080", "1936 Proof | 4,130". A label then a figure,
       * repeating, across two tables the page splits at 1929 -- which needs no
       * handling, because nothing here depends on the rows being contiguous.
       *
       * No `rollUp`: nothing in this series partitions a year's mintage, and
       * every label on the page is a whole coin.
       */
      parse: (html) => {
        const list = cells(html);
        const found = [];
        for (let i = 0; i < list.length - 1; i += 1) {
          const issue = mercuryLabel(list[i]);
          if (!issue) continue;
          const mintage = readMintage(list[i + 1]);
          if (mintage === null) continue;
          found.push({ ...issue, design: 'Mercury', mintage });
        }
        return found;
      },
    },
    {
      name: 'landofcoins.com',
      pages: ['https://www.landofcoins.com/mercury_dime_mintage.php'],
      years: { from: 1916, to: 1945 },
      /*
       * "Year & Mint | Mintage | Proof Mintage", then triples. The same shape
       * as this source's Morgan chart and the same parser with one difference
       * worth stating: here the proof column holds a literal `0` on every date
       * that had no proof, where the Morgan's holds a survival estimate. Zero
       * is refused by `readMintage`, which wants a figure above nothing, so the
       * seventy dates with no proof produce no proof row rather than seventy
       * claims that none were struck.
       */
      parse: (html) => {
        const list = cells(html);
        const start = list.findIndex((cell) => /^Proof Mintage$/i.test(cell));
        if (start === -1) return [];
        const found = [];
        for (let i = start + 1; i + 2 < list.length; i += 3) {
          const issue = mercuryLabel(list[i]);
          if (!issue || issue.finish !== 'circulation') break;
          const struck = readMintage(list[i + 1]);
          if (struck !== null) found.push({ ...issue, design: 'Mercury', mintage: struck });
          const proofs = readMintage(list[i + 2]);
          if (proofs !== null) {
            found.push({ ...issue, finish: 'proof', design: 'Mercury', mintage: proofs });
          }
        }
        return found;
      },
    },
    {
      name: 'usacoinbook.com',
      /*
       * One index for the whole series, where the quarter needs four: this
       * source files by denomination and series rather than by reverse
       * programme, and the Mercury dime is one series with one design.
       */
      indexes: ['https://www.usacoinbook.com/coins/dimes/mercury/'],
      /** `/coins/1472/dimes/mercury/1916-D/`, and 80 of them. */
      links: (html) =>
        [
          ...new Set(
            [...html.matchAll(/\/coins\/\d+\/dimes\/mercury\/\d{4}-[A-Z]?\/[a-z0-9-]*\/?/g)].map(
              (m) => m[0],
            ),
          ),
        ].map((path) => `https://www.usacoinbook.com${path}`),
      parse: (html, url) => {
        const path = /\/coins\/\d+\/dimes\/mercury\/(\d{4})-([PDS]?)\/([a-z0-9-]*)\/?$/.exec(url);
        if (!path) return [];
        const [, year, mark, tail] = path;
        /*
         * THE MORGAN'S RULE, and it is doing real work here rather than being
         * copied across. This series struck ONE design, so anything this source
         * writes in the slot after the date is a variety and not a reverse: the
         * index lists `1942-P/42-over-41/`, `1942-D/42-over-41/` and
         * `1945-S/micro/` beside the plain dates. Read as designs they would
         * pair against nothing, arrive at the merge as orphans, and be added to
         * their coins as a second reverse -- putting the 1942 page at 205 plus
         * 205 million over a sentence saying the mint struck two designs.
         *
         * A token list would have to name `42-over-41` and `micro` and then
         * whatever is named next. The design count cannot vary, so the rule is
         * that the slot is empty or the row is not a coin.
         */
        if (tail !== '') return [];
        const list = cells(html);
        const at = list.findIndex((cell) => /^Mintage:?$/i.test(cell));
        if (at === -1) return [];
        const figure = list
          .slice(at + 1, at + 3)
          .map(readMintage)
          .find((v) => v !== null && v !== undefined);
        if (figure === null || figure === undefined) return [];
        return [
          {
            year: Number(year),
            /*
             * P MEANS PHILADELPHIA AND PHILADELPHIA HAS NO MARK ON THIS SERIES.
             * The source writes the mint into every path; this site writes the
             * MINT MARK, and no Mercury dime carries a P. Left as written, every
             * Philadelphia figure keys on a coin that does not exist and all
             * twenty-seven of them vote on nothing. The quarter needs no such
             * line because from 1980 its Philadelphia coins really do carry one.
             */
            mark: mark === 'P' ? '' : mark,
            /*
             * This source lists no proof of the series -- 77 circulation dates,
             * the two overdates and the micro S, and nothing else. An absence
             * is an absence of checking, so the seven proofs stand on the three
             * sources that do carry them.
             */
            finish: 'circulation',
            design: 'Mercury',
            mintage: figure,
          },
        ];
      },
    },
    {
      name: 'silverrecyclers.com',
      /*
       * One page per YEAR rather than per design, carrying all three mints --
       * which is what a one-design series looks like on a source addressed by a
       * slug. The design in the target is not in the URL at all and is only
       * carried onto the figures by the driver.
       *
       * Two candidate paths and the order matters. `<year>-dime` is the shape
       * for all thirty years but the first; 1916 alone is `1916-mercury-dime`,
       * because that year also has a Barber dime and the site disambiguates it
       * the way a reader would. Probing one shape reports no coverage for a
       * source that has the other twenty-nine.
       */
      urls: ({ year }) => {
        const path = (tail) => `https://www.silverrecyclers.com/coins/${tail}.aspx`;
        return [path(`${year}-dime`), path(`${year}-mercury-dime`)];
      },
      /*
       * "Quantity Minted | 1916 | Philadelphia | 22,180,080 | 1916 D | Denver |
       * 264,000 | ...". A label, a city, a figure, repeating, and the city is
       * skipped because it carries nothing the label does not.
       *
       * It cannot use the shared `labelToIssue`: that wants a mint letter and
       * refuses a bare year, which is correct for the quarter -- where a
       * markless row would be ambiguous -- and drops every Philadelphia coin
       * here, where a bare year IS the mark.
       */
      parse: (html) => {
        const found = [];
        const list = cells(html);
        const start = list.findIndex((cell) => /^Quantity Minted$/i.test(cell));
        if (start === -1) return found;
        for (let i = start + 1; i < list.length; i += 1) {
          const label = /^(\d{4})(?:\s+([DS]))?$/.exec(list[i].trim());
          if (!label) {
            // The table ends at the next heading. Anything that is neither a
            // label, a city nor a figure means we have walked out of it.
            if (/^(Value|Specifications|Description|Related|Melt)/i.test(list[i])) break;
            continue;
          }
          const figure = list
            .slice(i + 1, i + 4)
            .map(readMintage)
            .find((value) => value !== null);
          if (figure === null || figure === undefined) continue;
          found.push({
            year: Number(label[1]),
            mark: label[2] ?? '',
            // The page carries the circulation strikes only; it says nothing
            // about the proofs and is not a vote against them.
            finish: 'circulation',
            mintage: figure,
          });
        }
        return found;
      },
    },
  ],
};

/**
 * What a series that struck ONE design calls it.
 *
 * Read where a coin has no `breakdown` to name its reverse -- see the note at
 * the use. It has to match what the primary source calls the same design,
 * because the merge pairs the two by name.
 */
const DESIGN_OF_ONE = {
  'morgan-dollar': 'Morgan',
  'peace-dollar': 'Peace',
  'wheat-penny': 'Plain',
  'mercury-dime': 'Mercury',
};

/**
 * A date as the Mercury dime charts write it, turned into a (year, mark, finish).
 *
 * "1916", "1916-D", "1936 Proof". Simpler than `morganLabel` in two ways that
 * are facts about the series rather than about the charts: every mint mark is
 * one letter, because no branch mint with a two-letter mark struck this coin,
 * and there is no hub to read, because nothing in the run partitions a year's
 * mintage the way the 1878 dollar's two reverses do.
 *
 * Anchored at both ends, which is what keeps it from matching the page's prose.
 * Both charts wrap their tables in paragraphs that name dates -- "the 1916-D
 * Mercury Dime", "Key Dates are 1916-D, 1919-D" -- and those cells reach this
 * function like any other.
 */
const mercuryLabel = (label) => {
  const match = /^(\d{4})(?:-([DS]))?(?:\s+(Proof))?$/i.exec(label.trim());
  if (!match) return null;
  const [, year, mark, proof] = match;
  return {
    year: Number(year),
    mark: mark ? mark.toUpperCase() : '',
    finish: proof ? 'proof' : 'circulation',
    hub: '',
  };
};

/**
 * A date as the Morgan charts write it, turned into a (year, mark, finish).
 *
 * "1878-CC", "1879 Proof", "1921-D", "1878 Proof 8 Tail Feathers". The tail
 * feathers are the first year's two reverse hubs and they PARTITION the year's
 * mintage, so the label is read far enough to know the row is a hub rather
 * than a variety -- a variety's coins are already counted inside the ordinary
 * figure and summing one in would count them twice.
 */
const morganLabel = (label) => {
  const match =
    /^(\d{4})(?:-(CC|O|S|D))?(?:\s+(Proof))?(?:\s+([78]) Tail Feathers)?$/i.exec(label.trim());
  if (!match) return null;
  const [, year, mark, proof, feathers] = match;
  return {
    year: Number(year),
    mark: mark ? mark.toUpperCase() : '',
    finish: proof ? 'proof' : 'circulation',
    /*
     * The reverse hub, where the label states one. It is carried rather than
     * dropped because the two 1878 Philadelphia reverses are pages of their
     * own: the eight-feather coin is one in fourteen of the year and a reader
     * holding one is holding a different object from the reader holding the
     * other. `rollUp` sums them back into the year's coin as well, so the
     * plain 1878 page keeps its total.
     */
    hub: feathers ? `${feathers}-tail-feathers` : '',
  };
};

/* ---------------------------------------------------------------------------
   Fetching, politely, and once
   --------------------------------------------------------------------------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cachePath = (url) =>
  `${CACHE}/${url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_')}.html`;

/**
 * A page, from the cache or from the network.
 *
 * Every response is cached, including the misses, because a 404 is a fact about
 * the source worth remembering: a design that has no page there has no page
 * there next week either, and re-asking on every run is a slow way to be told
 * the same thing. `--refresh` is the only thing that re-asks.
 */
const get = async (url, refresh, report) => {
  const path = cachePath(url);
  if (!refresh && existsSync(path)) {
    const held = readFileSync(path, 'utf8');
    return held === '' ? null : held;
  }
  await sleep(350);
  try {
    const response = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const body = response.ok ? await response.text() : '';
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
    if (!response.ok) report.push(`${response.status} ${url}`);
    return response.ok ? body : null;
  } catch (error) {
    report.push(`${error.message} ${url}`);
    return null;
  }
};

/* ---------------------------------------------------------------------------
   Running
   --------------------------------------------------------------------------- */

const keyOf = (row) => `${row.year}|${row.mark}|${row.finish}`;

async function main() {
  const refresh = process.argv.includes('--refresh');
  const all = process.argv.includes('--all');
  /*
   * One series, when one series is what has changed. The quarter's crawl is
   * eight hundred pages and its cache is scratch, so re-running it to add a
   * source to a different series costs an hour and proves nothing. What is
   * already in the file for a series this run skips is KEPT rather than
   * dropped -- the alternative is that narrowing the run silently deletes the
   * other series' votes and every coin they settled.
   */
  const only = process.argv.find((a) => !a.startsWith('--') && /^[a-z0-9-]+$/.test(a) && a !== 'verify');
  const data = JSON.parse(readFileSync(MINTAGES, 'utf8'));
  const held = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { series: {} };
  const out = { source: { note: SOURCE_NOTE }, series: { ...(held.series ?? {}) } };

  for (const [slug, series] of Object.entries(data.series)) {
    if (only && slug !== only) continue;
    const network = [];
    /** A flat list: one row per (source, year, mark, finish, design). */
    const figures = [];
    const misses = [];
    const sources = SOURCES[slug] ?? [];
    if (sources.length === 0) {
      console.log(`${slug}: no extra sources registered. Two votes only.`);
      continue;
    }

    /*
     * The whole-series pages first, because they are one fetch each and they
     * are the only shape that can hold a coin the primary source does not: a
     * chart with a row per date states what it states whether or not this
     * catalogue has a page for it.
     */
    for (const source of sources.filter((s) => s.pages)) {
      let found = [];
      for (const page of source.pages) {
        const body = await get(page, refresh, network);
        if (!body) continue;
        for (const row of source.parse(body, page)) {
          if (source.years && (row.year < source.years.from || row.year > source.years.to)) continue;
          found.push({ ...row, source: source.name, url: page });
        }
      }
      /*
       * Several rows for one coin, added up before anything downstream sees
       * them. It happens here rather than in the parser because a parser that
       * sums is a parser whose output cannot be checked against the page, and
       * because `unique` below is a Map -- two rows on one key would silently
       * become the second one rather than their total.
       */
      if (source.rollUp) {
        const summed = new Map();
        for (const row of found) {
          const key = `${row.year}|${row.mark}|${row.finish}|${row.design}|${row.hub ?? ''}`;
          const held = summed.get(key);
          if (held) held.mintage += row.mintage;
          else summed.set(key, { ...row });
        }
        found = [...summed.values()];
        /*
         * A hub partitions a coin rather than replacing it, so the hubs are
         * added up again into the coin they came from and both are kept. This
         * is also what makes the split checkable: the primary source states
         * 10,508,800 for the 1878 Philadelphia dollar and this source's two
         * reverses come to exactly that, which is the evidence that its split
         * is the one the primary's total was built from.
         */
        const wholes = new Map();
        for (const row of found.filter((r) => r.hub)) {
          const key = `${row.year}|${row.mark}|${row.finish}|${row.design}`;
          const held = wholes.get(key);
          if (held) held.mintage += row.mintage;
          else wholes.set(key, { ...row, hub: '' });
        }
        found = [...found, ...wholes.values()];
      }
      console.log(`  ${source.name}: ${found.length} figures on ${source.pages.length} page(s)`);
      figures.push(...found);
    }

    /*
     * The enumerating sources first: they list every coin they hold, so one
     * crawl covers the whole series and nothing depends on guessing a slug. Run
     * whether or not `--all` was asked for, because the crawl is cached and the
     * second run is free.
     */
    for (const source of sources.filter((s) => s.indexes)) {
      const urls = new Set();
      for (const index of source.indexes) {
        const body = await get(index, refresh, network);
        if (!body) continue;
        for (const link of source.links(body)) urls.add(link);
      }
      console.log(`  ${source.name}: ${urls.size} coin pages listed`);
      for (const url of urls) {
        const body = await get(url, refresh, network);
        if (!body) continue;
        for (const figure of source.parse(body, url)) {
          figures.push({ ...figure, source: source.name, url });
        }
      }
    }

    /*
     * Then the derivable source, which needs a target list because it is
     * addressed by a slug built from a design's name. By default the targets are
     * the designs the other sources could not settle; `--all` asks about every
     * design in the catalogue.
     */
    const wanted = new Map();
    const want = (year, design) => {
      if (!wanted.has(year)) wanted.set(year, new Set());
      wanted.get(year).add(design);
    };
    /*
     * What a coin with no `breakdown` is called: a series that struck one
     * design emits no breakdown at all, so the name has to come from somewhere,
     * and it was the literal 'Eagle' -- the Washington quarter's pre-1999
     * reverse -- until a second series reached this line.
     *
     * It is not cosmetic and it is not a slug. The name travels onto every
     * figure this source produces and the merge PAIRS THE DESIGNS: a figure
     * labelled 'Eagle' against a primary labelled 'Mercury' does not pair, so
     * it is not a vote on the coin's figure, it is an orphan -- which the merge
     * then adds as a second design, and the page comes out with twice the
     * mintage and "2 reverse designs" over it. That is the failure
     * `ADDING-A-SERIES.md` spends a section on, arriving from a new direction.
     *
     * So it is declared per series, beside the sources it labels.
     */
    const oneDesign = DESIGN_OF_ONE[slug] ?? 'Eagle';
    if (all) {
      for (const issue of series.issues) {
        if (issue.breakdown) for (const d of issue.breakdown) want(issue.year, d.design);
        else want(issue.year, oneDesign);
      }
    }
    for (const held of series.withheld ?? []) {
      const year = Number(held.coin.slice(0, 4));
      for (const design of held.designs ?? []) want(year, design.design);
      if (!held.designs) {
        for (const issue of series.issues.filter((i) => i.year === year)) {
          for (const d of issue.breakdown ?? []) want(year, d.design);
        }
      }
    }

    /*
     * Every name the other catalogue has for each design, as a second candidate
     * slug. Not optional: the primary source's captions abbreviate -- "National
     * Park" for the National Park of American Samoa -- and a source that files
     * its page under the full name cannot be reached from the short one.
     */
    const aliases = new Map();
    for (const issue of series.issues) {
      for (const d of issue.breakdown ?? []) if (!aliases.has(d.design)) aliases.set(d.design, new Set());
    }
    try {
      const other = await loadNumista(slug);
      const config = NUMISTA_SERIES[slug];
      for (const type of other.types) {
        const name = config?.designOf(type.title ?? '');
        if (!name) continue;
        for (const [primaryName, set] of aliases) {
          if (sameDesign(normaliseDesign(primaryName), normaliseDesign(name))) set.add(name);
        }
      }
    } catch {
      // No cache yet. Fewer candidate slugs, more misses, and the report says so.
    }

    for (const source of sources.filter((s) => s.urls)) {
      for (const [year, designs] of [...wanted].sort((a, b) => a[0] - b[0])) {
        for (const design of designs) {
          const target = { year, design, aliases: [...(aliases.get(design) ?? [])] };
          let found = false;
          for (const url of source.urls(target)) {
            const body = await get(url, refresh, network);
            if (!body) continue;
            for (const figure of source.parse(body, url)) {
              if (figure.year !== year) continue;
              found = true;
              figures.push({ ...figure, design, source: source.name, url });
            }
            if (found) break;
          }
          if (!found) misses.push(`${year} ${design}`);
        }
      }
    }

    // One figure per (source, coin, design): a page listed twice is one page.
    const unique = new Map();
    for (const row of figures) {
      unique.set(`${row.source}|${row.year}|${row.mark}|${row.finish}|${row.hub ?? ''}|${row.design}`, row);
    }
    out.series[slug] = {
      figures: [...unique.values()].sort(
        (a, b) =>
          a.year - b.year ||
          a.mark.localeCompare(b.mark) ||
          a.finish.localeCompare(b.finish) ||
          (a.hub ?? '').localeCompare(b.hub ?? '') ||
          a.source.localeCompare(b.source),
      ),
      ...(misses.length > 0 ? { notFound: [...new Set(misses)] } : {}),
    };

    const bySource = {};
    for (const row of out.series[slug].figures) bySource[row.source] = (bySource[row.source] ?? 0) + 1;
    console.log(`${slug}:`);
    for (const [name, count] of Object.entries(bySource)) console.log(`  ${name}: ${count} figures`);
    if (misses.length > 0) console.log(`  no page found for: ${[...new Set(misses)].join(', ')}`);
    if (network.length > 0) console.log(`  ${network.length} requests did not answer 200`);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${OUT}. Run \`npm run mintages\` to merge it in.`);
}

const SOURCE_NOTE =
  'Third and fourth opinions, fetched one coin at a time by `npm run verify` and merged by `npm run mintages`. These are collector price guides that publish a mintage table; none of them states where its own figures came from, so a majority here is a majority of SECONDARY sources and is recorded as such. The primary source is the United States Mint’s production report, which cannot be automated — usmint.gov, PCGS and NGC all answer 403 to anything that is not a browser.';

if (process.argv[1] && process.argv[1].endsWith('verify-mintages.mjs')) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
