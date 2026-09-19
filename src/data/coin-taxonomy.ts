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
    h1: 'Silver Coin Values',
    seoTitle: 'Silver Coin Values: Melt Value and Price Guide',
    bluf: 'A circulated silver coin is worth at least its silver content, which is its actual silver weight in troy ounces multiplied by the current spot price -- so a 90% silver US quarter tracks silver, not the 25 cents stamped on it.',
    description:
      'Silver coin values by denomination, with the actual silver weight of each issue and what that metal is worth at the current spot price. Covers US 90% and 40% silver coinage and world silver issues.',
    primaryKeyword: 'silver coin values',
    faqQuestion: 'What are silver coins worth?',
    secondaryKeywords: [
      'silver coin melt value',
      '90 percent silver coins',
      'junk silver value',
      'how much silver is in a coin',
    ],
    intro: [
      'Silver coins have a floor that ordinary coins do not: the metal. That floor is the coin’s actual silver weight multiplied by the spot price, and for common dates in worn condition it is essentially the whole answer. Collector premium is what sits on top of the floor, and it only becomes the larger number for scarce dates, scarce mint marks and genuinely uncirculated examples.',
      'The practical consequence for anyone who has just tipped out a jar: sort by date first, not by how shiny the coin is. United States dimes, quarters and half dollars dated 1964 and earlier are 90% silver. Half dollars dated 1965 to 1970 are 40% silver. Everything after that, with the exception of proof and collector issues, is copper-nickel clad and carries no silver at all.',
    ],
    meltDriven: true,
    updated: '2026-09-19',
  },
  {
    slug: 'gold',
    name: 'Gold',
    h1: 'Gold Coin Values',
    seoTitle: 'Gold Coin Values: Melt Value and Price Guide',
    bluf: 'A gold coin is worth its actual gold weight multiplied by the spot gold price, plus a premium that is small for modern bullion and can be very large for pre-1933 US gold in collectable condition.',
    description:
      'Gold coin values by denomination and format, with the actual gold weight of each issue and what that metal is worth at the current spot price. Covers modern bullion and circulating gold coinage.',
    primaryKeyword: 'gold coin values',
    faqQuestion: 'What are gold coins worth?',
    secondaryKeywords: [
      'gold coin melt value',
      'how much gold is in a gold coin',
      'gold coin price guide',
    ],
    intro: [
      'Gold coins split cleanly into two markets. Modern bullion -- Eagles, Maples, Krugerrands -- trades at metal plus a modest, predictable premium, and its value is close to arithmetic. Pre-1933 circulating gold trades on condition and date, where the premium over metal can be several multiples.',
      'The gold weight of a coin is not its total weight. A one-ounce American Gold Eagle weighs 33.93 grams because it is alloyed with copper and silver for hardness; it still contains exactly one troy ounce of gold. Always value the gold content, never the gross weight.',
    ],
    meltDriven: true,
    updated: '2026-09-19',
  },
  {
    slug: 'copper',
    name: 'Copper and bronze',
    h1: 'Copper and Bronze Coin Values',
    seoTitle: 'Copper and Bronze Coin Values: Price Guide',
    bluf: 'Copper and bronze coins are almost never worth their metal, so their value is collector premium alone -- which means the date, the mint mark and the condition are the entire answer.',
    description:
      'Copper and bronze coin values, including wheat cents and pre-decimal pennies. Metal content is negligible here, so value comes from date, mint mark, variety and condition.',
    primaryKeyword: 'copper coin values',
    faqQuestion: 'Are copper and bronze coins worth anything?',
    secondaryKeywords: ['bronze coin value', 'wheat penny value', 'old penny value'],
    intro: [
      'Unlike silver and gold, copper offers no floor worth caring about. A bronze cent contains roughly three grams of copper, worth a fraction of a cent more than its face value, and melting United States cents is illegal in any case. Everything a copper coin is worth above face value is collector demand.',
      'That makes this the group where the small details decide the number. A mint mark, a doubled die, a year with a low mintage: those are the differences between a coin worth one cent and the same coin worth four figures, and they are why the identification checklist on each page matters more here than anywhere else on the site.',
    ],
    meltDriven: false,
    updated: '2026-09-19',
  },
  {
    slug: 'nickel',
    name: 'Nickel and cupronickel',
    h1: 'Nickel and Cupronickel Coin Values',
    seoTitle: 'Nickel Coin Values: Price Guide',
    bluf: 'Nickel and cupronickel coins carry no meaningful metal premium, so value comes from date, mint mark and condition -- with the wartime silver nickels of 1942 to 1945 as the single exception.',
    description:
      'Nickel and cupronickel coin values, where metal content is negligible and date, mint mark and condition decide the price. Includes the exception: 1942-1945 wartime silver nickels.',
    primaryKeyword: 'nickel coin values',
    faqQuestion: 'Are nickel coins worth anything?',
    secondaryKeywords: ['jefferson nickel value', 'cupronickel coin value'],
    intro: [
      'Cupronickel is the workhorse alloy of modern circulating coinage worldwide, and it was chosen precisely because it is cheap and durable. Neither quality helps a coin be valuable. Assume face value and work upwards only on evidence of a scarce date or genuinely uncirculated condition.',
    ],
    meltDriven: false,
    updated: '2026-09-19',
  },
  {
    slug: 'clad',
    name: 'Clad',
    h1: 'Clad Coin Values',
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
    intro: [
      'This is the group most people who have just found a coin actually landed in, and the honest answer is short: it is worth what it says on it. The United States moved dimes and quarters to clad in 1965 and half dollars fully to clad in 1971, specifically to remove the silver, and the composition has not changed since.',
      'The exceptions are narrow and worth knowing rather than hoping for: genuine mint errors, uncirculated rolls of a scarce year, and a handful of low-mintage issues that never circulated. A worn clad coin from a jar is none of those.',
    ],
    meltDriven: false,
    updated: '2026-09-19',
  },
  {
    slug: 'steel',
    name: 'Steel',
    h1: 'Steel Coin Values',
    seoTitle: 'Steel Coin Values: Wartime and Modern Issues',
    bluf: 'Steel coins were struck when the usual metal was needed elsewhere, most famously the 1943 United States steel cent, and their value comes from collector interest in that story rather than from the steel.',
    description:
      'Steel coin values, including the 1943 US steel cent and modern plated-steel circulating coinage. Value here is collector interest, not metal.',
    primaryKeyword: 'steel coin value',
    faqQuestion: 'Are steel coins worth anything?',
    secondaryKeywords: ['1943 steel penny value', 'silver colored penny'],
    intro: [
      'Steel appears in coinage for one of two reasons: wartime shortage, or modern cost-cutting with a plated core. Neither produces a coin with metal value. The 1943 United States cent is in this group and is the coin most often brought to a dealer by someone who believes they have found silver.',
    ],
    meltDriven: false,
    updated: '2026-09-19',
  },
  {
    slug: 'platinum',
    name: 'Platinum',
    h1: 'Platinum Coin Values',
    seoTitle: 'Platinum Coin Values: Melt Value and Price Guide',
    bluf: 'A platinum coin is worth its actual platinum weight multiplied by the spot platinum price, plus a bullion premium that is usually wider than gold’s because the market is thinner.',
    description:
      'Platinum coin values, with the actual platinum weight of each issue and what that metal is worth at the current spot price.',
    primaryKeyword: 'platinum coin values',
    faqQuestion: 'What are platinum coins worth?',
    secondaryKeywords: ['platinum eagle value', 'platinum bullion coin price'],
    intro: [
      'Platinum coinage is almost entirely modern bullion, so the arithmetic is simple and the spread is not. Expect a wider gap between what a dealer pays and what a dealer charges than on the equivalent gold coin.',
    ],
    meltDriven: true,
    updated: '2026-09-19',
  },
  {
    slug: 'bi-metallic',
    name: 'Bi-metallic',
    h1: 'Bi-metallic Coin Values',
    seoTitle: 'Bi-metallic Coin Values: Price Guide',
    bluf: 'Bi-metallic circulating coins -- a ring of one alloy around a centre of another -- are worth face value in worn condition, because both alloys are base metals chosen for cost.',
    description:
      'Bi-metallic coin values. The two-tone construction is an anti-counterfeiting measure, not a precious-metal one, and these coins are worth face value in circulated condition.',
    primaryKeyword: 'bi-metallic coin value',
    faqQuestion: 'Are bi-metallic coins worth anything?',
    secondaryKeywords: ['two tone coin value', 'bimetallic coin worth'],
    intro: [
      'The two-tone look reads as valuable and almost never is. The construction exists because it is hard to counterfeit and easy for a vending machine to recognise, and both alloys involved are base metals.',
    ],
    meltDriven: false,
    updated: '2026-09-19',
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
    intro: [
      'A catch-all, on purpose. It exists so that an unusual coin has somewhere honest to sit rather than being filed under a metal it is not made of.',
    ],
    meltDriven: false,
    updated: '2026-09-19',
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
    updated: '2026-09-19',
  },
  {
    slug: 'nickel',
    name: 'Nickel',
    namePlural: 'Nickels',
    bluf: 'A United States nickel is worth five cents unless it is a 1942-1945 wartime issue, which contains 35% silver, or a scarce early date.',
    primaryKeyword: 'nickel value',
    secondaryKeywords: ['five cent coin value', 'jefferson nickel worth'],
    faceNote: '$0.05.',
    updated: '2026-09-19',
  },
  {
    slug: 'dime',
    name: 'Dime',
    namePlural: 'Dimes',
    bluf: 'A United States dime dated 1964 or earlier is 90% silver and worth several dollars in metal alone; a dime dated 1965 or later is clad and worth ten cents.',
    primaryKeyword: 'dime value',
    secondaryKeywords: ['silver dime value', 'ten cent coin worth', 'old dime worth'],
    faceNote: '$0.10.',
    updated: '2026-09-19',
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
    updated: '2026-09-19',
  },
  {
    slug: 'half-dollar',
    name: 'Half dollar',
    namePlural: 'Half dollars',
    bluf: 'United States half dollars dated 1964 and earlier are 90% silver, those dated 1965 to 1970 are 40% silver, and those dated 1971 and later are clad and worth fifty cents.',
    primaryKeyword: 'half dollar value',
    secondaryKeywords: ['kennedy half dollar value', 'silver half dollar worth', '50 cent coin value'],
    faceNote: '$0.50.',
    updated: '2026-09-19',
  },
  {
    slug: 'dollar',
    name: 'Dollar',
    namePlural: 'Dollars',
    bluf: 'A large United States dollar coin dated 1935 or earlier is 90% silver and worth its metal at minimum; modern dollar coins are base metal and worth one dollar.',
    primaryKeyword: 'dollar coin value',
    secondaryKeywords: ['silver dollar value', 'one dollar coin worth', 'large dollar coin'],
    faceNote: '$1.00, or one unit of the issuing currency.',
    updated: '2026-09-19',
  },
  {
    slug: 'half-crown',
    name: 'Half crown',
    namePlural: 'Half crowns',
    bluf: 'A British half crown dated 1946 or earlier contains silver -- .925 fine before 1920 and .500 fine from 1920 to 1946 -- while 1947 and later issues are cupronickel and carry none.',
    primaryKeyword: 'half crown value',
    secondaryKeywords: ['british half crown silver', 'two shillings and sixpence value'],
    faceNote: 'Two shillings and sixpence, one eighth of a pound, withdrawn in 1970.',
    updated: '2026-09-19',
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
    updated: '2026-09-19',
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
    h1: 'Washington Quarter Values by Year',
    seoTitle: 'Washington Quarter Value: Silver Years and Price Guide',
    bluf: 'Washington quarters dated 1932 to 1964 are 90% silver and worth many times face value; those dated 1965 and later are copper-nickel clad and worth twenty-five cents.',
    description:
      'Washington quarter values by year, covering the 1932-1964 silver issues and the 1965-onward clad issues. The date is the first thing to check, because it decides the metal.',
    primaryKeyword: 'washington quarter value',
    faqQuestion: 'Which Washington quarters are silver?',
    intro: [
      'The Washington quarter is the coin most often picked out of a jar with the question attached, and the answer turns entirely on one digit. The United States stopped putting silver in the quarter after 1964, so a 1964 and a 1965 look almost identical, weigh nearly the same, and differ in value by more than an order of magnitude.',
      'Because the metal changed mid-series, the silver years and the clad years sit in different branches of this site. This page is where they are back together.',
    ],
    updated: '2026-09-19',
  },
  {
    slug: 'mercury-dime',
    name: 'Mercury dime',
    kind: 'series',
    h1: 'Mercury Dime Values',
    seoTitle: 'Mercury Dime Value: Silver Content and Key Dates',
    bluf: 'Every Mercury dime, struck from 1916 to 1945, is 90% silver and contains 0.0723 troy ounces of silver, so even the most common date in worn condition is worth its metal several times over.',
    description:
      'Mercury dime values, silver content and the dates that carry a premium over metal. All 1916-1945 issues are 90% silver.',
    primaryKeyword: 'mercury dime value',
    faqQuestion: 'Which Mercury dimes are worth more than their silver?',
    intro: [
      'The Mercury dime is the friendliest coin on this site for someone with no grading vocabulary, because there is no date in the series that is worth only ten cents. The silver alone settles that.',
    ],
    updated: '2026-09-19',
  },
  {
    slug: 'lincoln-cent',
    name: 'Lincoln cent',
    kind: 'series',
    h1: 'Lincoln Cent Values by Year',
    seoTitle: 'Lincoln Cent Value: Key Dates and Price Guide',
    bluf: 'Almost every Lincoln cent is worth one cent, and the handful that are not are identified by a specific year and mint mark rather than by how old or how worn the coin looks.',
    description:
      'Lincoln cent values by year and mint mark, including the key dates and the 1943 steel issue. Most are worth face value; this page says which are not.',
    primaryKeyword: 'lincoln cent value',
    faqQuestion: 'Which Lincoln cents are worth money?',
    intro: [
      'The Lincoln cent has run since 1909 and is the most heavily minted coin in United States history, which is the reason almost none of them are scarce. Age is not the variable here. A specific combination of year, mint mark and variety is.',
    ],
    updated: '2026-09-19',
  },
  {
    slug: 'morgan-dollar',
    name: 'Morgan dollar',
    kind: 'series',
    h1: 'Morgan Dollar Values',
    seoTitle: 'Morgan Silver Dollar Value: Dates and Mint Marks',
    bluf: 'Every Morgan dollar contains 0.7734 troy ounces of silver, so the metal sets a floor of roughly three quarters of the spot silver price, and date, mint mark and condition decide how far above that floor a given coin sits.',
    description:
      'Morgan silver dollar values, silver content, mint marks and the dates that carry a large premium over metal.',
    primaryKeyword: 'morgan silver dollar value',
    faqQuestion: 'Which Morgan dollar dates and mint marks are scarce?',
    intro: [
      'The Morgan dollar is the most collected United States coin series, which cuts both ways: demand is deep, and so is supply. Common dates in worn condition trade close to their silver content, while the scarce mint marks are among the best-known rarities in American coinage.',
      'The mint mark is on the reverse, below the wreath. No mint mark means Philadelphia.',
    ],
    updated: '2026-09-19',
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
    intro: [
      'The name is unkind and the coins are not junk; the word only means they carry no premium above the metal. That is what makes them the simplest coins on this site to value, because the sum is one multiplication with no judgement in it.',
      'The standard shorthand: one dollar of face value in United States 90% silver dimes, quarters or half dollars contains approximately 0.715 troy ounces of silver. The figure is slightly below the theoretical 0.7234 because circulated coins have lost metal to wear, and the trade prices them accordingly.',
    ],
    updated: '2026-09-19',
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
    intro: [
      'One rule covers almost all of it: for United States dimes, quarters and half dollars, 1964 is the last silver year. That single fact answers more questions from people holding a coin than anything else on this site.',
    ],
    updated: '2026-09-19',
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
    intro: [
      'Everything expensive in a common series is a key date, and every key date is identified by reading the coin rather than by judging it. A year and a mint mark, in a specific combination: that is the whole test, and it is the reason the identification checklist comes before the value on every coin page here.',
      'Key dates are also the coins most often counterfeited and most often altered -- a mint mark added, a digit reworked. A coin that would be worth four figures is worth authenticating by a grading service before it is worth anything at all.',
    ],
    updated: '2026-09-19',
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
    intro: [
      'Emergency compositions are memorable, which means they were saved in quantity, which means most of them are common. The story is better than the price, and saying so is more useful than letting someone find out at a coin shop.',
    ],
    updated: '2026-09-19',
  },
  {
    slug: 'bullion',
    name: 'Bullion',
    kind: 'format',
    h1: 'Bullion Coin Values',
    seoTitle: 'Bullion Coin Values: Metal Content and Premiums',
    bluf: 'A bullion coin is worth its stated metal weight multiplied by the current spot price, plus a premium of a few percent, and its stamped face value is irrelevant to what it is worth.',
    description:
      'Bullion coin values by metal content, and how the dealer premium works on top of spot price for gold, silver and platinum coins.',
    primaryKeyword: 'bullion coin value',
    faqQuestion: 'How is a bullion coin valued?',
    intro: [
      'Bullion is the one corner of this site where valuation is genuinely simple. The weight is guaranteed by the issuing mint and stamped on the coin, so the only variables are the spot price and the premium, and the premium is published by every dealer.',
    ],
    updated: '2026-09-19',
  },
  {
    slug: 'us-coin',
    name: 'United States',
    kind: 'country',
    h1: 'United States Coin Values',
    seoTitle: 'US Coin Values: Price Guide by Denomination',
    bluf: 'United States coin values turn on one question first -- is it dated 1964 or earlier -- because that is when silver left the dime, the quarter and the half dollar.',
    description:
      'United States coin values by denomination, from cents to silver dollars, with the silver content of every pre-1965 issue and the dates that carry a collector premium.',
    primaryKeyword: 'us coin values',
    faqQuestion: 'Which US coins are worth more than face value?',
    intro: [
      'The United States is the deepest coin market in the world, which means two things at once: the price information is unusually good, and the supply of almost every date is unusually large. Both push in the same direction -- be specific about the date and the mint mark, and be sceptical of any claim that an ordinary coin is rare.',
    ],
    updated: '2026-09-19',
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
    intro: [
      'Canada’s silver cut-off is 1967-68 rather than 1964, and the transition was messier than the American one: 1967 issues exist in both .800 and .500 fine silver, and 1968 dimes and quarters exist in both .500 silver and pure nickel. Weight and a magnet separate them.',
    ],
    updated: '2026-09-19',
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
    intro: [
      'Two dates carry most of the weight on a British coin: 1920, when the silver standard dropped from .925 to .500, and 1947, when silver left circulating coinage entirely. Pre-decimal denominations -- florins, half crowns, shillings, sixpences -- are where the silver is.',
    ],
    updated: '2026-09-19',
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
    intro: [
      'Most foreign coins found in a drawer are modern base-metal circulating coins worth less than the postage to sell them. The exceptions are pre-1970 silver issues, which are worth their metal exactly like any other silver coin, and which is why this site files coins by what they are made of rather than by where they came from.',
    ],
    updated: '2026-09-19',
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
    intro: [
      'Clad coinage exists because silver became too expensive to put in pocket change. The Coinage Act of 1965 replaced it, and the copper stripe visible on the edge of a clad dime or quarter is the quickest way to tell one from a silver coin without a scale.',
    ],
    updated: '2026-09-19',
  },
];

