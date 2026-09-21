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
      'Silver coin values by denomination, with the actual silver weight of each issue and what that metal is worth at the current spot price. US and world issues.',
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
      'Gold coin values by denomination and format, with the actual gold weight of each issue and what that metal is worth at the current spot price. Covers modern bullion and circulating gold coinage.',
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
      'Copper and bronze coin values, including wheat cents and pre-decimal pennies. Metal content is negligible here, so value comes from date, mint mark, variety and condition.',
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
    seoTitle: 'Nickel Coin Values: Price Guide',
    bluf: 'Nickel and cupronickel coins carry no meaningful metal premium, so value comes from date, mint mark and condition -- with the wartime silver nickels of 1942 to 1945 as the single exception.',
    description:
      'Nickel and cupronickel coin values, where metal content is negligible and date, mint mark and condition decide the price. Includes the exception: 1942-1945 wartime silver nickels.',
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
      'Clad coin values. Clad coins contain no silver and are worth face value in circulated condition, with narrow exceptions for errors and uncirculated examples.',
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
      'Steel coin values, including the 1943 US steel cent and modern plated-steel circulating coinage. Value here is collector interest, not metal.',
    primaryKeyword: 'steel coin value',
    faqQuestion: 'Are steel coins worth anything?',
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
      'Platinum coin values, with the actual platinum weight of each issue and what that metal is worth at the current spot price.',
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
      'Bi-metallic coin values. The two-tone construction is an anti-counterfeiting measure, not a precious-metal one, and these coins are worth face value in circulated condition.',
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
    h1: 'Other Coin Compositions and Their Values',
    seoTitle: 'Other Coin Compositions: Values and Price Guide',
    bluf: 'Coins struck in aluminium, brass, zinc, iron and other minor alloys are worth face value or less as metal, so their value is collector interest alone.',
    description:
      'Coin values for compositions outside the main groups: aluminium, brass, zinc, iron and other minor alloys. Metal value is negligible; collector demand is the whole price.',
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
    seoTitle: 'Washington Quarter Value: Silver Years and Prices',
    bluf: 'Washington quarters dated 1932 to 1964 are 90% silver and worth many times face value; those dated 1965 and later are copper-nickel clad and worth twenty-five cents.',
    description:
      'Washington quarter values by year: the 1932-1964 silver issues and the 1965-onward clad issues. The date is the first thing to check, because it decides the metal.',
    primaryKeyword: 'washington quarter value',
    notes: [
      'The Washington quarter is the coin most often picked out of a jar with the question attached, and the answer turns entirely on one digit. The United States stopped putting silver in the quarter after 1964, so a 1964 and a 1965 look almost identical, weigh nearly the same, and differ in value by more than an order of magnitude.',
    ],
    series: {
      years: { from: 1932 },
      mints: [
        { city: 'Philadelphia', mark: '', note: 'No mint mark on the silver issues' },
        { city: 'Denver', mark: 'D' },
        { city: 'San Francisco', mark: 'S', note: 'Circulation strikes to 1954, proofs from 1968' },
      ],
      mintMarkLocation:
        'On the reverse of every silver quarter, below the wreath beneath the eagle and just above the ER of QUARTER. It moved to the obverse, to the right of Washington\u2019s neck, in 1968. Quarters dated 1965, 1966 and 1967 carry no mint mark at all \u2014 the Mint dropped them nationwide to discourage hoarding during the coin shortage \u2014 so on any other date, no mark means Philadelphia.',
      compositions: [
        { years: { from: 1932, to: 1964 }, composition: '90% silver, 10% copper', group: 'silver' },
        { years: { from: 1965 }, composition: 'Copper-nickel clad over a copper core', group: 'clad' },
      ],
      designer: 'John Flanagan',
      obverse: 'George Washington, facing left (Flanagan portrait to 2021)',
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
      'Mercury dime values, silver content and the dates that carry a premium over metal. All 1916-1945 issues are 90% silver.',
    primaryKeyword: 'mercury dime value',
    faqQuestion: 'Which Mercury dimes are worth more than their silver?',
    notes: [
      'The Mercury dime is the friendliest series for someone with no grading vocabulary, because there is no date in it worth only ten cents. The silver alone settles that.',
      'One term is worth learning here, because it moves prices more than anything else in the series: Full Bands. The reverse carries a bundle of rods bound by two horizontal bands, and on a sharply struck coin the two lines of each band are fully separated rather than merged. Dealers write it FB, grading services certify it, and the same date can be worth several times as much with the designation as without it. It is a question of how well the coin was struck, not how little it was worn, so a heavily circulated dime cannot have it.',
    ],
    series: {
      years: { from: 1916, to: 1945 },
      mints: [
        { city: 'Philadelphia', mark: '' },
        { city: 'Denver', mark: 'D' },
        { city: 'San Francisco', mark: 'S' },
      ],
      mintMarkLocation:
        'On the reverse, to the left of the base of the fasces. No mark at all means Philadelphia.',
      compositions: [
        { years: { from: 1916, to: 1945 }, composition: '90% silver, 10% copper', group: 'silver' },
      ],
      designer: 'Adolph A. Weinman',
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
    seoTitle: 'Lincoln Cent Value: Key Dates and Price Guide',
    bluf: 'Almost every Lincoln cent is worth one cent, and the handful that are not are identified by a specific year and mint mark rather than by how old or how worn the coin looks.',
    description:
      'Lincoln cent values by year and mint mark, including the key dates and the 1943 steel issue. Most are worth face value; this page says which are not.',
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
        { city: 'Denver', mark: 'D', years: { from: 1911 } },
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
      'Morgan silver dollar values, silver content, mint marks and the dates that carry a large premium over metal.',
    primaryKeyword: 'morgan silver dollar value',
    faqQuestion: 'Which Morgan dollar dates and mint marks are scarce?',
    notes: [
      'The Morgan dollar is the most collected United States coin series, which cuts both ways: demand is deep, and so is supply. Common dates in worn condition trade close to their silver content, while the scarce mint marks are among the best-known rarities in American coinage.',
      'The series is also mapped in more detail than any other. Collectors catalogue Morgan dollars by die pairing under a numbering system called VAM, after Van Allen and Mallis, and a handful of those pairings carry premiums far above the ordinary coin of the same date. The four below are the ones visible without a specialist reference.',
      'One caution about the date: the United States Mint revived the Morgan dollar in 2021, and those coins are .999 fine silver rather than 90%, contain more silver than the originals, and are modern collectables sold at a premium. Everything on this page refers to the 1878\u20131921 series.',
    ],
    series: {
      years: { from: 1878, to: 1921 },
      mints: [
        { city: 'Philadelphia', mark: '' },
        {
          city: 'Carson City',
          mark: 'CC',
          years: { from: 1878, to: 1893 },
          note: 'The scarcest mint of the series and the one collectors chase',
        },
        { city: 'New Orleans', mark: 'O', years: { from: 1879, to: 1904 } },
        { city: 'San Francisco', mark: 'S' },
        { city: 'Denver', mark: 'D', years: { from: 1921, to: 1921 }, note: 'One year only' },
      ],
      mintMarkLocation:
        'On the reverse, below the wreath and above the DO of DOLLAR. No mark at all means Philadelphia.',
      compositions: [
        { years: { from: 1878, to: 1921 }, composition: '90% silver, 10% copper', group: 'silver' },
      ],
      designer: 'George T. Morgan',
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
        {
          label: '1878 eight tail feathers',
          lookFor:
            'Count the tail feathers on the reverse eagle. The first design of the first year has eight, and was replaced within months by a seven-feather reverse.',
        },
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
      'Junk silver coin values: which coins count, how much silver is in each denomination, and how to work out what a bag of them is worth at the current spot price.',
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
    h1: '90% Silver Coins and Their Values',
    seoTitle: '90 Percent Silver Coins: List and Melt Values',
    bluf: 'United States dimes, quarters and half dollars dated 1964 and earlier are 90% silver, and silver dollars dated 1935 and earlier are too -- every one of them is worth its metal at minimum.',
    description:
      'Which United States coins are 90% silver, how much silver each denomination contains, and what that metal is worth at the current spot price.',
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
    seoTitle: 'Key Date Coins: What They Are and What They Are Worth',
    bluf: 'A key date is the scarcest issue in a series, usually because of a low mintage in one year at one mint, and it is the reason two coins that look identical can differ in value by a thousand times.',
    description:
      'Key date coins explained: what makes a date scarce, how to check whether the coin in your hand is one, and why condition matters more on a key date than anywhere else.',
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
    h1: 'Wartime Coins and Their Values',
    seoTitle: 'Wartime Coin Values: Emergency Compositions',
    bluf: 'Wartime coins were struck in substitute metals because the usual alloy was needed for munitions, which makes them historically interesting and, in most cases, still common enough to be inexpensive.',
    description:
      'Wartime coin values: emergency compositions such as the 1943 US steel cent and the 1942-1945 silver nickel, and what collectors actually pay for them.',
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
    seoTitle: 'US Coin Values: Price Guide by Denomination',
    bluf: 'United States coin values turn on one question first -- is it dated 1964 or earlier -- because that is when silver left the dime, the quarter and the half dollar.',
    description:
      'United States coin values by denomination, from cents to silver dollars, with the silver content of every pre-1965 issue and the dates that carry a premium.',
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
    h1: 'Canadian Coin Values',
    seoTitle: 'Canadian Coin Values: Silver Years and Price Guide',
    bluf: 'Canadian silver coinage ran at .800 fine through 1967 and .500 fine into 1968, after which circulating coins moved to nickel, so 1967 is the date that matters most on a Canadian coin.',
    description:
      'Canadian coin values, including the .800 and .500 fine silver years, the 1967 centennial issues, and what the silver content is worth at the current spot price.',
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
    h1: 'British Coin Values',
    seoTitle: 'British Coin Values: Silver Years and Price Guide',
    bluf: 'British silver coinage was .925 sterling until 1919, .500 fine from 1920 to 1946, and cupronickel with no silver from 1947 onward -- so 1946 is the last silver year for an ordinary British coin.',
    description:
      'British coin values, covering sterling and .500 fine silver years, pre-decimal denominations, and what the silver content is worth at the current spot price.',
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
    h1: 'World Coin Values',
    seoTitle: 'World Coin Values: Identify and Price Foreign Coins',
    bluf: 'A foreign coin is valued the same way as a domestic one -- metal content first, then date and condition -- and the hardest part is usually identifying the country, not pricing the coin.',
    description:
      'World coin values and identification. How to work out what a foreign coin is, whether it contains silver, and what it is worth.',
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

