# Writing a coin entry

How to fill in a `Coin` so the page reads the way the format intends. The
structure is in `src/data/coin-schema.ts`; this is the editorial half.

The page is a reference page, not an article. Facts in rows, one paragraph
where a paragraph is genuinely the shortest form, and nothing that exists to
fill a field.

---

## The outline

Every coin page is this, in this order. The order is the argument: the reader
arrived from search with one coin in hand and two questions — what is it worth,
and is mine special — and everything after that is reference material they read
only if the first answers hold them.

| # | Block | Source | Notes |
|---|-------|--------|-------|
| 1 | **H1 + eyebrow** | `name`, group, type, country, years | Metal · denomination · country · year |
| 2 | **The answer** | `bluf` | Two sentences. Also the FAQPage `acceptedAnswer` |
| 3 | **Melt value** | `silverOzt`/`goldOzt` × `spot.ts` | Big figure, the working, a dateline, one sentence |
| 4 | **Coin info** | the spec fields + `obverse`/`reverse`/`struckAt` | Rows only, no prose |
| 5 | **Is it worth more than melt?** | `commonality`, `mintage` | Three-word verdict, badge + mintage. No prose |
| 6 | **The series** | the series tag's `SeriesInfo` | Years, designer, key dates, metal eras |
| 7 | **Other years** | siblings sharing the series tag | Tiles when they exist; series archive link always |
| 8 | **Graded** | `GRADED_PAGES_AVAILABLE` | Dark until the route exists |
| 9 | **Depth** | `sections` | Optional. One fact true of this coin alone, or none |
| 10 | **Footer** | disclaimer, tags | No date: see below |

Blocks 3, 6, 7 and 8 render nothing at all when their data is absent — a coin
with no precious metal gets no melt block, a series nobody has researched gets
no series block. An empty heading is worse than a missing section.

**Only blocks 2, 5 and 9 are written by a person.** Everything else is
assembled from fields. If you find yourself writing a paragraph for one of the
others, the fact belongs in a field.

## The BLUF

**One sentence. What it is made of, with the number.**

The pattern, and the one to copy:

> A 1964 Washington quarter is 90% silver and contains 0.1808 troy ounces of
> silver.

That is the whole thing. An earlier draft added a second sentence — "That metal
is worth many times its twenty-five cent face value, even worn smooth" — and it
was cut, because the melt figure renders directly beneath it and says the same
thing in dollars. `tests/style.test.mjs` fails a BLUF with two sentences in it.

This text is used twice — as the opening paragraph and as the FAQPage
`acceptedAnswer` — so it has to be true standing alone, with no page around it.
That is how an answer engine will quote it.

**Do not:**

- run the two facts into one sentence with sub-clauses;
- hedge inside it ("roughly", "approximately", "depending on condition") — the
  melt block below carries the caveats, and repeating them here dilutes both;
- quote a dollar figure. Spot moves, the BLUF does not, and a stale number in
  the FAQ answer is the one place nobody will look to fix it.

## The melt block

Nothing to write. It is generated from `silverOzt` / `goldOzt` and
`src/lib/spot.ts`, and the sentence beneath it is `meltBaselineNote()` — the
same on every coin page on the site. If it needs rewording, it is reworded in
`spot.ts` and every page changes together.

## The verdict, and why there is nothing under it

Nothing to write. Section 5 is `PREMIUM_VERDICT[commonality]`, the badge and
the mintage, and that is the whole section.

There used to be a `premiumIf` list folded into one line beneath it — "Worth
more than melt only if it is uncirculated with full original lustre, certified
by PCGS or NGC rather than raw, or a verified mint error." It was cut at the
owner's instruction. The verdict is the sentence somebody who found a coin in
a jar came for, and a paragraph under it hedging the three-word answer takes
the one moment the page has their attention and spends it on the exceptions.
The grade table below already prices the uncirculated case, and an error is a
different coin.

## `obverse`, `reverse`, `struckAt`

**Per issue, never copied from the series.** A long series outlives its own
artwork and its own mints: the Washington quarter's reverse is a heraldic eagle
in 1964 and a commemorative design in 2005, and San Francisco struck the series
but not in 1964. Describing the coin from its series is how a page ends up
confidently wrong about the object in the reader's hand.

## `sections`

Optional depth, at the bottom, for the minority still reading. One section is
usually plenty and zero is acceptable.

**A section carries the one fact that is true of this coin and of no other.**
That is the whole test. The 1960 Philadelphia quarter has the smallest mintage
of the decade; the 1961 has the first proof run over three million; the 1962-D
has the widest two-mint split. An issue with nothing of its own omits the field
and its page ends at the pull quote, which is a complete page — the answer, the
metal figure, the specification, the verdict and the series all render above it
and none of them came from here.

`validateTaxonomy()` fails the build on two coins sharing a heading or a
paragraph, and on a heading with no paragraphs under it. That check is what
makes the field safe to leave empty: the cheapest way to fill it would
otherwise be to copy the section from the coin next door, so the only moves
left are to write something true of this issue alone or to write nothing.
Reaching for a near-duplicate is the signal that the honest answer was nothing.

Do not write a section that the structured fields already answer. Two were cut
from the 1964 quarter for exactly this: "how to work out what yours is worth"
(the melt block shows the working) and "when it is worth more than its silver"
(the verdict and the grade table). If a section restates a field, delete the
section.

## `values`

Leave empty unless there is a source that can be named on the page. `valueAsOf`
and `sources` are required the moment it is filled, and the build enforces it.
A coin with no `values` says so in one line and loses nothing — the metal
arithmetic is exact and carries the page.

## Dates

There are none. A `Coin` has no `published` and no `updated` field, no page
carries a `dateModified`, and nothing gets a sitemap `lastmod`. What a coin
weighs and what it is made of were settled before this site existed, so a date
on the entry would record a file save — noise to the reader, and a claim a
crawler can check and find worthless.

The two exceptions are both measurements rather than edits: `valueAsOf` dates
the priced rows whenever `values` is filled, and `spotBasis()` prints the time
the metal price was read next to every figure worked from it.

## The series cheat sheet: `keyDates`, `varieties`, `errors`

These three lists are the top of a series page. They are rendered twice — once
as a bare list of labels in the cheat sheet, once in full underneath — and the
cheat sheet is *derived*, so there is nothing to write twice and nothing to
keep in step.

**Everything here is checked before it is printed.** Not recalled, not inferred
from what the entry beside it says. Every one of these rows is a claim about
a coin somebody is holding, and the cost of a wrong one is a reader taking a
coin to a dealer to be told no. Mintages come from the mint's published
figures; populations come from a grading service's census or a published
discovery report; the physical tests come from the specifications. If a fact
cannot be traced to one of those, it does not go in.

### Which list does it belong to

The three differ by **how the reader settles it**, and that is the only test
that matters:

| | It is a | Because |
|---|---|---|
| Read the date and the mint mark | key date | No judgement is involved at all |
| Look at one feature and decide | variety | It is a die, so every coin from it is the same |
| Weigh it, or hold a magnet to it | mint error | The mistake is in the metal, not in the design |

The 1943 bronze cent looks like a variety and is not: nothing about the design
is different, the blank was wrong. The 1982 large and small date is a variety;
the 1982-D small date *in bronze* is an error, and they are two rows.

### `keyDates`

`why` explains the scarcity — never the price, and there is no field for one.
`mintage` is the mint's own figure, which is the evidence for the sentence
next to it. `coin` links to a catalogue page the day that page is built.

### `varieties`

`lookFor` is required and names the feature, not the coin. `caution` is where
the row earns its place: most people who think they have a doubled die have
machine doubling, and a row that does not say so is a row that sets somebody
up. Write the lookalike, not a disclaimer.

### `errors`

`check` is the measurement, written so it can be done at a kitchen table with
no vocabulary — a magnet, a scale that reads hundredths of a gram, the edge of
the coin. A test the reader cannot perform is the same as no test.

`caution` is **required** here, where it is optional on a variety. Every row
is a coin somebody would like to own, the confirmed population is usually in
the dozens, and the reader almost certainly has the ordinary thing. Say what
the ordinary thing is.

`known` is the published census, in words: "About twenty across the three
mints", "Two confirmed". Leave it off rather than estimate one.

Only errors documented on **this series**. Off-centre strikes, clipped
planchets and die cracks happen to every coin ever struck; repeating them on
every series page is generated filler, and they belong in a common question.
Most series have no entry here at all, and then the section does not render —
the Mercury dime and the Morgan dollar are both like that, and that is the
correct outcome rather than a gap to fill.

### Neither varieties nor errors get a page

They are listed and they are not followed. Each one is a specialty with its
own literature, its own authentication problem and an audience this site is
not written for, and a page per variety is a divergence that never converges.
There is no `coin` field on either type, and a build check fails if a link
appears in the cheat sheet. Key dates are the exception, because a key date
is an ordinary issue of the series that happens to be scarce.
