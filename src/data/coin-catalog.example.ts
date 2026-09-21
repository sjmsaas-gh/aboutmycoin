/**
 * NOT BUILT. Nothing imports this file and no page is generated from it.
 *
 * These are the nine entries that were written to prove the catalogue
 * structure, kept as a worked reference for the shape a real entry takes:
 * five composition groups, six denominations, three countries, both
 * granularities (a single issue and a whole run), and one series deliberately
 * split across two groups by its own mid-series metal change.
 *
 * They are here rather than deleted because they are the only filled-in
 * example of every field, and the field notes in `coin-schema.ts` are easier
 * to read against one. Delete this file once the real catalogue exists and it
 * has stopped being useful.
 *
 * Do not import it. `validateTaxonomy()` does not see these entries, so they
 * are not held to the rules the live catalogue is held to, and they may drift
 * out of date with the schema.
 */
import type { Coin } from './coin-schema';

export const EXAMPLE_COINS: Coin[] = [
  {
    slug: '1964-washington-quarter',
    group: 'silver',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: '1964 Washington Quarter',
    seoTitle: '1964 Quarter Value: 90% Silver Content and Price',
    bluf: 'A 1964 Washington quarter is 90% silver and contains 0.1808 troy ounces of silver, so it is worth roughly eighteen hundredths of the spot silver price -- many times its twenty-five cent face value -- even when it is worn smooth.',
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
    weightGrams: 6.25,
    diameterMm: 24.3,
    silverOzt: 0.1808,
    faceValue: '$0.25',
    commonality: 'very-common',
    identify: [
      'Read the date. It must say 1964. A 1964-D, struck at Denver, is the same metal and the same value.',
      'Look at the edge. A silver quarter has a uniform silver-grey edge; a clad quarter shows a copper-coloured stripe running round it.',
      'Weigh it if you can. A silver quarter weighs 6.25 grams, a clad quarter 5.67 grams. A kitchen scale reading to 0.1 grams will separate them.',
      'Check the mint mark, on the reverse to the right of the eagle. No mark is Philadelphia, D is Denver. Neither changes what a circulated 1964 quarter is worth.',
    ],
    sections: [
      {
        heading: 'Why 1964 is the date everyone asks about',
        paragraphs: [
          '1964 is the last year the United States struck quarters in silver. The Coinage Act of 1965 replaced the silver with a copper-nickel clad sandwich, and the two coins were deliberately made the same size and colour so vending machines would not need changing. That design decision is why a 1964 and a 1965 quarter are so easily confused, and why the difference in value is so large.',
          'A very large number of 1964 quarters were struck, so the coin is not scarce in any sense. Its value is metal, not rarity, and that is good news for anyone holding one: the price does not depend on a grading judgement you are not equipped to make.',
        ],
      },
      {
        heading: 'How to work out what yours is worth',
        paragraphs: [
          'Multiply 0.1808 by the current spot price of silver per troy ounce. That is the metal value of one 1964 quarter. A dealer buying for melt will pay somewhat under that figure and sell somewhat over it; the gap is the spread, and it is wider for one coin than for a bag of them.',
          'Condition barely enters into it. A 1964 quarter worn almost flat has lost a little silver to friction and is worth marginally less; an uncirculated one with full original lustre carries a modest collector premium over melt. Neither moves the number the way condition moves the price of a scarce coin.',
        ],
        steps: [
          { name: 'Confirm the date', text: 'The coin must read 1964. 1965 and later are clad and worth twenty-five cents.' },
          { name: 'Confirm the metal', text: 'Check the edge for a copper stripe, or weigh the coin: 6.25 grams silver, 5.67 grams clad.' },
          { name: 'Find the spot price', text: 'Look up the current spot price of silver per troy ounce.' },
          { name: 'Multiply', text: 'Metal value equals 0.1808 multiplied by the spot price per troy ounce.' },
          { name: 'Subtract the dealer spread', text: 'Expect a buyer to pay below melt and a seller to charge above it, with the gap narrowing on larger quantities.' },
        ],
      },
      {
        heading: 'When a 1964 quarter is worth more than its silver',
        paragraphs: [
          'Three cases, and only three. An uncirculated example with original mint lustre carries a premium over melt, larger the sharper the strike. A 1964 special mint set or proof coin, struck for collectors rather than circulation, is a different coin with a different market. And a genuine, verified mint error -- a doubled die, an off-centre strike, a coin struck on the wrong planchet -- is valued as an error rather than as a quarter.',
          'What does not add value: toning you like the look of, a coin being "shiny", or the coin having been in the family a long time. Those are the three reasons people most often expect a premium, and none of them is one.',
        ],
      },
    ],
    related: ['1965-washington-quarter', 'mercury-dime'],
  },
  {
    slug: '1965-washington-quarter',
    group: 'clad',
    type: 'quarter',
    tags: ['washington-quarter', 'us-coin', 'clad-coinage'],
    name: '1965 Washington Quarter',
    seoTitle: '1965 Quarter Value: Is It Silver? (No)',
    bluf: 'A 1965 Washington quarter is worth twenty-five cents. It contains no silver: 1965 is the first year of copper-nickel clad quarters, and a circulated one has no metal value and no collector premium.',
    description:
      'What a 1965 quarter is worth: twenty-five cents. 1965 is the first clad year, the coin contains no silver, and this page explains how to confirm that in ten seconds.',
    primaryKeyword: '1965 quarter value',
    secondaryKeywords: [
      'is a 1965 quarter silver',
      '1965 quarter worth',
      '1965 quarter no mint mark value',
      'first clad quarter',
    ],
    years: { from: 1965 },
    country: 'United States',
    composition: 'Copper-nickel clad: pure copper core between 75% copper / 25% nickel faces',
    weightGrams: 5.67,
    diameterMm: 24.3,
    faceValue: '$0.25',
    commonality: 'very-common',
    identify: [
      'Read the date. 1965 quarters carry no mint mark at all -- mint marks were suspended from 1965 to 1967 -- so "1965 no mint mark" is every 1965 quarter, not a variety.',
      'Look at the edge. A copper-coloured stripe running round the rim means clad. Every genuine 1965 quarter has one.',
      'Weigh it. 5.67 grams is clad. If it weighs 6.25 grams, check the date again.',
    ],
    sections: [
      {
        heading: 'Why so many people search for this coin',
        paragraphs: [
          'Because 1965 is one year after the last silver year, and the two coins were made to look identical. Anyone who has learned the useful rule -- United States dimes and quarters dated 1964 and earlier are silver -- reaches for a 1965 and finds it sitting exactly on the wrong side of the line.',
          'The other reason is the missing mint mark. The United States Mint suspended mint marks from 1965 through 1967 to discourage the coin hoarding that the silver withdrawal had set off. A 1965 quarter with no mint mark is therefore completely normal, not a rare error, despite being listed and relisted as one.',
        ],
      },
      {
        heading: 'The narrow exceptions, stated honestly',
        paragraphs: [
          'A 1965 quarter struck on a leftover 90% silver planchet is a genuine and genuinely valuable transitional error. It exists. It is also vanishingly rare, and it is identified by weight: 6.25 grams rather than 5.67, with a silver edge. If your coin weighs 5.67 grams, it is not one, and no amount of further examination will change that.',
          'Beyond that: a 1965 quarter from a special mint set in pristine condition is worth a few dollars to a collector assembling a set. A worn one from a jar is worth twenty-five cents, and spending it is a perfectly sensible thing to do with it.',
        ],
      },
    ],
    related: ['1964-washington-quarter'],
  },
  {
    slug: 'mercury-dime',
    group: 'silver',
    type: 'dime',
    tags: ['mercury-dime', 'us-coin', '90-percent-silver', 'junk-silver'],
    name: 'Mercury Dime (1916-1945)',
    shortName: 'Mercury dime',
    seoTitle: 'Mercury Dime Value: Silver Content and Key Dates',
    bluf: 'Every Mercury dime is 90% silver and contains 0.0723 troy ounces of silver, so the most common date in worn condition is still worth several times its ten-cent face value -- and one date, the 1916-D, is worth several thousand times it.',
    description:
      'Mercury dime values: 0.0723 troy ounces of silver in every 1916-1945 issue, how to read the mint mark, and the key dates that are worth far more than their metal.',
    primaryKeyword: 'mercury dime value',
    secondaryKeywords: [
      'winged liberty head dime',
      'how much silver in a mercury dime',
      'mercury dime silver content',
      '1916 d mercury dime',
    ],
    years: { from: 1916, to: 1945 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    weightGrams: 2.5,
    diameterMm: 17.9,
    silverOzt: 0.0723,
    faceValue: '$0.10',
    commonality: 'common',
    identify: [
      'Look at the portrait. A young Liberty in a winged cap, facing left. The wings are why it is called a Mercury dime; the official name is the Winged Liberty Head dime, and the figure is Liberty, not Mercury.',
      'Check the date, between 1916 and 1945. The reverse carries a fasces and an olive branch.',
      'Find the mint mark on the reverse, to the left of the bottom of the fasces. No mark is Philadelphia, D is Denver, S is San Francisco.',
      'Weigh it. 2.5 grams. A Roosevelt dime dated 1964 or earlier weighs the same and is the same silver content, but it shows Roosevelt in profile, not a winged cap.',
    ],
    sections: [
      {
        heading: 'What the silver alone is worth',
        paragraphs: [
          'Multiply 0.0723 by the current spot price of silver per troy ounce. That is the floor under every Mercury dime regardless of date, mint mark or condition, and for the great majority of them it is also the ceiling. Ten of them make roughly 0.723 troy ounces, which is the origin of the "0.715 ounces per dollar of face value" rule of thumb used for circulated 90% silver.',
          'This is why the series is a good one to find. There is no Mercury dime that is worth only ten cents, so nobody holding one has to be told their coin is worth nothing.',
        ],
      },
      {
        heading: 'The dates that are worth more than the metal',
        paragraphs: [
          'The 1916-D is the key date of the series and one of the best-known rarities in twentieth-century United States coinage: Denver struck only a small fraction of the number Philadelphia and San Francisco did that year. It is worth a very large multiple of its silver content in any condition, and it is also one of the most frequently counterfeited American coins, usually by adding a D mint mark to a genuine 1916 Philadelphia dime. A 1916-D is worth submitting to a grading service before it is worth selling.',
          'The 1921 and 1921-D issues are the next scarcest, followed by the 1926-S. Beyond those, the series is common, and the 1942 over 1941 overdate is a variety rather than a date -- a doubled digit visible under magnification.',
        ],
      },
      {
        heading: 'Why this page covers thirty years at once',
        paragraphs: [
          'Because the answer does not change across them. Every issue from 1916 to 1945 is the same alloy, the same weight and the same silver content, so a page per year would repeat one sentence thirty times and say nothing new. The dates that do change the answer -- the 1916-D above all -- earn pages of their own, because people search for them by name.',
        ],
      },
    ],
    related: ['1964-washington-quarter', 'morgan-dollar'],
  },
  {
    slug: '1943-steel-cent',
    group: 'steel',
    type: 'cent',
    tags: ['lincoln-cent', 'us-coin', 'wartime'],
    name: '1943 Steel Cent',
    seoTitle: '1943 Steel Penny Value: Common, Not Silver',
    bluf: 'A 1943 steel cent is worth a few cents to a few dollars depending on condition. It is not silver -- it is zinc-coated steel, struck for one year because copper was needed for the war -- and over a billion were made, so it is common.',
    description:
      'What a 1943 steel penny is worth. It is zinc-plated steel rather than silver, more than a billion were struck, and the genuinely valuable 1943 cent is the copper one, not this.',
    primaryKeyword: '1943 steel penny value',
    secondaryKeywords: [
      '1943 silver penny',
      'is my 1943 penny valuable',
      '1943 steel cent worth',
      'why is my 1943 penny silver colored',
    ],
    years: { from: 1943 },
    country: 'United States',
    composition: 'Zinc-coated steel',
    weightGrams: 2.7,
    diameterMm: 19.05,
    faceValue: '$0.01',
    commonality: 'very-common',
    identify: [
      'Test it with a magnet. A 1943 steel cent sticks. This is the single most useful check on the coin, and it takes a second.',
      'Read the date: 1943. The colour is silver-grey, which is the zinc plating, not silver.',
      'Check the mint mark under the date. No mark is Philadelphia, D is Denver, S is San Francisco. All three are common.',
      'Weigh it. 2.7 grams for steel, against 3.11 grams for a bronze cent.',
    ],
    sections: [
      {
        heading: 'Why it looks like silver and is not',
        paragraphs: [
          'In 1943 copper was a war material, so the United States Mint struck cents from steel with a thin zinc coating. The result is a cent that is grey rather than copper-coloured, which is why it is brought in as a silver penny more often than any other coin in American circulation. It contains no silver and never did.',
          'More than a billion were struck across the three mints in that single year, and many were set aside as curiosities at the time, so they survive in quantity. Common in worn condition, inexpensive in nice condition, and genuinely interesting: all three are true at once.',
        ],
      },
      {
        heading: 'The 1943 cent that is worth a fortune is the copper one',
        paragraphs: [
          'A small number of 1943 cents were struck in error on bronze planchets left over from 1942. Those are among the most valuable United States coins in existence, and they are the reason this date has the reputation it does. They are also the reason for a steady trade in fakes, made by copper-plating a genuine steel cent or by altering the date on a 1948.',
          'The magnet settles it in one second. A genuine 1943 bronze cent is not magnetic and weighs about 3.11 grams. A copper-plated steel cent sticks to a magnet. If your coin sticks, it is a steel cent, whatever colour it is.',
        ],
        steps: [
          { name: 'Hold a magnet to it', text: 'If the coin sticks, it is steel. Stop here: it is a common 1943 steel cent.' },
          { name: 'Weigh it if it does not stick', text: 'Roughly 3.11 grams is consistent with bronze; 2.7 grams is steel with the plating disguised.' },
          { name: 'Examine the date under magnification', text: 'Altered dates, most often a reworked 1948, are the common forgery. The 3 should match other 1943 cents exactly.' },
          { name: 'Have it authenticated', text: 'A coin that passes all three checks is worth the cost of professional authentication before any conversation about selling it.' },
        ],
      },
    ],
    related: ['1909-s-vdb-lincoln-cent'],
  },
  {
    slug: '1909-s-vdb-lincoln-cent',
    group: 'copper',
    type: 'cent',
    tags: ['lincoln-cent', 'us-coin', 'key-date'],
    name: '1909-S VDB Lincoln Cent',
    seoTitle: '1909-S VDB Penny Value: The Lincoln Cent Key Date',
    bluf: 'The 1909-S VDB Lincoln cent is the key date of the series and is worth a large multiple of face value in any condition, because only 484,000 were struck before the designer’s initials were removed from the reverse.',
    description:
      'What a 1909-S VDB penny is worth, how to confirm you have one rather than a plain 1909-S or 1909 VDB, and why this date is the one Lincoln cent that is genuinely scarce.',
    primaryKeyword: '1909 s vdb penny value',
    secondaryKeywords: [
      '1909 s vdb lincoln cent',
      'vdb penny worth',
      'lincoln cent key date',
      'how to tell a real 1909 s vdb',
    ],
    years: { from: 1909 },
    mintMark: 'S',
    country: 'United States',
    composition: '95% copper, 5% tin and zinc (bronze)',
    weightGrams: 3.11,
    diameterMm: 19.05,
    faceValue: '$0.01',
    mintage: 484000,
    commonality: 'key-date',
    identify: [
      'Read the date: 1909. Then find the mint mark directly below it. It must be an S, for San Francisco.',
      'Turn the coin over and look at the very bottom of the reverse, between the wheat ears. The initials VDB -- for the designer Victor David Brenner -- must be there.',
      'Both must be present. A 1909 VDB with no mint mark is a Philadelphia coin with a mintage in the millions and is worth a small fraction of this one. A 1909-S with no VDB is scarcer than that but far less than this.',
      'Compare the S to a known genuine example under magnification. An added mint mark is the standard forgery of this coin, and it is common.',
    ],
    sections: [
      {
        heading: 'Why only 484,000 exist',
        paragraphs: [
          'The Lincoln cent was introduced in 1909 with the designer’s initials, VDB, placed prominently at the bottom of the reverse. The placement was criticised almost immediately as self-advertisement, and the Mint removed the initials partway through the first year. San Francisco had struck 484,000 cents with them by that point and none afterwards, which is how the first year of the most common coin in American history contains a genuine rarity.',
          'For scale: Philadelphia struck nearly 28 million 1909 VDB cents, which is why that coin is inexpensive and why the distinction between the two matters so much.',
        ],
      },
      {
        heading: 'What it is worth, and why this page does not print a number',
        paragraphs: [
          'The range across grades on this coin is extreme -- a heavily worn example and a pristine uncirculated one are not in the same market -- and the price moves with the coin market rather than with a metal price. That is exactly the case where a single figure on a web page is a promise the page cannot keep.',
          'What can be said without hedging: a genuine 1909-S VDB is worth hundreds of dollars at minimum, is worth having authenticated before it is sold, and should never be cleaned. Cleaning is the single most common way an owner reduces the value of a coin like this, often by half, in the belief that they are improving it.',
        ],
      },
      {
        heading: 'Before you get excited',
        paragraphs: [
          'Most coins brought in as a 1909-S VDB are a 1909 VDB from Philadelphia, where the absence of the mint mark has been overlooked, or a coin with an S that was added later. Both are extremely common outcomes, and neither is a reason not to check carefully -- the coin does exist in old accumulations, which is why it is worth knowing the four-part test above.',
        ],
      },
    ],
    related: ['1943-steel-cent'],
  },
  {
    slug: 'morgan-dollar',
    group: 'silver',
    type: 'dollar',
    tags: ['morgan-dollar', 'us-coin', '90-percent-silver'],
    name: 'Morgan Silver Dollar (1878-1921)',
    shortName: 'Morgan silver dollar',
    seoTitle: 'Morgan Silver Dollar Value: Silver Content and Dates',
    bluf: 'Every Morgan silver dollar contains 0.7734 troy ounces of silver, so the metal alone puts a floor of roughly three quarters of the spot silver price under any example -- and scarce mint marks in uncirculated condition sell for very large multiples of that.',
    description:
      'Morgan silver dollar values: 0.7734 troy ounces of silver in every coin, where the mint mark is, which dates are scarce, and how to separate metal value from collector premium.',
    primaryKeyword: 'morgan silver dollar value',
    secondaryKeywords: [
      'how much silver in a morgan dollar',
      'morgan dollar mint marks',
      '1921 morgan dollar value',
      'old silver dollar worth',
    ],
    years: { from: 1878, to: 1921 },
    country: 'United States',
    composition: '90% silver, 10% copper',
    weightGrams: 26.73,
    diameterMm: 38.1,
    silverOzt: 0.7734,
    faceValue: '$1.00',
    commonality: 'common',
    identify: [
      'Look for Liberty in profile facing left wearing a coronet reading LIBERTY, with a wreath of cotton and wheat. The reverse shows an eagle with outstretched wings.',
      'Check the date: 1878 to 1904, then 1921. There are no Morgan dollars dated 1905 to 1920.',
      'Find the mint mark on the reverse, below the wreath and above the letters DO in DOLLAR. No mark is Philadelphia; CC is Carson City, S is San Francisco, O is New Orleans, D is Denver and appears only on 1921 coins.',
      'Weigh it. 26.73 grams and 38.1 millimetres across. A modern Eisenhower or Susan B. Anthony dollar is neither.',
    ],
    sections: [
      {
        heading: 'The metal floor, first',
        paragraphs: [
          'Multiply 0.7734 by the current spot price of silver per troy ounce. That is what the silver in any Morgan dollar is worth, and it is the number a dealer buying a worn common date will work back from. It applies equally to the commonest 1921 and to the scarcest Carson City issue; the difference between them is entirely premium on top.',
          'Starting from the metal is the honest order for this series in particular, because a great many Morgan dollars in circulated condition are worth exactly their silver and no more, and the coin’s reputation leads people to expect otherwise.',
        ],
      },
      {
        heading: 'What lifts a Morgan above its silver',
        paragraphs: [
          'Mint mark first. Carson City coins, marked CC, were struck in small numbers at a frontier mint and command a premium in every grade; they are the reason the series is collected the way it is. New Orleans and San Francisco issues from particular years are scarcer than their Philadelphia equivalents.',
          'Condition second, and it matters more on this series than on almost any other. A Morgan dollar with full original lustre and no wear on the high points of the hair and the eagle’s breast is a different asset from the same coin with light wear, and the gap between the two grades can be a multiple rather than a percentage. This is also where an untrained eye is least reliable, which is why graded examples in sealed holders trade at a premium over raw ones.',
          'What does not lift it: age. An 1879 is not worth more than a 1921 because it is older. The mintage and the survival rate decide, and the 1921 issues were struck in enormous numbers.',
        ],
      },
      {
        heading: 'Cleaning, and why not to',
        paragraphs: [
          'A Morgan dollar that has been polished, dipped or rubbed with a cloth is worth substantially less than the same coin left dirty, and the damage is permanent and obvious to anyone who buys coins. Grading services will refuse to grade a cleaned coin or will mark it as cleaned, which is the same thing commercially. If a coin is worth enough to be worth cleaning, it is worth too much to clean.',
        ],
      },
    ],
    related: ['mercury-dime', '1967-canadian-silver-dollar'],
  },
  {
    slug: '1967-canadian-silver-dollar',
    group: 'silver',
    type: 'dollar',
    tags: ['canada', 'world-coin', 'junk-silver'],
    name: '1967 Canadian Silver Dollar',
    seoTitle: '1967 Canadian Silver Dollar Value: Silver Content',
    bluf: 'The 1967 Canadian silver dollar is .800 fine silver and contains 0.600 troy ounces of silver, so it is worth six tenths of the spot silver price at minimum -- more than most people expect from a centennial coin struck in the millions.',
    description:
      'What a 1967 Canadian silver dollar is worth: 0.600 troy ounces of silver in the centennial goose dollar, why 1967 is the last silver year, and how to check the metal.',
    primaryKeyword: '1967 canadian silver dollar value',
    secondaryKeywords: [
      'canada centennial dollar value',
      '1967 goose dollar',
      'canadian silver dollar silver content',
      'is my canadian dollar silver',
    ],
    years: { from: 1967 },
    country: 'Canada',
    composition: '80% silver, 20% copper',
    weightGrams: 23.33,
    diameterMm: 36.06,
    silverOzt: 0.6,
    faceValue: 'CAD $1.00',
    commonality: 'common',
    identify: [
      'Look at the reverse. The 1967 centennial dollar shows a Canada goose in flight, designed by Alex Colville, with the dates 1867 and 1967.',
      'Check the obverse for Queen Elizabeth II and the legend ELIZABETH II D G REGINA.',
      'Weigh it. 23.33 grams. A 1968 or later Canadian dollar is nickel, weighs 15.62 grams, and sticks to a magnet.',
      'Try a magnet. Silver is not magnetic. Canadian nickel coinage is strongly magnetic, which separates the two instantly.',
    ],
    sections: [
      {
        heading: 'Why 1967 is the date that matters on Canadian coins',
        paragraphs: [
          'Canada removed silver from circulating coinage a few years after the United States did, and less tidily. 1967 is the last year of .800 fine silver dollars; the 1967 dime and quarter exist in both .800 and .500 fine, struck partway through the year as the silver price rose, and 1968 dimes and quarters exist in both .500 silver and pure nickel. Weight and a magnet are the practical tests.',
          'The centennial series was struck in large numbers and widely saved, so these are common coins. Common and silver is a perfectly good combination: it means the value is predictable and does not depend on a grading judgement.',
        ],
      },
      {
        heading: 'Working out the value',
        paragraphs: [
          'Multiply 0.600 by the spot price of silver per troy ounce. The .800 fineness is lower than the American 90% standard but the coin is large, so the silver content lands close to eight tenths of a Morgan dollar’s.',
          'Collector premium over melt is modest on a circulated example. Uncirculated centennial dollars, and the cased proof-like sets they were sold in, carry more -- though many have developed milk spots or toning in storage, which the market discounts.',
        ],
      },
      {
        heading: 'Why a Canadian coin is filed under silver rather than under Canada',
        paragraphs: [
          'Because the metal is the answer and the country is the context. This site organises coins by what they are made of and what denomination they are, so a silver dollar from Ottawa sits beside a silver dollar from Philadelphia, where a person comparing the two would want it. The country is a tag, and the Canadian view of the catalogue is assembled from it.',
        ],
      },
    ],
    related: ['morgan-dollar', '1937-1946-british-half-crown'],
  },
  {
    slug: '1937-1946-british-half-crown',
    group: 'silver',
    type: 'half-crown',
    tags: ['united-kingdom', 'world-coin', 'junk-silver'],
    name: 'British Half Crown (1937-1946)',
    shortName: 'British half crown',
    seoTitle: 'British Half Crown Value: .500 Silver Years',
    bluf: 'A British half crown dated 1937 to 1946 is .500 fine silver and contains 0.2273 troy ounces of silver, so it is worth roughly a fifth of the spot silver price -- while an otherwise identical 1947 or later half crown is cupronickel and contains none.',
    description:
      'What a British half crown is worth: 0.2273 troy ounces of silver in the 1937-1946 issues, why 1946 is the last silver year, and how to tell a silver half crown from a cupronickel one.',
    primaryKeyword: 'british half crown value',
    secondaryKeywords: [
      'half crown silver content',
      'is my half crown silver',
      'pre 1947 british silver',
      'george vi half crown value',
    ],
    years: { from: 1937, to: 1946 },
    country: 'United Kingdom',
    composition: '50% silver, 50% copper and other base metals',
    weightGrams: 14.138,
    diameterMm: 32.3,
    silverOzt: 0.2273,
    faceValue: 'Two shillings and sixpence',
    commonality: 'common',
    identify: [
      'Read the date. 1937 to 1946 is .500 fine silver. 1947 and later is cupronickel with no silver. 1920 to 1936 is also .500 fine, and 1919 and earlier is .925 sterling and worth almost twice as much in metal.',
      'Check the obverse. 1937 to 1946 half crowns carry George VI, with the legend GEORGIVS VI D G BR OMN REX.',
      'Weigh it. 14.14 grams for both the silver and the cupronickel issues -- the weight was kept the same, so weight alone does not separate them. The date does.',
      'Look at the colour of a worn high point. .500 silver tones to a dull grey; cupronickel keeps a harder, more yellow-white tone. This is a supporting check, not a decisive one.',
    ],
    sections: [
      {
        heading: 'The two dates that decide a British coin',
        paragraphs: [
          '1920 and 1947. Before 1920, British silver coinage was .925 sterling. From 1920 to 1946 it was debased to .500 fine, half silver and half base metal, because the price of silver after the First World War made sterling coinage uneconomic. From 1947 silver was removed entirely and circulating coins were struck in cupronickel.',
          'Those two dates apply across the pre-decimal denominations -- crowns, half crowns, florins, shillings, sixpences and threepences -- so learning them answers the question for a whole drawer of coins rather than one.',
        ],
      },
      {
        heading: 'What the silver is worth',
        paragraphs: [
          'Multiply 0.2273 by the spot price of silver per troy ounce. A .925 sterling half crown from 1919 or earlier contains 0.4205 troy ounces instead, nearly double, which is why the date check comes before anything else.',
          'Circulated George VI half crowns are common and trade on metal. Collector premium appears on the scarcer years and on genuinely uncirculated examples, and the 1937 proof issues from the coronation sets are a separate market.',
        ],
      },
    ],
    related: ['1967-canadian-silver-dollar', 'morgan-dollar'],
  },
  {
    slug: 'american-gold-eagle-1-oz',
    group: 'gold',
    type: 'bullion',
    tags: ['bullion', 'us-coin'],
    name: 'One Ounce American Gold Eagle',
    seoTitle: 'American Gold Eagle Value: 1 oz Gold Content',
    bluf: 'A one ounce American Gold Eagle contains exactly one troy ounce of pure gold and is worth the spot gold price plus a dealer premium of a few percent, despite weighing 33.93 grams and carrying a face value of fifty dollars.',
    description:
      'What a one ounce American Gold Eagle is worth: one full troy ounce of gold, why the coin weighs more than an ounce, and how the dealer premium over spot works.',
    primaryKeyword: 'american gold eagle value',
    secondaryKeywords: [
      '1 oz gold eagle price',
      'how much gold in a gold eagle',
      'gold eagle premium over spot',
      'gold eagle face value',
    ],
    years: { from: 1986 },
    country: 'United States',
    composition: '91.67% gold (22 karat), with silver and copper for hardness',
    weightGrams: 33.931,
    diameterMm: 32.7,
    goldOzt: 1,
    faceValue: '$50',
    commonality: 'common',
    identify: [
      'Read the reverse. A one ounce Gold Eagle states 1 OZ. FINE GOLD~50 DOLLARS. The fractional coins state their own weight and a lower face value.',
      'Weigh it. 33.931 grams gross. A coin that weighs 31.1 grams is not a Gold Eagle; it may be a Krugerrand-style .9167 coin of different specification or a one ounce pure gold coin such as a Maple Leaf.',
      'Measure it. 32.7 millimetres across and 2.87 millimetres thick. Counterfeits frequently get the weight right and the dimensions wrong, because gold-plated tungsten cannot match both.',
    ],
    sections: [
      {
        heading: 'Why the coin weighs more than an ounce of gold',
        paragraphs: [
          'The American Gold Eagle is 22 karat, alloyed with silver and copper so that it resists scratching in handling. The alloy means the coin must be heavier than a troy ounce to contain a troy ounce: 33.931 grams gross carries 31.103 grams of pure gold. The weight stamped on the coin refers to the gold, not to the coin.',
          'This is the single most common misunderstanding about the coin, and it goes in both directions -- people undervalue it by pricing the gross weight as gold, or worry that it is not pure. One troy ounce of gold is exactly what is in it.',
        ],
      },
      {
        heading: 'Value is spot plus premium, and the premium is published',
        paragraphs: [
          'Multiply the spot gold price per troy ounce by one. Then add the dealer premium, which for a common-date Gold Eagle is typically a few percent over spot when buying, and subtract a smaller spread when selling. Every bullion dealer publishes both numbers, which makes this the easiest coin on the site to price accurately.',
          'The fifty dollar face value is a legal formality required to make the coin legal tender, and it has never at any point in the coin’s history approached the metal value. Nobody spends these.',
        ],
      },
      {
        heading: 'Proof and burnished versions are a different market',
        paragraphs: [
          'The Mint also sells proof and burnished Gold Eagles to collectors, in packaging, at a substantial premium over bullion. Those trade on condition, original packaging and certificate, not purely on metal, and a proof coin removed from its capsule and handled loses most of what made it a proof coin.',
        ],
      },
    ],
  },
];

