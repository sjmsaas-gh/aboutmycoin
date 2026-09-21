/**
 * The common-questions registry: /common-questions and /common-questions/<slug>.
 *
 * One page per question, and the question is one somebody types. This is the
 * same programmatic pattern as the catalogue, held to the same rule: if you
 * cannot name the person who asks this and what they want back, the entry does
 * not get written. A registry makes a hundred thin pages as easy as five good
 * ones, and that is the failure mode, not the feature.
 *
 * ---------------------------------------------------------------------------
 * WHAT BELONGS HERE AND WHAT DOES NOT
 * ---------------------------------------------------------------------------
 *
 * Here: a question about coins in general, whose answer is the same whatever
 * coin the reader is holding. "What is spot price", "can I sell for spot",
 * "how do I tell if a coin is fake".
 *
 * Not here: anything whose answer depends on which coin it is. "How much is a
 * 1964 quarter worth" is a catalogue page; "what is the melt value of a 1964
 * quarter" is a melt page. A question that has to name a coin to be answered
 * is a coin page wearing a question mark.
 *
 * The fifteen below are ordered by how often the question is asked, and the
 * hub renders them in that order. That ordering is the only editorial act in
 * the file: everything else about a page -- its title, its description, its
 * breadcrumb, its schema -- is derived from the entry.
 *
 * ---------------------------------------------------------------------------
 * THE TITLE AND THE DESCRIPTION ARE FORMULAS
 * ---------------------------------------------------------------------------
 *
 * Neither is a field, for the reason the catalogue's are not: fifteen becomes
 * fifty, and a hand-typed <title> is a hand-typed <title> that nobody measures
 * against the suffix `Seo.astro` appends to it. So:
 *
 *   title       = Title Case of the question + " " + `titleTail`,
 *                 fitted to `TITLE_MAX` by dropping the tail.
 *   description = `lede` + " Covers <the page's own H2s>.",
 *                 fitted to `DESCRIPTION_MAX` by dropping headings off the end.
 *
 * The consequence worth having is the second one: a description cannot
 * describe a section the page does not contain, because it is built from the
 * headings the page renders. `titleTail` is the only keyword field with any
 * freedom in it, and `validateQuestions()` throws when the result of either
 * formula is too long, duplicated, or -- for a description -- too short to
 * have been worth writing.
 *
 * ---------------------------------------------------------------------------
 * THE RULES THAT GET BROKEN BY ACCIDENT
 * ---------------------------------------------------------------------------
 *
 * - **`answer` is the whole answer, in one or two sentences.** It is rendered
 *   as the opening paragraph AND used as the FAQPage `acceptedAnswer`, so it
 *   has to be true with no page around it. That is how an answer engine will
 *   quote it. No link markup in it: a quoted answer takes its anchors nowhere.
 * - **No two pages on the site claim one question.** Enforced across the
 *   catalogue, the melt section and this registry in
 *   `src/data/faq-registry.ts`, which throws.
 * - **A slug is never changed once published.** There are no redirects in a
 *   static build.
 * - **`related` throws on a slug that is not here**, the same way the
 *   catalogue's does, so a link is never written in anticipation of a page.
 * - **A link inside a paragraph is written `[anchor text](/path)`, and the
 *   path is checked against the pages the site actually builds.** Anchor text
 *   is the phrase the target page wants to rank for, never "click here" and
 *   never a bare URL. `validateQuestions()` throws on a path that no route
 *   produces -- an unpopulated tag archive is not a page -- which is the only
 *   defence a static site has against a link that 404s after a coin moves.
 * - **No number that moves is typed into `sections`.** Spot prices reach these
 *   pages through `spotPanel`, which renders them from `src/lib/spot.ts`. A
 *   price typed into a paragraph is a price nobody will remember to update,
 *   and the validator throws on a currency symbol appearing in one.
 *
 * ---------------------------------------------------------------------------
 * THE QUESTIONS STILL TO WRITE
 * ---------------------------------------------------------------------------
 *
 * Recorded as a list rather than as empty entries, because an entry with a
 * slug and no answer is a published URL with nothing behind it. In the order
 * they are worth writing:
 *
 *   what-is-a-proof-coin                "What is a proof coin?"
 *   what-is-a-mintage                   "What is a mintage?"
 *   how-do-i-store-coins                "How should I store coins?"
 *   are-commemorative-coins-worth-money "Are commemorative coins worth money?"
 *   do-i-pay-tax-on-selling-coins       "Do I pay tax when I sell coins?"
 *
 * The last one is not written until somebody can state the rule for one
 * jurisdiction and cite it; a tax answer that hedges is worse than no page.
 */
import {
  COINS,
  COIN_VALUE_ROOT,
  coinPath,
  groupPath,
  populatedGroups,
  populatedPairs,
  populatedTags,
  tagPath,
  typePath,
} from './coins';
import {
  MELT_ROOT,
  MELT_TAGGED_ROOT,
  meltGroupPath,
  meltPath,
  meltTagPath,
  meltTypePath,
  meltGroups,
  meltPairs,
  meltTags,
} from '../lib/melt';
import { CHEAT_SHEETS, CHEAT_SHEETS_ROOT, cheatSheetPath } from './cheat-sheets';
import { DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_MAX, fit, titleCase } from '../lib/meta';

/** A block of body copy. One heading, one or more paragraphs. */
export interface QuestionSection {
  heading: string;
  /** Plain text, with `[anchor text](/path)` for an internal link. */
  paragraphs: string[];
}

export interface Question {
  /** URL segment. Lowercase, hyphenated, and never changed once published. */
  slug: string;
  /**
   * The one category this question belongs to, by slug.
   *
   * One, required, and never a list: see the header of QUESTION_CATEGORIES.
   * A question filed under two topics is a page competing with one of its own
   * archives, and `validateQuestions()` throws on a slug no category declares.
   */
  category: string;
  /** The question as people ask it. The H1, and the FAQPage question. */
  question: string;
  /**
   * What follows the question in the <title>, when there is room for it.
   *
   * The one keyword field with any freedom in it: the title is the question
   * because the question is the query, and this is the phrase that makes the
   * result worth clicking. Dropped whole rather than truncated. Title Case,
   * because that is what it is joined to.
   */
  titleTail: string;
  /**
   * The complete answer in one or two sentences, plain text.
   *
   * Opening paragraph and `acceptedAnswer`, from this one string. It must
   * survive being quoted with no page around it.
   */
  answer: string;
  /**
   * The first sentence of the meta description. What the page concludes,
   * not what it contains -- the formula appends what it contains, from the
   * headings. Never the same sentence as `answer`.
   */
  lede: string;
  /** The single phrase this page exists for. One, not a list. */
  primaryKeyword: string;
  /** Phrasings that belong in H2s and body copy on THIS page. Never a second page. */
  secondaryKeywords: string[];
  sections: QuestionSection[];
  /**
   * Renders the site's reference metal prices, from `src/lib/spot.ts`, with
   * the dateline and the not-a-live-quote caveat attached.
   *
   * A field rather than a paragraph because the numbers move and the copy must
   * not. Set it on any page that would otherwise be tempted to type a price
   * into a sentence.
   */
  spotPanel?: boolean;
  /** Slugs of sibling questions. Throws at build time on one that is not here. */
  related?: string[];
  /*
   * No `published` and no `updated`. What a troy ounce is, what grading does
   * and whether cleaning a coin hurts it are not answers with a shelf life,
   * so a date on one records a file save and nothing more. Prices reach these
   * pages through `spotPanel`, which dates itself.
   */
}

export const QUESTIONS_ROOT = '/common-questions';

/* ===========================================================================
   Categories
   ===========================================================================

   Four topics, one question in exactly one of them, and a page each at
   /common-questions/topic/<slug>.

   Why a category and not a tag: a tag is many-to-many and unbounded, which is
   right for the catalogue, where a coin is legitimately silver AND a key date
   AND a Washington quarter. A question is not like that. "What is a troy
   ounce" belongs to the metal topic and to nothing else, and a question filed
   under three headings is a question whose page competes with two of its own
   archives. So membership is a single field on the question, required, and
   the registry throws on a topic with fewer than two questions in it -- a
   category holding one page is a second URL for that page.

   Why they are hand-written where the questions' titles are not: there are
   four of them and there will be four. The generated-copy rule exists because
   the tag registry is unbounded and hand-written copy would mean the pages
   somebody had time for; GROUPS in coin-taxonomy.ts are hand-written for the
   same reason categories are, which is that a bounded list of section
   headings is an editorial act and can be done properly once.

   The title and the description are still formulas, for the reason in the
   header: they are measured against limits, and a hand-typed title is one
   nobody measures.
   =========================================================================== */

export interface QuestionCategory {
  /** URL segment under /common-questions/topic. Never changed once published. */
  slug: string;
  /** Short label. Breadcrumbs, the hub's section headings, the "other topics" list. */
  name: string;
  /** The H1. Title Case, because it is a phrase the page competes for. */
  h1: string;
  /** The opening answer, and the first sentence of the generated description. */
  bluf: string;
  /** Body copy under the bluf. `[anchor text](/path)` links, checked like a question's. */
  intro: string[];
  /** The single phrase this page exists for. */
  primaryKeyword: string;
}

export const QUESTION_TOPIC_ROOT = `${QUESTIONS_ROOT}/topic`;

/**
 * In the order the hub renders them, which is the order of their most-asked
 * question. The first topic on the page is therefore the one most readers
 * arrived for, the same rule the questions themselves are ordered by.
 */
export const QUESTION_CATEGORIES: QuestionCategory[] = [
  {
    slug: 'what-a-coin-is-worth',
    name: 'What a coin is worth',
    h1: 'What a Coin Is Worth',
    bluf:
      'Four things set what a coin is worth, and the year stamped on the front is only one of them.',
    intro: [
      'The other three are the mint mark beside it, the condition of the surface and how many people collect the series. A coin struck in the hundreds of millions is common whatever its date, and the questions here are about telling the difference before anybody makes you an offer.',
      'Every answer stops where the coin starts mattering. For a figure on one particular coin, the [coin value catalogue](/coin-value) has the specifications and the metal content, and the [melt value](/melt-value) pages do the arithmetic.',
    ],
    primaryKeyword: 'what is my coin worth',
  },
  {
    slug: 'grading-and-condition',
    name: 'Grading and condition',
    h1: 'Coin Grading and Condition',
    bluf:
      'Condition is the largest variable in a coin’s price and the one most easily destroyed at home.',
    intro: [
      'The trade prices condition on a numbered scale, a grading service sells its opinion of where a coin sits on it, and a coin that has been cleaned leaves the scale altogether. The answers here cover what the number means, who issues it, when it is worth paying for and what takes a coin off the scale altogether.',
      'Read them before doing anything to a coin. Almost every avoidable loss in this section happens in the first ten minutes somebody owns a coin, with a cloth.',
    ],
    primaryKeyword: 'coin grading and condition',
  },
  {
    slug: 'silver-gold-and-spot-prices',
    name: 'Silver, gold and spot prices',
    h1: 'Silver, Gold and Spot Prices',
    bluf:
      'The metal in a coin is the part of its value that is calculated rather than judged.',
    intro: [
      'Spot price, the troy ounce and the fineness of the alloy are the three things that sum turns on, and none of them depends on anybody’s opinion of the coin. That makes the metal the floor under every other question about the coin.',
      'The figures themselves are on the [melt value](/melt-value) pages, each one dated and shown with the price it was worked at. These answers are what the figures mean.',
    ],
    primaryKeyword: 'silver coin questions',
  },
  {
    slug: 'selling-coins',
    name: 'Selling coins',
    h1: 'Selling Coins',
    bluf:
      'Nobody pays what a coin is worth, and knowing why is what makes an offer judgeable.',
    intro: [
      'Whoever buys your coin has to sell it again, and the gap between those two prices is their income rather than a slight against you. What changes with the venue is the size of the gap and how long you wait for it.',
      'The answers here cover what a buyer will hand over, where to find the buyer, and why the metal price you looked up is not the number on the cheque.',
    ],
    primaryKeyword: 'selling coins',
  },
];

export const QUESTIONS: Question[] = [
  {
    slug: 'how-much-is-my-coin-worth',
    category: 'what-a-coin-is-worth',
    question: 'How much is my coin worth?',
    titleTail: 'How to Find Out',
    answer:
      'A coin is worth whichever is higher: the metal in it, or what a collector will pay for that date, mint mark and condition. The metal is arithmetic you can settle in a minute, and the collector premium comes from three things printed on the coin or visible on its surface.',
    lede: 'Every coin is worth its metal or its collector premium, whichever is higher.',
    primaryKeyword: 'how much is my coin worth',
    secondaryKeywords: [
      'what is my coin worth',
      'coin value',
      'how to value a coin',
      'what makes a coin valuable',
    ],
    sections: [
      {
        heading: 'The metal floor',
        paragraphs: [
          'Every coin has a floor, and the floor is what the metal in it would fetch as metal. The sum is one multiplication: the coin’s metal content in troy ounces times the [spot price](/common-questions/what-is-spot-price) of that metal. The working is on the coin’s [melt value](/melt-value) page.',
          'For United States coinage the floor only matters on silver and gold. A dime, quarter or half dollar dated 1964 or earlier is [90% silver](/coin-value/tagged/90-percent-silver). The same denominations dated 1965 or later are copper-nickel clad, and the metal in them is worth a fraction of what the coin spends for.',
        ],
      },
      {
        heading: 'The date and the mint mark',
        paragraphs: [
          'Two coins that look identical can differ in value by a factor of a thousand, and what separates them is printed on the coin. A series is struck at several mints in several years, some of those combinations were struck in small numbers, and those are the ones worth money. Nothing about the design differs.',
          'The mint is identified by a single letter, and its position moved over the life of most series, which is why the identification checklist on every coin page here says where to look. If the letters mean nothing to you yet, start with [what the letters on a coin mean](/common-questions/what-do-the-letters-on-a-coin-mean).',
        ],
      },
      {
        heading: 'Condition',
        paragraphs: [
          'On a common date, condition is the whole of the collector premium: a worn example is worth its metal and an unworn one is worth several times that. On a scarce date, condition multiplies a number that was already large. Either way the question is the same one, and it is answered in [does condition affect a coin’s value](/common-questions/does-condition-affect-coin-value).',
          'Condition is judged on a 70-point scale that the trade agrees on, and the grade a dealer gives your coin is the grade the price guides are keyed to. [What coin grading is](/common-questions/what-is-coin-grading) explains the scale and who issues it.',
        ],
      },
      {
        heading: 'What nobody pays extra for',
        paragraphs: [
          'Age on its own is not value, and this is the single most expensive misunderstanding in the hobby: a Roman bronze can be bought for the price of a sandwich and a 1955 cent cannot. The reason is survival, not antiquity, and it is set out in [are old coins worth money](/common-questions/are-old-coins-worth-money).',
          'Nor does a shine help. Cleaning a coin removes original surface and the trade can see it from across a table, which is why [cleaning reduces a coin’s value](/common-questions/does-cleaning-a-coin-reduce-value) rather than raising it. Whatever you decide about the coin, decide it before you touch it with anything.',
        ],
      },
      {
        heading: 'Turning value into an offer',
        paragraphs: [
          'A value is a benchmark and an offer is a transaction, and they are never the same number. Anybody buying has to resell, so they buy below what the coin is worth; the gap is the business. What that means in practice is covered in [how much can I sell my coin for](/common-questions/how-much-can-i-sell-my-coin-for) and [where to sell coins](/common-questions/where-can-i-sell-my-coins).',
          'Look your coin up in the [coin value catalogue](/coin-value) to get the metal figure and the identification checklist for its series, then judge any offer against that. An offer you cannot explain the gap in is an offer to walk away from.',
        ],
      },
    ],
    related: [
      'does-condition-affect-coin-value',
      'how-much-can-i-sell-my-coin-for',
      'are-old-coins-worth-money',
    ],
  },
  {
    slug: 'does-condition-affect-coin-value',
    category: 'grading-and-condition',
    question: 'Does condition affect a coin’s value?',
    titleTail: 'Grades Explained',
    answer:
      'Condition is the largest single factor in what a coin is worth, and on a common date it is the only one: the same coin worn smooth and the same coin as it left the press can differ in price by fifty times or more. The line that matters most is whether the coin has been circulated at all.',
    lede: 'Condition is the largest factor in a coin’s price, and the decisive line is whether it circulated.',
    primaryKeyword: 'does condition affect coin value',
    secondaryKeywords: [
      'coin condition and value',
      'circulated vs uncirculated coins',
      'coin wear',
      'how condition affects coin price',
    ],
    sections: [
      {
        heading: 'Why condition moves the price',
        paragraphs: [
          'Coins were struck in the hundreds of millions and spent. What is scarce is not the coin, it is the coin in the state it left the die: a few were set aside in 1964 and the rest went into tills, pockets and coin jars for a decade. Every collector wants the same thing, there is a fixed supply of it, and the price reflects that.',
          'This is why condition dominates on common dates. A worn [1964 Washington quarter](/coin-value/silver/quarter/1964-washington-quarter) is worth its silver and nothing else, because millions of equally worn ones are available. An unworn one is competing in a much smaller pool.',
        ],
      },
      {
        heading: 'Circulated or not',
        paragraphs: [
          'One question does most of the work. Has the coin been in circulation? A coin that has been spent shows wear first on the highest points of the design — the cheekbone, the hair above the ear, the eagle’s breast — where the metal stood proudest of the surface and rubbed first.',
          'Look at those points under a lamp, tilting the coin. If they are flat and slightly brighter than the fields around them, the coin has circulated. If the finest details are still crisp and the surface carries an unbroken lustre that moves as you tilt it, it did not, and it is in the category worth having examined.',
        ],
      },
      {
        heading: 'The 70-point scale',
        paragraphs: [
          'The trade grades on a numbered scale from 1 to 70, and the numbers cluster into bands anyone can use. Below 20 is well worn, with the design readable but the fine detail gone. The 20s and 30s show clear wear on the high points and complete detail everywhere else. The 40s and 50s show light rub only. From 60 up the coin never circulated at all, and 60 to 70 measures how few marks it picked up in a mint bag.',
          'Those last ten points are where most of the money lives on a common coin, and they are also where judgement is hardest and least forgiving: one grading point at the top of the scale can double a price. [What coin grading is](/common-questions/what-is-coin-grading) covers who assigns the number and what their opinion is worth.',
        ],
      },
      {
        heading: 'Where condition stops mattering',
        paragraphs: [
          'Condition stops mattering at the metal. A [silver coin](/coin-value/silver) worn nearly smooth is still worth its silver, and that floor does not move with the grade; the melt figure is calculated from the struck weight, and circulation wear takes a fraction of a percent off it.',
          'Condition also stops mattering once the surface has been altered. A cleaned coin is graded as cleaned whatever detail remains, and it is priced below an honest worn example. That is not an aesthetic judgement but a market one, and it is explained in [does cleaning a coin reduce its value](/common-questions/does-cleaning-a-coin-reduce-value).',
        ],
      },
    ],
    related: [
      'what-is-coin-grading',
      'does-cleaning-a-coin-reduce-value',
      'should-i-get-my-coin-graded',
    ],
  },
  {
    slug: 'what-is-coin-grading',
    category: 'grading-and-condition',
    question: 'What is coin grading?',
    titleTail: 'The 70-Point Scale',
    answer:
      'Coin grading is the assessment of how much wear and how many marks a coin carries, expressed as a number from 1 to 70 on a scale the whole trade prices against. A grading service seals the coin in a tamper-evident holder with that number on it, which turns one person’s opinion into something a buyer will pay against without seeing the coin.',
    lede: 'Grading puts a coin’s condition on a 1-to-70 scale that the whole trade prices against.',
    primaryKeyword: 'what is coin grading',
    secondaryKeywords: [
      'coin grading scale',
      'coin grading companies',
      'sheldon scale',
      'what does MS65 mean',
    ],
    sections: [
      {
        heading: 'What the number measures',
        paragraphs: [
          'The scale runs from 1, a coin worn until only the outline of the design survives, to 70, a coin with no wear and no mark visible at ten times magnification. It was built for early American copper, where collectors needed to price the difference between a barely readable cent and a slightly readable one, and the trade extended it to everything.',
          'Above 60 the coin never circulated, and the prefix changes to say how it was made: MS for mint state, a coin struck for circulation that never went into it, and PR or PF for proof, a coin struck twice on polished dies for collectors. MS65 is a mint state coin with a handful of small marks. MS63 is the same coin with more of them.',
        ],
      },
      {
        heading: 'Who assigns it',
        paragraphs: [
          'Anyone can state a grade, and what they are stating is an opinion. Four grading services carry weight in the United States market: PCGS and NGC are the two the trade prices against, with ANACS and ICG behind them. They examine the coin, authenticate it, assign a grade and seal it in a plastic holder with a certification number that can be looked up.',
          'The holder is doing something specific. It lets a coin be bought by someone who has not seen it, priced against published sales of the same coin at the same grade, and sold again without the argument starting over. That is the whole product, and it is why the same coin raw and graded fetch different money.',
        ],
      },
      {
        heading: 'What a grade cannot do',
        paragraphs: [
          'A grade is not a valuation, and no grading service issues one. It says what the coin is; what it is worth is set by what the last few examples sold for, which moves with the market and with how many have been graded since.',
          'A grade also does not rescue a coin that has been altered. A cleaned, polished, repaired or environmentally damaged coin comes back in a holder marked with that fact instead of a number, and it is priced accordingly. [Cleaning a coin](/common-questions/does-cleaning-a-coin-reduce-value) is the way most people produce that outcome without meaning to.',
        ],
      },
      {
        heading: 'When it is worth paying for',
        paragraphs: [
          'Grading costs a fee per coin, and it is worth paying when the fee is small against the difference it makes: a coin whose value turns on a judgement call, a coin scarce enough to be worth faking, or a coin heading to an auction where bidders cannot handle it. On a common circulated coin the fee exceeds the coin, and the trade will price it across a counter in seconds for nothing.',
          '[Should I get my coin graded](/common-questions/should-i-get-my-coin-graded) works through the decision with the numbers in front of you, and [does condition affect a coin’s value](/common-questions/does-condition-affect-coin-value) covers what the grade is measuring before you pay anyone to measure it.',
        ],
      },
    ],
    related: [
      'should-i-get-my-coin-graded',
      'does-condition-affect-coin-value',
      'how-can-i-tell-if-my-coin-is-fake',
    ],
  },
  {
    slug: 'what-is-spot-price',
    category: 'silver-gold-and-spot-prices',
    question: 'What is spot price?',
    titleTail: 'Silver and Gold',
    answer:
      'Spot price is what one troy ounce of a metal is trading for on the international market right now. It is the number a coin’s melt value is calculated from, and it is not the price a dealer will pay you for a coin.',
    lede: 'Spot is the wholesale price of one troy ounce of metal, and it is a ceiling rather than an offer.',
    primaryKeyword: 'what is spot price',
    secondaryKeywords: [
      'spot price meaning',
      'silver spot price explained',
      'gold spot price meaning',
      'spot price vs melt value',
    ],
    spotPanel: true,
    sections: [
      {
        heading: 'Where the number comes from',
        paragraphs: [
          'Spot is the price for immediate delivery of refined metal in wholesale quantity, quoted in US dollars per troy ounce. It is set by continuous trading between banks, refiners, miners and funds, and it moves for as long as those markets are open — through the night, and every day except the weekend.',
          'Nobody publishes an official spot price. What you see quoted is the last traded price, or a benchmark taken from it, so two sources can show figures a few cents apart at the same moment. For working out what the metal in a coin is worth, that difference does not matter.',
        ],
      },
      {
        heading: 'A troy ounce is not an ounce',
        paragraphs: [
          'Precious metal is weighed in troy ounces. One troy ounce is 31.1035 grams; the ounce on a kitchen scale is 28.3495 grams. A troy ounce is the heavier of the two by about a tenth, so treating one as the other overstates what you have by that much. [What a troy ounce is](/common-questions/what-is-a-troy-ounce) covers the unit and the coin weights that use it.',
          'Every metal weight in this catalogue is in troy ounces, for exactly this reason. A [1964 Washington quarter](/coin-value/silver/quarter/1964-washington-quarter) holds 0.1808 troy ounces of silver, and that figure multiplied by the spot price is the whole melt calculation.',
        ],
      },
      {
        heading: 'Why spot is a ceiling',
        paragraphs: [
          'A coin’s melt value is its metal content times spot. That is the most the metal in it is worth, and it is the right number to start from, but it is not an offer. A dealer buys below spot and sells above it, and the gap between the two is the business. [Can I sell my coin for spot price](/common-questions/can-i-sell-my-coin-for-spot-price) explains why the answer is almost always no.',
          'What the gap is depends on the metal, the form it is in and how much of it you have. Treat melt value as the benchmark you judge an offer against, rather than the price you expect to be handed.',
        ],
      },
      {
        heading: 'Why a melt figure carries a date',
        paragraphs: [
          'Spot moves every few seconds, and a static page cannot follow it. So every melt figure states the price it was worked at and the time that price was read, and each [melt value](/melt-value) page carries a table of what the same coin comes to at other prices either side of it.',
          'Look up today’s spot price, find the nearest row, and read the answer off it. If you want the exact figure, the arithmetic is on the page: troy ounces times price per troy ounce.',
        ],
      },
    ],
    related: [
      'what-is-a-troy-ounce',
      'can-i-sell-my-coin-for-spot-price',
      'how-much-can-i-sell-my-coin-for',
    ],
  },
  {
    slug: 'does-cleaning-a-coin-reduce-value',
    category: 'grading-and-condition',
    question: 'Does cleaning a coin reduce its value?',
    titleTail: 'Yes, Sharply',
    answer:
      'Yes, and on a collectable coin the loss is severe: cleaning strips the original surface, the trade recognises it instantly, and a cleaned coin sells for a fraction of what the same coin would have brought untouched. The damage cannot be undone, so the rule is to do nothing until you know what you have.',
    lede: 'Cleaning strips a coin’s original surface, the trade sees it instantly, and the loss is permanent.',
    primaryKeyword: 'does cleaning a coin reduce its value',
    secondaryKeywords: [
      'should i clean my coins',
      'cleaned coin value',
      'how to tell if a coin has been cleaned',
      'coin toning',
    ],
    sections: [
      {
        heading: 'What cleaning actually removes',
        paragraphs: [
          'A struck coin has a surface that only the dies could produce: flow lines in the metal that throw light in a rotating pattern, called lustre. Over decades the outermost layer of metal reacts with the air and darkens into toning, which sits on top of that surface and protects it.',
          'Polishing, rubbing or dipping removes the toning and takes some of the surface with it. What is left is brighter and flatter, with hairline scratches all running the same way under a lamp, and no lustre to rotate. The coin is now shiny in the way a worn spoon is shiny, and it reads as wrong at arm’s length.',
        ],
      },
      {
        heading: 'Why the market punishes it',
        paragraphs: [
          'Original surface is the one thing that cannot be replaced. Wear is expected on a circulated coin and priced into the grade; cleaning is damage inflicted after the fact, and it puts the coin into a separate category that the price guides do not cover.',
          'The grading services make this concrete. A cleaned coin does not receive a numeric grade — it comes back in a holder marked as cleaned, with the detail level noted, which is the market’s way of saying it is no longer comparable to graded examples. [What coin grading is](/common-questions/what-is-coin-grading) covers how that designation works.',
        ],
      },
      {
        heading: 'What to do instead',
        paragraphs: [
          'Nothing, in almost every case. Handle the coin by its edge, keep it dry, and put it in an inert holder rather than a paper envelope or a plastic bag with softeners in it. Dirt on a coin is not the problem people think it is, and buyers would far rather see it than see what came off with it.',
          'There is one narrow exception, and it is about arresting damage rather than improving looks: a coin with active corrosion or with something wet on it can be rinsed in distilled water and patted dry, no rubbing. Anything beyond that, on a coin worth more than its metal, belongs to a conservation service.',
        ],
      },
      {
        heading: 'When it does not matter',
        paragraphs: [
          'Bulk [junk silver](/coin-value/tagged/junk-silver) is bought by weight and sold to a refiner, and the surface has no bearing on the sum. If a coin is worth its metal and nothing more, cleaning it costs nothing but time — and it gains nothing either, because [melt value](/melt-value) is decided by what is in the coin rather than how it looks.',
          'The risk is not knowing which case you are in. Check the date and mint mark against the [coin value catalogue](/coin-value) before you decide a coin is common, because the coins most often cleaned by their owners are the ones that looked ordinary and were not.',
        ],
      },
    ],
    related: [
      'does-condition-affect-coin-value',
      'what-is-coin-grading',
      'how-much-is-my-coin-worth',
    ],
  },
  {
    slug: 'are-old-coins-worth-money',
    category: 'what-a-coin-is-worth',
    question: 'Are old coins worth money?',
    titleTail: 'Age Is Not Value',
    answer:
      'Age on its own is worth nothing: a two-thousand-year-old Roman bronze can be bought for pocket money, while a cent from 1909 sells for four figures. What sets the price is how many survive and how many people collect them, and a coin struck in the hundreds of millions is common however old it is.',
    lede: 'Age does not set a coin’s price; survival and demand do, and old coins are often common.',
    primaryKeyword: 'are old coins worth money',
    secondaryKeywords: [
      'are old coins valuable',
      'is my old coin rare',
      'what makes a coin rare',
      'old coin value',
    ],
    sections: [
      {
        heading: 'Survivors rather than years',
        paragraphs: [
          'Coins are made in enormous numbers and most of them outlive the people who spent them. What decides scarcity is how many were struck, how many were melted afterwards and how many were kept, and none of those follow from the date. Roman coins survive by the hundreds of thousands because they were buried in hoards; a 1933 double eagle survives in single figures because the rest were recalled and melted.',
          'This is also why a series tells you more than a century does. Within one design struck for fifty years, a handful of year-and-mint combinations were struck in small numbers, and those are the coins worth money. The rest look identical and are not.',
        ],
      },
      {
        heading: 'What an old coin often has',
        paragraphs: [
          'Metal. Coins made before the middle of the twentieth century were often struck in silver or gold because the metal was the money, and that gives them a floor no modern circulating coin has. A worn Victorian shilling and a worn [silver quarter](/coin-value/silver/quarter) are both worth their silver on any day of the week.',
          'That floor is worth checking first, because it is the part of the answer that can be calculated rather than judged. The [melt value](/melt-value) pages here give it for every coin in the catalogue, sorted so the richest coins come first.',
        ],
      },
      {
        heading: 'What does add value',
        paragraphs: [
          'A low mintage for that year and mint, which you check by reading the date and the mint mark. An unworn surface, which is scarce on any coin old enough to have circulated. And a die variety or an error, which is a coin that left the mint different from its siblings.',
          'All three are read off the coin rather than deduced from its age, and they stack: an unworn example of a low-mintage date is where the large prices in a common series are. [How much is my coin worth](/common-questions/how-much-is-my-coin-worth) sets out the order to check them in.',
        ],
      },
      {
        heading: 'Sorting an inherited box',
        paragraphs: [
          'Sort by metal before you sort by date. Pull out anything silver or gold using the test in [how can I tell if a coin is silver](/common-questions/how-can-i-tell-if-a-coin-is-silver), because that pile has a floor under it and the rest does not. Then check dates and mint marks in the remainder against the [coin value catalogue](/coin-value).',
          'Do not clean anything, and do not sort by how good a coin looks. The two mistakes cost the same accumulation twice: once when the good coins are polished, and again when they are sold as scrap because nobody read the dates.',
        ],
      },
    ],
    related: [
      'how-much-is-my-coin-worth',
      'how-can-i-tell-if-a-coin-is-silver',
      'are-error-coins-worth-money',
    ],
  },
  {
    slug: 'how-can-i-tell-if-a-coin-is-silver',
    category: 'silver-gold-and-spot-prices',
    question: 'How can I tell if a coin is silver?',
    titleTail: 'Four Tests',
    answer:
      'For United States coins the date settles it: dimes, quarters and half dollars dated 1964 or earlier are 90% silver, and those dated 1965 or later are not. Where the date does not settle it, the edge, the weight, a magnet and the sound of the coin will.',
    lede: 'The date answers it for most US coins; the edge, the scales and a magnet answer the rest.',
    primaryKeyword: 'how can i tell if a coin is silver',
    secondaryKeywords: [
      'is my coin silver',
      'silver coin test',
      'what years are coins silver',
      'silver coin edge',
    ],
    sections: [
      {
        heading: 'Reading the date',
        paragraphs: [
          'United States dimes, quarters and half dollars struck in 1964 and earlier are 90% silver. From 1965 they are copper-nickel clad, with one exception: half dollars from 1965 to 1970 are 40% silver. Silver dollars dated 1935 and earlier are 90% silver, and the dollar coins struck from 1971 are not, apart from collector issues sold by the mint.',
          'Cents and five-cent pieces are not silver in any ordinary year. The one exception is the five-cent piece of 1942 to 1945, which was struck in an alloy containing 35% silver and carries a large mint mark above the building on the reverse. The full list of dates is on the [90% silver coins](/coin-value/tagged/90-percent-silver) page.',
        ],
      },
      {
        heading: 'The edge test',
        paragraphs: [
          'Stand the coin on its rim and look at the edge. A 90% silver dime, quarter or half is silver-grey the whole way through. A clad coin of the same denomination shows a copper stripe sandwiched between two lighter layers, because that is exactly what it is.',
          'This test takes a second, needs nothing, and settles the question on a coin whose date is worn away. The only coins it misleads on are the 40% silver halves, whose edge shows a faint stripe as well.',
        ],
      },
      {
        heading: 'The weight test',
        paragraphs: [
          'Silver is denser than the copper-nickel that replaced it, and the mint struck the silver coins heavier. A silver dime weighs 2.50 g against 2.27 g for a clad one; a silver quarter 6.25 g against 5.67 g; a silver half 12.50 g against 11.34 g. A kitchen scale reading to a tenth of a gram separates them without argument.',
          'Weight is also how you catch a counterfeit, because faking the weight and the diameter and the metal at once is hard. Compare against the specifications on the coin’s own page in the [coin value catalogue](/coin-value), and see [how can I tell if my coin is fake](/common-questions/how-can-i-tell-if-my-coin-is-fake) for what else to measure.',
        ],
      },
      {
        heading: 'The magnet and the ring',
        paragraphs: [
          'Silver is not magnetic. Neither is copper-nickel clad, so a magnet does not separate those two, but it does catch plated steel and most cheap fakes at once: if a coin jumps to a magnet it is not silver, and nothing further needs checking.',
          'Dropped on a hard surface, a silver coin rings for a second or more in a clear high note, where a clad coin gives a short dull click. It is the least precise of the four tests and the one collectors use most, because it needs no equipment. Once you know what you have, the [silver melt values](/melt-value/silver) pages give what the metal in it is worth.',
        ],
      },
    ],
    related: [
      'what-is-spot-price',
      'how-can-i-tell-if-my-coin-is-fake',
      'how-much-is-my-coin-worth',
    ],
  },
  {
    slug: 'what-do-the-letters-on-a-coin-mean',
    category: 'what-a-coin-is-worth',
    question: 'What do the letters on a coin mean?',
    titleTail: 'Mint Marks',
    answer:
      'A single small letter near the date or on the reverse is the mint mark, and it says which facility struck the coin: D for Denver, S for San Francisco, P or no letter for Philadelphia, W for West Point. Initials elsewhere in the design are the designer’s, and they mean nothing for value.',
    lede: 'The small letter is the mint mark and it names the facility; designers’ initials are not it.',
    primaryKeyword: 'what do the letters on a coin mean',
    secondaryKeywords: [
      'mint mark meaning',
      'what does D mean on a coin',
      'where is the mint mark',
      'no mint mark coin',
    ],
    sections: [
      {
        heading: 'The mint mark itself',
        paragraphs: [
          'United States coins carry a letter identifying the mint that struck them. D is Denver, S is San Francisco, W is West Point, and P or no letter at all is Philadelphia, which struck most coins without a mark until 1980. Three closed mints appear on older coins: CC for Carson City, O for New Orleans and C or D for the two southern gold mints of the nineteenth century.',
          'The mark exists so the mint could trace a bad batch to the building that made it. It matters to a collector because mintages are reported per mint, and the scarce issue in a series is almost always one mint in one year rather than the year itself.',
        ],
      },
      {
        heading: 'Where to look for it',
        paragraphs: [
          'The position moved over the life of most series, which is why a general answer is useless and a per-series answer is not. On Washington quarters it sits on the reverse below the eagle until 1964, and on the obverse to the right of the ribbon in the hair from 1968. The position is stated series by series, on the page for the coin in hand.',
          'A coin with no mint mark is not an error and is rarely unusual: it is a Philadelphia coin. The narrow exceptions, where a mark was omitted by accident on a coin that should have had one, are documented per series rather than assumed.',
        ],
      },
      {
        heading: 'The other letters in the design',
        paragraphs: [
          'The initials tucked into the truncation of the bust or at the base of the design belong to the designer. JF on a Washington quarter is John Flanagan, VDB on a Lincoln cent is Victor David Brenner, AW on a Mercury dime is Adolph Weinman. They appear on every coin of that design and add nothing to the value.',
          'The one famous exception is a matter of position rather than initials: on the cent of 1909 the designer’s initials were placed on the reverse, removed within weeks, and restored to the obverse decades later, which makes the first version a date to check rather than a letter to worry about.',
        ],
      },
      {
        heading: 'What to do with it',
        paragraphs: [
          'Write down the date and the mint mark together, in that order, because that pair is how every mintage table and every price guide is indexed. A quarter is not a 1964 quarter for pricing purposes; it is a 1964 or a 1964-D, and the tables treat them separately.',
          'Then look the pair up. The [Washington quarter](/coin-value/tagged/washington-quarter) pages here list the years and what each is made of, and [how much is my coin worth](/common-questions/how-much-is-my-coin-worth) covers what to check after the date and the mark.',
        ],
      },
    ],
    related: [
      'how-much-is-my-coin-worth',
      'are-old-coins-worth-money',
      'are-error-coins-worth-money',
    ],
  },
  {
    slug: 'how-much-can-i-sell-my-coin-for',
    category: 'selling-coins',
    question: 'How much can I sell my coin for?',
    titleTail: 'What Buyers Pay',
    answer:
      'Less than the coin is worth, because whoever buys it has to resell it and the gap between the two prices is their income. On a coin valued for its metal the gap is narrow and predictable; on a collectable coin it depends on how quickly the buyer can find the next owner.',
    lede: 'Every buyer pays below the coin’s value, and how far below depends on what they will do with it.',
    primaryKeyword: 'how much can i sell my coin for',
    secondaryKeywords: [
      'what will a dealer pay for my coin',
      'coin buy price vs sell price',
      'selling coins to a dealer',
      'coin dealer spread',
    ],
    sections: [
      {
        heading: 'Value against offer',
        paragraphs: [
          'A value is what a coin is worth in a completed sale between a willing buyer and a willing seller. An offer is what somebody will hand you today for the right to go and find that buyer themselves. The difference pays for their time, their premises, their capital and the risk that the coin does not sell.',
          'This is not a coin-trade peculiarity; it is how every dealt market works, and it is the reason a price guide and a cheque never match. Knowing the value is still what protects you, because it is the only thing that makes an offer judgeable.',
        ],
      },
      {
        heading: 'Coins valued for metal',
        paragraphs: [
          'Here the arithmetic is close to fixed. The buyer is reselling to a refiner or to another stacker at a known price, so the offer sits a predictable step below [melt value](/melt-value), and the step narrows as the quantity rises. A jar of [junk silver](/coin-value/tagged/junk-silver) is priced in one multiplication and settled in minutes.',
          'The step moves with the metal market, so no fixed figure holds for long. Work out the melt figure first, ask two buyers, and let the difference between their answers tell you what the going rate is this week.',
        ],
      },
      {
        heading: 'Collectable coins',
        paragraphs: [
          'The spread is wider and far less predictable, because the buyer is taking a view on how long the coin sits in a case. A common date in a common grade is slow, and the offer reflects it. A coin that a dealer already has a customer for is quick, and the offer reflects that too.',
          'Two things narrow the spread more than haggling does: knowing the date and mint mark you actually hold, and having the grade settled by someone whose opinion the buyer accepts. [Should I get my coin graded](/common-questions/should-i-get-my-coin-graded) covers when that is worth paying for.',
        ],
      },
      {
        heading: 'Getting a number you can trust',
        paragraphs: [
          'Get more than one offer, in the same week, on the same coin, and do not tell the second buyer what the first said. Two independent numbers on one coin tell you more about the market than any published guide, because they are what somebody will actually pay rather than what somebody else paid for a different example.',
          'Then decide where to sell, which is a separate question with a different answer for metal and for collectables: [where can I sell my coins](/common-questions/where-can-i-sell-my-coins). Start from the coin’s own page in the [coin value catalogue](/coin-value) so you arrive knowing the floor.',
        ],
      },
    ],
    related: [
      'where-can-i-sell-my-coins',
      'can-i-sell-my-coin-for-spot-price',
      'how-much-is-my-coin-worth',
    ],
  },
  {
    slug: 'where-can-i-sell-my-coins',
    category: 'selling-coins',
    question: 'Where can I sell my coins?',
    titleTail: 'Five Venues',
    answer:
      'Bulk silver and gold go to a bullion dealer, who prices them off the metal in one calculation. Collectable coins go to a coin shop, a coin show, an auction house or an online marketplace, and which of those pays best depends on how much the coin is worth and how long you are willing to wait.',
    lede: 'Metal goes to a bullion dealer; collectable coins go to a shop, a show, an auction or a marketplace.',
    primaryKeyword: 'where can i sell my coins',
    secondaryKeywords: [
      'where to sell coins',
      'sell coins near me',
      'selling coins online',
      'coin auction house',
    ],
    sections: [
      {
        heading: 'Splitting the pile first',
        paragraphs: [
          'Metal and collectables are sold to different people for different reasons, and mixing them means one of the two gets priced by somebody who does not want it. Separate anything silver or gold using the tests in [how can I tell if a coin is silver](/common-questions/how-can-i-tell-if-a-coin-is-silver), then work through the rest for dates and mint marks.',
          'This step is also your protection. A buyer offering one number for a mixed box is pricing the box at the value of its worst coin and keeping whatever is better than that.',
        ],
      },
      {
        heading: 'Selling metal to a bullion dealer',
        paragraphs: [
          'Bullion dealers buy by weight against the day’s [spot price](/common-questions/what-is-spot-price), quote on the spot and pay immediately. They have no interest in the date on the coin, which makes them fast and makes them the wrong buyer for anything with a premium. Bring the [melt value](/melt-value) figure with you so the quote can be checked in your head.',
          'Two quotes are worth the extra hour. Bullion buying is competitive and the difference between two shops in one town is real money on a jar of silver.',
        ],
      },
      {
        heading: 'Four routes for collectables',
        paragraphs: [
          'A local coin shop is the fastest and pays the least, which is a fair trade for cash today and no fees. A coin show puts twenty dealers in one room competing for the same coin, and it is the best place to sell mid-value material without waiting.',
          'An auction house suits a coin worth enough to carry the commission and the months it takes, because a room of collectors bidding against each other is the only mechanism that reliably finds the top of the market. An online marketplace reaches the most buyers of all, and it hands you the work: photographs, grading claims you are answerable for, postage, and the risk of a chargeback.',
        ],
      },
      {
        heading: 'What to have ready',
        paragraphs: [
          'The date and mint mark of every coin worth more than its metal, the melt figure for everything that is not, and photographs of both sides under a single light source. Coins in inert holders, handled by the edge. Nothing cleaned, for the reason in [does cleaning a coin reduce its value](/common-questions/does-cleaning-a-coin-reduce-value).',
          'And a number in your head before the first conversation. [How much can I sell my coin for](/common-questions/how-much-can-i-sell-my-coin-for) covers what a realistic offer looks like, and the [coin value catalogue](/coin-value) is where to get the floor for each coin you are taking.',
        ],
      },
    ],
    related: [
      'how-much-can-i-sell-my-coin-for',
      'can-i-sell-my-coin-for-spot-price',
      'how-can-i-tell-if-my-coin-is-fake',
    ],
  },
  {
    slug: 'can-i-sell-my-coin-for-spot-price',
    category: 'selling-coins',
    question: 'Can I sell my coin for spot price?',
    titleTail: 'Melt vs Offer',
    answer:
      'No, and it is not a sign of a bad buyer: spot is a wholesale price for refined metal in quantity, and a coin is neither refined nor wholesale until somebody has sorted, verified, transported and processed it. Every one of those steps sits between your coin and spot, and the buyer is paid for them out of the gap.',
    lede: 'Spot is a wholesale price for refined metal, so a coin sells below it — and sometimes above.',
    primaryKeyword: 'can i sell my coin for spot price',
    secondaryKeywords: [
      'selling silver at spot price',
      'why do dealers pay under spot',
      'spot price vs what dealers pay',
      'silver premium over spot',
    ],
    sections: [
      {
        heading: 'What spot is a price for',
        paragraphs: [
          'Spot quotes refined metal of known purity, in commercial quantity, deliverable now, between parties who trade with each other daily. A coin is a small piece of alloy of uncertain provenance that has to be identified, weighed, authenticated and then accumulated with others before it is any of those things.',
          'The gap between the two is the cost of closing that distance, and it falls as the quantity rises and the verification gets easier. That is why a sealed bar and a jar of mixed silver are quoted so differently even though the metal is identical. [What spot price is](/common-questions/what-is-spot-price) covers where the number itself comes from.',
        ],
      },
      {
        heading: 'When a coin sells above spot',
        paragraphs: [
          'Often, in fact. Anything with a collector premium is priced by date and grade rather than by weight, and it leaves the metal behind entirely. Bullion coins sold by a government mint carry a premium of their own, because buyers pay for a known weight and purity in a recognised form.',
          'This is the reason the first question is never what your silver weighs. It is whether the coin is worth more than its silver, which is what the date and mint mark decide and what the [coin value catalogue](/coin-value) is for.',
        ],
      },
      {
        heading: 'How to get close to spot',
        paragraphs: [
          'Quantity, sorting and form. A hundred ounces in one transaction is worth more per ounce than five, because the buyer’s costs are mostly per visit rather than per coin. Sorting by denomination and composition removes work from their side, and a pile of one thing beats a box of everything.',
          'Form matters as much: recognised coins in known weights need less verification than scrap or unfamiliar pieces, and they are priced accordingly. A bag of [90% silver US coins](/coin-value/tagged/90-percent-silver) is the easiest thing in the shop to price, and the quote reflects that.',
        ],
      },
      {
        heading: 'Using melt value properly',
        paragraphs: [
          'Melt value is a benchmark, not a target. Calculate it before you walk in, judge every offer against it, and treat the size of the gap as the thing you are shopping for. A buyer whose gap is twice the next one’s is telling you something no price guide can.',
          'The [melt value](/melt-value) pages here give the figure for each coin, and the group pages carry a column of what the same coin comes to at other spot prices, so the answer stays usable when the metal moves after the page was built.',
        ],
      },
    ],
    related: [
      'what-is-spot-price',
      'how-much-can-i-sell-my-coin-for',
      'where-can-i-sell-my-coins',
    ],
  },
  {
    slug: 'what-is-a-troy-ounce',
    category: 'silver-gold-and-spot-prices',
    question: 'What is a troy ounce?',
    titleTail: 'Grams and Coin Weights',
    answer:
      'A troy ounce is the unit precious metal is weighed in, and it is 31.1035 grams — about a tenth heavier than the 28.3495 gram ounce used for everything else. Metal weights and spot prices are quoted per troy ounce, because mixing the two units overstates what you have by a tenth.',
    lede: 'A troy ounce is 31.1035 g, about a tenth heavier than the everyday ounce metal is often confused with.',
    primaryKeyword: 'what is a troy ounce',
    secondaryKeywords: [
      'troy ounce vs ounce',
      'troy ounce in grams',
      'how many grams in a troy ounce',
      'troy weight',
    ],
    sections: [
      {
        heading: 'The two ounces compared',
        paragraphs: [
          'One troy ounce is 31.1035 grams. One avoirdupois ounce, the one on a kitchen scale and on a packet of flour, is 28.3495 grams. The troy ounce is the heavier by about 10%, and the two share a name because they descend from different medieval systems that both survived.',
          'The confusion runs the other way as well. A troy pound is twelve troy ounces rather than sixteen, so a troy pound is lighter than a regular pound even though a troy ounce is heavier than a regular ounce. Precious metal is never quoted in pounds, which is how the trade avoids the problem entirely.',
        ],
      },
      {
        heading: 'Why it matters on a coin',
        paragraphs: [
          'Spot prices are quoted per troy ounce, so a metal weight has to be in troy ounces before the multiplication means anything. Weigh a coin on a kitchen scale, read grams, and divide by 31.1035 — not by 28.3495, which inflates the answer by a tenth before you have started.',
          'Worked through: a [1964 Washington quarter](/coin-value/silver/quarter/1964-washington-quarter) weighs 6.25 grams and is 90% silver, so it holds 5.625 grams of silver, which is 0.1808 troy ounces. That figure times the [spot price](/common-questions/what-is-spot-price) of silver is the coin’s melt value, and it is how every figure in the [melt value](/melt-value) section is produced.',
        ],
      },
      {
        heading: 'Fineness is the other half',
        paragraphs: [
          'A coin’s weight is not its metal content, because almost no circulating coin was struck in pure metal — silver coinage was alloyed with copper to survive being carried. United States 90% silver coinage is nine parts silver to one part copper, and it is the nine parts that the price applies to.',
          'So the calculation always has two steps: gross weight times fineness gives the metal content, and metal content times spot gives the value. Getting the fineness right matters as much as getting the unit right, which is why every coin page here states the weight and the composition separately.',
        ],
      },
      {
        heading: 'A shorthand worth memorising',
        paragraphs: [
          'One dollar of face value in United States 90% silver dimes, quarters or half dollars contains about 0.715 troy ounces of silver once circulation wear is allowed for. Four quarters, ten dimes or two halves — the mix does not matter, because the denominations were struck to the same weight per dollar.',
          'That single number prices a jar of [junk silver](/coin-value/tagged/junk-silver) in one multiplication, which is why the trade uses it in preference to counting coins.',
        ],
      },
    ],
    related: [
      'what-is-spot-price',
      'how-can-i-tell-if-a-coin-is-silver',
      'can-i-sell-my-coin-for-spot-price',
    ],
  },
  {
    slug: 'how-can-i-tell-if-my-coin-is-fake',
    category: 'grading-and-condition',
    question: 'How can I tell if my coin is fake?',
    titleTail: 'Six Checks',
    answer:
      'Weigh it and measure it first, because a counterfeit that matches the design rarely matches the specifications to a tenth of a gram. Then check the magnet, the edge, the sound and the mint mark, and on anything worth four figures have a grading service settle it rather than the internet.',
    lede: 'Weight and diameter catch most fakes; the magnet, the edge and the mint mark catch the rest.',
    primaryKeyword: 'how can i tell if my coin is fake',
    secondaryKeywords: [
      'fake coin test',
      'counterfeit coin detection',
      'is my silver coin real',
      'how to spot a counterfeit coin',
    ],
    sections: [
      {
        heading: 'Weight and diameter first',
        paragraphs: [
          'Every coin was struck to a published specification, and a counterfeiter has to match the design, the diameter, the thickness and the density at once with metal that costs less than the original. Most do not try. A scale reading to a hundredth of a gram and a pair of callipers settle the majority of cases in under a minute.',
          'Compare against the specifications on the coin’s own page in the [coin value catalogue](/coin-value), not against another coin in your pocket. A fake that is 5% light is obvious against a published figure and invisible in the hand.',
        ],
      },
      {
        heading: 'The magnet and the edge',
        paragraphs: [
          'No United States silver, gold, copper or copper-nickel coin is magnetic. A coin that responds to a magnet is plated steel, and the question is over. A strong neodymium magnet held near a real silver coin produces a faint drag rather than attraction, which is a different effect and takes practice to read.',
          'Then look at the edge for a seam, for a copper stripe where none belongs, and for reeding that is uneven or soft. Cast counterfeits show a line where the two halves of the mould met; struck ones show reeding that does not run cleanly to the rim. The same edge check tells you whether a coin is silver at all: see [how can I tell if a coin is silver](/common-questions/how-can-i-tell-if-a-coin-is-silver).',
        ],
      },
      {
        heading: 'Details counterfeiters get wrong',
        paragraphs: [
          'Compare the font of the date and the legend against a known genuine example of the same year, at magnification. Digits that are slightly the wrong shape, letters that are mushy, a design whose fine lines are rounded rather than sharp: all are signs of a coin that was cast or struck from dies made by copying a coin rather than by the mint.',
          'Look hardest at the mint mark, because adding or altering one is the cheapest way to turn a common coin into a scarce one. A mark that sits at the wrong angle, in the wrong position for that series, or on a patch of surface that looks different from its surroundings is the classic alteration, and it is the one worth knowing for every series you collect.',
        ],
      },
      {
        heading: 'When to pay somebody',
        paragraphs: [
          'When the coin is worth enough that being wrong costs more than the fee, and when it is a key date in a well-known series — those are the coins that are faked, because faking a common coin makes no money. The grading services authenticate as part of grading, and the holder is what lets the next buyer accept the verdict without repeating the argument.',
          'Nothing you do with household chemicals should be part of this. Acid tests damage the coin, and [cleaning it](/common-questions/does-cleaning-a-coin-reduce-value) destroys value on the genuine article while proving nothing about a fake. [Should I get my coin graded](/common-questions/should-i-get-my-coin-graded) covers what the service costs you in return.',
        ],
      },
    ],
    related: [
      'should-i-get-my-coin-graded',
      'how-can-i-tell-if-a-coin-is-silver',
      'what-is-coin-grading',
    ],
  },
  {
    slug: 'should-i-get-my-coin-graded',
    category: 'grading-and-condition',
    question: 'Should I get my coin graded?',
    titleTail: 'When It Pays',
    answer:
      'Only when the grade is worth more than the fee, which rules out most circulated coins: grading costs the same on a coin worth its metal as on one worth thousands. Submit when the coin is scarce, when it looks uncirculated, when it is worth faking, when you are selling to somebody who cannot handle it first — or when you are keeping it and want it sealed against handling and the air.',
    lede: 'Grading pays when the fee is small against what it changes, in price or in protection.',
    primaryKeyword: 'should i get my coin graded',
    secondaryKeywords: [
      'is coin grading worth it',
      'coin grading cost',
      'when to grade a coin',
      'coin grading submission',
    ],
    sections: [
      {
        heading: 'The fee against the difference',
        paragraphs: [
          'Grading is a fixed cost per coin, plus postage both ways and insurance on a parcel you cannot replace. That cost does not scale with the coin, so for a coin you intend to sell the question is a single one: does a certified grade change the price by more than it costs to obtain?',
          'On a worn common date the answer is no by a wide margin, and this covers most of what people inherit. The coin is worth its metal, the [melt value](/melt-value) pages give that figure for nothing, and any dealer will confirm it across a counter in seconds.',
        ],
      },
      {
        heading: 'The four cases where it pays',
        paragraphs: [
          'A coin that looks uncirculated, because above the circulated line a single grading point can double the price and the trade will not pay top money on your opinion. A key date, where the price justifies the fee several times over and the market expects certification. A coin worth faking, where the holder is authentication as much as grading. And any coin heading to auction or to an online buyer, because a bidder who cannot examine it bids on the holder.',
          'The common thread is that all four are situations where somebody else’s money is at risk on a judgement. That is what the service sells, and it is worth buying only when that risk is what is holding the price down.',
        ],
      },
      {
        heading: 'Keeping the coin is a reason too',
        paragraphs: [
          'Every case above is about a sale, and a coin you are not selling is a different calculation: what you are buying then is the holder. A sealed slab keeps a coin at a stable humidity, away from skin, from cardboard flips that off-gas, and from the handling that turns an uncirculated coin into a coin with a thumbprint on it. If the coin matters to you, that protection is worth paying for whether or not the grade ever earns its fee back.',
          'It is also the honest answer to a question the trade tends to dodge. Collectors submit coins because they prefer them in holders — consistent, stackable, labelled with the date, the mint mark and the grade, and safe to hand to somebody across a table. That is a legitimate reason on its own, and it does not stop being legitimate because the coin is common.',
          'Two things to be clear about if this is your reason. The fee buys preservation and a label, not an increase in value, so a common coin comes back worth what it was worth. And the grade you get is the grade the coin has: submitting it will not improve it, and a coin that has been cleaned will come back saying so. [What coin grading is](/common-questions/what-is-coin-grading) covers what the holder does and does not certify.',
        ],
      },
      {
        heading: 'When it was not worth it',
        paragraphs: [
          'It comes back graded, in a holder, worth what it was worth before, minus the fee. Nothing is damaged and nothing is gained. The worse outcome is the coin that comes back marked as cleaned or damaged rather than numbered, which is information you needed but paid a premium to receive.',
          'Grading also cannot be undone cheaply, in the sense that a common coin in a holder looks like a coin somebody overestimated. [What coin grading is](/common-questions/what-is-coin-grading) covers the designations and what each one signals to a buyer.',
        ],
      },
      {
        heading: 'Before you submit anything',
        paragraphs: [
          'Confirm the date and mint mark, because the whole case for submitting usually rests on them being what you think they are — and an altered mint mark is exactly what a service would catch. [What the letters on a coin mean](/common-questions/what-do-the-letters-on-a-coin-mean) covers reading them, and [how can I tell if my coin is fake](/common-questions/how-can-i-tell-if-my-coin-is-fake) covers the checks worth running first.',
          'Then handle the coin by its edge, put it in an inert holder, and clean nothing. A coin that arrives at a grading service having been polished is a coin that arrives having already lost the value you were submitting it to prove.',
        ],
      },
    ],
    related: [
      'what-is-coin-grading',
      'does-condition-affect-coin-value',
      'how-much-can-i-sell-my-coin-for',
    ],
  },
  {
    slug: 'are-error-coins-worth-money',
    category: 'what-a-coin-is-worth',
    question: 'Are error coins worth money?',
    titleTail: 'Errors vs Damage',
    answer:
      'A few are worth a great deal and most are worth very little, and the difference is whether the fault happened inside the mint or afterwards. Damage in a pocket, a machine or a vice is not an error, and it is the explanation for the overwhelming majority of unusual-looking coins people find.',
    lede: 'A genuine mint error can be valuable; post-mint damage, which looks similar, is worth nothing.',
    primaryKeyword: 'are error coins worth money',
    secondaryKeywords: [
      'coin error value',
      'mint error coins',
      'doubled die vs machine doubling',
      'damaged coin value',
    ],
    sections: [
      {
        heading: 'Mint error or later damage',
        paragraphs: [
          'A mint error happened while the coin was being made — a blank of the wrong metal, a strike off centre, a die that cracked, two coins struck together. Post-mint damage happened after it left, and it covers almost everything that arrives in an envelope marked "rare error": coins run over, acid-etched, spooned, hammered or spun in a machine.',
          'The distinction is settled by asking what the press could have done. A press cannot add metal, polish one side, or bend a coin without flattening its design; it can only strike a blank wrongly, or strike the wrong blank. Anything that could not have come out of a press came from somewhere else.',
        ],
      },
      {
        heading: 'Errors that carry real money',
        paragraphs: [
          'A coin struck on the wrong blank, which is checked with a scale rather than the eye and is the reason weight is the first test on any suspected error. A strike far enough off centre that part of the design is missing, priced by how much is missing and by whether the date survived. A doubled die, where the doubling was cut into the die itself and so appears identically on every coin struck from it.',
          'What they have in common is that each is verifiable against a published specification or a documented variety. An error nobody has documented is a coin with an unusual appearance and no market, however unusual it looks.',
        ],
      },
      {
        heading: 'The doubling mistake',
        paragraphs: [
          'Most coins that look doubled show machine doubling, which happens when the die shifts slightly as it lifts and smears the design sideways. It is flat, shelf-like and duller than the surrounding metal, it is common, and it adds nothing to the value.',
          'A true doubled die shows a second image with its own rounded relief and its own clear edges, and it appears in the same place on every coin from that die pair, which is why the genuine ones are catalogued by series and year. If the doubling is shiny and flat, it is machine doubling, and the answer is no.',
        ],
      },
      {
        heading: 'If you think yours is genuine',
        paragraphs: [
          'Weigh it, measure it, and compare it against the specifications for that issue in the [coin value catalogue](/coin-value) before going any further, because a wrong-metal error is proved by the scale and nothing else. Then check whether the variety is documented for that series and year, rather than searching for a coin that looks like yours.',
          'Errors that survive those two steps are worth authenticating, for the reason in [should I get my coin graded](/common-questions/should-i-get-my-coin-graded): an error is only worth what a buyer can be convinced of, and on errors the convincing is what the holder is for.',
        ],
      },
    ],
    related: [
      'should-i-get-my-coin-graded',
      'are-old-coins-worth-money',
      'how-much-is-my-coin-worth',
    ],
  },
];

/* ===========================================================================
   Lookups
   =========================================================================== */

export const questionPath = (q: Question) => `${QUESTIONS_ROOT}/${q.slug}`;
export const questionBySlug = (slug: string) => QUESTIONS.find((q) => q.slug === slug);


/** Every FAQ question this registry emits, with the page that owns it. */
export const allQuestionFaqs = (): { question: string; path: string }[] =>
  QUESTIONS.map((q) => ({ question: q.question, path: questionPath(q) }));

/* ===========================================================================
   The title and the description formulas
   ===========================================================================

   See the header. Both are derived, both are fitted to the limits in
   `meta.ts` rather than trimmed, and neither has a hand-written override --
   there are fifteen of these and there will be fifty.
   =========================================================================== */

/** Title Case of the question, plus the tail when there is room for it. */
export const questionTitle = (q: Question): string =>
  fit([`${titleCase(q.question)} ${q.titleTail}`, titleCase(q.question)], TITLE_MAX);

/**
 * "Covers the mint mark, where to look for it, what to do with it."
 *
 * A comma-separated list rather than a sentence with "and" in it, because a
 * heading is a label and a list of labels joined by a conjunction reads as a
 * clause that got away. `validateQuestions()` keeps commas and colons out of
 * headings for the same reason: they are the punctuation this list uses.
 */
const covers = (headings: string[]): string =>
  `Covers ${headings.map((h) => h.charAt(0).toLowerCase() + h.slice(1)).join(', ')}.`;

/**
 * The lede, plus as many of the page's own headings as will fit after it.
 *
 * Built from the headings rather than from a second written sentence, so a
 * description cannot promise a section the page does not have. Sections are
 * dropped off the end, never truncated mid-phrase.
 */
export const questionDescription = (q: Question): string => {
  const headings = q.sections.map((s) => s.heading);
  const candidates = headings.map((_, i) => `${q.lede} ${covers(headings.slice(0, headings.length - i))}`);
  return fit([...candidates, q.lede], DESCRIPTION_MAX);
};

/* ===========================================================================
   Categories: lookups and copy
   =========================================================================== */

export const categoryPath = (c: QuestionCategory) => `${QUESTION_TOPIC_ROOT}/${c.slug}`;
export const categoryBySlug = (slug: string) => QUESTION_CATEGORIES.find((c) => c.slug === slug);

/** The questions in a category, in registry order -- most asked first. */
export const questionsInCategory = (slug: string) => QUESTIONS.filter((q) => q.category === slug);

/** The category a question belongs to. Undefined only if validation was skipped. */
export const categoryOf = (q: Question) => categoryBySlug(q.category);


/**
 * "What a Coin Is Worth: Common Questions"
 *
 * No hand-written tail, unlike a question's: four section headings do not
 * need four separately-argued hooks, and the phrase the page competes for is
 * already the H1. The list exists so the suffix drops rather than the subject.
 */
export const categoryTitle = (c: QuestionCategory): string =>
  fit([`${c.h1}: Common Questions`, `${c.h1} Questions`, c.h1], TITLE_MAX);

/** The bluf, plus as many of the questions it holds as will fit after it. */
export const categoryDescription = (c: QuestionCategory): string => {
  const asked = questionsInCategory(c.slug).map((q) => q.question.replace(/\?$/, ''));
  const candidates = asked.map((_, i) => `${c.bluf} ${covers(asked.slice(0, asked.length - i))}`);
  return fit([...candidates, c.bluf], DESCRIPTION_MAX);
};

/* ===========================================================================
   Links inside a paragraph
   ===========================================================================

   `[anchor text](/path)`, and nothing else: no bold, no lists, no images.
   The narrowest syntax that does the job is the one that cannot grow into a
   second content format nobody documented.

   The rendering escapes first and links second, so a paragraph is plain text
   as far as the browser is concerned until this function says otherwise.
   =========================================================================== */

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A paragraph as HTML: escaped text with its internal links resolved. */
export const questionHtml = (text: string): string =>
  escapeHtml(text).replace(LINK, (_m, label, href) => `<a href="${href}">${label}</a>`);

/** A paragraph as plain text, links flattened to their anchor text. */
export const questionText = (text: string): string => text.replace(LINK, '$1');

/**
 * The opening of an answer, for a teaser on a page that links to it.
 *
 * The first sentence, plus the next while the result is still short enough to
 * read as a fragment. Derived from `answer` and never typed anywhere else, so
 * a teaser cannot promise something the page it links to does not say -- the
 * same reason the archives' copy is generated.
 */
export const questionTeaser = (q: Question, minChars = 120): string => {
  const plain = questionText(q.answer).trim();
  const sentences = plain.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  if (!sentences) return plain;
  let teaser = '';
  for (const sentence of sentences) {
    teaser += sentence;
    if (teaser.trim().length >= minChars) break;
  }
  return teaser.trim();
};

/** Every (anchor, href) pair a question links to from its body copy. */
export const questionLinks = (q: Question): { label: string; href: string }[] =>
  q.sections
    .flatMap((s) => s.paragraphs)
    .flatMap((p) => [...p.matchAll(LINK)].map((m) => ({ label: m[1], href: m[2] })));

/** The same, for a category's intro. */
export const categoryLinks = (c: QuestionCategory): { label: string; href: string }[] =>
  c.intro.flatMap((p) => [...p.matchAll(LINK)].map((m) => ({ label: m[1], href: m[2] })));

/**
 * Every path the built site will serve, for checking those hrefs against.
 *
 * Assembled from the same registries the routes are, which is the point: an
 * archive exists only where it has coins, so a link to an unpopulated tag is
 * a 404 that a build would otherwise ship in silence. A static site has no
 * redirects and no 404 report, so this is the only place it can be caught.
 */
export const sitePaths = (): Set<string> =>
  new Set<string>([
    '/',
    '/contact',
    '/privacy',
    QUESTIONS_ROOT,
    ...QUESTIONS.map(questionPath),
    ...QUESTION_CATEGORIES.map(categoryPath),
    CHEAT_SHEETS_ROOT,
    ...CHEAT_SHEETS.map(cheatSheetPath),
    COIN_VALUE_ROOT,
    `${COIN_VALUE_ROOT}/tagged`,
    ...populatedGroups().map((g) => groupPath(g.slug)),
    ...populatedPairs().map(({ group, type }) => typePath(group.slug, type.slug)),
    ...populatedTags().map((t) => tagPath(t.slug)),
    ...COINS.map(coinPath),
    MELT_ROOT,
    MELT_TAGGED_ROOT,
    ...meltGroups().map((g) => meltGroupPath(g.slug)),
    ...meltPairs().map(({ group, type }) => meltTypePath(group.slug, type.slug)),
    ...meltTags().map((t) => meltTagPath(t.slug)),
    ...COINS.map(meltPath),
  ]);

/** Anchor text that tells a reader and a crawler nothing. */
const EMPTY_ANCHORS = ['here', 'click here', 'this page', 'link', 'read more', 'more'];

/* ===========================================================================
   Build-time validation
   ===========================================================================

   Throws rather than warns, for the same reason validateTaxonomy() does:
   every failure below builds cleanly and is silent in the output.
   Cross-section question collisions are checked in faq-registry.ts, which
   is the only module that can see all three sources at once.
   =========================================================================== */

export function validateQuestions(): void {
  const problems: string[] = [];
  const counts = new Map<string, number>();
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const paragraphs = new Map<string, string>();
  const paths = sitePaths();

  for (const q of QUESTIONS) {
    counts.set(q.slug, (counts.get(q.slug) ?? 0) + 1);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(q.slug)) {
      problems.push(`question slug "${q.slug}" is not lowercase and hyphenated`);
    }
    if (!q.question.trim().endsWith('?')) {
      problems.push(`question "${q.slug}" is not phrased as a question`);
    }
    if (q.sections.length === 0) {
      problems.push(`question "${q.slug}" has no sections; the answer alone is not a page`);
    }
    for (const { heading } of q.sections) {
      if (/[,:;]/.test(heading)) {
        problems.push(`question "${q.slug}" has a heading punctuated with a comma or colon ("${heading}"); the description lists headings with commas`);
      }
    }
    // The answer is quoted with no page around it, so it carries no markup and
    // states no figure that the page cannot restate a week later.
    if (/\[[^\]]+\]\([^)]+\)/.test(q.answer)) {
      problems.push(`question "${q.slug}" has link markup in its answer`);
    }
    if (q.lede === q.answer) {
      problems.push(`question "${q.slug}" uses its answer as its description lede`);
    }

    // The title and the description, as they will ship.
    const title = questionTitle(q);
    if (title.length > TITLE_MAX) {
      problems.push(`question "${q.slug}" has a ${title.length}-character title; the budget is ${TITLE_MAX}`);
    }
    const twin = titles.get(title);
    if (twin) problems.push(`questions "${twin}" and "${q.slug}" ship the same title`);
    else titles.set(title, q.slug);

    const description = questionDescription(q);
    if (description.length > DESCRIPTION_MAX) {
      problems.push(`question "${q.slug}" has a ${description.length}-character description; the limit is ${DESCRIPTION_MAX}`);
    }
    if (description.length < DESCRIPTION_MIN) {
      problems.push(`question "${q.slug}" has a ${description.length}-character description; under ${DESCRIPTION_MIN} is a description nobody wrote`);
    }
    const sameDescription = descriptions.get(description);
    if (sameDescription) {
      problems.push(`questions "${sameDescription}" and "${q.slug}" ship the same description`);
    } else descriptions.set(description, q.slug);

    // No paragraph on two pages: the rule that keeps a generated-feeling
    // section from becoming a set of doorways.
    for (const section of q.sections) {
      for (const p of section.paragraphs) {
        const key = questionText(p);
        const owner = paragraphs.get(key);
        if (owner) problems.push(`questions "${owner}" and "${q.slug}" share a paragraph`);
        else paragraphs.set(key, q.slug);
        if (/[$£€]/.test(p)) {
          problems.push(`question "${q.slug}" states a price in its copy; prices belong to spotPanel`);
        }
      }
    }

    // Every link goes somewhere the build produces, under anchor text worth
    // reading. A path is not a route until a registry populates it.
    for (const { label, href } of questionLinks(q)) {
      if (!href.startsWith('/')) {
        problems.push(`question "${q.slug}" links off-site to "${href}"; body links are internal`);
      } else if (!paths.has(href)) {
        problems.push(`question "${q.slug}" links to "${href}", which the site does not build`);
      } else if (href === questionPath(q)) {
        problems.push(`question "${q.slug}" links to itself`);
      }
      if (EMPTY_ANCHORS.includes(label.trim().toLowerCase())) {
        problems.push(`question "${q.slug}" links under the anchor text "${label}"`);
      }
    }

    for (const r of q.related ?? []) {
      if (r === q.slug) problems.push(`question "${q.slug}" lists itself as related`);
      else if (!questionBySlug(r)) problems.push(`question "${q.slug}" links to unknown question "${r}"`);
    }
  }

  /* ---------------------------------------------------------------------
     The categories.

     A topic page is made of its questions, so everything that can go wrong
     with it is a membership problem: a question filed under a topic nobody
     declared, a topic holding one page, or the hub listing its topics in an
     order that no longer matches the questions inside them.
     --------------------------------------------------------------------- */
  const categorySlugs = new Set<string>();
  for (const c of QUESTION_CATEGORIES) {
    if (categorySlugs.has(c.slug)) problems.push(`category slug "${c.slug}" is declared twice`);
    categorySlugs.add(c.slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.slug)) {
      problems.push(`category slug "${c.slug}" is not lowercase and hyphenated`);
    }
    if (QUESTIONS.some((q) => q.slug === c.slug)) {
      problems.push(`"${c.slug}" is both a question and a category`);
    }

    const held = questionsInCategory(c.slug);
    if (held.length < 2) {
      problems.push(`category "${c.slug}" holds ${held.length} question(s); a topic page over one question is a second URL for it`);
    }

    const title = categoryTitle(c);
    if (title.length > TITLE_MAX) {
      problems.push(`category "${c.slug}" has a ${title.length}-character title; the budget is ${TITLE_MAX}`);
    }
    const sameTitle = titles.get(title);
    if (sameTitle) problems.push(`"${sameTitle}" and category "${c.slug}" ship the same title`);
    else titles.set(title, `category ${c.slug}`);

    const description = categoryDescription(c);
    if (description.length > DESCRIPTION_MAX) {
      problems.push(`category "${c.slug}" has a ${description.length}-character description; the limit is ${DESCRIPTION_MAX}`);
    }
    if (description.length < DESCRIPTION_MIN) {
      problems.push(`category "${c.slug}" has a ${description.length}-character description; under ${DESCRIPTION_MIN} is a description nobody wrote`);
    }
    const sameDescription = descriptions.get(description);
    if (sameDescription) {
      problems.push(`"${sameDescription}" and category "${c.slug}" ship the same description`);
    } else descriptions.set(description, `category ${c.slug}`);

    for (const p of c.intro) {
      const key = questionText(p);
      const owner = paragraphs.get(key);
      if (owner) problems.push(`"${owner}" and category "${c.slug}" share a paragraph`);
      else paragraphs.set(key, `category ${c.slug}`);
      if (/[$£€]/.test(p)) {
        problems.push(`category "${c.slug}" states a price in its copy; prices belong to spotPanel`);
      }
    }

    for (const { label, href } of categoryLinks(c)) {
      if (!href.startsWith('/')) {
        problems.push(`category "${c.slug}" links off-site to "${href}"; body links are internal`);
      } else if (!paths.has(href)) {
        problems.push(`category "${c.slug}" links to "${href}", which the site does not build`);
      } else if (href === categoryPath(c)) {
        problems.push(`category "${c.slug}" links to itself`);
      }
      if (EMPTY_ANCHORS.includes(label.trim().toLowerCase())) {
        problems.push(`category "${c.slug}" links under the anchor text "${label}"`);
      }
    }
  }

  for (const q of QUESTIONS) {
    if (!categorySlugs.has(q.category)) {
      problems.push(`question "${q.slug}" is filed under "${q.category}", which is not a category`);
    }
  }

  // The hub renders the topics in registry order and the questions in theirs,
  // so the two orderings have to agree: a topic whose first question is asked
  // less often than the next topic's puts the wrong thing at the top of the
  // page. Derived rather than declared, because the alternative is a second
  // ordering to keep in step by hand.
  const declared = QUESTION_CATEGORIES.map((c) => c.slug);
  const byDemand = [...new Set(QUESTIONS.map((q) => q.category))].filter((slug) =>
    categorySlugs.has(slug),
  );
  if (declared.length === byDemand.length && declared.join() !== byDemand.join()) {
    problems.push(
      `the categories are declared in the order ${declared.join(', ')} but their questions rank them ${byDemand.join(', ')}`,
    );
  }

  for (const [slug, n] of counts) {
    if (n > 1) problems.push(`question slug "${slug}" is declared ${n} times`);
  }

  if (problems.length > 0) {
    throw new Error(`Common questions are invalid:\n  - ${problems.join('\n  - ')}`);
  }
}

validateQuestions();
