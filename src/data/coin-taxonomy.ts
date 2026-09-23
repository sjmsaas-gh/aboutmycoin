/**
 * The editorial half of the catalogue: composition groups, denominations and
 * tags. Hand-written, permanently.
 *
 * This file stays hand-written even once the coins themselves come out of a
 * database, and that is the point of separating it. There will be tens of
 * groups and hundreds of tags against tens of thousands of coins, and each one
 * of these entries is an archive page whose copy a person has to have written.
 * A group or tag generated from a `SELECT DISTINCT` is a page with a heading
 * and a list on it, which is precisely the thin archive the house rules exist
 * to prevent.
 *
 * So: a coin may reference only a group, type or tag that appears below.
 * `validateTaxonomy()` in coins.ts throws at build time otherwise, which is
 * the mechanism that stops an import adding two hundred empty tag pages.
 */
import type { Group, CoinType, Tag } from './coin-schema';

/* ===========================================================================
   Groups
   =========================================================================== */

export const GROUPS: Group[] = [
  {
    slug: 'silver',
    name: 'Silver',
    // No h1, seoTitle or faqQuestion: catalog-copy.ts generates exactly these
    // three strings from the name and `meltDriven`, and a hand-written copy of
    // a generated string is a second place for it to drift from. The build
    // fails if one is added back unchanged.
    bluf: 'A circulated silver coin is worth at least its silver content, which is its actual silver weight in troy ounces multiplied by the current spot price -- so a 90% silver US quarter tracks silver, not the 25 cents stamped on it.',
    description:
      'Silver coin values by denomination: which issues are silver, the actual silver weight of each one, and the years each was struck.',
    primaryKeyword: 'silver coin values',
    secondaryKeywords: [
      'silver coin melt value',
      '90 percent silver coins',
      'junk silver value',
      'how much silver is in a coin',
    ],
    notes: [
      'United States dimes, quarters and half dollars dated 1964 and earlier are 90% silver. Half dollars dated 1965 to 1970 are 40% silver. Everything after that, with the exception of proof and collector issues, is copper-nickel clad and carries no silver at all.',
    ],
    meltDriven: true,
  },
  {
    slug: 'gold',
    name: 'Gold',
    bluf: 'A gold coin is worth its actual gold weight multiplied by the spot gold price, plus a premium that is small for modern bullion and can be very large for pre-1933 US gold in collectable condition.',
    description:
      'Gold coin values by denomination and format, with the actual gold weight of each issue. Modern bullion and circulating gold coinage alike.',
    primaryKeyword: 'gold coin values',
    secondaryKeywords: [
      'gold coin melt value',
      'how much gold is in a gold coin',
      'gold coin price guide',
    ],
    notes: [
      'Gold coins split cleanly into two markets. Modern bullion -- Eagles, Maples, Krugerrands -- trades at metal plus a modest, predictable premium, and its value is close to arithmetic. Pre-1933 circulating gold trades on condition and date, where the premium over metal can be several multiples.',
      'The gold weight of a coin is not its total weight. A one-ounce American Gold Eagle weighs 33.93 grams because it is alloyed with copper and silver for hardness; it still contains exactly one troy ounce of gold. Always value the gold content, never the gross weight.',
    ],
    meltDriven: true,
  },
  {
    slug: 'copper',
    name: 'Copper and bronze',
    bluf: 'Copper and bronze coins are almost never worth their metal, so their value is collector premium alone -- which means the date, the mint mark and the condition are the entire answer.',
    description:
      'Copper and bronze coins, including wheat cents and pre-decimal pennies. Metal content is negligible here, so date, mint mark, variety and condition decide the value.',
    primaryKeyword: 'copper coin values',
    secondaryKeywords: ['bronze coin value', 'wheat penny value', 'old penny value'],
    notes: [
      'Unlike silver and gold, copper offers no floor worth caring about. A bronze cent carries 3.11 grams of 95% copper, worth a fraction of a cent more than its face value, and melting United States cents is illegal in any case.',
      'That makes this the group where the small details decide the number. A mint mark, a doubled die, a year with a low mintage: those are the differences between a coin worth one cent and the same coin worth four figures, and they are why the identification checklist on each page matters more here than anywhere else on the site.',
    ],
    meltDriven: false,
  },
  {
    slug: 'nickel',
    name: 'Nickel and cupronickel',
    seoTitle: 'Nickel Coin Values: Dates, Mintages and Composition',
    bluf: 'Nickel and cupronickel coins carry no meaningful metal premium, so value comes from date, mint mark and condition -- with the wartime silver nickels of 1942 to 1945 as the single exception.',
    description:
      'Nickel and cupronickel coins, where metal content is negligible and date, mint mark and condition decide the value. Includes the exception: 1942-1945 wartime silver nickels.',
    primaryKeyword: 'nickel coin values',
    faqQuestion: 'Are nickel coins worth anything?',
    secondaryKeywords: ['jefferson nickel value', 'cupronickel coin value'],
    notes: [
      'Cupronickel is the workhorse alloy of modern circulating coinage worldwide, and it was chosen precisely because it is cheap and durable. Neither quality helps a coin be valuable.',
    ],
    meltDriven: false,
  },
  {
    slug: 'clad',
    name: 'Clad',
    seoTitle: 'Clad Coin Values: Are They Worth Anything?',
    bluf: 'Almost every clad coin is worth exactly its face value, because clad coinage is a copper core between copper-nickel faces with no precious metal in it at all.',
    description:
      'Clad coins by denomination and date. Clad coinage contains no silver and is worth face value circulated, with narrow exceptions for errors and uncirculated examples.',
    primaryKeyword: 'clad coin value',
    faqQuestion: 'Are clad coins worth more than face value?',
    secondaryKeywords: [
      'are clad coins worth anything',
      'clad quarter value',
      'copper nickel clad coin',
    ],
    notes: [
      'The United States moved dimes and quarters to clad in 1965 and half dollars fully to clad in 1971, specifically to remove the silver, and the composition has not changed since.',
      'The exceptions are narrow and worth knowing rather than hoping for: genuine mint errors, uncirculated rolls of a scarce year, and a handful of low-mintage issues that never circulated. A worn clad coin from a jar is none of those.',
    ],
    meltDriven: false,
  },
  {
    slug: 'steel',
    name: 'Steel',
    seoTitle: 'Steel Coin Values: Wartime and Modern Issues',
    bluf: 'Steel coins were struck when the usual metal was needed elsewhere, most famously the 1943 United States steel cent, and their value comes from collector interest in that story rather than from the steel.',
    description:
      'Steel coins, including the 1943 US steel cent and modern plated-steel circulating coinage. What matters here is collector interest, not metal.',
    primaryKeyword: 'steel coin value',
    /*
     * No `faqQuestion` here. It was written by hand as "Are steel coins worth
     * anything?" while this group had no coins in it, and the generator now
     * produces that exact string from the group's own name -- because the 1943
     * cent arrived and the group became populated. A hand-written field that
     * matches the generated one is a second place for one sentence to drift
     * from, which is what `validateCatalogCopy()` throws on.
     */
    secondaryKeywords: ['1943 steel penny value', '1943 silver penny'],
    notes: [
      'Steel appears in coinage for one of two reasons: wartime shortage, or modern cost-cutting with a plated core. Neither produces a coin with metal value. The 1943 United States cent is in this group and is the coin most often brought to a dealer by someone who believes they have found silver.',
    ],
    meltDriven: false,
  },
  {
    slug: 'platinum',
    name: 'Platinum',
    bluf: 'A platinum coin is worth its actual platinum weight multiplied by the spot platinum price, plus a bullion premium that is usually wider than gold’s because the market is thinner.',
    description:
      'Platinum coin values by denomination and format, with the actual platinum weight of each issue and the years each was struck.',
    primaryKeyword: 'platinum coin values',
    secondaryKeywords: ['platinum eagle value', 'platinum bullion coin price'],
    notes: [
      'Platinum coinage is almost entirely modern bullion, so the arithmetic is simple and the spread is not. Expect a wider gap between what a dealer pays and what a dealer charges than on the equivalent gold coin.',
    ],
    meltDriven: true,
  },
  {
    slug: 'bi-metallic',
    name: 'Bi-metallic',
    bluf: 'Bi-metallic circulating coins -- a ring of one alloy around a centre of another -- are worth face value in worn condition, because both alloys are base metals chosen for cost.',
    description:
      'Bi-metallic coins by denomination and date. The two-tone construction is an anti-counterfeiting measure, not a precious-metal one, and these are worth face value circulated.',
    primaryKeyword: 'bi-metallic coin value',
    secondaryKeywords: ['two tone coin value', 'bimetallic coin worth'],
    notes: [
      'The two-tone look reads as valuable and almost never is. The construction exists because it is hard to counterfeit and easy for a vending machine to recognise, and both alloys involved are base metals.',
    ],
    meltDriven: false,
  },
  {
    slug: 'other',
    name: 'Other compositions',
    h1: 'Other Coin Compositions',
    seoTitle: 'Other Coin Composition Values: What They Are Made Of',
    bluf: 'Coins struck in aluminium, brass, zinc, iron and other minor alloys are worth face value or less as metal, so their value is collector interest alone.',
    description:
      'Coins in compositions outside the main groups: aluminium, brass, zinc, iron and other minor alloys. Metal value is negligible; collector demand is the whole story.',
    primaryKeyword: 'coin composition value',
    faqQuestion: 'What is a coin made of an unusual metal worth?',
    secondaryKeywords: ['aluminium coin value', 'brass coin value', 'zinc coin value'],
    notes: [
      'A catch-all, on purpose. It exists so that an unusual coin has somewhere honest to sit rather than being filed under a metal it is not made of.',
    ],
    meltDriven: false,
  },
];

/* ===========================================================================
   Denominations and formats
   =========================================================================== */

export const TYPES: CoinType[] = [
  {
    slug: 'cent',
    name: 'Cent',
    namePlural: 'Cents',
    bluf: 'Cents are worth one cent unless the date, mint mark or a known variety says otherwise, and that is true of the overwhelming majority of them.',
    primaryKeyword: 'cent value',
    secondaryKeywords: ['penny value', 'one cent coin worth', 'old penny worth'],
    faceNote: '$0.01 in the United States; the smallest circulating unit in most decimal currencies.',
  },
  {
    slug: 'nickel',
    name: 'Nickel',
    namePlural: 'Nickels',
    bluf: 'A United States nickel is worth five cents unless it is a 1942-1945 wartime issue, which contains 35% silver, or a scarce early date.',
    primaryKeyword: 'nickel value',
    secondaryKeywords: ['five cent coin value', 'jefferson nickel worth'],
    faceNote: '$0.05.',
  },
  {
    slug: 'dime',
    name: 'Dime',
    namePlural: 'Dimes',
    bluf: 'A United States dime dated 1964 or earlier is 90% silver and worth several dollars in metal alone; a dime dated 1965 or later is clad and worth ten cents.',
    primaryKeyword: 'dime value',
    secondaryKeywords: ['silver dime value', 'ten cent coin worth', 'old dime worth'],
    faceNote: '$0.10.',
  },
  {
    slug: 'quarter',
    name: 'Quarter',
    namePlural: 'Quarters',
    bluf: 'A United States quarter dated 1964 or earlier is 90% silver and worth many times face value in metal; a quarter dated 1965 or later is clad and worth twenty-five cents.',
    primaryKeyword: 'quarter value',
    secondaryKeywords: [
      'silver quarter value',
      'quarter worth money',
      'twenty five cent coin value',
    ],
    faceNote: '$0.25.',
  },
  {
    slug: 'half-dollar',
    name: 'Half dollar',
    namePlural: 'Half dollars',
    bluf: 'United States half dollars dated 1964 and earlier are 90% silver, those dated 1965 to 1970 are 40% silver, and those dated 1971 and later are clad and worth fifty cents.',
    primaryKeyword: 'half dollar value',
    secondaryKeywords: ['kennedy half dollar value', 'silver half dollar worth', '50 cent coin value'],
    faceNote: '$0.50.',
  },
  {
    slug: 'dollar',
    name: 'Dollar',
    namePlural: 'Dollars',
    bluf: 'A large United States dollar coin dated 1935 or earlier is 90% silver and worth its metal at minimum; modern dollar coins are base metal and worth one dollar.',
    primaryKeyword: 'dollar coin value',
    secondaryKeywords: ['silver dollar value', 'one dollar coin worth', 'large dollar coin'],
    faceNote: '$1.00, or one unit of the issuing currency.',
  },
  {
    slug: 'half-crown',
    name: 'Half crown',
    namePlural: 'Half crowns',
    bluf: 'A British half crown dated 1946 or earlier contains silver -- .925 fine before 1920 and .500 fine from 1920 to 1946 -- while 1947 and later issues are cupronickel and carry none.',
    primaryKeyword: 'half crown value',
    secondaryKeywords: ['british half crown silver', 'two shillings and sixpence value'],
    faceNote: 'Two shillings and sixpence, one eighth of a pound, withdrawn in 1970.',
  },
  {
    slug: 'bullion',
    name: 'Bullion coin',
    namePlural: 'Bullion coins',
    bluf: 'A bullion coin is bought for its metal, so its value is the stated metal weight multiplied by the spot price, plus a premium of a few percent -- the face value stamped on it is legal fiction and always far below the metal.',
    primaryKeyword: 'bullion coin value',
    secondaryKeywords: ['gold eagle value', 'silver bullion coin price', 'one ounce coin worth'],
    faceNote:
      'Nominal only. A one-ounce American Gold Eagle is legal tender for $50 and has never been worth anything close to that.',
  },
];

/* ===========================================================================
   Tags
   =========================================================================== */

export const TAGS: Tag[] = [
  {
    slug: 'washington-quarter',
    name: 'Washington quarter',
    kind: 'series',
    // No h1 and no faqQuestion: "Washington Quarter Values by Year" and "Which
    // Washington quarters are silver?" are what catalog-copy.ts generates for a
    // series whose `compositions` change mid-run.
    seoTitle: 'Washington Quarter Value: Silver Years and Dates',
    bluf: 'Washington quarters dated 1932 to 1964 are 90% silver and worth many times face value; those dated 1965 and later are copper-nickel clad and worth twenty-five cents, apart from the silver proofs sold in collector sets since 1992.',
    description:
      'The Washington quarter by year and mint mark: the 1932-1964 silver issues, the clad issues from 1965, and the silver proofs sold in sets since 1992.',
    primaryKeyword: 'washington quarter value',
    notes: [
      'The Washington quarter is the coin most often picked out of a jar with the question attached, and the answer turns almost entirely on one digit. The United States stopped putting silver in the quarter after 1964, so a 1964 and a 1965 look almost identical, weigh nearly the same, and differ in value by more than an order of magnitude.',
      'The exception is worth knowing before you weigh anything, because it is the one case where the date does not decide the metal. Since 1992 the Mint has sold a silver proof set each year containing a quarter struck in 90% silver, and since 2019 in 99.9% silver \u2014 so a quarter dated 1999 or 2015 or 2021 can be silver after all. Those coins carry an S, were never in circulation, and came in a hard plastic case rather than a jar. A silver proof also weighs more than the clad coin of the same date, not less: 6.25 grams for the 90% issues and 6.343 for the 99.9% ones, against 5.67 for the quarter from the roll.',
    ],
    series: {
      years: { from: 1932 },
      mints: [
        {
          city: 'Philadelphia',
          mark: '',
          years: [{ from: 1932, to: 1979 }],
          note: 'No mint mark until 1980',
        },
        {
          city: 'Philadelphia',
          mark: 'P',
          years: [{ from: 1980 }],
          note: 'The P was first used on the quarter in 1980',
        },
        { city: 'Denver', mark: 'D', years: [{ from: 1932 }] },
        {
          city: 'San Francisco',
          mark: 'S',
          /*
           * Two spans, and the gap between them is the point. San Francisco
           * struck quarters for circulation to 1954, struck none at all from
           * 1955 to 1967, and has struck proofs every year since 1968. A single
           * range claims one of two false things -- that it never stopped, or
           * that it never started again -- and a reader turning a 1960-S over
           * looking for a coin that was never made is who pays for it.
           */
          years: [
            { from: 1932, to: 1954 },
            { from: 1968 },
          ],
          note: 'Circulation strikes to 1954, proofs from 1968, and uncirculated coins sold in Mint rolls and bags from 2012',
        },
        {
          city: 'West Point',
          mark: 'W',
          years: [{ from: 2019, to: 2020 }],
          note: 'Two million of each reverse design in 2019 and again in 2020, released into circulation deliberately. West Point also struck quarters in 1977-1979 and marked none of them, so those carry no W.',
        },
      ],
      mintMarkLocation:
        'On the reverse of every silver quarter, below the wreath beneath the eagle and just above the ER of QUARTER. It moved to the obverse, to the right of Washington\u2019s neck, in 1968. Quarters dated 1965, 1966 and 1967 carry no mint mark at all \u2014 the Mint dropped them nationwide to discourage hoarding during the coin shortage. On any other date up to 1979, no mark means Philadelphia; from 1980 Philadelphia marks its own quarters with a P, so a blank space on a modern quarter is not a Philadelphia coin but a coin worth looking at twice.',
      denomination: 'quarter',
      country: 'United States',
      tags: ['us-coin'],
      // Where the mark sits, by era, for the generated identification
      // checklists. `mintMarkLocation` above is the prose version for a
      // reader; this is the same knowledge a generator can pick one of.
      markPositions: [
        {
          years: { from: 1932, to: 1964 },
          where: 'on the reverse, below the wreath beneath the eagle and just above the ER of QUARTER',
        },
        {
          years: { from: 1968 },
          where: 'on the obverse, to the right of Washington\u2019s neck \u2014 not on the reverse, where the silver issues carry it',
        },
      ],
      proofOnly: {
        mark: 'S',
        years: { from: 1968 },
        note: 'San Francisco struck quarters of this date as proofs only, sold in collector sets, so an S here means a proof rather than a coin that was ever in a till.',
      },
      mintSetsFrom: 1947,
      /*
       * The timeline: ordered, gapless, and what the series page reads out as
       * "the metal changed partway through the run".
       *
       * The clad era is split THREE ways and the metal is identical across all
       * three, which looks like a mistake and is not. An era carries the
       * reverse and the obverse as well as the alloy, and those changed twice
       * inside it: the eagle gave way to the commemorative reverses in 1999,
       * and the Flanagan portrait gave way to the Crawford one in 2022. Without
       * the split, every page from 1999 on would have told a reader to look for
       * a heraldic eagle on a coin that has a state, a national park or a
       * portrait on the back of it -- on a hundred and thirty pages.
       *
       * The GROUP stays `clad` across all three, which is what keeps the split
       * invisible in the URLs. A coin's group is its path and a slug is never
       * changed once published.
       */
      compositions: [
        {
          years: { from: 1932, to: 1964 },
          composition: '90% silver, 10% copper',
          group: 'silver',
          specs: { weightGrams: 6.25, diameterMm: 24.3, silverOzt: 0.1808, faceValue: '$0.25' },
          obverse: 'George Washington, facing left',
          reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
          edgeLooks: 'a uniform silver-grey edge',
          tags: ['90-percent-silver'],
        },
        {
          years: { from: 1965, to: 1998 },
          composition: 'Copper-nickel clad over a copper core',
          group: 'clad',
          specs: { weightGrams: 5.67, diameterMm: 24.3, faceValue: '$0.25' },
          obverse: 'George Washington, facing left',
          reverse: 'Heraldic eagle, wings spread, on a bundle of arrows',
          edgeLooks: 'a copper-coloured stripe running round the edge',
          tags: ['clad-coinage'],
        },
        {
          years: { from: 1999, to: 2021 },
          composition: 'Copper-nickel clad over a copper core',
          group: 'clad',
          specs: { weightGrams: 5.67, diameterMm: 24.3, faceValue: '$0.25' },
          obverse: 'George Washington, facing left',
          reverse:
            'A commemorative design that changes several times a year \u2014 a state or territory to 2009, a national park or site to 2021, and Washington crossing the Delaware in 2021',
          edgeLooks: 'a copper-coloured stripe running round the edge',
          tags: ['clad-coinage'],
        },
        {
          /*
           * Open-ended, and the era is described by what has not changed rather
           * than by the programme running inside it. The American Women designs
           * ran 2022-2025 and the Semiquincentennial ones began in 2026, but the
           * obverse, the alloy and the fact of a reverse that changes several
           * times a year are true across both -- and an era ending in 2025 would
           * close the series' own run, which has not ended. The catalogue
           * stopping at 2025 is a fact about the catalogue.
           */
          years: { from: 2022 },
          composition: 'Copper-nickel clad over a copper core',
          group: 'clad',
          specs: { weightGrams: 5.67, diameterMm: 24.3, faceValue: '$0.25' },
          obverse:
            'George Washington, facing right \u2014 the Laura Gardin Fraser portrait, which replaced the Flanagan one in 2022',
          reverse: 'A commemorative design that changes several times a year',
          edgeLooks: 'a copper-coloured stripe running round the edge',
          tags: ['clad-coinage'],
        },
      ],
      /*
       * The silver proofs, which are not on the timeline: San Francisco has
       * struck one alongside the clad quarter of the same date every year since
       * 1992, so 1999 is both clad and silver and the date cannot decide which.
       * See `finishCompositions` in the schema for why they are kept apart.
       */
      finishCompositions: [
        {
          years: { from: 1992, to: 2018 },
          composition: '90% silver, 10% copper',
          group: 'silver',
          specs: { weightGrams: 6.25, diameterMm: 24.3, silverOzt: 0.1808, faceValue: '$0.25' },
          obverse: 'George Washington, facing left',
          reverse: 'The commemorative design of its year, struck as a proof',
          edgeLooks: 'a uniform silver-grey edge',
          tags: ['90-percent-silver'],
        },
        {
          /*
           * .999 fine from 2019, and HEAVIER than the 90% coin it replaced
           * rather than lighter: the dimensions did not change, and pure silver
           * is denser than the 90/10 alloy, so the same disc weighs 6.343 grams
           * instead of 6.25. Verified against the Mint's announcement through
           * CoinNews and FindBullionPrices (6.343 g, .203 troy oz) and against
           * Numista's specification (6.34 g, .999). The silver content here is
           * derived from the weight and the fineness like every other figure on
           * this site: 6.343 x 0.999 / 31.1035 = 0.2037.
           */
          years: { from: 2019 },
          composition: '99.9% silver',
          group: 'silver',
          specs: { weightGrams: 6.343, diameterMm: 24.3, silverOzt: 0.2037, faceValue: '$0.25' },
          obverse: 'George Washington, facing left to 2021 and facing right from 2022',
          reverse: 'The commemorative design of its year, struck as a proof',
          edgeLooks: 'a uniform silver-grey edge',
          tags: ['90-percent-silver'],
        },
      ],
      designer: 'John Flanagan',
      // Where this design wears, for the grade pages. See grades.ts: a grade
      // description is generated from the grade AND these, so "Extremely Fine"
      // names the hair above the ear rather than the Sheldon scale.
      wear: {
        obverse: 'the high points of Washington\u2019s hair above and behind the ear',
        reverse: 'the eagle\u2019s breast and the tops of its wings',
        legend: 'LIBERTY, IN GOD WE TRUST and the date',
        detail: 'the eagle\u2019s individual breast and leg feathers',
        // No appositive. Every slot here is dropped into the MIDDLE of a
        // generated sentence, so a comma-led gloss reads as a splice wherever
        // it lands: "marks so small that Washington's cheek and jaw, the
        // largest open fields on the coin survive inspection" shipped on all
        // seventy-five MS65 pages. A plain plural noun phrase, as the rule
        // above `WearPoints` says, and the fact about field size goes in the
        // phrase rather than after it.
        lustre: 'the open fields of Washington\u2019s cheek and jaw',
      },
      obverse:
        'George Washington \u2014 the John Flanagan portrait facing left to 2021, and the Laura Gardin Fraser portrait facing right from 2022',
      reverse: 'Heraldic eagle on a bundle of arrows, 1932\u20131998; commemorative designs from 1999',
      edge: 'Reeded',
      keyDates: [
        {
          label: '1932-D',
          mintage: 436800,
          why: 'The lowest Denver mintage in the series, struck in the first year and in the worst of the Depression, when almost nobody was putting coins aside.',
        },
        {
          label: '1932-S',
          mintage: 408000,
          why: 'A smaller mintage still than the 1932-D, but more of them were saved, so it is usually the cheaper of the two first-year keys in worn condition.',
        },
      ],
      varieties: [
        {
          label: '1934 doubled die obverse',
          lookFor: 'Doubling on the motto IN GOD WE TRUST, strongest on the word TRUST.',
          caution: 'Philadelphia only. A 1934-D quarter has no equivalent variety.',
        },
        {
          label: '1937 doubled die obverse',
          lookFor: 'Doubling on IN GOD WE TRUST and on LIBERTY.',
          caution:
            'Ordinary 1937 quarters often show machine doubling, which is worth nothing. A true doubled die is raised and rounded; machine doubling is flat and shelf-like.',
        },
        {
          label: '1942-D doubled die obverse',
          lookFor: 'Doubling on IN GOD WE TRUST, on a quarter carrying a D on the reverse.',
        },
        {
          label: '1943-S doubled die obverse',
          lookFor: 'Strong doubling on both IN GOD WE TRUST and LIBERTY, with an S on the reverse.',
        },
        {
          label: '1950-D over S and 1950-S over D',
          lookFor:
            'One mint mark punched over the other on the reverse, showing under magnification as the remains of the wrong letter underneath.',
        },
        {
          label: '2004-D Wisconsin extra leaf',
          lookFor:
            'An extra leaf on the ear of corn on the reverse of the Wisconsin state quarter, in either a high or a low position. Denver only.',
          caution:
            'Scratches and die gouges on ordinary Wisconsin quarters are taken for this constantly. The extra leaf is a raised, leaf-shaped feature, not a line.',
        },
      ],
      errors: [
        {
          label: '1965 quarter on a silver planchet',
          what: 'Silver blanks left over from 1964 struck in the first year of the clad quarter, after surviving the changeover in the tote bags the mint stored blanks in.',
          check:
            'Weigh it, then look at the edge. A silver quarter weighs 6.25 g and has a plain silver-grey edge; a clad one weighs 5.67 g and shows a copper stripe running round it.',
          known: 'At least a dozen, and the same mistake is known on a 1966.',
          caution:
            'Every ordinary 1965 quarter looks silver on its faces, because the outer layer is copper-nickel and that is what silver-coloured means here. The edge is the tell, and a worn clad quarter can still hide its stripe under grime \u2014 so the scale settles it, not the eye.',
        },
      ],
    },
  },
  {
    slug: 'mercury-dime',
    name: 'Mercury dime',
    kind: 'series',
    seoTitle: 'Mercury Dime Value: Silver Content and Key Dates',
    bluf: 'Every Mercury dime, struck from 1916 to 1945, is 90% silver and contains 0.0723 troy ounces of silver, so even the most common date in worn condition is worth its metal several times over.',
    description:
      'The Mercury dime: silver content, mint marks and the dates that carry a premium over metal. All 1916-1945 issues are 90% silver.',
    primaryKeyword: 'mercury dime value',
    faqQuestion: 'Which Mercury dimes are worth more than their silver?',
    notes: [
      'The Mercury dime is the friendliest series for someone with no grading vocabulary, because there is no date in it worth only ten cents. The silver alone settles that.',
      'One term is worth learning here, because it moves prices more than anything else in the series: Full Bands. The reverse carries a bundle of rods bound by two horizontal bands, and on a sharply struck coin the two lines of each band are fully separated rather than merged. Dealers write it FB, grading services certify it, and the same date can be worth several times as much with the designation as without it. It is a question of how well the coin was struck, not how little it was worn, so a heavily circulated dime cannot have it.',
    ],
    series: {
      years: { from: 1916, to: 1945 },
      mints: [
        /*
         * Three holes, and they belong to the DECADE rather than to any one
         * mint: no dimes at all were struck in 1922, 1932 or 1933. 1922 is the
         * year the Pittman Act silver went into dollars instead, and 1932-1933
         * is the bottom of the Depression, when enough dimes were already in
         * circulation for the Mint to strike none. So all three mints carry the
         * same three spans.
         *
         * THE PER-MINT HOLES ARE DELIBERATELY NOT HERE, and that is the
         * opposite of what it looks like. There is no 1923-D, no 1930-D, no
         * 1921-S and no 1934-S -- and cutting those years out of the spans is
         * what STOPS the site saying so. `Mint.years` is read by exactly one
         * thing, `plausibleMint` in `coin-copy.ts`, and it asks whether a mint
         * is one a reader might plausibly be hunting a letter for: the
         * checklist prints "There is no 1923-D" only where the mint was working
         * on the series around that date and the sources attest no such coin.
         * Narrow the span to the dates actually struck and the two tests can
         * never both pass, so the sentence never prints -- on the four pages in
         * this series where it is worth the most.
         *
         * Whether the coin EXISTS is a different question with a different
         * answer, and the generator asks the `attested` list in
         * `data/mintages.json` rather than this field. The per-mint holes are
         * in each mint's `note`, which is where a reader meets them.
         */
        {
          city: 'Philadelphia',
          mark: '',
          years: [
            { from: 1916, to: 1921 },
            { from: 1923, to: 1931 },
            { from: 1934, to: 1945 },
          ],
        },
        {
          city: 'Denver',
          mark: 'D',
          years: [
            { from: 1916, to: 1921 },
            { from: 1923, to: 1931 },
            { from: 1934, to: 1945 },
          ],
          note: 'No 1923-D and no 1930-D: Denver struck no dimes at all in either year',
        },
        {
          city: 'San Francisco',
          mark: 'S',
          years: [
            { from: 1916, to: 1921 },
            { from: 1923, to: 1931 },
            { from: 1934, to: 1945 },
          ],
          note: 'No 1921-S and no 1934-S',
        },
      ],
      mintMarkLocation:
        'On the reverse, to the left of the base of the fasces. No mark at all means Philadelphia.',
      denomination: 'dime',
      country: 'United States',
      tags: ['us-coin'],
      /*
       * One era: the mark never moved in thirty years, and Philadelphia never
       * used one on this series at all.
       */
      markPositions: [
        {
          years: { from: 1916, to: 1945 },
          where: 'on the reverse, to the left of the base of the fasces, below and left of the olive branch',
        },
      ],
      /*
       * One era, one alloy, one pair of designs, for the whole run -- which is
       * the simplest shape this field takes and the reason the Mercury dime is
       * a good second silver series.
       *
       * The silver content is the weight times the fineness, like every other
       * figure on this site: 2.5 x 0.90 / 31.1035 = 0.0723. It is not the
       * published ASW, which is somebody else's arithmetic. The same standard
       * carried the Barber dime before it and the Roosevelt dime to 1964, which
       * is why one `silver-dime` melt row covers all three.
       */
      compositions: [
        {
          years: { from: 1916, to: 1945 },
          composition: '90% silver, 10% copper',
          group: 'silver',
          specs: { weightGrams: 2.5, diameterMm: 17.9, silverOzt: 0.0723, faceValue: '$0.10' },
          obverse:
            'Liberty facing left in a winged cap, with LIBERTY around her and the date below',
          reverse:
            'A fasces bound with cord and topped with an axe blade, an olive branch across it, with ONE DIME below',
          edgeLooks: 'a uniform silver-grey edge',
          tags: ['90-percent-silver'],
        },
      ],
      designer: 'Adolph A. Weinman',
      /*
       * Where this design wears, for the grade pages. Every slot is a PLURAL
       * noun phrase with no appositive: each one is dropped into the middle of
       * a generated sentence, on every grade page of the series.
       *
       * `detail` names the bands deliberately. They are what the whole series
       * is graded and priced on -- a dime with the two lines of the centre band
       * fully separated is designated Full Bands and can be worth several times
       * one without -- so the slot that describes the fine detail surviving at
       * the top of the ladder is the slot where a reader meets them.
       */
      wear: {
        obverse: 'the high points of the wing and the hair above Liberty’s ear',
        reverse: 'the horizontal bands across the middle of the fasces and the tops of its rods',
        legend: 'LIBERTY around the cap, the date, and the designer’s AW below the neck',
        detail:
          'the two separate lines of each horizontal band and the individual leaves of the olive branch',
        lustre: 'the open fields of Liberty’s cheek and the neck below the cap',
      },
      obverse:
        'Liberty in a winged cap \u2014 the wings stand for freedom of thought, and are the reason the coin has been misnamed after Mercury for a century',
      reverse: 'A fasces with an olive branch across it',
      edge: 'Reeded',
      keyDates: [
        {
          label: '1916-D',
          mintage: 264000,
          why: 'The key to the series by a wide margin. Denver struck dimes for only part of 1916 before its presses were turned over to quarters, and no other date comes close to this mintage.',
        },
        {
          label: '1921-D',
          mintage: 1080000,
          why: 'Struck in a recession year when almost no new dimes were needed, and scarce in every grade rather than only in high ones.',
        },
        {
          label: '1921',
          mintage: 1230000,
          why: 'The Philadelphia half of the same low-demand year, and the second-hardest date to find worn.',
        },
        {
          label: '1926-S',
          mintage: 1520000,
          why: 'A low mintage that also circulated hard, so survivors in better than well-worn condition are genuinely difficult to find.',
        },
      ],
      varieties: [
        {
          label: '1942 over 1 overdate',
          lookFor:
            'The top of a 1 showing inside the 2 of the date. It exists from Philadelphia, and separately from Denver as 1942/1-D.',
          caution:
            'Among the most valuable Mercury dimes and among the most frequently faked. Worth having authenticated before it is worth anything.',
        },
        {
          label: '1945 micro S',
          lookFor: 'A noticeably smaller S mint mark on the reverse of a 1945 San Francisco dime.',
        },
      ],
    },
  },
  {
    slug: 'lincoln-cent',
    name: 'Lincoln cent',
    kind: 'series',
    seoTitle: 'Lincoln Cent Value: Key Dates and Mintages',
    bluf: 'Almost every Lincoln cent is worth one cent, and the handful that are not are identified by a specific year and mint mark rather than by how old or how worn the coin looks.',
    description:
      'The Lincoln cent by year and mint mark, including the key dates and the 1943 steel issue. Most are worth face value; this page says which are not.',
    primaryKeyword: 'lincoln cent value',
    faqQuestion: 'Which Lincoln cents are worth money?',
    notes: [
      'The Lincoln cent has run since 1909 and is the most heavily minted coin in United States history, which is the reason almost none of them are scarce. Age is not the variable here. A specific combination of year, mint mark and variety is.',
      'It is also the series where the metal changed most often, and where the metal is worth the least. Five compositions in a hundred and fifteen years, none of them containing anything precious: the table below is there to tell you what your cent is made of, not what the alloy is worth.',
    ],
    series: {
      years: { from: 1909 },
      mints: [
        { city: 'Philadelphia', mark: '' },
        { city: 'Denver', mark: 'D', years: [{ from: 1911 }] },
        {
          city: 'San Francisco',
          mark: 'S',
          note: 'Circulation strikes to 1974, proof cents from 1968',
        },
      ],
      mintMarkLocation: 'On the obverse, below the date. No mark at all means Philadelphia.',
      compositions: [
        {
          years: { from: 1909, to: 1942 },
          composition: '95% copper with tin and zinc (bronze)',
          group: 'copper',
        },
        { years: { from: 1943, to: 1943 }, composition: 'Zinc-coated steel', group: 'steel' },
        {
          years: { from: 1944, to: 1946 },
          composition: '95% copper brass, made largely from recovered shell cases',
          group: 'copper',
        },
        {
          years: { from: 1947, to: 1982 },
          composition: '95% copper, 5% tin and zinc',
          group: 'copper',
        },
        {
          years: { from: 1982 },
          composition: 'Copper-plated zinc, 97.5% zinc under a thin copper skin',
          group: 'other',
        },
      ],
      designer: 'Victor David Brenner',
      obverse:
        'Abraham Lincoln facing right \u2014 the first circulating United States coin to carry a real person',
      reverse:
        'Two wheat ears, 1909\u20131958; the Lincoln Memorial, 1959\u20132008; four scenes from Lincoln\u2019s life in 2009; a union shield from 2010',
      edge: 'Plain',
      keyDates: [
        {
          label: '1909-S VDB',
          mintage: 484000,
          why: 'The first year, from the smallest mint, with the designer\u2019s initials on the reverse before public complaint had them removed. The most famous date in United States coinage and the most counterfeited.',
        },
        {
          label: '1914-D',
          mintage: 1193000,
          why: 'A genuinely low Denver mintage in a year nobody was saving cents, and the hardest date of the run to find undamaged.',
        },
        {
          label: '1931-S',
          mintage: 866000,
          why: 'Struck at the bottom of the Depression when demand for cents collapsed. Widely hoarded at the time, so it is scarce but rarely worn.',
        },
        {
          label: '1909-S',
          mintage: 1825000,
          why: 'The same first year without the initials, and scarce on mintage alone.',
        },
      ],
      varieties: [
        {
          label: '1922 no D',
          lookFor:
            'A 1922 cent with no mint mark at all. Denver struck every cent made that year, so the mark is missing because the die was worn or over-polished, not because Philadelphia made it.',
          caution:
            'Only one of the die pairs is collectable, and a mint mark removed with a tool is the usual explanation for a coin found in a jar. This one needs authenticating.',
        },
        {
          label: '1955 doubled die obverse',
          lookFor:
            'Dramatic doubling of the date, LIBERTY and IN GOD WE TRUST, clear to the naked eye with no magnification at all.',
          caution:
            'If it needs a loupe, it is not this variety. The 1955 doubled die is obvious, which is why anything subtle on a 1955 cent is machine doubling.',
        },
        {
          label: '1969-S doubled die obverse',
          lookFor: 'Strong doubling of the date and the lettering on a San Francisco cent.',
          caution:
            'Machine doubling on 1969-S cents is common and worthless. Genuine examples are rare enough that the Secret Service once seized them as counterfeits.',
        },
        {
          label: '1972 doubled die obverse',
          lookFor: 'Clear doubling of the date and the mottoes on a Philadelphia cent.',
        },
        {
          label: '1995 doubled die obverse',
          lookFor: 'Doubling on LIBERTY and on IN GOD WE TRUST, visible with a loupe.',
        },
        {
          label: '1982 large date and small date',
          lookFor:
            'The height and spacing of the digits. On the large date the 2 has a flat base and the date is noticeably taller; on the small date the digits are shorter and more rounded.',
          caution:
            'Seven different cents were struck in 1982, across two date sizes and two metals, and six of the seven are ordinary. The date size alone does not make one scarce \u2014 the metal decides that, and a scale reads the metal.',
        },
      ],
      errors: [
        {
          label: '1943 bronze cent',
          what: 'A bronze blank left over from 1942 fed into a press that was striking the wartime steel cent.',
          check:
            'A magnet, then a scale. A genuine bronze 1943 cent is not magnetic and weighs 3.11 g; the steel cent it was struck alongside is magnetic and weighs 2.7 g.',
          known: 'About twenty across the three mints, of which one is the 1943-D and five or so are 1943-S.',
          caution:
            'Nearly every copper-coloured 1943 cent is an ordinary steel cent that has been copper-plated, and it sticks to a magnet. The next most common is a 1948 with the 8 tooled into a 3, so the shape of the 3 is worth comparing against an ordinary 1943 before anything else.',
        },
        {
          label: '1944 steel cent',
          what: 'The same mistake in reverse: a steel blank left over from 1943 struck in the 1944 bronze run.',
          check:
            'The magnet again, the other way round. A genuine 1944 steel cent is magnetic and weighs about 2.7 g, where an ordinary 1944 cent is bronze, not magnetic, and weighs 3.11 g.',
          known: 'Twenty-five to thirty from Philadelphia, seven from Denver, two from San Francisco.',
          caution:
            'A 1944 cent that looks silver and is not magnetic has been plated or dipped. Cents were plated for jewellery and for school projects in large numbers, and the result is convincing to the eye and not to a magnet.',
        },
        {
          label: '1982-D small date in bronze',
          what: 'A bronze blank struck after the cent had changed to copper-plated zinc partway through 1982.',
          check:
            'Weigh it. Bronze is 3.11 g and copper-plated zinc is 2.5 g, a gap any kitchen scale reading hundredths of a gram will show without ambiguity.',
          known: 'Two confirmed.',
          caution:
            'A 1982-D small date weighing 2.5 g is an ordinary cent, and almost all of them do. This is the one 1982 combination worth weighing, not a reason to weigh the other six.',
        },
      ],
    },
  },
  {
    slug: 'morgan-dollar',
    name: 'Morgan dollar',
    kind: 'series',
    seoTitle: 'Morgan Silver Dollar Value: Dates and Mint Marks',
    bluf: 'Every Morgan dollar struck between 1878 and 1921 contains 0.7734 troy ounces of silver, and date, mint mark and condition decide how far above that metal floor a given coin sits.',
    description:
      'The Morgan silver dollar: silver content, mint marks and the dates that carry a large premium over metal.',
    primaryKeyword: 'morgan silver dollar value',
    faqQuestion: 'Which Morgan dollar dates and mint marks are scarce?',
    notes: [
      'The Morgan dollar is the most collected United States coin series, which cuts both ways: demand is deep, and so is supply. Common dates in worn condition trade close to their silver content, while the scarce mint marks are among the best-known rarities in American coinage.',
      'The series is also mapped in more detail than any other. Collectors catalogue Morgan dollars by die pairing under a numbering system called VAM, after Van Allen and Mallis, and a handful of those pairings carry premiums far above the ordinary coin of the same date. The ones listed below are those visible without a specialist reference; there are well over a thousand more, and attributing them is a specialty with its own literature.',
      'One caution about the date: the United States Mint revived the Morgan dollar in 2021, and those coins are 99.9% silver rather than 90%, contain more silver than the originals, and are modern collectables sold at a premium. Everything on this page refers to the 1878\u20131921 series.',
    ],
    series: {
      years: { from: 1878, to: 1921 },
      mints: [
        /*
         * Every mint of this series has the same gap in it: the Mint struck no
         * Morgan dollars at all from 1905 to 1920, and struck them again for
         * one year in 1921. Philadelphia and San Francisco therefore carry two
         * ranges apiece, Carson City carries its own two, and New Orleans had
         * closed before the revival.
         */
        {
          city: 'Philadelphia',
          mark: '',
          years: [
            { from: 1878, to: 1904 },
            { from: 1921, to: 1921 },
          ],
        },
        {
          city: 'Carson City',
          mark: 'CC',
          /*
           * Two spans, like San Francisco on the quarter and for the same
           * reason. Carson City struck dollars from 1878 to 1885, struck none
           * at all in 1886, 1887 and 1888 while the mint was shut, and struck
           * them again from 1889 to 1893. One range tells a reader an 1887-CC
           * exists, and the coin it sends them looking for was never made.
           */
          years: [
            { from: 1878, to: 1885 },
            { from: 1889, to: 1893 },
          ],
          note: 'The scarcest mint of the series and the one collectors chase',
        },
        { city: 'New Orleans', mark: 'O', years: [{ from: 1879, to: 1904 }] },
        {
          city: 'San Francisco',
          mark: 'S',
          years: [
            { from: 1878, to: 1904 },
            { from: 1921, to: 1921 },
          ],
        },
        { city: 'Denver', mark: 'D', years: [{ from: 1921, to: 1921 }], note: 'One year only' },
      ],
      mintMarkLocation:
        'On the reverse, below the wreath and above the DO of DOLLAR. No mark at all means Philadelphia.',
      denomination: 'dollar',
      country: 'United States',
      tags: ['us-coin'],
      // The generator's version of `mintMarkLocation` above. One era, because
      // the mark never moved in forty-three years.
      markPositions: [
        {
          years: { from: 1878, to: 1921 },
          where: 'on the reverse, below the wreath and above the DO of DOLLAR',
        },
      ],
      /*
       * The two 1878 Philadelphia reverses, which get pages of their own at the
       * owner's decision of 2026-09-22. The only entry of its kind on the site.
       *
       * They were a `varieties` row until then, which is the house rule's
       * default and is right for every other Morgan variety -- the hot lips,
       * the 1900-O over CC, and the five hundred VAM pairings nobody here will
       * ever follow. These two are different in the one way that matters: the
       * mint struck 749,500 coins on the first reverse and 9,759,300 on the
       * second, the sources state those figures separately, and a reader tells
       * them apart by counting feathers. A variety row could say none of that,
       * and the eight-feather coin is the commonest genuinely scarce thing a
       * person finds in an inherited Morgan.
       *
       * The seven-over-eight reverse is NOT here and must not be. Its coins are
       * counted inside the seven-feather figure -- the sources say so in as
       * many words -- so a page for it would either state a mintage it does not
       * have or state one that is already on another page. It stays a variety
       * row, which is what a variety row is for.
       */
      hubs: [
        {
          slug: '8-tail-feathers',
          name: '8 Tail Feathers',
          noun: '8 tail feathers',
          /*
           * IDENTIFICATION ONLY, and no claim about which is scarcer. That
           * clause was here for one afternoon and it was false on half the
           * pages it reached: among the circulation strikes the eight-feather
           * reverse is one coin in fourteen, and among the 1878 proofs it is
           * 500 of 750 and the COMMONER of the two. The bluf derives that
           * comparison from the figures on the page it is on, which is the
           * only place it can be got right.
           */
          identify:
            'Count the tail feathers on the eagle, below the wreath on the reverse. There must be eight. This was the first reverse of the series and it was replaced within months of the coin going into production.',
        },
        {
          slug: '7-tail-feathers',
          name: '7 Tail Feathers',
          noun: '7 tail feathers',
          identify:
            'Count the tail feathers on the eagle, below the wreath on the reverse. There must be seven. This is the replacement reverse, cut after the first months of production and used for the rest of the run.',
        },
      ],
      /*
       * One era, one alloy, one pair of designs. The silver content is the
       * weight times the fineness like every other figure on this site --
       * 26.73 x 0.90 / 31.1035 = 0.7734 -- and not the published ASW, which is
       * somebody else's arithmetic.
       */
      compositions: [
        {
          years: { from: 1878, to: 1921 },
          composition: '90% silver, 10% copper',
          group: 'silver',
          specs: { weightGrams: 26.73, diameterMm: 38.1, silverOzt: 0.7734, faceValue: '$1.00' },
          obverse: 'Liberty facing left in a Phrygian cap, wearing cotton bolls and wheat',
          reverse: 'An eagle with wings spread, holding arrows and an olive branch, within a wreath',
          edgeLooks: 'a uniform silver-grey edge',
          tags: ['90-percent-silver'],
        },
      ],
      designer: 'George T. Morgan',
      // Where this design wears, for the grade pages. Every slot is a PLURAL
      // noun phrase with no appositive: each one is dropped into the middle of
      // a generated sentence, on every grade page of the series.
      wear: {
        obverse: 'the hair above Liberty\u2019s ear and the cotton bolls in her cap',
        reverse: 'the eagle\u2019s breast feathers and the tops of its wings',
        legend: 'LIBERTY on the headband, E PLURIBUS UNUM and the date',
        detail: 'the eagle\u2019s individual wing and breast feathers and the leaves of the wreath',
        lustre: 'the open fields of Liberty\u2019s cheek and neck',
      },
      obverse: 'Liberty facing left in a Phrygian cap, wearing cotton and wheat',
      reverse: 'An eagle with wings spread, holding arrows and an olive branch, within a wreath',
      edge: 'Reeded',
      keyDates: [
        {
          label: '1893-S',
          mintage: 100000,
          why: 'The lowest circulation mintage of the series and the key date in every grade. Most were spent rather than saved, and it is heavily counterfeited by altering a 1893-O or adding an S.',
        },
        {
          label: '1889-CC',
          mintage: 350000,
          why: 'The scarcest Carson City dollar, and the one most often faked, because CC dollars of other dates are common enough to donate a host coin.',
        },
        {
          label: '1894',
          mintage: 110000,
          why: 'The lowest Philadelphia mintage of the series, struck in a year the Mint had almost no silver to work with.',
        },
        {
          label: '1895',
          mintage: 880,
          why: 'Proofs only, as far as anyone can demonstrate: 12,000 circulation strikes were recorded and not one has ever been confirmed. The 880 proofs are the entire surviving date.',
        },
        {
          label: '1892-S',
          mintage: 1200000,
          why: 'Inexpensive worn and one of the great American rarities uncirculated, because essentially the whole mintage went into circulation.',
        },
      ],
      varieties: [
        /*
         * The plain eight-feather and seven-feather reverses are NOT in this
         * list any more: they are catalogue coins with pages of their own, see
         * `hubs` above. Listing them here as well would be the site competing
         * with itself over one subject, which is the same failure the series
         * tag page exists to avoid.
         */
        {
          label: '1878 seven over eight tail feathers',
          lookFor:
            'The tips of the earlier eight feathers showing through beneath the seven, on a first-year Philadelphia dollar.',
        },
        {
          label: '1888-O doubled die obverse, the \u201chot lips\u201d',
          lookFor: 'Heavy doubling on Liberty\u2019s lips, nose and chin, strong enough to read without a loupe.',
        },
        {
          label: '1900-O over CC',
          lookFor: 'The remains of a CC mint mark showing underneath the O on the reverse.',
          caution:
            'The Carson City mint had closed by 1900; this is an old die reused, not a Carson City coin, and it is priced as the variety rather than as a CC dollar.',
        },
        {
          /*
           * The outcome of the 2026-09-22 audit, written down so the next
           * person does not re-open it. These are real coins and they are
           * deliberately not catalogue pages: no mint ever published a figure
           * for one, the published counts are survival estimates or single
           * digits, and the sources do not even agree on which DATES belong --
           * one lists the 1884-CC and 1884-O, another calls those disputed and
           * adds an 1881-O and a 1921-S. Four sources that cannot agree on the
           * list is the exact condition this site refuses to publish through.
           *
           * So it goes here, as one row, which is what a `varieties` row is
           * for: the reader looks at one feature and decides, and the answer
           * they need is "have it authenticated" rather than a figure.
           */
          label: 'Branch-mint proofs, mainly 1879-O, 1883-O and 1893-CC',
          lookFor:
            'Fully mirrored fields, frosted devices and sharp square rims on a coin from New Orleans or Carson City, neither of which sold proofs to collectors.',
          caution:
            'Fewer than a dozen of each are thought to have been struck and the experts disagree about which dates count at all. Ordinary dollars from those mints are often prooflike from fresh dies and look much the same to the eye, so nothing here can be settled by looking; a coin that might be one is worth certifying before it is worth valuing.',
        },
      ],
    },
  },
  {
    /*
     * THE WHEAT PENNY, AND WHY IT IS A TAG OF ITS OWN.
     *
     * The owner's decision. It is worth writing down because it goes against
     * the rule one section up -- `lincoln-cent` is already a registered series
     * tag covering 1909 to today, and "the series page is the series tag page"
     * says one subject gets one URL. The wheat reverse is the first half of
     * that series, not a series beside it, and the Washington quarter is the
     * precedent for keeping every reverse of a run under one tag.
     *
     * What makes it survivable: `lincoln-cent` has no coins and therefore no
     * page, because an archive with nothing on it does not get a URL. So there
     * is exactly one URL for these coins today and the competition is latent
     * rather than live. THE DAY SOMEBODY POPULATES `lincoln-cent` IT STOPS
     * BEING LATENT, and the two tags will both claim every cent dated 1909 to
     * 1958. Whoever does that has to resolve this first: either fold these
     * coins in and retire this tag, or bound `lincoln-cent` to 1959 onward and
     * rename it for what it would then hold.
     */
    slug: 'wheat-penny',
    name: 'Wheat penny',
    kind: 'series',
    seoTitle: 'Wheat Penny Value: Key Dates and Mint Marks',
    bluf: 'Almost every wheat penny is worth a few cents, and the ones that are not are identified by a specific year and mint mark rather than by age or wear -- the 1909-S VDB, the 1914-D and the 1931-S above all.',
    description:
      'The wheat penny, 1909 to 1958: which dates and mint marks are scarce, where the mint mark sits, and the 1943 steel cent.',
    primaryKeyword: 'wheat penny value',
    faqQuestion: 'Which wheat pennies are worth money?',
    notes: [
      'A wheat penny is any Lincoln cent dated 1909 to 1958, named for the two ears of wheat on the reverse. The design was replaced by the Lincoln Memorial in 1959, so the date alone settles whether a cent is one.',
      'Age is not the variable. Billions of wheat pennies were struck and most dates survive in enormous numbers, so a worn common date from 1944 is worth a few cents however old it looks. What carries a premium is a short mintage -- and the three shortest are all identified by reading the date and the mint mark, with no judgement required.',
      'One year is made of something else entirely. Copper was needed for ammunition in 1943, so that year’s cents were struck in zinc-plated steel: they look silver-grey and a magnet picks them up, which no other wheat penny does. A 1943 cent that does NOT stick to a magnet is the famous bronze error and is worth having authenticated; a 1943 steel cent, of which a billion were struck, is worth very little.',
    ],
    series: {
      years: { from: 1909, to: 1958 },
      mints: [
        /*
         * Every range here was read off the source's own tables rather than
         * remembered, and two of them are counter-intuitive enough that it was
         * worth doing: there is NO 1922 Philadelphia cent and NO 1923-D, and
         * San Francisco struck none at all from 1932 to 1934. A single range
         * per mint would put four coins into the world that were never made.
         */
        {
          city: 'Philadelphia',
          mark: '',
          years: [
            { from: 1909, to: 1921 },
            { from: 1923, to: 1958 },
          ],
          note: 'Struck no cents in 1922',
        },
        {
          city: 'Denver',
          mark: 'D',
          years: [
            { from: 1911, to: 1920 },
            { from: 1922, to: 1922 },
            { from: 1924, to: 1958 },
          ],
          note: 'The only mint to strike cents in 1922, and it struck none in 1921 or 1923',
        },
        {
          city: 'San Francisco',
          mark: 'S',
          years: [
            { from: 1909, to: 1921 },
            { from: 1923, to: 1931 },
            { from: 1935, to: 1955 },
          ],
          note: 'Struck no cents from 1932 to 1934, and none after 1955',
        },
      ],
      mintMarkLocation:
        'On the obverse, below the date. No mark at all means Philadelphia.',
      denomination: 'cent',
      country: 'United States',
      tags: ['us-coin'],
      markPositions: [
        { years: { from: 1909, to: 1958 }, where: 'on the obverse, below the date' },
      ],
      /*
       * The 1909 VDB reverse, and the second entry of its kind on this site.
       *
       * The three tests, all passed: the sources state a SEPARATE MINTAGE for
       * it -- 484,000 at San Francisco against 1,825,000 plain, and 27,995,000
       * against 72,702,618 at Philadelphia. A reader tells it apart by READING
       * three letters at the foot of the reverse, with no loupe and no
       * judgement. And four to one is far enough apart to matter: the 1909-S
       * VDB is the key date of the series and the plain 1909-S is an ordinary
       * scarce coin.
       *
       * ONE hub rather than the Morgan's pair, and the difference is in what
       * the sources publish. The Morgan's primary states 1878 Philadelphia as
       * one combined total, so both reverses had to be named to split it and
       * the year keeps a page stating the total. This page never states a 1909
       * total -- it publishes the two reverses in two tables and leaves the
       * addition to the reader -- so the plain reverse simply IS the date, the
       * 1909-S page states 1,825,000, and there is no combined page because no
       * source ever published a combined figure.
       *
       * The initials moved to Lincoln's shoulder in 1918 and stopped being a
       * reverse difference, which is why this is scoped to 1909 and why the
       * 1918-1942 table is a `Plain` design and not a second hub.
       */
      hubs: [
        {
          slug: 'vdb',
          name: 'VDB',
          noun: 'the VDB initials',
          identify:
            'Look at the foot of the reverse, between the wheat ears and below ONE CENT. The designer\u2019s initials V.D.B. are there in small letters. They were removed within weeks of the cent going into production after complaints that they were too prominent, so a 1909 cent either has them or it does not, and no other date in the series does.',
        },
      ],
      /*
       * Four eras, split by ALLOY, and the group changes only once. The 1943
       * steel cent is the one that reaches a URL -- those coins file under
       * `/coin-info/steel/cent/` and every other wheat penny under
       * `/coin-info/copper/cent/`, which is the composition-belongs-to-the-
       * issue rule doing exactly what it does to the 1964 and 1965 quarters.
       *
       * The 1944-1946 brass is a separate era although it files under the same
       * group: it is a different alloy with the tin left out, struck from
       * recovered shell cases, and the timeline is what the series page reads
       * out as "the metal changed partway through the run".
       *
       * No `silverOzt` and no `goldOzt` anywhere here, which is correct and not
       * an omission: a cent contains nothing precious, so every melt page in
       * this series answers "none" and says why.
       */
      compositions: [
        {
          years: { from: 1909, to: 1942 },
          composition: '95% copper, 5% tin and zinc',
          group: 'copper',
          specs: { weightGrams: 3.11, diameterMm: 19.05, faceValue: '$0.01' },
          obverse: 'Abraham Lincoln facing right, with LIBERTY behind him and the date before him',
          reverse: 'Two ears of durum wheat curving up the sides, framing ONE CENT',
          edgeLooks: 'a plain copper-brown edge',
          tags: [],
        },
        {
          years: { from: 1943, to: 1943 },
          composition: 'Zinc-plated steel',
          group: 'steel',
          specs: { weightGrams: 2.7, diameterMm: 19.05, faceValue: '$0.01' },
          obverse: 'Abraham Lincoln facing right, with LIBERTY behind him and the date before him',
          reverse: 'Two ears of durum wheat curving up the sides, framing ONE CENT',
          edgeLooks: 'a plain silver-grey edge, on a coin a magnet will pick up',
          tags: [],
        },
        {
          years: { from: 1944, to: 1946 },
          composition: '95% copper, 5% zinc',
          group: 'copper',
          specs: { weightGrams: 3.11, diameterMm: 19.05, faceValue: '$0.01' },
          obverse: 'Abraham Lincoln facing right, with LIBERTY behind him and the date before him',
          reverse: 'Two ears of durum wheat curving up the sides, framing ONE CENT',
          edgeLooks: 'a plain copper-brown edge',
          tags: [],
        },
        {
          years: { from: 1947, to: 1958 },
          composition: '95% copper, 5% tin and zinc',
          group: 'copper',
          specs: { weightGrams: 3.11, diameterMm: 19.05, faceValue: '$0.01' },
          obverse: 'Abraham Lincoln facing right, with LIBERTY behind him and the date before him',
          reverse: 'Two ears of durum wheat curving up the sides, framing ONE CENT',
          edgeLooks: 'a plain copper-brown edge',
          tags: [],
        },
      ],
      designer: 'Victor David Brenner',
      wear: {
        obverse: 'the cheekbone and the jaw of Lincoln’s portrait and the hair above his ear',
        reverse: 'the tips of the wheat ears and the upper edges of their stalks',
        legend: 'LIBERTY behind the shoulder, IN GOD WE TRUST above the head and the date',
        detail: 'the individual grains on the wheat ears and the strands of hair above Lincoln’s ear',
        lustre: 'the open fields before and behind Lincoln’s portrait',
      },
      obverse: 'Abraham Lincoln facing right',
      reverse: 'Two ears of wheat framing ONE CENT',
      edge: 'Plain',
      keyDates: [
        {
          /*
           * The label carries something a slug cannot -- this is the case the
           * `coin` override exists for and deliberately does NOT use it: the
           * catalogue's 1909-S page states the year's combined total across
           * both reverses, so pointing this row at it would send a reader
           * looking for a 484,000-coin issue to a page about a 2,309,000-coin
           * one. It reads as plain text until the VDB has a page of its own.
           */
          label: '1909-S VDB',
          mintage: 484000,
          why: 'The key date of the series and the one everybody checks for: the designer’s initials V.D.B. at the foot of the reverse, on a San Francisco coin. They were removed within weeks of the cent going into production after complaints that they were too prominent.',
        },
        {
          label: '1931-S',
          mintage: 866000,
          why: 'The lowest mintage of the series after the 1909-S VDB, struck in the depths of the Depression when almost nobody needed new cents. Enough were saved at the time that it is scarce rather than rare.',
        },
        {
          label: '1914-D',
          mintage: 1193000,
          why: 'Scarce in every grade and heavily counterfeited, usually by adding a D to a 1914 Philadelphia cent or by altering a 1944-D.',
        },
        {
          label: '1909-S',
          mintage: 1825000,
          why: 'The plain-reverse San Francisco coin of the first year, without the initials. Scarce in its own right and routinely confused with the VDB, which is worth several times more.',
        },
        {
          label: '1924-D',
          mintage: 2520000,
          why: 'The scarcest Denver cent of the twenties, and one usually found well worn because nobody set them aside.',
        },
      ],
      varieties: [
        {
          label: '1922 plain, the cent with no D',
          lookFor:
            'A 1922 cent with no mint mark at all below the date. Denver was the only mint to strike cents that year, so every genuine 1922 cent is a Denver coin and a missing D means the die was clogged.',
          caution:
            'Only one die pair produces the recognised variety, and it is identified by a strong reverse rather than by the absent D alone -- a weakly struck D that has simply worn away is the common coin. It is among the most counterfeited cents there is, usually by grinding the D off an ordinary 1922-D, and it is worth certifying before it is worth valuing.',
        },
        {
          label: '1955 doubled die obverse',
          lookFor:
            'Heavy doubling on LIBERTY, on IN GOD WE TRUST and on the date, strong enough to read across the room with no loupe at all.',
          caution:
            'Machine doubling is flat and shelf-like and is far commoner; the genuine variety shows two rounded, fully separated images. This is the most faked doubled die in American coinage.',
        },
        {
          label: '1944-D over S',
          lookFor: 'The remains of an S mint mark showing underneath the D below the date.',
          caution:
            'The undertype is faint on a worn coin and is easily confused with a damaged or repunched D. It needs magnification and, on anything but a sharp example, certification.',
        },
      ],
      /*
       * The two off-metal errors this series is known for, and the reason this
       * list exists at all. Both are settled by a magnet and a scale in a few
       * seconds, and neither can be settled by looking -- which is the whole
       * distinction between an error and a variety.
       */
      errors: [
        {
          label: '1943 bronze cent',
          what:
            'A bronze blank left in the press from 1942 and struck with 1943 dies, in the one year every cent was meant to be steel.',
          known:
            'Seventeen across the three mints: twelve from Philadelphia, four from San Francisco and a single Denver coin.',
          check:
            'A 1943 cent that a magnet will NOT pick up, and that weighs about 3.11 grams rather than 2.70. Ordinary 1943 cents are zinc-plated steel and stick firmly.',
          caution:
            'Nearly every 1943 cent that looks copper is an ordinary steel cent that has been copper-plated, and those are magnetic. A genuine one is a bronze blank left in the press from 1942; fewer than thirty are known across all three mints, and no coin is worth valuing on this basis until a grading service has confirmed it.',
        },
        {
          label: '1944 steel cent',
          what:
            'A steel blank left over from 1943 and struck with 1944 dies, after the mint had gone back to brass.',
          known:
            'Around thirty-five: twenty-seven from Philadelphia, seven to ten from Denver and one from San Francisco.',
          check:
            'A 1944 cent that a magnet DOES pick up, and that weighs about 2.70 grams rather than 3.11. Ordinary 1944 cents are brass and are not magnetic.',
          caution:
            'The mirror of the error above and the same warning: a steel 1943 cent with the 3 altered to a 4 is the usual fake, and the alteration is visible under magnification. Around thirty are known.',
        },
      ],
    },
  },
  {
    slug: 'peace-dollar',
    name: 'Peace dollar',
    kind: 'series',
    seoTitle: 'Peace Silver Dollar Value: Dates and Mint Marks',
    bluf: 'A Peace dollar contains 0.7734 troy ounces of silver, and that is the floor under every date in the series; above it the run divides sharply between dates that are common in worn condition and a handful that are not.',
    description:
      'The Peace dollar, 1921 to 1935: silver content, where the mint mark sits, and which dates and mint marks are scarce.',
    primaryKeyword: 'peace silver dollar value',
    faqQuestion: 'Which Peace dollar dates and mint marks are scarce?',
    notes: [
      'The Peace dollar was the last silver dollar the United States struck for circulation, and it was struck in two bursts rather than one run: every year from 1921 to 1928, then nothing at all for five years, then 1934 and 1935. A reader holding a dollar dated 1929, 1930, 1931, 1932 or 1933 has something other than a Peace dollar.',
      'The first year stands apart physically as well as by date. The 1921 coins were struck in high relief, from dies that raised the design far enough off the field to give the presses trouble, and the relief was lowered for 1922. A 1921 therefore looks and feels different from every date after it, which is the one identification a reader can make without knowing anything about the series.',
      'One caution about the date. The United States Mint revived the Peace dollar in 2021, and those coins are 99.9% silver rather than 90%, contain more silver than the originals, and are modern collectables sold at a premium. Everything on this page refers to the 1921–1935 series.',
      'A separate caution about 1964. Denver struck more than three hundred thousand Peace dollars dated 1964 and then melted every one of them before any were released. None is known to exist and none may legally be held, so a 1964 Peace dollar offered for sale is a replica or a counterfeit.',
    ],
    series: {
      years: { from: 1921, to: 1935 },
      mints: [
        /*
         * The five-year hole of 1929 to 1933 is in every mint's list, because
         * the Mint struck no silver dollars at all in those years -- the
         * Pittman Act coinage the series was authorised to replace had been
         * completed. Denver's list has a second hole either side of it: it
         * struck dollars in 1922, 1923, 1926, 1927 and 1934 and in no other
         * year of the run, so a single range would put a 1924-D and a 1935-D
         * into the world, and neither was ever made.
         */
        {
          city: 'Philadelphia',
          mark: '',
          years: [
            { from: 1921, to: 1928 },
            { from: 1934, to: 1935 },
          ],
        },
        {
          city: 'Denver',
          mark: 'D',
          years: [
            { from: 1922, to: 1923 },
            { from: 1926, to: 1927 },
            { from: 1934, to: 1934 },
          ],
          note: 'Five years only, and not the five a reader would guess',
        },
        {
          city: 'San Francisco',
          mark: 'S',
          years: [
            { from: 1922, to: 1928 },
            { from: 1934, to: 1935 },
          ],
        },
      ],
      mintMarkLocation:
        'On the reverse, in the field to the left of the eagle, below the word ONE and near the tip of its wing. No mark at all means Philadelphia.',
      denomination: 'dollar',
      country: 'United States',
      tags: ['us-coin'],
      // One era: the mark never moved in fifteen years.
      markPositions: [
        {
          years: { from: 1921, to: 1935 },
          where:
            'on the reverse, in the field to the left of the eagle, below the word ONE and near the tip of its wing',
        },
      ],
      /*
       * No `hubs`, and the 1921 high relief is the case that has to be argued
       * rather than assumed. It fails the first test outright: EVERY 1921
       * Peace dollar is high relief, so the sources state one figure for the
       * date and a hub page would restate the year's own. There is nothing to
       * tell apart. It is a `keyDates` reason instead, which is where a fact
       * about a whole date belongs.
       *
       * The 1922 high relief fails the same test from the other side. The
       * sources state no mintage for it at all, because the coins were struck
       * and then destroyed; what survives is a single circulation piece and
       * about a dozen matte proofs. A page would have a figure slot with
       * nothing in it. It is a `varieties` row.
       */
      /*
       * One era, one alloy, one pair of designs, for the whole run. The silver
       * content is the weight times the fineness like every other figure on
       * this site -- 26.73 x 0.90 / 31.1035 = 0.7734 -- and not the published
       * ASW, which is somebody else's arithmetic. The figures are the Morgan's
       * because the Peace dollar was struck to the same standard on the same
       * planchets.
       */
      compositions: [
        {
          years: { from: 1921, to: 1935 },
          composition: '90% silver, 10% copper',
          group: 'silver',
          specs: { weightGrams: 26.73, diameterMm: 38.1, silverOzt: 0.7734, faceValue: '$1.00' },
          obverse: 'Liberty facing left in a radiate crown, with LIBERTY above and the date below',
          reverse: 'An eagle at rest on a rock, facing right, holding an olive branch, with PEACE cut into the rock below it',
          edgeLooks: 'a uniform silver-grey edge',
          tags: ['90-percent-silver'],
        },
      ],
      designer: 'Anthony de Francisci',
      // Where this design wears, for the grade pages. Every slot is a PLURAL
      // noun phrase with no appositive: each one is dropped into the middle of
      // a generated sentence, on every grade page of the series.
      wear: {
        obverse: 'the hair above Liberty’s eye and the high points of the rays of her crown',
        reverse: 'the eagle’s shoulder and the feathers along the top of its folded wing',
        legend: 'LIBERTY across the crown, IN GOD WE TRVST and the date',
        detail:
          'the eagle’s individual wing feathers and the leaves of the olive branch beneath its talons',
        lustre: 'the open fields of Liberty’s cheek and neck',
      },
      obverse: 'Liberty facing left in a radiate crown',
      reverse: 'An eagle at rest on a rock, holding an olive branch, with PEACE below',
      edge: 'Reeded',
      keyDates: [
        {
          label: '1928',
          mintage: 360649,
          why: 'The lowest mintage of the series by a wide margin, and the only date that was recognised as scarce while the coins were still being struck, so more were saved than the figure alone suggests.',
        },
        {
          label: '1927',
          mintage: 848000,
          why: 'The lowest Philadelphia mintage after the 1928, and one of the three consecutive years the whole series is scarce in.',
        },
        {
          label: '1927-S',
          mintage: 866000,
          why: 'Scarce as struck and scarcer well struck: San Francisco’s dies of these years left the hair over the ear soft on most of the coins.',
        },
        {
          label: '1934',
          mintage: 954057,
          why: 'The lowest mintage of the two revival years, from a Philadelphia run that lasted a few weeks.',
        },
        {
          label: '1921',
          mintage: 1006473,
          why: 'The first year and the only one struck in high relief, which is a difference a reader can see across the room and which makes it the most asked-after date in the series.',
        },
        {
          label: '1934-S',
          mintage: 1011000,
          why: 'Ordinary worn and the great rarity of the series with full lustre, because essentially the whole mintage was spent in the years after it was struck.',
        },
      ],
      varieties: [
        {
          label: '1922 high relief',
          lookFor:
            'A 1922 whose whole design stands as high off the field as a 1921 does, struck from the tall dies before the relief was lowered.',
          caution:
            'Almost every one was melted at the mint. One circulation strike and about a dozen matte proofs are known, against more than fifty million ordinary 1922 dollars, so a sharply struck 1922 is still an ordinary 1922 and this is a coin to have certified rather than identified.',
        },
        {
          label: '1934-D doubled die obverse',
          lookFor:
            'Doubling on IN GOD WE TRVST and on the letters of LIBERTY, with both images rounded and clearly separated.',
          caution:
            'Machine doubling is flat and shelf-like, it is far commoner on this issue than the variety is, and the two are told apart under magnification rather than by eye.',
        },
        {
          label: '1935 doubled die reverse',
          lookFor:
            'Doubling on the rays below the eagle and on the letters of ONE DOLLAR, on a Philadelphia coin of the last year of the series.',
          caution:
            'Several minor die pairings of this date carry light doubling that is not the listed variety; a strong, separated image on the rays is the one worth pursuing.',
        },
      ],
    },
  },
  {
    slug: 'junk-silver',
    name: 'Junk silver',
    kind: 'theme',
    h1: 'Junk Silver Coins and What They Are Worth',
    seoTitle: 'Junk Silver Value: What Counts and What It Is Worth',
    bluf: 'Junk silver means common-date circulated silver coins with no collector premium, valued purely on metal content -- for United States 90% silver coinage that is about 0.715 troy ounces of silver per dollar of face value.',
    description:
      'Junk silver coin values: which coins count, how much silver is in each denomination, and how to work a bag of them out from its face value.',
    primaryKeyword: 'junk silver value',
    faqQuestion: 'What is junk silver worth?',
    notes: [
      'The name is unkind and the coins are not junk; the word only means they carry no premium above the metal. That is what makes them the simplest coins to value, because the sum is one multiplication with no judgement in it.',
      'The standard shorthand: one dollar of face value in United States 90% silver dimes, quarters or half dollars contains 0.715 troy ounces of silver in practice. That is below the theoretical 0.7234 because circulated coins have lost metal to wear, and the trade prices them accordingly.',
    ],
  },
  {
    slug: '90-percent-silver',
    name: '90% silver',
    kind: 'composition',
    h1: '90% Silver Coins: The Full List',
    seoTitle: '90 Percent Silver Coins: List and Melt Values',
    bluf: 'United States dimes, quarters and half dollars dated 1964 and earlier are 90% silver, and silver dollars dated 1935 and earlier are too -- every one of them is worth its metal at minimum.',
    description:
      'Which United States coins are 90% silver, how much silver each denomination contains, and the years to check on a dime, a quarter, a half and a dollar.',
    primaryKeyword: '90 percent silver coins',
    faqQuestion: 'Which US coins are 90% silver?',
    notes: [
      'One rule covers almost all of it: for United States dimes, quarters and half dollars, 1964 is the last silver year. That single fact answers more questions from people holding a coin than any other.',
    ],
  },
  {
    slug: 'key-date',
    name: 'Key date',
    kind: 'theme',
    h1: 'Key Date Coins and Why They Are Worth More',
    seoTitle: 'Key Date Coins: What They Are and Why',
    bluf: 'A key date is the scarcest issue in a series, usually because of a low mintage in one year at one mint, and it is the reason that two otherwise identical-looking coins can differ in value by a thousand times.',
    description:
      'Key date coins explained: what makes a date scarce, how to check whether the coin in your hand is one, and why condition matters most on a key date.',
    primaryKeyword: 'key date coins',
    faqQuestion: 'What is a key date coin?',
    notes: [
      'Everything expensive in a common series is a key date, and every key date is identified by reading the coin rather than by judging it. A year and a mint mark, in a specific combination: that is the whole test, and it is the reason the identification checklist comes before the value on every coin page here.',
      'Key dates are also the coins most often counterfeited and most often altered -- a mint mark added, a digit reworked. A coin that would be worth four figures is worth authenticating by a grading service before it is worth anything at all.',
    ],
  },
  {
    slug: 'wartime',
    name: 'Wartime issue',
    kind: 'theme',
    h1: 'Wartime Coins and Their Compositions',
    seoTitle: 'Wartime Coin Values: Emergency Compositions',
    bluf: 'Wartime coins were struck in substitute metals because the usual alloy was needed for munitions, which makes them historically interesting and, in most cases, still common enough to be inexpensive.',
    description:
      'Wartime coins: emergency compositions such as the 1943 US steel cent and the 1942-1945 silver nickel, and what collectors actually pay for them.',
    primaryKeyword: 'wartime coin value',
    faqQuestion: 'Are wartime coins worth anything?',
    notes: [
      'Emergency compositions are memorable, which means they were saved in quantity, which means most of them are common. The story is better than the price, and saying so is more useful than letting someone find out at a coin shop.',
    ],
  },
  {
    slug: 'bullion',
    name: 'Bullion',
    kind: 'format',
    seoTitle: 'Bullion Coin Values: Metal Content and Premiums',
    bluf: 'A bullion coin is worth its stated metal weight multiplied by the current spot price, plus a premium of a few percent, and its stamped face value is irrelevant to what it is worth.',
    description:
      'Bullion coin values by metal content, and how the dealer premium works on top of spot price for gold, silver and platinum coins.',
    primaryKeyword: 'bullion coin value',
    faqQuestion: 'How is a bullion coin valued?',
    notes: [
      'Bullion is the one corner of coin collecting where valuation is genuinely simple. The weight is guaranteed by the issuing mint and stamped on the coin, so the only variables are the spot price and the premium, and the premium is published by every dealer.',
    ],
  },
  {
    slug: 'us-coin',
    name: 'United States',
    kind: 'country',
    // "United States Coin Values" is the generated H1 for a country tag.
    seoTitle: 'US Coin Values: Dates, Mintages and Melt Value',
    bluf: 'United States coin values turn on one question first -- is it dated 1964 or earlier -- because that is when silver left the dime, the quarter and the half dollar.',
    description:
      'United States coins by denomination, from cents to silver dollars, with the silver content of every pre-1965 issue and the dates that carry a premium.',
    primaryKeyword: 'us coin values',
    faqQuestion: 'Which US coins are worth more than face value?',
    notes: [
      'The United States is the deepest coin market in the world, which means two things at once: the price information is unusually good, and the supply of almost every date is unusually large. Both push in the same direction -- be specific about the date and the mint mark, and be sceptical of any claim that an ordinary coin is rare.',
    ],
  },
  {
    slug: 'canada',
    name: 'Canada',
    kind: 'country',
    h1: 'Canadian Coins',
    seoTitle: 'Canadian Coin Values: Silver Years and Melt',
    bluf: 'Canadian silver coinage ran at .800 fine through 1967 and .500 fine into 1968, after which circulating coins moved to nickel, so 1967 is the date that matters most on a Canadian coin.',
    description:
      'Canadian coins, including the .800 and .500 fine silver years, the 1967 centennial issues, and how much silver each denomination actually contains.',
    primaryKeyword: 'canadian coin values',
    faqQuestion: 'Which Canadian coins are silver?',
    notes: [
      'Canada’s silver cut-off is 1967-68 rather than 1964, and the transition was messier than the American one: 1967 issues exist in both .800 and .500 fine silver, and 1968 dimes and quarters exist in both .500 silver and pure nickel. Weight and a magnet separate them.',
    ],
  },
  {
    slug: 'united-kingdom',
    name: 'United Kingdom',
    kind: 'country',
    h1: 'British Coins',
    seoTitle: 'British Coin Values: Silver Years and Melt',
    bluf: 'British silver coinage was .925 sterling until 1919, .500 fine from 1920 to 1946, and cupronickel with no silver from 1947 onward -- so 1946 is the last silver year for an ordinary British coin.',
    description:
      'British coins, covering sterling and .500 fine silver years, pre-decimal denominations, and how much silver each denomination actually contains.',
    primaryKeyword: 'british coin values',
    faqQuestion: 'Which British coins are silver?',
    notes: [
      'Two dates carry most of the weight on a British coin: 1920, when the silver standard dropped from .925 to .500, and 1947, when silver left circulating coinage entirely. Pre-decimal denominations -- florins, half crowns, shillings, sixpences -- are where the silver is.',
    ],
  },
  {
    slug: 'world-coin',
    name: 'World coins',
    kind: 'theme',
    seoTitle: 'World Coin Values: Identify a Foreign Coin',
    bluf: 'A foreign coin is valued the same way as a domestic one -- metal content first, then date and condition -- and the hardest part is usually identifying the country, not pricing the coin.',
    description:
      'World coins and how to identify one. How to work out what a foreign coin is, whether it contains silver, and what it is worth.',
    primaryKeyword: 'world coin values',
    faqQuestion: 'Are foreign coins worth anything?',
    notes: [
      'Most foreign coins found in a drawer are modern base-metal circulating coins worth less than the postage to sell them. The exceptions are pre-1970 silver issues, which are worth their metal exactly like any other silver coin.',
    ],
  },
  {
    slug: 'clad-coinage',
    name: 'Clad coinage',
    kind: 'composition',
    h1: 'Clad Coins and What They Are Worth',
    seoTitle: 'Clad Coins: Are They Worth More Than Face Value?',
    bluf: 'Clad coins are worth face value, because a clad coin is a pure copper core bonded between copper-nickel faces and contains no precious metal whatsoever.',
    description:
      'What clad coinage is, when each United States denomination switched to it, and why a clad coin is worth face value in circulated condition.',
    primaryKeyword: 'clad coins worth',
    faqQuestion: 'What is a clad coin?',
    notes: [
      'Clad coinage exists because silver became too expensive to put in pocket change. The Coinage Act of 1965 replaced it, and the copper stripe visible on the edge of a clad dime or quarter is the quickest way to tell one from a silver coin without a scale.',
    ],
  },
];

