/**
 * The Sheldon ladder, and the one sentence a grade page says about a grade.
 *
 * ---------------------------------------------------------------------------
 * WHY THE DEFINITIONS ARE PARAMETERISED RATHER THAN WRITTEN OUT
 * ---------------------------------------------------------------------------
 *
 * The obvious build is one description per grade, reused on every grade page:
 * seventy paragraphs, written once, correct everywhere. It is also the doorway
 * page shape -- the same paragraph on every page of a generated tree -- and it
 * is the exact-string duplication `validateCatalogCopy()` has thrown on since
 * the archives were generated.
 *
 * The fix costs one field per SERIES rather than one per coin. A grade's
 * `definition` is a template with slots, `WearPoints` on the series fills them,
 * and the result is not merely unique -- it is more useful than the generic
 * form, because the reader is holding one of these rather than a diagram of the
 * Sheldon scale. "Extremely Fine" on a Washington quarter names the hair above
 * the ear and the eagle's breast; on a capped bust half it will name the
 * drapery and LIBERTY.
 *
 * The `{coin}` slot is what makes the sentence unique per PAGE rather than per
 * series. Without it, a 1932-D in Good and a 1932-S in Good -- same series,
 * same grade -- would ship one paragraph on two URLs, which is the collision
 * the whole scheme exists to avoid, and it would not appear until the second
 * coin of a series was added.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS REGISTERED HERE AND WHAT IS NOT
 * ---------------------------------------------------------------------------
 *
 * EVERY RUNG A COIN CAN BE GIVEN, and that is the owner's decision of
 * 2026-09-22 reaching this file. It used to be the opposite -- only the rungs
 * the site had a price for, on the argument that a rung with no page behind it
 * is a row in a registry doing nothing -- and PO1, FR2, G6, VG10, VF25, VF35,
 * XF45, AU53, AU55 and MS61 were all absent under it. MS61 had been written
 * and then removed by name, because no published source priced it separately
 * from MS60 and MS62 on the one coin that then had a ladder.
 *
 * That argument died with the rule it rested on. A rung is a page because it
 * is a grade the coin can be given, not because somebody published a figure
 * for it, and the registry that decides which rungs exist cannot go on being
 * filtered by price when nothing downstream is. The reader who has just been
 * handed a slab reading AU55 is the whole case: that grade is on the slab, it
 * is what they will type, and under the old rule this site had no page for it
 * on any coin in the catalogue.
 *
 * So the list is now the Sheldon scale as the two services award it. What is
 * still NOT here is a grade nobody awards -- there is no MS71 and no AU56 --
 * and that is the only test left.
 *
 * `number` is the ladder order and it is what prev/next step along, NOT the
 * position in this array. A grade inserted in the wrong place would then still
 * sort correctly, which is the one failure mode a hand-kept order has.
 */

// The one thing this module takes from outside: `{a}` below is decided by the
// coin's own name, and the rule for that is written once, in `meta.ts`.
import { article } from '../lib/meta';


/**
 * The parts of a series' design that wear, named as a person holding one would
 * name them.
 *
 * Five slots, and every grade definition uses a subset. They are series facts,
 * not issue facts -- the same places wear on a 1932 quarter and a 1964 one --
 * so they hang on the series tag beside the designer and the mint marks. See
 * the house rule: a fact belongs to the run or to the issue, never to both.
 */
/*
 * EVERY SLOT IS A PLURAL NOUN PHRASE, and the grade definitions take a plural
 * verb. "the high points of the hair", "the breast and the tops of the wings",
 * "LIBERTY and the date" -- a design wears in places rather than in one place,
 * every one of these reads as a list, and a singular slot in a plural sentence
 * produces "the high points of the hair is flat" on forty pages at once. Write
 * the singular case as a plural anyway ("the shoulder feathers", not "the
 * shoulder"): nothing downstream can fix the agreement, because the sentence
 * is built before the slot is known.
 */
export interface WearPoints {
  /** Where wear shows first on the obverse: "the high points of Washington's hair above the ear". */
  obverse: string;
  /** The same on the reverse: "the eagle's breast and the tops of its wings". */
  reverse: string;
  /** The lettering a worn coin is read by: "IN GOD WE TRUST and the date". */
  legend: string;
  /** The fine detail that survives only at the top of the ladder. */
  detail: string;
  /** Where lustre and bag marks are judged on an uncirculated example. */
  lustre: string;
}

export interface Grade {
  /** The URL segment, and how the phrase is typed: "g4", "ms63", "ms65rd". */
  slug: string;
  /** As it is written in a title and on a slab: "G4", "MS63", "MS65RD". */
  code: string;
  /**
   * Other prefixes the same grade is written with, unhyphenated.
   *
   * "EF" for "XF" is the only one in United States and British usage, and it
   * is not cosmetic: a reader who learned the British convention types EF45
   * and lands on a page that never says the word. `gradeForms()` turns this
   * into every spelling, and one generated sentence per page prints them.
   */
  alsoWritten?: string[];
  /** The word: "Good", "Mint State". */
  name: string;
  /** How collectors write it in prose: "Good (G-4)". */
  label: string;
  /** Sheldon number. The ladder order, and the only thing prev/next reads. */
  number: number;
  /**
   * Circulated coins are graded by how much wear they carry; mint state coins
   * carry none and are graded by marks and lustre. That is a different
   * question, not a further step of the same one, and the copy branches on it.
   */
  tier: 'circulated' | 'mint-state' | 'proof';
  /**
   * The colour designation, on the grades that carry one. See `Designation`.
   *
   * Composed rather than declared: `GRADES` is the Sheldon rungs plus every
   * (mint state rung x designation) pair, built at module load, because the
   * alternative is twenty-one hand-written definitions that are each one
   * sentence different from another one.
   */
  designation?: Designation;
  /**
   * Which ladder this rung belongs to: '' for an undesignated coin, or the
   * designation slug.
   *
   * Colour makes the ladder three parallel chains rather than one, and they
   * are NOT comparable rung for rung -- a cent in MS64 Red is routinely worth
   * more than the same cent in MS65 Brown. So the monotonicity check runs
   * within a chain, and prev/next step within a chain.
   */
  chain: string;
  /** Order within one Sheldon number: Brown, then Red-Brown, then Red. */
  rank: number;
  /** Composition groups this rung may be used on. Empty means all of them. */
  groups: string[];
  /**
   * The definition, with `{coin}`, `{label}` and the `WearPoints` slots.
   *
   * One sentence or two. Anything longer is the series page's job -- this
   * block answers "what does the word on the slab mean for the coin in my
   * hand" and then gets out of the way.
   */
  definition: string;
}

/**
 * A copper coin's colour, which is the second half of its grade.
 *
 * Copper begins oxidising the moment it leaves the press, and the grading
 * services record how far that has gone: Red, Red-Brown, Brown. It is not a
 * refinement of the Sheldon number, it is an independent axis over it, and on
 * a cent it moves the price further than a grade point does -- a 1909-S VDB in
 * MS65 Red is worth several times the same coin in MS65 Brown.
 *
 * So it is composed with the grade rather than declared beside it. Each
 * designation carries one clause, that clause is appended to whichever mint
 * state definition it pairs with, and twenty-one rungs come out of seven
 * definitions and three.
 *
 * MINT STATE ONLY, deliberately. The services do designate colour on
 * circulated copper, but below mint state every surviving copper coin is brown
 * and the letters carry no information a buyer pays for. A rung exists here to
 * hold a price that separates; BN on a Fine cent separates nothing.
 */
export interface Designation {
  /** URL fragment, appended to the grade: "rd" gives "ms65rd". */
  slug: string;
  /** As struck on the slab: "RD". */
  code: string;
  /** The word: "Red". */
  name: string;
  /** Poorest first: Brown 0, Red-Brown 1, Red 2. The order within one number. */
  rank: number;
  /** Composition groups where colour is designated at all. */
  groups: string[];
  /** One clause, appended to the grade's own definition. Takes `{coin}`. */
  definition: string;
}

export const DESIGNATIONS: Designation[] = [
  {
    slug: 'bn',
    code: 'BN',
    name: 'Brown',
    rank: 0,
    groups: ['copper'],
    definition:
      'Brown is what copper becomes: the mint red has oxidised away across all but a few per cent of both faces. Nearly every {coin} that has spent decades outside an airtight holder is brown, and brown is much the cheapest of the three colours.',
  },
  {
    slug: 'rb',
    code: 'RB',
    name: 'Red-Brown',
    rank: 1,
    groups: ['copper'],
    definition:
      'Red-brown is the middle designation: somewhere between five and ninety-five per cent of the original mint red survives on a {coin} graded this way and the rest has gone. It is much the widest of the three bands, and the one where two graders most easily disagree.',
  },
  {
    slug: 'rd',
    code: 'RD',
    name: 'Red',
    rank: 2,
    groups: ['copper'],
    definition:
      'Red means at least ninety-five per cent of the original mint red is still on both faces. Copper starts to turn the day it leaves the press, so red on a {coin} is a statement about how it was stored rather than about how it was struck, and it is worth a multiple of the same coin in brown.',
  },
];

export const designationBySlug = (slug: string) => DESIGNATIONS.find((d) => d.slug === slug);

/**
 * The composition groups a colour is designated on, read off `DESIGNATIONS`.
 *
 * The one list, used both ways: it lets a designated rung onto a copper coin
 * and keeps the undesignated one off it.
 */
const DESIGNATED_GROUPS = new Set(DESIGNATIONS.flatMap((d) => d.groups));

/**
 * The Sheldon rungs themselves, before colour is composed over them.
 *
 * Not exported: everything downstream reads `GRADES`, which is this list plus
 * the designated rungs, so nothing has to know which of the two kinds it is
 * holding.
 */
const SHELDON: Omit<Grade, 'chain' | 'rank' | 'groups'>[] = [
  {
    slug: 'po1',
    code: 'PO1',
    name: 'Poor',
    label: 'Poor (PO-1)',
    number: 1,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} is worn smooth: the coin can be identified as to type and the date can be made out, and that is the whole of what this grade claims. {obverse} are flat to the field, {legend} have worn away into the rim over most of their length, and what survives is an outline. It is a grade worth having only on an issue scarce enough that a reader wants one in any state at all.',
  },
  {
    slug: 'fr2',
    code: 'FR2',
    name: 'Fair',
    label: 'Fair (FR-2)',
    number: 2,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} is worn nearly smooth but reads more completely than the grade below it: the date and the mint mark are clear without effort, {legend} survive in part rather than in trace, and {obverse} are flat with the outline of the design still following its edges. The rim is worn well into the lettering the whole way round.',
  },
  {
    slug: 'ag3',
    code: 'AG3',
    name: 'About Good',
    label: 'About Good (AG-3)',
    number: 3,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} is worn past the point where the design carries any detail: {obverse} are gone, {reverse} are flat to the field, and the rim has worn into {legend} so that parts of the lettering merge with the edge. The date is readable, and on a scarce issue that is the whole of what this grade has to guarantee.',
  },
  {
    slug: 'g4',
    code: 'G4',
    name: 'Good',
    label: 'Good (G-4)',
    number: 4,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} is worn evenly across its whole surface, and the design reads as an outline rather than a relief: {obverse} are flat, {reverse} show no detail at all, and {legend} are still readable with the rim beginning to merge into the lettering.',
  },
  {
    slug: 'g6',
    code: 'G6',
    name: 'Good',
    label: 'Good (G-6)',
    number: 6,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} is a Good coin at the better end of the grade: the same heavy and even wear as at four, but the rim is full and unbroken the whole way round and {legend} stand clear of it rather than merging into it. A rim and a little lettering is the entire difference between the two, which is why they sell within a very short distance of each other.',
  },
  {
    slug: 'vg8',
    code: 'VG8',
    name: 'Very Good',
    label: 'Very Good (VG-8)',
    number: 8,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} is well worn but complete: {obverse} are smooth, {reverse} show the outline of the design and little inside it, and {legend} stand clear of a full rim that runs unbroken round the coin.',
  },
  {
    slug: 'vg10',
    code: 'VG10',
    name: 'Very Good',
    label: 'Very Good (VG-10)',
    number: 10,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} is a Very Good coin at the better end of the grade: {obverse} are smooth as they are at eight, but a little of {detail} survives where the design was struck deepest, and {legend} and the rim are bold. Both Very Good rungs describe a heavily worn coin that is nonetheless complete and easy to read.',
  },
  {
    slug: 'f12',
    code: 'F12',
    name: 'Fine',
    label: 'Fine (F-12)',
    number: 12,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} carries moderate wear over the whole coin, but the design is still a relief rather than an outline: {obverse} keep some separation, {reverse} are worn smooth at their highest points while the outline of every feature stays sharp, and {legend} are full and clear.',
  },
  {
    slug: 'f15',
    code: 'F15',
    name: 'Fine',
    label: 'Fine (F-15)',
    number: 15,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} is a Fine coin at the better end of the grade: the same moderate, even wear, but {detail} start to show at the centres and {obverse} hold more of their shape than on a coin graded twelve. The difference between the two is a judgement of degree rather than of kind, which is why they sell so close together.',
  },
  {
    slug: 'vf20',
    code: 'VF20',
    name: 'Very Fine',
    label: 'Very Fine (VF-20)',
    number: 20,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} shows clear detail across the whole design with wear on the raised areas alone: {obverse} are flattened but still separated from one another, {reverse} keep most of their major detail, and {legend} are sharp.',
  },
  {
    slug: 'vf25',
    code: 'VF25',
    name: 'Very Fine',
    label: 'Very Fine (VF-25)',
    number: 25,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} sits between the two ends of Very Fine: {obverse} are flattened across more of their area than at thirty and less than at twenty, {reverse} keep their major detail, and {legend} are sharp. The three Very Fine rungs are one coin at three degrees of the same wear, which is why a grader can move a coin between them and a buyer can rarely see it.',
  },
  {
    slug: 'vf30',
    code: 'VF30',
    name: 'Very Fine',
    label: 'Very Fine (VF-30)',
    number: 30,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} sits at the top of Very Fine: {detail} are largely present, {obverse} have lost their shape over a smaller area than at twenty, and only the highest points are worn. It is the last grade where the wear is obvious at arm\u2019s length.',
  },
  {
    slug: 'vf35',
    code: 'VF35',
    name: 'Very Fine',
    label: 'Very Fine (VF-35)',
    number: 35,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} is Very Fine at its top edge and is routinely mistaken for the grade above: {detail} are nearly all present, the wear is confined to {obverse} where they stand highest, and traces of lustre sometimes survive beside the devices. What separates it from Extremely Fine is how far the flattening has spread rather than any feature a reader can point at.',
  },
  {
    slug: 'xf40',
    code: 'XF40',
    alsoWritten: ['EF40'],
    name: 'Extremely Fine',
    label: 'Extremely Fine (XF-40)',
    number: 40,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} has light wear on the high points and nowhere else: {detail} survive except where {obverse} have just begun to flatten, and traces of mint lustre often remain in the protected areas beside the devices.',
  },
  {
    slug: 'xf45',
    code: 'XF45',
    alsoWritten: ['EF45'],
    name: 'Extremely Fine',
    label: 'Extremely Fine (XF-45)',
    number: 45,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} is Extremely Fine at its better end, which the trade writes as Choice: the wear touches {obverse} and nothing else, {detail} are complete everywhere around them, and appreciable mint lustre survives in the fields. It is the grade at which a circulated coin starts to pass for an uncirculated one at arm\u2019s length.',
  },
  {
    slug: 'au50',
    code: 'AU50',
    name: 'About Uncirculated',
    label: 'About Uncirculated (AU-50)',
    number: 50,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} circulated briefly and barely: {obverse} are flattened where they stand highest, {reverse} show the same, some of the original mint lustre survives in the fields around them, and every other detail is as it was struck.',
  },
  {
    slug: 'au53',
    code: 'AU53',
    name: 'About Uncirculated',
    label: 'About Uncirculated (AU-53)',
    number: 53,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} carries light wear over the highest points of the design, with perhaps half of the original lustre still in the fields: {obverse} are visibly rubbed, and {reverse} show the same. It is the lowest of the three About Uncirculated rungs above fifty and the one where the rub is easiest to see, because it covers an area rather than merely touching the peaks.',
  },
  {
    slug: 'au55',
    code: 'AU55',
    name: 'About Uncirculated',
    label: 'About Uncirculated (AU-55)',
    number: 55,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} shows slight wear at the highest points of the design and nowhere else: {obverse} are just touched, {reverse} likewise, and most of the original mint lustre is intact. The trade writes it as Choice About Uncirculated, and it is the rung where the question stops being how worn the coin is and becomes how much lustre it kept.',
  },
  {
    slug: 'au58',
    code: 'AU58',
    name: 'About Uncirculated',
    label: 'About Uncirculated (AU-58)',
    number: 58,
    tier: 'circulated',
    definition:
      '{a} {coin} in {label} is as close to uncirculated as a circulated coin gets: the lustre is nearly complete and the only wear is a faint rub across {obverse} that shows when the coin is tilted under a light. Many are better-looking coins than a low mint state example of the same date, and they sell for less.',
  },
  {
    slug: 'ms60',
    code: 'MS60',
    name: 'Mint State',
    label: 'Mint State (MS-60)',
    number: 60,
    tier: 'mint-state',
    definition:
      '{a} {coin} in {label} has no wear at all and is graded at the bottom of mint state for everything else: {lustre} carry heavy contact marks from the mint bag, the lustre is dull or broken, and the coin has little eye appeal. Nothing about it circulated; everything about it was handled.',
  },
  {
    slug: 'ms61',
    code: 'MS61',
    name: 'Mint State',
    label: 'Mint State (MS-61)',
    number: 61,
    tier: 'mint-state',
    definition:
      '{a} {coin} in {label} has no wear whatever and is graded near the floor of mint state for its surfaces alone: {lustre} carry heavy and obvious contact marks and the lustre is present but broken. It is one step off the bottom of the grade, and what separates it from sixty is that the marks are fewer rather than lighter.',
  },
  {
    slug: 'ms62',
    code: 'MS62',
    name: 'Mint State',
    label: 'Mint State (MS-62)',
    number: 62,
    tier: 'mint-state',
    definition:
      '{a} {coin} in {label} has no wear and marks that are scattered rather than concentrated: {lustre} still show them, but the lustre is largely unbroken and the coin reads as uncirculated at a glance rather than only under a loupe.',
  },
  {
    slug: 'ms63',
    code: 'MS63',
    name: 'Mint State',
    label: 'Mint State (MS-63)',
    number: 63,
    tier: 'mint-state',
    definition:
      '{a} {coin} in {label} has no wear at all, because it never circulated. What separates it from the mint state grades above is contact marks rather than wear: {lustre} carry scattered nicks picked up in the mint bag, and the lustre is unbroken but not exceptional.',
  },
  {
    slug: 'ms64',
    code: 'MS64',
    name: 'Mint State',
    label: 'Mint State (MS-64)',
    number: 64,
    tier: 'mint-state',
    definition:
      '{a} {coin} in {label} has no wear, full lustre and only minor marks, none of them where the eye lands first. This is the grade at which a coin stops being judged by its faults and starts being judged by how it looks.',
  },
  {
    slug: 'ms65',
    code: 'MS65',
    name: 'Mint State',
    label: 'Mint State (MS-65)',
    number: 65,
    tier: 'mint-state',
    definition:
      '{a} {coin} in {label} is a gem: no wear, full unbroken lustre, and marks so few and so small that {lustre} survive inspection under magnification. On a scarce date this is usually where the certified population collapses and the price stops following the grade in a straight line.',
  },
  {
    slug: 'ms66',
    code: 'MS66',
    name: 'Mint State',
    label: 'Mint State (MS-66)',
    number: 66,
    tier: 'mint-state',
    definition:
      '{a} {coin} in {label} sits at or near the top of the certified population for the issue: no wear, exceptional lustre, and virtually no marks anywhere on it. At this level the coin is a condition rarity rather than a date rarity, and the price is set by the few collectors who need one and the few coins that exist.',
  },
  {
    slug: 'ms67',
    code: 'MS67',
    name: 'Mint State',
    label: 'Mint State (MS-67)',
    number: 67,
    tier: 'mint-state',
    definition:
      '{a} {coin} in {label} is as good as the issue is known to come: no wear, lustre that is complete and undisturbed, and marks so small that finding them is the work rather than counting them. On a common date this is usually the only grade worth a large sum, because a coin anybody can buy for pennies in every other grade is one almost nobody kept this well.',
  },
  {
    slug: 'ms68',
    code: 'MS68',
    name: 'Mint State',
    label: 'Mint State (MS-68)',
    number: 68,
    tier: 'mint-state',
    definition:
      '{a} {coin} in {label} is finer than all but a handful ever certified: no wear, lustre that is complete and undisturbed, and at most one or two marks small enough that a grader had to hunt for them. Almost nothing from a circulating mintage survives at this level, because the coin had to escape the bag, the counting machine and sixty years of storage untouched.',
  },
  {
    slug: 'ms69',
    code: 'MS69',
    name: 'Mint State',
    label: 'Mint State (MS-69)',
    number: 69,
    tier: 'mint-state',
    definition:
      '{a} {coin} in {label} is one mark away from perfect, and that mark is visible only under magnification. On a coin struck for circulation this grade is essentially unheard of; where it occurs at all it is on an issue the Mint sold directly, in packaging that never let the coin touch another.',
  },
  {
    slug: 'ms70',
    code: 'MS70',
    name: 'Mint State',
    label: 'Mint State (MS-70)',
    number: 70,
    tier: 'mint-state',
    definition:
      '{a} {coin} in {label} is flawless at magnification: no wear, no marks, no weakness in the strike, full lustre everywhere. It is the top of the scale and it is almost never awarded to a coin that was struck for circulation, so a listing offering one deserves the certification number checked before anything else.',
  },
];

/**
 * The proof ladder, which is a scale of its own rather than the top of this one.
 *
 * ---------------------------------------------------------------------------
 * WHY PROOFS ARE NOT MINT STATE RUNGS
 * ---------------------------------------------------------------------------
 *
 * A proof is not a better uncirculated coin, it is a different object: struck
 * twice on a polished blank from polished dies, sold in a set, and never in a
 * till. So it carries no wear at all, which means the Sheldon question -- how
 * much of the design has worn away -- has no answer for it, and the mint state
 * question is not quite right either, because what a grader is counting is not
 * bag marks from a mint bag the coin never sat in.
 *
 * What separates PR65 from PR67 is hairlines, from cleaning or from a cloth,
 * and the contrast between the frosted devices and the mirrored fields. That is
 * a third question, so it gets a third tier, and the coin page already carries
 * the matching rule: a proof gets no scarcity verdict either, because
 * commonality is a statement about survival and survival is not in doubt for a
 * coin everybody who bought one kept.
 *
 * PR AND PF ARE THE SAME GRADE. One grading service writes PR and the other
 * PF, both are on slabs in the wild, and a reader types whichever is on the one
 * in front of them -- so `alsoWritten` carries PF and `gradeForms()` turns the
 * pair into all four spellings. It is the same fix as EF for XF, and it matters
 * more here, because neither spelling is the obviously dominant one.
 */
const PROOF: Omit<Grade, 'chain' | 'rank' | 'groups'>[] = [
  {
    slug: 'pr60',
    code: 'PR60',
    alsoWritten: ['PF60'],
    name: 'Proof',
    label: 'Proof (PR-60)',
    number: 160,
    tier: 'proof',
    definition:
      '{a} {coin} in {label} is a proof that has been handled badly: the mirrors are there but dulled, and {lustre} carry hairlines heavy enough to see without magnification. Nothing about it circulated — this is what happens to a proof taken out of its packaging and wiped.',
  },
  {
    slug: 'pr61',
    code: 'PR61',
    alsoWritten: ['PF61'],
    name: 'Proof',
    label: 'Proof (PR-61)',
    number: 161,
    tier: 'proof',
    definition:
      '{a} {coin} in {label} is an impaired proof: the fields are still reflective but the hairlines across {lustre} are obvious, and the eye is drawn to the damage before the design. The gap between this and an unimpaired proof of the same date is usually the whole of the price.',
  },
  {
    slug: 'pr62',
    code: 'PR62',
    alsoWritten: ['PF62'],
    name: 'Proof',
    label: 'Proof (PR-62)',
    number: 162,
    tier: 'proof',
    definition:
      '{a} {coin} in {label} shows scattered hairlines and some haze over {lustre}, but the mirrors read as mirrors at arm\u2019s length. It is the grade at which a proof stops being described by its faults alone.',
  },
  {
    slug: 'pr63',
    code: 'PR63',
    alsoWritten: ['PF63'],
    name: 'Proof',
    label: 'Proof (PR-63)',
    number: 163,
    tier: 'proof',
    definition:
      '{a} {coin} in {label} has clean mirrors with light hairlines visible when the coin is tilted under a lamp, and no distracting mark on {lustre}. This is roughly what a proof looks like after fifty years in the original packaging and one careless handling.',
  },
  {
    slug: 'pr64',
    code: 'PR64',
    alsoWritten: ['PF64'],
    name: 'Proof',
    label: 'Proof (PR-64)',
    number: 164,
    tier: 'proof',
    definition:
      '{a} {coin} in {label} is a near-gem proof: the fields are deeply reflective, {lustre} are essentially clean, and what keeps it off the gem grade is a few faint hairlines rather than anything a reader would notice unaided.',
  },
  {
    slug: 'pr65',
    code: 'PR65',
    alsoWritten: ['PF65'],
    name: 'Proof',
    label: 'Proof (PR-65)',
    number: 165,
    tier: 'proof',
    definition:
      '{a} {coin} in {label} is a gem proof: full mirrors, frosted devices standing clear of them, and no hairline or mark that survives inspection of {lustre} under a glass. Most proofs kept in their original packaging and never handled grade about here.',
  },
  {
    slug: 'pr66',
    code: 'PR66',
    alsoWritten: ['PF66'],
    name: 'Proof',
    label: 'Proof (PR-66)',
    number: 166,
    tier: 'proof',
    definition:
      '{a} {coin} in {label} is better than the run of surviving proofs of its date: the mirrors are unbroken, {lustre} are clean under magnification, and the contrast between field and device is what the grade is really paying for.',
  },
  {
    slug: 'pr67',
    code: 'PR67',
    alsoWritten: ['PF67'],
    name: 'Proof',
    label: 'Proof (PR-67)',
    number: 167,
    tier: 'proof',
    definition:
      '{a} {coin} in {label} is a superb proof, and on most dates this is where the certified population starts to fall away sharply. No hairlines at all on {lustre}, mirrors that are flawless to the eye, and a strike that is complete everywhere.',
  },
  {
    slug: 'pr68',
    code: 'PR68',
    alsoWritten: ['PF68'],
    name: 'Proof',
    label: 'Proof (PR-68)',
    number: 168,
    tier: 'proof',
    definition:
      '{a} {coin} in {label} is as good as the date is usually found: the surfaces are untouched, {lustre} show nothing under magnification, and the only thing separating it from the top of the scale is a trace of haze or a single pinpoint mark.',
  },
  {
    slug: 'pr69',
    code: 'PR69',
    alsoWritten: ['PF69'],
    name: 'Proof',
    label: 'Proof (PR-69)',
    number: 169,
    tier: 'proof',
    definition:
      '{a} {coin} in {label} is one imperfection from flawless, and finding it is the grader\u2019s work rather than the buyer\u2019s. On modern dates this grade is common enough to be the collecting standard; on older ones it is rare.',
  },
  {
    slug: 'pr70',
    code: 'PR70',
    alsoWritten: ['PF70'],
    name: 'Proof',
    label: 'Proof (PR-70)',
    number: 170,
    tier: 'proof',
    definition:
      '{a} {coin} in {label} is perfect under magnification: no hairline, no mark, no weakness anywhere, and {lustre} as they left the die. On a date struck before modern packaging this grade is close to unobtainable, so a listing offering one is worth checking the certification number on.',
  },
];

/** A code with its hyphen in: "MS65" -> "MS-65". */
const hyphenate = (code: string) => code.replace(/^([A-Z]+)(\d+)$/, '$1-$2');

/**
 * Every spelling of one rung, for the sentence that makes it findable.
 *
 * "XF40", "XF-40", "EF40", "EF-40" -- and with a designation, the same four
 * with RD on the end, spaced and unspaced. A reader types one of these; the
 * page should contain it.
 */
export const gradeForms = (grade: Grade): string[] => {
  const base = [grade.designation ? grade.code.replace(grade.designation.code, '') : grade.code];
  const codes = [...base, ...(grade.alsoWritten ?? [])];
  const spellings = codes.flatMap((c) => [c, hyphenate(c)]).filter((c, i, all) => all.indexOf(c) === i);
  if (!grade.designation) return spellings;
  const suffix = grade.designation.code;
  return spellings.flatMap((c) => [`${c}${suffix}`, `${c} ${suffix}`]);
};

/**
 * The rungs, Sheldon and designated together, in ladder order.
 *
 * Composed at module load rather than typed out: a designated rung is its
 * Sheldon rung's definition with one clause on the end, and writing the
 * twenty-one out by hand would be twenty-one places for that clause to drift.
 */
export const GRADES: Grade[] = [...SHELDON, ...PROOF].flatMap((g) => {
  const plain: Grade = { ...g, chain: '', rank: 0, groups: [] };
  if (g.tier !== 'mint-state') return [plain];
  return [
    plain,
    ...DESIGNATIONS.map(
      (d): Grade => ({
        ...g,
        slug: `${g.slug}${d.slug}`,
        code: `${g.code}${d.code}`,
        label: `${g.label} ${d.name}`,
        designation: d,
        chain: d.slug,
        rank: d.rank + 1,
        groups: d.groups,
        definition: `${g.definition} ${d.definition}`,
      }),
    ),
  ];
});

export const gradeBySlug = (slug: string) => GRADES.find((g) => g.slug === slug);

/**
 * Which rungs a given coin can legitimately be graded on.
 *
 * Not "which rungs have a price" -- that is the ladder's job and, since
 * 2026-09-22, a rung with no price is still a page. This is the prior question:
 * whether the grade DESCRIBES this object at all. Three answers, and each of
 * them is a fact about how the coin was made rather than about what is known
 * about it:
 *
 *   A PROOF is graded PR60-PR70 and nothing else. It was never in a till, so
 *   it carries no wear and no Sheldon rung applies; it was never in a mint bag
 *   either, so the mint state rungs do not describe it.
 *
 *   A MINT-SET UNCIRCULATED issue is graded MS60 upwards and nothing below.
 *   The Mint sold it directly, in a roll or a bag, so it never circulated --
 *   and a page offering "1974-S in Very Fine" would be describing a coin that
 *   cannot exist in that state without having been spent, which these were not.
 *
 *   A CIRCULATION STRIKE takes the whole Sheldon ladder, worn and unworn, and
 *   no proof rung.
 *
 * Colour is filtered on top of all three, in BOTH directions. `groups` on a
 * designated rung is the list of compositions the services designate colour
 * for, so MS65RD reaches a copper coin and never a silver one -- and where
 * colour IS designated the undesignated mint state rung is not a grade the
 * coin can be given at all. No service slabs a wheat penny as plain MS65: it
 * comes back MS65BN, MS65RB or MS65RD, and a page offering the coin in MS65
 * describes a holder nobody has ever seen. That is the same fact as the rung
 * above it, read the other way round, so it is derived from `DESIGNATIONS`
 * rather than declared a second time.
 *
 * It falls out by composition group, which is where the 1943 cent lands on
 * the right side of the line for free: it is zinc-coated steel, it files
 * under `steel`, colour is not designated on it, and it keeps the plain mint
 * state rungs that every other wheat penny loses.
 */
export const eligibleRungs = (coin: { group: string; finish?: { kind: string } }): Grade[] => {
  const kind = coin.finish?.kind;
  const tiers: Grade['tier'][] =
    kind === 'proof' || kind === 'silver-proof'
      ? ['proof']
      : kind === 'uncirculated'
        ? ['mint-state']
        : ['circulated', 'mint-state'];
  const designated = DESIGNATED_GROUPS.has(coin.group);
  return gradeLadder().filter(
    (g) =>
      tiers.includes(g.tier) &&
      (g.groups.length === 0 || g.groups.includes(coin.group)) &&
      !(designated && g.tier === 'mint-state' && !g.designation),
  );
};

/** The ladder order: Sheldon number, then colour within it. Never the array order. */
export const gradeLadder = (): Grade[] =>
  [...GRADES].sort((a, b) => a.number - b.number || a.rank - b.rank);

/**
 * The definition with its slots filled.
 *
 * Every slot is required, so a series with no `wear` cannot produce one -- and
 * that is the gate on the whole section rather than a missing-value bug: a
 * grade page whose "what the grade means" block is a generic paragraph about
 * the Sheldon scale is the thin page the fan-out rule exists to not build.
 */
export const gradeDefinition = (grade: Grade, wear: WearPoints, coinName: string): string =>
  // replaceAll, not replace. A composed definition names its coin twice -- once
  // in the Sheldon clause and once in the colour clause -- and `replace` would
  // fill the first and print `{coin}` to the reader for the second.
  grade.definition
    /*
     * `{a}` is the opening article, and it is a SLOT because the coin that
     * follows it decides it. Every definition here begins by naming the coin,
     * every coin on this site is named by its year, and a year is read aloud:
     * "an 1889-CC Morgan dollar" and "a 1932-D Washington quarter". It was the
     * literal "A " until the second series arrived, which made it right on
     * seventy-five pages and wrong on two thousand.
     */
    .replaceAll('{a}', article(coinName, true))
    .replaceAll('{coin}', coinName)
    .replaceAll('{label}', grade.label)
    .replaceAll('{obverse}', wear.obverse)
    .replaceAll('{reverse}', wear.reverse)
    .replaceAll('{legend}', wear.legend)
    .replaceAll('{detail}', wear.detail)
    .replaceAll('{lustre}', wear.lustre);

/**
 * Build-time checks on the ladder itself.
 *
 * Every one of these ships a page that looks finished: a duplicate slug is a
 * URL collision, a slot nobody filled renders the word `{obverse}` to a
 * reader, and two grades on one Sheldon number make prev/next step in a circle.
 */
export function validateGrades(): void {
  const problems: string[] = [];
  const slugs = new Set<string>();
  const rungs = new Set<string>();
  const forms = new Map<string, string>();

  for (const g of GRADES) {
    if (slugs.has(g.slug)) problems.push(`grade slug "${g.slug}" is declared twice`);
    slugs.add(g.slug);
    // One Sheldon number per chain. Two rungs on one number in one chain make
    // prev/next step in a circle; the same number in two chains is the point.
    const rung = `${g.number}/${g.chain}`;
    if (rungs.has(rung)) {
      problems.push(`two grades share Sheldon number ${g.number} in the "${g.chain || 'plain'}" ladder`);
    }
    rungs.add(rung);
    // Every spelling has to reach exactly one rung, or the sentence that lists
    // them sends a reader to the wrong page -- or to two.
    for (const form of gradeForms(g)) {
      const owner = forms.get(form);
      if (owner && owner !== g.slug) {
        problems.push(`"${form}" is a spelling of both "${owner}" and "${g.slug}"`);
      }
      forms.set(form, g.slug);
    }
    if (g.designation && g.tier !== 'mint-state') {
      problems.push(`grade "${g.code}" carries a colour on a circulated rung, where it separates nothing`);
    }
    if (g.designation && g.groups.length === 0) {
      problems.push(`grade "${g.code}" carries a colour that applies to no composition group`);
    }
    if (!/^[a-z0-9]+$/.test(g.slug)) problems.push(`grade slug "${g.slug}" is not URL-safe`);
    if (!g.definition.includes('{coin}')) {
      problems.push(`grade "${g.code}" definition does not name its coin, so it would be one paragraph on many pages`);
    }
    if (!g.definition.includes('{label}')) {
      problems.push(`grade "${g.code}" definition does not name its own grade`);
    }
    // A mint state coin has no wear, so a definition describing where it wears
    // is a definition that contradicts the grade it defines.
    if (g.tier !== 'circulated' && /{obverse}|{reverse}|{legend}|{detail}/.test(g.definition)) {
      problems.push(`grade "${g.code}" carries no wear but its definition describes wear points`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`The grade ladder is invalid:\n  - ${problems.join('\n  - ')}`);
  }
}

validateGrades();
