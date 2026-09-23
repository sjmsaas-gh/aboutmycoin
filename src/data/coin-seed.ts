/**
 * The hand-written coins: the ones whose copy somebody sat down and wrote.
 *
 * This file used to be the whole catalogue and is now half of it. The other
 * half is `coin-generated.ts`, written by `npm run coins` from the research
 * sheets in `data/coins/`, and `coin-catalog.ts` is the two merged in
 * chronological order. That is the split the header below always described --
 * "seeded by hand, then generated" -- arrived at the day the Washington
 * quarter went from eleven issues to eighty-three.
 *
 * WHAT BELONGS HERE: an issue with something of its own to say. The 1932-D has
 * the added-mint-mark problem, the 1964 has the end of silver coinage, the
 * 1964-D has the largest silver mintage ever struck. Every one of them carries
 * a `sections` block that is true of that coin and of no other, and prose
 * written round it.
 *
 * WHAT DOES NOT: an issue whose page is its facts. A 1947-S Washington quarter
 * is a date, a mint, a mintage and 0.1808 troy ounces of silver, and a page
 * generated from those four facts says everything true about it. Writing one
 * by hand would produce the same page more slowly and with more places to be
 * wrong. Add it to the sheet.
 *
 * Moving a coin from there to here is the upgrade path: fill in the fields you
 * want to write, and the generator stops supplying them.
 *
 * ---------------------------------------------------------------------------
 * HOW THIS SCALES TO THOUSANDS OF PAGES
 * ---------------------------------------------------------------------------
 *
 * The intended pipeline, recorded here before it exists so that nothing is
 * built that blocks it:
 *
 *   authoring database  ->  `npm run catalog`  ->  this file (committed)
 *                                              ->  `astro build`  ->  static HTML
 *
 * The database is a BUILD-TIME source, never a runtime one. Nothing the
 * deployed site serves ever touches it, so the "no database" house rule is
 * intact: that rule is about what the running site depends on, and the running
 * site remains a directory of HTML files on a CDN. This distinction is the one
 * thing to preserve if this file is ever reorganised.
 *
 * Why the snapshot is committed rather than fetched during the build:
 *
 *   - A build must be reproducible. A deploy that produces different HTML
 *     because a row changed between two runs is a deploy nobody can bisect.
 *   - A build must work offline and on a host with no credentials. Vercel,
 *     Netlify and Cloudflare Pages all build from the repo; none of them
 *     should hold a database password.
 *   - A diff on this file is the review. A catalogue change that adds two
 *     hundred pages should show up in a pull request as two hundred pages,
 *     not as an invisible consequence of a build.
 *
 * At tens of thousands of entries this file stops being one file. The split
 * then is by group -- `catalog/silver.ts`, `catalog/copper.ts` -- because that
 * is the axis the routes already page by, and the loader in coins.ts becomes
 * the only thing that has to know. Do not split by year or by country: neither
 * matches how anything reads the data.
 *
 * ---------------------------------------------------------------------------
 * THE SEED BELOW
 * ---------------------------------------------------------------------------
 *
 * Ten entries: the 1960 to 1964 Washington quarters, Philadelphia and Denver,
 * one page each. The silver years still within living memory of pocket change.
 * They are the first real coins rather than structural samples --
 * `coin-catalog.example.ts` still holds the nine worked entries that exercise
 * every branch of the schema.
 *
 * ---------------------------------------------------------------------------
 * WHY A MINT MARK IS A PAGE AND A YEAR IS A PAGE
 * ---------------------------------------------------------------------------
 *
 * The house test is "name the person who types the phrase", and for these
 * coins there are two of them. One types "1960 quarter value" holding a coin
 * with nothing under the wreath; the other types "1960 d quarter value"
 * holding one with a letter there. They are looking at different objects with
 * different published mintages, and until 2026-09-21 both were sent to one
 * page that quietly averaged the two.
 *
 * That page was wrong in ways a reader could catch:
 *
 *   - `mintage` was the two-mint total, so neither coin's own figure was on
 *     the site at all.
 *   - `struckAt` listed both mints, so the "Minted at" row did not describe
 *     the coin in the reader's hand.
 *   - It offered "a 1960 proof struck for collectors" to somebody holding a
 *     D. Every United States proof struck between 1950 and 1964 came from
 *     Philadelphia and carries no mint mark, so that line was an invitation
 *     to look for something that does not exist.
 *
 * So the split is a correctness fix before it is a keyword decision. What it
 * is NOT is a licence to expand every series by its mint marks: it earns its
 * pages here because the two mints' mintages differ and are separately
 * published, because
 * the identification step genuinely differs (a blank space versus a letter in
 * a place nobody looks), and because both phrases are typed. A mint mark that
 * changes none of those is a row in the spec table, not a URL.
 *
 * The slugs of the five Philadelphia pages are unchanged, because a slug is
 * never changed once published. They are now the no-mint-mark pages, and they
 * say so in their names, their H1s and the first line of their checklists.
 *
 * San Francisco struck no quarters at all between 1955 and 1967, so there is
 * no -S page for any of these dates and every checklist says so. A mint that
 * struck nothing is a fact the reader needs, not a gap in the data.
 *
 * None of these carry `values`. Graded prices wait on the market-data decision
 * in SPEC.md, and a coin page with no `values` says so plainly rather than
 * printing a number nobody measured. The metal arithmetic -- 0.1808 troy
 * ounces times spot -- carries the page in the meantime, which is why these
 * coins are good ones to be first.
 *
 * No `related` links on any of the ten: the coin page's siblings block is
 * derived from the coins sharing the series tag, so listing them by hand would
 * be a second list to keep in step with the first.
 *
 * ---------------------------------------------------------------------------
 * MINTAGES
 * ---------------------------------------------------------------------------
 *
 * Circulation strikes, per mint. Proofs are a separate figure struck for
 * collectors and are not folded into any of them.
 *
 *   year   Philadelphia    Denver        proof (Philadelphia, no mark)
 *   1960     29,164,000     63,000,324     1,691,602
 *   1961     37,036,000     83,656,928     3,028,244
 *   1962     36,156,000    127,554,756     3,218,019
 *   1963     74,316,000    135,288,184     3,075,645
 *   1964    560,390,585    704,135,528     3,950,762
 *
 * Sources: U.S. Mint annual production figures as tabulated by
 * landofcoins.com, cross-checked against PCGS CoinFacts and against
 * en.wikipedia.org/wiki/Washington_quarter_mintage_figures. All fifteen
 * figures agree across the three.
 *
 * 1932, for the key-date sentences: Philadelphia 5,404,000, Denver 436,800,
 * San Francisco 408,000. Same sources.
 *
 * ---------------------------------------------------------------------------
 * THE DATED CLAIMS IN THE SECTIONS, AND WHERE THEY WERE CHECKED
 * ---------------------------------------------------------------------------
 *
 * Every one of these is a sentence a reader can catch the site out on, so each
 * is written down with what settles it. Four of them were wrong in an earlier
 * draft and are noted as such, because the wrong version is the plausible one
 * and it will be reintroduced otherwise.
 *
 *   - San Francisco struck no quarters from 1955 to 1967. The last was
 *     1954-S; 1968-S is proof only. So there is no -S page for these dates.
 *   - Proofs of this era were struck only at Philadelphia and carry no mint
 *     mark, so no Denver page may ever send a reader looking for one.
 *   - 1961 is the first year proof production passed three million
 *     (1960: 1,691,602; 1961: 3,028,244).
 *   - 29,164,000 is the smallest quarter mintage of the 1960s, clad years
 *     included; the next smallest is 1962 at 36,156,000.
 *   - The 1962 split is the widest of the five: 3.53 to one, against 2.16,
 *     2.26, 1.82 and 1.26. NOT "two to four" across the run -- 1964 is 1.26.
 *   - The mint mark sits below the crossed ends of the olive branches, above
 *     the ER of QUARTER, and moved to the obverse in 1968. It is in the
 *     field, so it is NOT "the part of the design that wears first".
 *   - Philadelphia quarters carried no mint mark at all until 1980, so it is
 *     every quarter that CARRIES one that has carried it on the obverse
 *     since 1968 -- not every quarter struck since.
 *   - Public Law 88-36 repealed the Silver Purchase Acts on 4 June 1963; the
 *     Coinage Act of 1965 was signed on 23 July 1965. That is twenty-five
 *     months, so "just over two years", NOT eighteen months.
 *   - The coin shortage CAUSED the end of silver coinage and the 1965-67
 *     removal of mint marks. It did not follow them.
 *   - 704,135,528 is the largest mintage of any SILVER quarter. It is not the
 *     record for the denomination: 1965 struck 1,819,717,540 and 1967
 *     1,524,031,848.
 *   - 1964-dated quarters went on being struck after 1964, under the Coinage
 *     Act's authority to hold the date.
 *
 * Checked 2026-09-21 against the Wikipedia mintage table, CoinWeek's silver
 * Washington quarter reference (mint mark position), congress.gov for both
 * statutes, and the U.S. Mint's own note on mint marks being restored.
 */
import type { Coin } from './coin-schema';

export const SEEDED_COINS: Coin[] = [
  {
    /*
     * The one Morgan dollar written by hand, and the reason is the whole of
     * the section at the bottom of it.
     *
     * The generated page was correct and useless. It said "one of 880 struck"
     * and stopped, on the page a person lands on when they have found a silver
     * dollar dated 1895 in a drawer -- which is the single most likely coin on
     * this site to be a fake, because hundreds of 1895-O and 1895-S dollars
     * exist with the mint mark filed off. The fact that answers them is not
     * derivable from any figure in the pipeline, which is exactly the test for
     * a `sections` block.
     *
     * Note what this page does NOT do: it does not say the 12,000 were melted.
     * The sources disagree about that and the disagreement is the interesting
     * part, so both accounts are given and neither is settled here. Same rule
     * as a contested mintage.
     *
     * Sources: the Mint's own 1895 report for the 12,000; Tom DeLorey in
     * CoinWeek ("The Phantom Silver Dollars of 1895") for the mint-mark
     * removals and for Henry T. Hettger's research on the 1894 dating; the
     * Pittman Act of 1918 for the melting account.
     */
    slug: '1895-proof-morgan-dollar',
    group: 'silver',
    type: 'dollar',
    // Key date, and the one place a proof carries that tag. The generator
    // withholds it from every finish, because a proof page states no
    // scarcity verdict -- but the 880 proofs ARE the 1895, the page argues
    // exactly that, and this is what a hand-written coin is for.
    tags: ['morgan-dollar', 'us-coin', '90-percent-silver', 'key-date'],
    name: '1895 Proof Morgan Dollar (No Mint Mark)',
    shortName: '1895 proof Morgan dollar with no mint mark',
    seoTitle: '1895 Morgan Dollar Value: The King of the Morgans',
    bluf: 'An 1895 Morgan dollar with no mint mark exists only as a proof — 880 were struck, 90% silver with 0.7734 troy ounces in it — and the 12,000 circulation strikes the Mint’s own report records for that year have never been found, so a worn one is a coin to have authenticated before anything else.',
    description:
      'An 1895 Morgan dollar: a proof-only date, 880 struck, and why the 12,000 circulation strikes in the Mint’s own report have never been found.',
    primaryKeyword: '1895 morgan dollar value',
    secondaryKeywords: [
      '1895 silver dollar value',
      '1895 morgan dollar no mint mark',
      'is my 1895 morgan dollar real',
      'king of the morgan dollars',
    ],
    years: { from: 1895 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'Liberty facing left in a Phrygian cap, wearing cotton bolls and wheat',
    reverse: 'An eagle with wings spread, holding arrows and an olive branch, within a wreath',
    struckAt: [{ city: 'Philadelphia', mark: '' }],
    weightGrams: 26.73,
    diameterMm: 38.1,
    silverOzt: 0.7734,
    faceValue: '$1.00',
    mintage: 880,
    commonality: 'key-date',
    finish: {
      kind: 'proof',
      note: 'This is a proof, not a coin that was ever in a till: it was struck on a polished blank from polished dies and sold to collectors. On this date that is not a detail, it is the whole coin — the 880 proofs are the entire 1895 Philadelphia issue anybody can demonstrate, so there is no ordinary version of it to compare against and no circulated grade it can honestly be in.',
    },
    identify: [
      'Read the date. It must say 1895. An altered digit is one of the two ways a coin comes to be dated 1895 when it was not, so read it under magnification rather than across a room.',
      'Look on the reverse, below the wreath and above the DO of DOLLAR. There must be no letter at all in that spot — but on this date a blank space is the thing to be suspicious of rather than reassured by, because a filed-off O or S leaves one too.',
      'Look at the surfaces. A proof has mirrored fields and frosted devices and was never spent, so it shows no wear anywhere. An 1895 with no mint mark and honest circulation wear on the cheek and the eagle’s breast is not a worn proof: it is a coin that started life as something else.',
      'Weigh it and check the edge. A Morgan dollar weighs 26.73 grams and is 90% silver with a reeded edge. Anything materially lighter, or showing a copper line at the edge, is a replica — and the 1895 is replicated more than any other date in the series.',
    ],
    sections: [
      {
        heading: 'The twelve thousand nobody has ever found',
        paragraphs: [
          'The Mint’s report for 1895 records 12,000 silver dollars struck for circulation at Philadelphia, and in the century and a third since, not one has been confirmed. That is why the 880 proofs are treated as the whole date, and why this is the coin collectors call the King of the Morgan Dollars — not because it is the lowest mintage in the series, which it is not, but because the rest of the mintage appears never to have reached anybody.',
          'There are two accounts and they are not settled. The older one is that the 12,000 were melted under the Pittman Act of 1918, which turned some 270 million silver dollars into bars for shipment to India; on that reading the coins existed and were destroyed before anybody thought to keep one. The newer one, from research by Henry T. Hettger, is that they were never dated 1895 at all — a footnote in the Mint’s own records reads "12,000 coined in 1894", which would make the whole mystery a bookkeeping artefact. This page states both because the evidence does, and takes neither.',
        ],
      },
      {
        heading: 'Why a circulated 1895 with no mint mark is a problem, not a find',
        paragraphs: [
          'Two other mints struck dollars that year and both are ordinary coins: New Orleans made 450,000 and San Francisco 400,000, and they carry an O and an S below the wreath. Removing that letter turns a coin worth a few hundred into one that looks like the rarest date in the series, and it is easy to do — hundreds of 1895-O and 1895-S dollars are known with their mint marks filed away.',
          'So the sequence matters on this date and on almost no other. Do not look up a price first. A genuine 1895 is a proof, which means mirrored fields, frosted devices and no wear at all; anything with a worn cheek or a flattened eagle’s breast is answering a different question. If the coin has any chance of being real, it is worth the cost of certification by a grading service before it is worth a valuation, because at these prices an uncertified example is not a coin, it is a question.',
        ],
      },
    ],
  },
  {
    slug: '1932-d-washington-quarter',
    group: 'silver',
    type: 'quarter',
    // No junk-silver tag, and that is the point of the tag: junk silver is
    // common-date silver bought by weight, and this is the one Washington
    // quarter a dealer reads the date on before weighing anything.
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'key-date'],
    name: '1932-D Washington Quarter',
    shortName: '1932-D Washington quarter',
    seoTitle: '1932-D Quarter Value: The Key Date Washington',
    bluf: 'A 1932-D Washington quarter is the key date of the series: 436,800 were struck in the first year of issue, it is 90% silver with 0.1808 troy ounces in it, and even a heavily worn example is worth many times its metal.',
    description:
      'A 1932-D Washington quarter: the key date of the series, 436,800 struck in the first year of issue, 0.1808 troy ounces of silver, and how to spot an added mint mark.',
    primaryKeyword: '1932 d quarter value',
    secondaryKeywords: [
      '1932 d quarter worth',
      '1932 d washington quarter value',
      'is my 1932 d quarter real',
      'key date washington quarter',
    ],
    years: { from: 1932 },
    mintMark: 'D',
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    struckAt: [{ city: 'Denver', mark: 'D' }],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 436800,
    commonality: 'key-date',
    pcgsNumber: '5791',
    identify: [
      'Read the date. It must say 1932. The Washington quarter was struck for the bicentennial of Washington\u2019s birth and 1932 is the first year of the series, so there is nothing earlier to confuse it with.',
      'Find the D. It is on the reverse, below the wreath beneath the eagle and just above the ER of QUARTER. An S in that spot is the 1932-S, a different coin of similar scarcity; nothing at all in that spot is the 1932 Philadelphia issue, of which 5,404,000 were struck and which is worth a small fraction of this one.',
      'Look at the mint mark under magnification before you look at anything else. The commonest fake is a genuine 1932 Philadelphia quarter with a D glued or soldered on, because the donor coin is cheap and the difference in value is large.',
      'Weigh it. A silver quarter weighs 6.25 grams and reads a uniform silver-grey at the edge; a clad quarter weighs 5.67 grams and shows a copper stripe. A 1932-D that weighs 5.67 grams is not a 1932-D.',
    ],
    sections: [
      {
        heading: 'The added mint mark, and why this date is the one to have checked',
        paragraphs: [
          'Denver struck 436,800 quarters in 1932 and Philadelphia struck 5,404,000, which are the same coin apart from one letter on the reverse. That gap is the whole counterfeiting problem: a common 1932 quarter costs a few dollars, a D glued into the space below the wreath costs nothing, and the result is worth a hundred times the donor coin at the lowest grade on the ladder.',
          'A genuine D was punched into the die, so it sits flush in the field with the same surface and the same wear as the metal around it. An added one sits on top, often with a seam, a colour difference or tool marks around its edge, and it is frequently the wrong shape or in the wrong place by a fraction of a millimetre. This is the reason every figure on this page is quoted for a certified coin: at these prices a raw 1932-D is not a coin, it is a question.',
        ],
      },
    ],
  },
  {
    slug: '1960-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1960 Washington Quarter (No Mint Mark)',
    shortName: '1960 Washington quarter with no mint mark',
    seoTitle: '1960 Quarter Value: No Mint Mark, 90% Silver',
    bluf: 'A 1960 Washington quarter with no mint mark was struck at Philadelphia, is 90% silver, and contains 0.1808 troy ounces of silver.',
    description:
      'A 1960 quarter with no mint mark: struck at Philadelphia, 0.1808 troy ounces of silver, a mintage of 29,164,000, and what the metal is worth now.',
    primaryKeyword: '1960 quarter value',
    secondaryKeywords: [
      '1960 quarter no mint mark',
      '1960 silver quarter',
      '1960 quarter worth',
      'how much silver in a 1960 quarter',
    ],
    years: { from: 1960 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    // This issue only: the Denver coin is its own page, and San Francisco
    // struck no quarters between 1955 and 1967. Proofs were struck here and
    // carry no mint mark either, so they are not a second row.
    struckAt: [{ city: 'Philadelphia', mark: '' }],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 29164000,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1960.',
      'Look at the reverse, below the wreath beneath the eagle and just above the ER of QUARTER. There must be no letter at all in that spot. A blank space is Philadelphia; a D there is a 1960-D, which is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'There is no 1960-S. San Francisco struck no quarters at all between 1955 and 1967, so an S is not something to go looking for on this date.',
    ],
    sections: [
      {
        heading: 'Why the 1960 quarter looks scarce on paper and is not',
        paragraphs: [
          'Philadelphia struck 29,164,000 quarters in 1960, the smallest Washington quarter mintage of the decade, and that figure is the reason this date comes up in searches. It does not make the coin scarce. Denver struck 63,000,324 the same year, the two are worth the same, and twenty-nine million of anything is more than the collector market can ever absorb.',
          'What decides the value is the silver in it, exactly as it does for 1964. A mintage only starts to matter when it falls into the hundreds of thousands — the 1932-D at 436,800 and the 1932-S at 408,000 are the Washington quarters where the number is the whole story.',
        ],
      },
    ],
  },
  {
    slug: '1960-d-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1960-D Washington Quarter',
    seoTitle: '1960-D Quarter Value: 90% Silver and Mintage',
    bluf: 'A 1960-D Washington quarter was struck at Denver, is 90% silver, and contains 0.1808 troy ounces of silver — the same metal, and the same value, as a 1960 quarter with no mint mark.',
    description:
      'A 1960-D quarter: struck at Denver, 0.1808 troy ounces of silver, a mintage of 63,000,324, and what the silver comes to at the current spot price.',
    primaryKeyword: '1960 d quarter value',
    secondaryKeywords: [
      '1960 d silver quarter',
      '1960 d quarter worth',
      'is a 1960 d quarter rare',
      'how much silver in a 1960 d quarter',
    ],
    years: { from: 1960 },
    mintMark: 'D',
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    struckAt: [{ city: 'Denver', mark: 'D' }],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 63000324,
    commonality: 'very-common',
    // No proof line here. Every United States proof struck between 1950 and
    // 1964 came from Philadelphia and carries no mint mark, so a 1960-D proof
    // does not exist and offering one would send a reader looking for it.
    identify: [
      'Read the date. It must say 1960.',
      'Find the D. It is on the reverse, below the wreath beneath the eagle and just above the ER of QUARTER — not on the obverse, where the mint mark moved in 1968. No letter at all in that spot is the Philadelphia coin, which is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'There is no 1960-S. San Francisco struck no quarters at all between 1955 and 1967, so an S is not something to go looking for on this date.',
    ],
    sections: [
      {
        heading: 'A mint mark does not make a quarter rarer',
        paragraphs: [
          'Denver struck 63,000,324 quarters in 1960, more than twice the 29,164,000 struck at Philadelphia, so the coin with the letter on it is the commoner of the two. That is the reverse of what most people expect, and the expectation has a source: in the first year of the series Denver struck 436,800 quarters and San Francisco 408,000, against more than five million at Philadelphia, and those two mint-marked dates are the famous keys of the whole run.',
          'Twenty-eight years later the arithmetic had turned over and nothing about the letter carried with it. A 1960-D is worth the silver in it, and no dealer separates it from a 1960 with no mint mark in circulated grades.',
        ],
      },
    ],
  },
  {
    slug: '1961-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1961 Washington Quarter (No Mint Mark)',
    shortName: '1961 Washington quarter with no mint mark',
    seoTitle: '1961 Quarter Value: No Mint Mark, 90% Silver',
    bluf: 'A 1961 Washington quarter with no mint mark was struck at Philadelphia, is 90% silver, and contains 0.1808 troy ounces of silver.',
    description:
      'A 1961 quarter with no mint mark: struck at Philadelphia, 0.1808 troy ounces of silver, a mintage of 37,036,000, and what that silver is worth now.',
    primaryKeyword: '1961 quarter value',
    secondaryKeywords: [
      '1961 quarter no mint mark',
      '1961 silver quarter',
      '1961 quarter worth',
      'how much silver in a 1961 quarter',
    ],
    years: { from: 1961 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    struckAt: [{ city: 'Philadelphia', mark: '' }],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 37036000,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1961.',
      'Look at the reverse, below the wreath beneath the eagle and just above the ER of QUARTER. There must be no letter at all in that spot. A blank space is Philadelphia; a D there is a 1961-D, which is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'There is no 1961-S. San Francisco struck no quarters at all between 1955 and 1967, so an S is not something to go looking for on this date.',
    ],
    sections: [
      {
        heading: 'What the proof mintage tells you about finding a nice one',
        paragraphs: [
          'The Mint sold 3,028,244 proof sets in 1961, the first year proof production passed three million, and that matters to anyone holding a 1961 quarter: collectors were already putting this date away in quantity when it was new. Uncirculated 1961 quarters are not hard to find and are not priced as though they were.',
          'Proof quarters were struck at Philadelphia and carry no mint mark, so a 1961 proof and an ordinary 1961 circulation strike are told apart by their surfaces rather than by a letter. A proof has mirror fields and sharp, squared rims, and almost always arrives still in its Mint packaging.',
        ],
      },
    ],
  },
  {
    slug: '1961-d-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1961-D Washington Quarter',
    seoTitle: '1961-D Quarter Value: 90% Silver and Mintage',
    bluf: 'A 1961-D Washington quarter was struck at Denver, is 90% silver, and contains 0.1808 troy ounces of silver — the same metal, and the same value, as a 1961 quarter with no mint mark.',
    description:
      'A 1961-D quarter: 0.1808 troy ounces of silver, where the D sits on the reverse, a mintage of 83,656,928, and what the metal comes to at spot.',
    primaryKeyword: '1961 d quarter value',
    secondaryKeywords: [
      '1961 d silver quarter',
      '1961 d quarter worth',
      'where is the mint mark on a 1961 quarter',
      'how much silver in a 1961 d quarter',
    ],
    years: { from: 1961 },
    mintMark: 'D',
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    struckAt: [{ city: 'Denver', mark: 'D' }],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 83656928,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1961.',
      'Find the D. It is on the reverse, below the wreath beneath the eagle and just above the ER of QUARTER — not on the obverse, where the mint mark moved in 1968. No letter at all in that spot is the Philadelphia coin, which is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'There is no 1961-S. San Francisco struck no quarters at all between 1955 and 1967, so an S is not something to go looking for on this date.',
    ],
    sections: [
      {
        heading: 'Where the D is, and why so many people report not finding one',
        paragraphs: [
          'The mint mark on a 1961-D quarter is on the reverse, below the wreath beneath the eagle and just above the ER of QUARTER. It is small, it is easy to miss on a worn coin, and it is not where a modern eye looks: the Mint moved the mark to the obverse, to the right of Washington’s neck, in 1968, and every quarter that carries one has carried it there since.',
          'That is why "my 1961 quarter has no mint mark" is one of the commonest things said about this date. Turn the coin over before concluding anything. Denver struck 83,656,928 quarters in 1961 against Philadelphia’s 37,036,000, so on the numbers alone a 1961 quarter found in change is more likely to carry a D than not.',
        ],
      },
    ],
  },
  {
    slug: '1962-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1962 Washington Quarter (No Mint Mark)',
    shortName: '1962 Washington quarter with no mint mark',
    seoTitle: '1962 Quarter Value: No Mint Mark, 90% Silver',
    bluf: 'A 1962 Washington quarter with no mint mark was struck at Philadelphia, is 90% silver, and contains 0.1808 troy ounces of silver.',
    description:
      'A 1962 quarter with no mint mark: 0.1808 troy ounces of silver, the 36,156,000 struck at Philadelphia, and what the metal is worth at spot today.',
    primaryKeyword: '1962 quarter value',
    secondaryKeywords: [
      '1962 quarter no mint mark',
      '1962 silver quarter',
      '1962 quarter worth',
      'how much silver in a 1962 quarter',
    ],
    years: { from: 1962 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    struckAt: [{ city: 'Philadelphia', mark: '' }],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 36156000,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1962.',
      'Look at the reverse, below the wreath beneath the eagle and just above the ER of QUARTER. There must be no letter at all in that spot. A blank space is Philadelphia; a D there is a 1962-D, which is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'There is no 1962-S. San Francisco struck no quarters at all between 1955 and 1967, so an S is not something to go looking for on this date.',
    ],
    sections: [
      {
        heading: 'No mint mark means Philadelphia here, but not on every quarter',
        paragraphs: [
          'Philadelphia struck 36,156,000 quarters in 1962 and put no letter on any of them, so a blank space below the wreath is the identification rather than a gap in it. On this date the absence of a mark is itself the answer.',
          'It is not a rule that holds across the series. Quarters dated 1965, 1966 and 1967 carry no mint mark at all, whichever mint struck them: the Mint dropped mint marks nationwide to discourage hoarding during the coin shortage that ended silver coinage in the first place. So a blank space identifies Philadelphia on a 1962 and identifies nothing at all on a 1966, which is worth knowing before a bare-looking quarter is set aside as unusual.',
        ],
      },
    ],
  },
  {
    slug: '1962-d-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1962-D Washington Quarter',
    seoTitle: '1962-D Quarter Value: 90% Silver and Mintage',
    bluf: 'A 1962-D Washington quarter was struck at Denver, is 90% silver, and contains 0.1808 troy ounces of silver — the same metal, and the same value, as a 1962 quarter with no mint mark.',
    description:
      'A 1962-D quarter: struck at Denver, 0.1808 troy ounces of silver, a mintage of 127,554,756, and what the metal comes to at the current spot price.',
    primaryKeyword: '1962 d quarter value',
    secondaryKeywords: [
      '1962 d silver quarter',
      '1962 d quarter worth',
      'is a 1962 d quarter rare',
      'how much silver in a 1962 d quarter',
    ],
    years: { from: 1962 },
    mintMark: 'D',
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    struckAt: [{ city: 'Denver', mark: 'D' }],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 127554756,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1962.',
      'Find the D. It is on the reverse, below the wreath beneath the eagle and just above the ER of QUARTER — not on the obverse, where the mint mark moved in 1968. No letter at all in that spot is the Philadelphia coin, which is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'There is no 1962-S. San Francisco struck no quarters at all between 1955 and 1967, so an S is not something to go looking for on this date.',
    ],
    sections: [
      {
        heading: 'Denver struck more than three times as many, and it changes nothing',
        paragraphs: [
          'The 1962 mintage split is the widest of the silver Sixties: 36,156,000 at Philadelphia against 127,554,756 at Denver. A reader who finds the D and then reads those two figures sometimes concludes the plain 1962 is the one to keep. It is not, in any practical sense — both are common, both are worth their silver, and no dealer prices them apart in circulated grades.',
        ],
      },
    ],
  },
  {
    slug: '1963-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1963 Washington Quarter (No Mint Mark)',
    shortName: '1963 Washington quarter with no mint mark',
    seoTitle: '1963 Quarter Value: No Mint Mark, 90% Silver',
    bluf: 'A 1963 Washington quarter with no mint mark was struck at Philadelphia, is 90% silver, and contains 0.1808 troy ounces of silver.',
    description:
      'A 1963 quarter with no mint mark: struck at Philadelphia, 0.1808 troy ounces of silver, a mintage of 74,316,000, and what the metal is worth now.',
    primaryKeyword: '1963 quarter value',
    secondaryKeywords: [
      '1963 quarter no mint mark',
      '1963 silver quarter',
      '1963 quarter worth',
      'how much silver in a 1963 quarter',
    ],
    years: { from: 1963 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    struckAt: [{ city: 'Philadelphia', mark: '' }],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 74316000,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1963.',
      'Look at the reverse, below the wreath beneath the eagle and just above the ER of QUARTER. There must be no letter at all in that spot. A blank space is Philadelphia; a D there is a 1963-D, which is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'There is no 1963-S. San Francisco struck no quarters at all between 1955 and 1967, so an S is not something to go looking for on this date.',
    ],
    sections: [
      {
        heading: 'The last ordinary year',
        paragraphs: [
          '1963 is the last year silver quarters were struck and spent without anyone thinking about it. Silver reached $1.29 an ounce that year — the price at which a silver dollar’s metal is worth its face value — and Congress repealed the Silver Purchase Acts in June, ending the Treasury’s ability to hold the price down. Quarters started leaving circulation shortly afterwards, and the Coinage Act of 1965 followed just over two years later.',
          'That is why 1964 mintages are several times the size of 1963’s: the Mint was striking against a coin shortage caused by people pulling silver out of tills. A 1963 quarter is the more interesting coin of the two for that reason, and worth precisely the same.',
        ],
      },
    ],
  },
  {
    slug: '1963-d-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1963-D Washington Quarter',
    seoTitle: '1963-D Quarter Value: 90% Silver and Mintage',
    bluf: 'A 1963-D Washington quarter was struck at Denver, is 90% silver, and contains 0.1808 troy ounces of silver — the same metal, and the same value, as a 1963 quarter with no mint mark.',
    description:
      'A 1963-D quarter: struck at Denver, 0.1808 troy ounces of silver, a mintage of 135,288,184, and how a dealer actually prices one.',
    primaryKeyword: '1963 d quarter value',
    secondaryKeywords: [
      '1963 d silver quarter',
      '1963 d quarter worth',
      'sell 1963 d quarter',
      'how much silver in a 1963 d quarter',
    ],
    years: { from: 1963 },
    mintMark: 'D',
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    struckAt: [{ city: 'Denver', mark: 'D' }],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 135288184,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1963.',
      'Find the D. It is on the reverse, below the wreath beneath the eagle and just above the ER of QUARTER — not on the obverse, where the mint mark moved in 1968. No letter at all in that spot is the Philadelphia coin, which is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'There is no 1963-S. San Francisco struck no quarters at all between 1955 and 1967, so an S is not something to go looking for on this date.',
    ],
    sections: [
      {
        heading: 'How a dealer actually prices a worn 1963-D',
        paragraphs: [
          'By weight, and without reading the coin. Denver struck 135,288,184 quarters in 1963 and every one holds the same 0.1808 troy ounces of silver as every other Washington quarter dated 1932 to 1964, so a dealer buying circulated silver puts the whole lot on a scale, works a percentage of spot and writes one cheque. The date is not looked at and neither is the mint mark.',
          'That is the honest answer for a 1963-D with wear on it, and it is why the figure at the top of this page sits close to both the floor and the ceiling. The coins that get examined one at a time are the ones with no wear at all, and those are sold by grade rather than by weight.',
        ],
      },
    ],
  },
  {
    slug: '1964-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1964 Washington Quarter (No Mint Mark)',
    shortName: '1964 Washington quarter with no mint mark',
    seoTitle: '1964 Quarter Value: No Mint Mark, 90% Silver',
    bluf: 'A 1964 Washington quarter with no mint mark was struck at Philadelphia, is 90% silver, and contains 0.1808 troy ounces of silver.',
    description:
      'A 1964 quarter with no mint mark: 0.1808 troy ounces of silver, the last silver year of the Washington quarter, and what the metal is worth now.',
    primaryKeyword: '1964 quarter value',
    secondaryKeywords: [
      '1964 quarter no mint mark',
      '1964 silver quarter',
      'how much silver in a 1964 quarter',
      'last year silver quarter',
    ],
    years: { from: 1964 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    struckAt: [{ city: 'Philadelphia', mark: '' }],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 560390585,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1964.',
      'Look at the reverse, below the wreath beneath the eagle and just above the ER of QUARTER. There must be no letter at all in that spot. A blank space is Philadelphia; a D there is a 1964-D, which is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'There is no 1964-S. San Francisco struck no quarters at all between 1955 and 1967, so an S is not something to go looking for on this date.',
    ],
    // No commas inside these -- the page joins them with commas, and an item
    // that contains one reads as two items. See COIN-ARTICLE-GUIDE.md.
    sections: [
      {
        heading: 'Why 1964 is the date everyone asks about',
        paragraphs: [
          '1964 is the last year the United States struck quarters in silver. The Coinage Act of 1965 replaced the silver with a copper-nickel clad sandwich, and the two coins were deliberately made the same size and colour so vending machines would not need changing. That design decision is why a 1964 and a 1965 quarter are so easily confused, and why the difference in value is so large.',
          'A very large number of 1964 quarters were struck, so the coin is not scarce in any sense. Its value is metal, not rarity, and that is good news for anyone holding one: the price does not depend on a grading judgement you are not equipped to make.',
        ],
      },
    ],
  },
  {
    slug: '1964-d-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1964-D Washington Quarter',
    seoTitle: '1964-D Quarter Value: 90% Silver and Mintage',
    bluf: 'A 1964-D Washington quarter was struck at Denver, is 90% silver, and contains 0.1808 troy ounces of silver — the same metal, and the same value, as a 1964 quarter with no mint mark.',
    description:
      'A 1964-D quarter: 0.1808 troy ounces of silver, the largest silver quarter mintage ever struck at 704,135,528, and what it comes to at spot.',
    primaryKeyword: '1964 d quarter value',
    secondaryKeywords: [
      '1964 d silver quarter',
      '1964 d quarter worth',
      'is a 1964 d quarter rare',
      'how much silver in a 1964 d quarter',
    ],
    years: { from: 1964 },
    mintMark: 'D',
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    struckAt: [{ city: 'Denver', mark: 'D' }],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 704135528,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1964.',
      'Find the D. It is on the reverse, below the wreath beneath the eagle and just above the ER of QUARTER — not on the obverse, where the mint mark moved in 1968. No letter at all in that spot is the Philadelphia coin, which is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'There is no 1964-S. San Francisco struck no quarters at all between 1955 and 1967, so an S is not something to go looking for on this date.',
    ],
    sections: [
      {
        heading: 'The commonest silver quarter there is',
        paragraphs: [
          'Denver struck 704,135,528 quarters dated 1964, the largest mintage of any silver quarter and more than every Washington quarter of the previous four years put together, from either mint. The Mint was striking against a national coin shortage caused by people pulling silver out of tills, and it went on striking 1964-dated quarters after the calendar year had ended.',
          'None of that makes a 1964-D worth less than a 1960-D. Both hold 0.1808 troy ounces of silver, and a circulated silver quarter is priced by its metal rather than by how many were made. What the mintage does settle is the other question people ask about this date: no, yours is not rare, and there is nothing here that needs authenticating before it is sold.',
        ],
      },
    ],
  },
];
