/**
 * The coins. Today a hand-written seed; tomorrow a generated snapshot.
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
 * Five entries: the 1960 to 1964 Washington quarters, the silver years still
 * within living memory of pocket change. They are the first real coins rather
 * than structural samples -- `coin-catalog.example.ts` still holds the nine
 * worked entries that exercise every branch of the schema.
 *
 * They are five pages rather than one run page because the year is what the
 * reader types. The metal answer is identical across all five, but the
 * mintages are not, and neither is the reason each date gets asked about.
 *
 * It carries no `values`. Graded prices wait on the market-data decision in
 * SPEC.md, and a coin page with no `values` says so plainly rather than
 * printing a number nobody measured. The metal arithmetic -- 0.1808 troy
 * ounces times spot -- carries the page in the meantime, which is why this
 * coin is a good one to be first.
 */
import type { Coin } from './coin-schema';

export const COINS: Coin[] = [
  /*
   * Mintages: Philadelphia 29,164,000, Denver 63,000,324,
   * proof 1,691,602 (Philadelphia, no mint mark). `mintage` below is the
   * two circulation strikes added together; the proofs are not in it.
   * Sources: U.S. Mint annual figures as tabulated by landofcoins.com and
   * cross-checked against PCGS CoinFacts. San Francisco struck no quarters in
   * any year from 1955 to 1967, so there is no 1960-S.
   */
  {
    slug: '1960-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1960 Washington Quarter',
    seoTitle: '1960 Quarter Value: 90% Silver Content and Price',
    bluf: 'A 1960 Washington quarter is 90% silver and contains 0.1808 troy ounces of silver.',
    description:
      'What a 1960 quarter is worth: 0.1808 troy ounces of silver, the mintages for Philadelphia and Denver, and what the metal is worth at the current spot price.',
    primaryKeyword: '1960 quarter value',
    secondaryKeywords: [
      '1960 silver quarter',
      '1960 quarter worth',
      '1960 d quarter value',
      'how much silver in a 1960 quarter',
    ],
    years: { from: 1960 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    // San Francisco struck no quarters between 1955 and 1967. Proofs were
    // struck at Philadelphia and carry no mint mark, so neither is a third row.
    struckAt: [
      { city: 'Philadelphia', mark: '' },
      { city: 'Denver', mark: 'D' },
    ],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 92164324,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1960. A 1960-D, struck at Denver, is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'Check the mint mark, on the reverse below the wreath beneath the eagle, just above the ER of QUARTER. No mark is Philadelphia, D is Denver. There is no 1960-S \u2014 San Francisco struck no quarters between 1955 and 1967.',
    ],
    premiumIf: [
      'uncirculated with full original lustre',
      'a 1960 proof struck for collectors',
      'a verified mint error such as a doubled die or an off-centre strike',
    ],
    sections: [
      {
        heading: 'Why the 1960 quarter looks scarce on paper and is not',
        paragraphs: [
          'Philadelphia struck 29,164,000 quarters in 1960, the smallest Washington quarter mintage of the decade, and that figure is the reason the date comes up in searches. It does not make the coin scarce. Denver struck 63,000,324 the same year, the two coins are worth the same, and twenty-nine million of anything is more than the collector market can ever absorb.',
          'What decides a 1960 quarter\'s value is the silver in it, exactly as it does for 1964. A mintage only starts to matter when it falls into the hundreds of thousands — the 1932-D at 436,800 and the 1932-S at 408,000 are the Washington quarters where the number is the whole story.',
        ],
      },
    ],
  },
  /*
   * Mintages: Philadelphia 37,036,000, Denver 83,656,928,
   * proof 3,028,244 (Philadelphia, no mint mark). `mintage` below is the
   * two circulation strikes added together; the proofs are not in it.
   * Sources: U.S. Mint annual figures as tabulated by landofcoins.com and
   * cross-checked against PCGS CoinFacts. San Francisco struck no quarters in
   * any year from 1955 to 1967, so there is no 1961-S.
   */
  {
    slug: '1961-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1961 Washington Quarter',
    seoTitle: '1961 Quarter Value: 90% Silver Content and Price',
    bluf: 'A 1961 Washington quarter is 90% silver and contains 0.1808 troy ounces of silver.',
    description:
      'What a 1961 quarter is worth: 0.1808 troy ounces of silver, the mintages for Philadelphia and Denver, and what the metal is worth at the current spot price.',
    primaryKeyword: '1961 quarter value',
    secondaryKeywords: [
      '1961 silver quarter',
      '1961 quarter worth',
      '1961 d quarter value',
      'how much silver in a 1961 quarter',
    ],
    years: { from: 1961 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    // San Francisco struck no quarters between 1955 and 1967. Proofs were
    // struck at Philadelphia and carry no mint mark, so neither is a third row.
    struckAt: [
      { city: 'Philadelphia', mark: '' },
      { city: 'Denver', mark: 'D' },
    ],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 120692928,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1961. A 1961-D, struck at Denver, is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'Check the mint mark, on the reverse below the wreath beneath the eagle, just above the ER of QUARTER. No mark is Philadelphia, D is Denver. There is no 1961-S \u2014 San Francisco struck no quarters between 1955 and 1967.',
    ],
    premiumIf: [
      'uncirculated with full original lustre',
      'a 1961 proof struck for collectors',
      'a verified mint error such as a doubled die or an off-centre strike',
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
  /*
   * Mintages: Philadelphia 36,156,000, Denver 127,554,756,
   * proof 3,218,019 (Philadelphia, no mint mark). `mintage` below is the
   * two circulation strikes added together; the proofs are not in it.
   * Sources: U.S. Mint annual figures as tabulated by landofcoins.com and
   * cross-checked against PCGS CoinFacts. San Francisco struck no quarters in
   * any year from 1955 to 1967, so there is no 1962-S.
   */
  {
    slug: '1962-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1962 Washington Quarter',
    seoTitle: '1962 Quarter Value: 90% Silver Content and Price',
    bluf: 'A 1962 Washington quarter is 90% silver and contains 0.1808 troy ounces of silver.',
    description:
      'What a 1962 quarter is worth: 0.1808 troy ounces of silver, the mintages for Philadelphia and Denver, and what the metal is worth at the current spot price.',
    primaryKeyword: '1962 quarter value',
    secondaryKeywords: [
      '1962 silver quarter',
      '1962 quarter worth',
      '1962 d quarter value',
      'how much silver in a 1962 quarter',
    ],
    years: { from: 1962 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    // San Francisco struck no quarters between 1955 and 1967. Proofs were
    // struck at Philadelphia and carry no mint mark, so neither is a third row.
    struckAt: [
      { city: 'Philadelphia', mark: '' },
      { city: 'Denver', mark: 'D' },
    ],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 163710756,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1962. A 1962-D, struck at Denver, is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'Check the mint mark, on the reverse below the wreath beneath the eagle, just above the ER of QUARTER. No mark is Philadelphia, D is Denver. There is no 1962-S \u2014 San Francisco struck no quarters between 1955 and 1967.',
    ],
    premiumIf: [
      'uncirculated with full original lustre',
      'a 1962 proof struck for collectors',
      'a verified mint error such as a doubled die or an off-centre strike',
    ],
    sections: [
      {
        heading: 'Denver struck more than three times as many, and it changes nothing',
        paragraphs: [
          'The 1962 mintage split is the widest of the silver Sixties: 36,156,000 at Philadelphia against 127,554,756 at Denver. A reader who finds the D and reads that figure sometimes concludes the plain 1962 is the one to keep. It is not, in any practical sense — both dates are common, both are worth their silver, and no dealer prices them apart in circulated grades.',
        ],
      },
    ],
  },
  /*
   * Mintages: Philadelphia 74,316,000, Denver 135,288,184,
   * proof 3,075,645 (Philadelphia, no mint mark). `mintage` below is the
   * two circulation strikes added together; the proofs are not in it.
   * Sources: U.S. Mint annual figures as tabulated by landofcoins.com and
   * cross-checked against PCGS CoinFacts. San Francisco struck no quarters in
   * any year from 1955 to 1967, so there is no 1963-S.
   */
  {
    slug: '1963-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1963 Washington Quarter',
    seoTitle: '1963 Quarter Value: 90% Silver Content and Price',
    bluf: 'A 1963 Washington quarter is 90% silver and contains 0.1808 troy ounces of silver.',
    description:
      'What a 1963 quarter is worth: 0.1808 troy ounces of silver, the mintages for Philadelphia and Denver, and what the metal is worth at the current spot price.',
    primaryKeyword: '1963 quarter value',
    secondaryKeywords: [
      '1963 silver quarter',
      '1963 quarter worth',
      '1963 d quarter value',
      'how much silver in a 1963 quarter',
    ],
    years: { from: 1963 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    // San Francisco struck no quarters between 1955 and 1967. Proofs were
    // struck at Philadelphia and carry no mint mark, so neither is a third row.
    struckAt: [
      { city: 'Philadelphia', mark: '' },
      { city: 'Denver', mark: 'D' },
    ],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 209604184,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1963. A 1963-D, struck at Denver, is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter dated 1965 or later shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'Check the mint mark, on the reverse below the wreath beneath the eagle, just above the ER of QUARTER. No mark is Philadelphia, D is Denver. There is no 1963-S \u2014 San Francisco struck no quarters between 1955 and 1967.',
    ],
    premiumIf: [
      'uncirculated with full original lustre',
      'a 1963 proof struck for collectors',
      'a verified mint error such as a doubled die or an off-centre strike',
    ],
    sections: [
      {
        heading: 'The last ordinary year',
        paragraphs: [
          '1963 is the last year silver quarters were struck and spent without anyone thinking about it. Silver reached $1.29 an ounce that year — the price at which a silver dollar\'s metal is worth its face value — and Congress repealed the Silver Purchase Acts in June, ending the Treasury\'s ability to hold the price down. Quarters started leaving circulation shortly afterwards, and the Coinage Act of 1965 followed eighteen months later.',
          'That is why 1964 mintages are ten times the size of 1963\'s: the Mint was striking against a coin shortage caused by people pulling silver out of tills. A 1963 quarter is the more interesting coin of the two for that reason, and worth precisely the same.',
        ],
      },
    ],
  },
  /*
   * The 1964 quarter is the seed of the catalogue and the clearest case the
   * site exists to answer: a coin people find in change, search by year, and
   * own for its metal rather than its rarity. No `related` links on any of
   * these five -- the coin page's "other years" block is derived from the
   * coins sharing the series tag, so listing siblings by hand would be a
   * second list to keep in step with the first.
   *
   * Mintages: Philadelphia 560,390,585, Denver 704,135,528, proof 3,950,762
   * (Philadelphia, no mint mark). `mintage` is the two circulation strikes
   * added together. San Francisco struck no quarters in 1964.
   */
  {
    slug: '1964-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1964 Washington Quarter',
    seoTitle: '1964 Quarter Value: 90% Silver Content and Price',
    bluf: 'A 1964 Washington quarter is 90% silver and contains 0.1808 troy ounces of silver.',
    description:
      'What a 1964 quarter is worth: 0.1808 troy ounces of silver, the last silver year of the Washington quarter, and what the metal is worth at the current spot price.',
    primaryKeyword: '1964 quarter value',
    secondaryKeywords: [
      '1964 silver quarter',
      'how much silver in a 1964 quarter',
      '1964 quarter worth',
      'last year silver quarter',
    ],
    years: { from: 1964 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    obverse: 'George Washington, facing left',
    reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
    // San Francisco struck no quarters in 1964, so this is not the series list.
    struckAt: [
      { city: 'Philadelphia', mark: '' },
      { city: 'Denver', mark: 'D' },
    ],
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    mintage: 1264526113,
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1964. A 1964-D, struck at Denver, is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'Check the mint mark, on the reverse below the wreath beneath the eagle, just above the ER of QUARTER. No mark is Philadelphia, D is Denver. Neither changes what a circulated 1964 quarter is worth, and there is no 1964-S.',
    ],
    // No commas inside these -- the page joins them with commas, and an item
    // that contains one reads as two items. See COIN-ARTICLE-GUIDE.md.
    premiumIf: [
      'uncirculated with full original lustre',
      'a 1964 proof struck for collectors',
      'a verified mint error such as a doubled die or an off-centre strike',
    ],
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
];
