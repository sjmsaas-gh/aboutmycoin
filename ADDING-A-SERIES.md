# Adding a whole series

`ADDING-A-COIN.md` is for one coin, written by hand, because it has something of
its own to say. This is the other procedure: a **whole run** of a series — every
year, every mint mark, every finish — fetched, cross-checked and generated, with
nothing typed in the middle.

It exists because the two jobs have opposite failure modes. One coin written by
hand fails by never getting written. Two hundred coins generated fail by all
being wrong at once, quietly, in a way that looks finished. Everything below is
shaped by the second problem.

The worked example is the Washington quarter: 1932 to 2025, four source pages,
two catalogues, 244 issues and 33 refusals. Read `scripts/fetch-mintages.mjs`
and `scripts/numista.mjs` alongside this.

---

## The whole routine, in order

```bash
npm run verify -- --all         # crawl sources 3 and 4 -> data/mintage-consensus.json
npm run mintages                # parse sources 1 and 2, vote, refuse -> data/mintages.json
npm run coins                   # that + coin-taxonomy.ts -> coin-generated.ts
npm run report                  # ONLY what is still undecided
npm run prices -- <series-slug>  # the retail guides -> data/grade-prices.json
npm run grades                  # that + the sheets -> src/data/graded-values.ts
npm run check && npm test && npm run test:build
```

`npm run catalogue` chains the middle four. Run **`npm run report`** to see where a
series stands without reading two hundred lines of confirmations: it prints one
block per coin that has no page, with every figure each source states and a
ready-made `ADJUDICATED` entry to paste. It touches no network and costs
nothing, so run it as often as it is useful.

Add `-- --refresh` to either fetching command to go to the network again;
without it both read the committed caches and are free.

Four commands and one editorial file. **What a person types is the series
registry in `coin-taxonomy.ts`** — the denomination, the country, the
composition eras with their weights, where the mint mark sits in each era, which
mints struck which years. No feed knows where a mint mark sits. Everything else
is derived, and anything typed into a generated file is lost on the next run.

---

## 0. Run `npm run discover -- <series-slug>` first

```bash
npm run discover -- morgan-dollar
```

One command, no writes, and it answers the four questions that otherwise cost a
dozen exploratory fetches:

- **What the taxonomy is already missing** for that series, split into what
  BLOCKS generation (`denomination`, `country`, `compositions[].specs`) and what
  merely costs a generated sentence (`markPositions`, the obverse and reverse
  clauses, `wear`). The two failures look identical from outside: `npm run coins`
  generates nothing for a series with no source and nothing for a series with no
  denomination.
- **Which Wikipedia pages hold the figures**, and each table classified `narrow`,
  `wide` or unknown — which is what decides the parser.
- **What Numista calls it**, and crucially whether ONE type spans the whole run
  (the Morgan: every issue is an issue of type 1492) or there is one type per
  design (the modern quarter). That decides whether `designOf` has anything to
  read.
- **Whether the one-page-per-coin sources cover it, and at what URL.** It probes
  several year and slug shapes, because these sites do not have a page for every
  year — the Morgan's 1921 is there and its 1878 is not, so probing one year
  reports no coverage for a source that has 140 pages.

The tag itself has to exist in `coin-taxonomy.ts` first; that is the editorial
half and nothing here can write it.

## 0b. If there is no Wikipedia page, name another primary

`npm run discover` prints `0 tables, 0 readable` for every candidate, and that
is not a parser problem. Some series have no Wikipedia mintage table at all: the
family of `<X> mintage figures` pages covers the cent, the nickel, the quarter,
the half dollar and the Roosevelt dime, and **the Mercury dime is not in it**.
The article carries no table of any kind and there is no dime page to hold one.

Under the ordinary rule that series generates nothing, because the merge seeds
every coin off the primary source. That is a failure worth naming precisely:
the figures are not doubtful, the thing that seeds them is absent. Five sources
carry the Mercury dime and agree with each other on all but ten figures.

So a series may name its primary, in `primary` on its entry in `SERIES`:

```js
{
  slug: 'mercury-dime',
  primary: { via: 'numista', covers: '...', cites: '...', why: '...' },
  outOfScope: [],
  sources: [],          // no wikitext pages, and that is the point
}
```

**Numista, not one of the collector charts, and that is the owner's decision of
2026-09-22.** Two of the charts that cover this series quote identical figures
down to the last digit and one of them names the other's source, so they are one
lineage counted twice; Numista is a catalogue with an editorial process, it is
already a first-class source in this pipeline, and its responses are cached and
committed under `data/numista/`. The four collector sources then vote exactly as
they do on every other series.

Three things follow and all three are load-bearing:

- **The primary does not get to vote twice.** Its rows are what the others are
  voting on, so `numistaRows` is not read again as the second source. Counting
  it in both places makes every disagreement a tie the primary wins.
- **The registration in `NUMISTA_SERIES` stops being a convenience.** Elsewhere
  a mistake in it costs a vote. Here it costs the catalogue.
- **Expect the primary to be outvoted, and check that it is.** Numista folds
  the proofs into its Philadelphia totals from 1936 to 1942 — 87,504,130 where
  the others say 87,500,000 and state the 4,130 proofs separately — and this
  catalogue gives the proof a page of its own, so the primary's figure counts
  those coins twice. Three sources outvote it on all seven. That is the vote
  doing its job, and it is the first thing to read in `npm run report`.

## 1. Find the sources, and expect there to be several

A series' figures are almost never on one page. The Washington quarter's are on
four, in three different table shapes:

| Shape | What it looks like | Who uses it |
|---|---|---|
| `narrow` | Year / Mint / Mintage / Comments, one row per mint | the `<X> mintage figures` pages — Lincoln cent, Roosevelt dime, Kennedy half, nickel |
| `wide` | one row per reverse design, one **column** per mint | `50 State quarters`, `American Women quarters` |

The narrow shape is the standard one and most series have a page in it, which is
why adding a second series is about ten lines of registry. Register each page in
the `sources` list of that series' entry in `SERIES`, with `covers` (which years
it holds) and `cites` (what the page's own footnotes point at).

**Two things to check before you trust a page.** Whether its citation is a site
another of your pages also cites — the Washington page's mintage column cites
`washingtonquarters.org`, so the two are one source wearing two hats. And
whether the primary source is reachable at all: `usmint.gov` answers 403 to
anything that is not a browser, so the Mint's own production figures cannot be
automated and are not one of the two sources.

## 2. Declare the wide columns; never find them

A wide table's columns go in `columns`, each with its data `index` and its
`header`. The check is that every declared heading appears in the table's
headers **in the declared order**, because that is the failure worth catching:
the 50 State table runs Philadelphia, Denver, San Francisco and the American
Women table runs **Denver, Philadelphia**, San Francisco. A parser that guessed
would file four years of Denver's figures under Philadelphia and every number
would look plausible.

It cannot be done by position — both tables have a two-band header with a
`colspan` over the mints, so a heading's place in the header list is not its
place in a data row. Declare `total` wherever the page adds its own columns up:
the sum is re-derived on every row, which is what turns "the San Francisco
column must be the uncirculated coin" from a remembered reading into a build
failure the day it stops being true.

## 3. Get the finishes right, and get the order right

The Comments column is the only thing separating **four different coins** that
share a year and a mint mark. `EXCLUDED` is tested before `FINISHES`, and that
order is the whole of the correctness:

- `Silver bullion, uncirculated` is a five-ounce bullion round, **not** the
  uncirculated quarter sold in Mint rolls.
- `Silver reverse proof` is **not** the silver proof.
- `Enhanced uncirculated` is **not** the uncirculated coin.

Match the short patterns first and you file fifty-six bullion rounds as
quarters and give two coins one page. Out of scope by decision, each recorded
with its reason: bullion, satin/Special Mint Set, enhanced uncirculated,
reverse proof, and anything dual-dated.

## 4. Decide the slug for every finish BEFORE the first run

A slug is never changed once published and there are no redirects in a static
build, so this is the one decision that cannot be revised. `issueSlug` in
`src/lib/coin-copy.ts` is the whole of it.

The trap: **the bare form can only belong to one coin per (year, mark).** For the
Washington quarter the bare form went to the proof, because from 1968 an S on a
quarter means a proof and nothing else — and that collided at once with the
twenty-two Philadelphia proofs of 1936–1942 and 1950–1964, which carry no mint
mark and would have shared `1936-washington-quarter` with the circulation strike
of the same date.

The fix is the shape to copy: state the rule on the **mark**, not on what else
happens to exist. A proof with no mint mark takes the token; a proof with one
keeps the bare form. That is decided by the coin rather than by the state of the
catalogue, so it cannot change the day a source adds a sibling — which a
conditional "bare unless taken" rule would.

## 5. Four sources, and take what a majority agrees on

**This is the part that is not optional.** A figure the sources split evenly on
is a figure this site does not print — the grade pages' "two figures minimum, or
the rung is not a page" rule applied to a mintage.

But **two sources is not enough**, and that is the lesson worth carrying to the
next series. Two sources can only agree or disagree, so every disagreement is a
coin with no page: the first run of this pipeline withheld **thirty-three** coins,
including whole years. Adding a third and fourth brought it to a handful, because
most of what looks like a disagreement is one site's transcription slip, and a
third vote identifies it.

| Outcome | What happens |
|---|---|
| all that hold a figure agree | taken, `sources: n` |
| a majority agrees | taken, with the outvoted figures recorded beside it |
| a near-tie on a collector issue | the higher figure, as a revised sales count — see step 6 |
| one source alone | taken, `sources: 1`. Normal, and not evidence against it: the later sources have no page for anything struck in the last two years |
| an even split | `ADJUDICATED`, or the coin is withheld |

**A source is registered per series, and so are its URLs.** `SOURCES` in
`verify-mintages.mjs` is keyed by series slug, the same move `SERIES` in
`grade-sources.mjs` made for the price guides. Every URL in the quarter's
entries names a quarter, so a flat list reaches nothing on a second series —
and `npm run verify -- <series>` narrows a run without dropping the other
series' votes, which matters because the quarter's crawl is eight hundred pages
and a narrowed run that quietly deleted its results would withhold every coin
they settled.

Three shapes, and which one a source gets is decided by what the SOURCE is
rather than by which series it holds:

| Shape | What it means |
|---|---|
| `indexes` | it enumerates itself: an index page listing every coin it holds, then one page per coin. Nothing is guessed and nothing is missed |
| `urls` | addressed by a slug built from a design's name. Needs a target list, and a miss is reported rather than fatal |
| `pages` | the whole series on one chart, a row per date. One fetch, no slug to guess, and no miss possible — the row is there or the source does not hold the coin |

The known ones, and what each costs:

| Source | Shape | Cost |
|---|---|---|
| Wikipedia mintage tables | whole series per page | 4 requests |
| Numista | API, enumerated by search | ~300 requests, 2,000/month allowance |
| silverrecyclers.com | one page per design, **URL derivable** | 1–2 requests per design |
| usacoinbook.com | one page per (design, mint, finish), **enumerated from four programme indexes** | ~830 requests |
| coinmintages.com | `pages` — a row per (date, finish) | 1 request |
| landofcoins.com | `pages` — date, mintage, proof mintage | 1 request |

**When the primary source does not cover a kind of coin at all, say so in
`gaps`.** The Morgan table carries no proof figures and says so in its
`missing` field; twenty-six coins that exist and that three sources agree about
had no page, because the merge could not tell "this table does not cover
proofs" from "this table was told to leave the Bicentennial out". A declared
gap lets the secondary sources build the coin, and the bar goes UP rather than
down — `MIN_GAP_SOURCES` is two that agree, where a coin the primary carries
may stand on that one source.

Everything is cached. `data/numista/` and `data/mintage-consensus.json` are
committed; the raw HTML lives in `data/verify/.cache/` and is gitignored, because
it is nine megabytes and re-fetchable from the url each figure records.

**Two traps in adding a source.** Its own search may be useless — usacoinbook's
is a marketplace search that returns nothing for a catalogue query, which is why
that source enumerates from programme index pages instead. And it will name a
design its own way: pass the other catalogues' names as candidate slugs, which is
the only reason the American Samoa page was found at
`2020-national-park-of-american-samoa-quarter` rather than from the primary
source's caption, "National Park".

Register the series in `NUMISTA_SERIES` with its query, its `titleMatch` and a
`designOf`. Every response is cached under `data/numista/` and committed, so a
re-run costs nothing of the 2,000-a-month allowance and the numbers a build was
made from are in the repository. Same for the wikitext, under `data/wikitext/`.
`--refresh` is the only thing that goes to the network.

**What the cross-check actually caught**, on one series:

- Wikipedia's 2000 South Carolina row repeats the 1999 Delaware figures — a
  534-million understatement on two pages, and both numbers are plausible.
- Numista's 2010 Hot Springs figures are the **May 2010 announcement**, not the
  final audited ones.
- Numista is low by a third on 2018-D Apostle Islands and on 2009 DC.
- Three American Women rows are missing a mint cell entirely, so every figure
  after the gap reads one column to the left.
- Numista titles the 2024 issues `25 Cents` and everything else `¼ Dollar`, so a
  prefix filter dropped a whole year in silence.

## 6. A near-tie on a collector issue is one figure, not two

A proof's "mintage" is not a production run, it is **how many were sold**, and
that figure is revised as the Mint's audits land. So two sources quoting 512,798
and 512,729 are not disagreeing about the coin; they are quoting one number
before and after a correction, and the later one is the higher one. Five coins
were withheld over differences of a few hundred out of half a million.

`NEAR_ENOUGH` is half a per cent and the rule applies **only to the collector
finishes**, because a circulation strike's mintage is a production total that does
not drift — a tie there is one source being wrong. The 2014-P figures differ by
exactly ten thousand, which is a transcription slip and not a revision, and taking
the larger would be a coin toss dressed as a rule. Widening the tolerance starts
merging figures that really do disagree: the next gap up in this series is eight
per cent.

## 7. Adjudicate a genuine tie against a further source, in writing

`ADJUDICATED` is judgement; the merge is mechanics. Neither source is reliably
better — the list above proves it in both directions — so a rule preferring
either one would have shipped something wrong. Each entry names the year, the
design, the **finish** (required) and `checked`: what the third source said.

An entry with no third source behind it is a preference, and a preference is
what the list exists instead of. An entry with no finish silently settles the
proofs on the strength of a circulation figure; that happened, and the
requirement is the fix.

## 8. Watch the design count, in both directions

From 1999 a mint strikes five or six reverses a year, a page belongs to the
(year, mark, finish), and so the mintage is a **sum**. Two things must hold and
both are checked:

- **The sum covers every design struck.** `designs` counts the designs the
  figure was built from, which is not the number struck. The 2023-S uncirculated
  coin lost one design to a source with no figure for it, and the page would
  have summed four and said "San Francisco struck four reverse designs in 2023".
- **No design is counted twice.** Two catalogues do not call one design by one
  name, so they are paired loosely — and *every* time the loose match failed,
  the design looked absent from one side, was added as a gap to fill, and the
  coin came out with one design more than the mint ever struck. "River of No
  Return" against "Frank Church River of No Return Wilderness" put six designs
  and twelve million on the 2019-W page; "US Virgin Islands" against "U.S.
  Virgin Islands" put seven on the two 2009 pages; "Ozark Riverways" against
  "Ozark National Scenic Riverways" put six on 2017's.

`normaliseDesign` and `sameDesign` do the pairing and `pairDesigns` refuses
rather than choosing when one name matches two designs of one coin.
`tests/mintages.test.mjs` holds every one of these as a case.

## 9. Say what the number counts, on the page

A sum printed in the slot where a 1950-D page prints one striking's mintage is
the site changing what a word means halfway down its own catalogue.
`Coin.mintageNote` is generated from the figures and renders under the mintage.

Where every design carries the same figure — **every proof**, because the figure
is the number of sets, and the 2019-W and 2020-W issues at two million apiece —
`perDesign` is set and it is the number the page leads with. Ten million is an
accounting fact about West Point; two million is why anybody is looking.

`perDesign` is also what the scarcity thresholds are applied to, never the sum.

## 10. A coin that was never in a till gets no scarcity verdict

`commonality` is a statement about **survival**, and survival is only a question
for a coin that circulated. Every proof was bought by somebody who wanted it and
put it in a drawer, so a proof with a mintage of a million is not scarce, it is
cheap — and the thresholds would print "Scarce" over ninety of them.

`Coin.finish` carries a generated sentence and suppresses the verdict, the badge
and the market note. It is a fifth branch rather than a fifth `commonality`
value because the four values are read as a ladder from the flattest no to the
clearest yes, and there is no honest rung for "different question".

## 11. Composition belongs to the issue

Two lists on `SeriesInfo`, and the distinction is load-bearing:

- **`compositions`** is a **timeline**: ordered, gapless, covering the whole run,
  and validated as such, because the series page reads it out as "the metal
  changed partway through the run" and the date is what tells a reader which era
  they hold. Split an era when the *reverse* or *obverse* changes, not only the
  alloy — without the 1999 split, every page from 1999 on told a reader to look
  for a heraldic eagle on a coin with a state on the back of it. The **group**
  stays the same across such a split, which is what keeps it out of the URLs.
- **`finishCompositions`** is for compositions that are **not on the timeline**.
  San Francisco has struck a silver proof alongside the clad quarter of the same
  date every year since 1992, so 1999 is both clad and silver and the date
  cannot decide. Folding those into the timeline overlaps it and makes the series
  page claim the date decides the metal when it does not.

A silver proof lands in the `silver` group and therefore at
`/coin-info/silver/...` while its clad twin is at `/coin-info/clad/...`. That
is the design, not a bug.

**A new composition needs a melt row.** `validateMeltRows()` throws when a
United States catalogue coin states a silver weight no calculator row matches.
State the weight and the fineness and let the content derive — the .999 quarter
is 6.343 g at .999, which is **heavier** than the 90% coin it replaced, because
the dimensions did not change and pure silver is denser than the alloy.

## 12. A mint does not appear on a page unless it struck that coin

`Mint.years` is a **list** of ranges, because a mint's run has holes in it: San
Francisco struck these to 1954, struck none at all for thirteen years, and has
struck proofs since 1968. One range claims either that it never stopped or that
it never started again, and both mislead a reader turning a 1960-S over looking
for a coin that was never made.

The generated checklist says which mints did *not* strike a date, and it reads
the `attested` list in `data/mintages.json` rather than the catalogue. The
difference is a false sentence: a coin withheld for a source conflict is absent
from the catalogue and present in the world, and reading the catalogue made the
2012-S page say "There is no 2012-D. Denver struck none of these in 2012" about
a coin Denver struck five hundred million of. **Existence and price are two
different questions.**

## 13. Read the report, then read the diff

`npm run report` prints what is left to decide, which is the part to read.
`npm run mintages` prints everything it did, and every list in it is written into
`data/mintages.json`:

`withheld` · `outOfScope` · `malformed` · `unpublished` · `excluded` ·
`afterLastYear` · `adjudicated` · `revised` · `sources.agreement`, and on each
issue `sources`, `agreedBy` and `outvoted`

Then read the diff to `src/data/coin-generated.ts`. Never edit it.

## 14. Stop where the published figures stop

`LAST_YEAR`. A page for the current year either states a partial total, which is
a wrong number, or states none, which is a page with nothing on it. Raise it the
year the source's table is complete, not the year the coins appear — and note
that "complete" is a thing the cross-check tells you: the 2025 figures are still
moving, which is why the two sources agree on three designs and differ by a
factor of three on the fourth.

## 15. Look at the pages

With `npm run dev` running, `/dev/coins` shows every URL the entries created,
every FAQ question claimed and everything still missing. Read a proof page, a
`W` page, an uncirculated page and an ordinary one, because those are four
different generated shapes.

---

## What this does not do

It generates a coin whose page is its facts. It does **not** write `sections`,
which holds the one fact true of this coin and of no other — a generator cannot
know one, and if it could, the fact would be derivable and not worth a section.
A generated coin's page ends at the pull quote, which is a complete page. An
issue with a story is moved into `coin-seed.ts` by hand, and the importer skips
any slug the seed defines, so promoting one is a change to two files rather
than to the site.

---

## 16. Grade pages, which are a second pipeline over the same coins

The catalogue answers "what is this worth". A grade page answers "what is it
worth in THIS grade", and it runs on a different kind of number: a mintage was
settled in 1932 and a price was settled last week. So it has its own fetch, its
own gates and its own committed file, and nothing about it touches the mintage
pipeline.

```bash
npm run prices -- <series-slug>           # both guides, every coin of the series
npm run prices -- --report                # what matched, what did not, fetch nothing
npm run prices -- --refresh               # ignore the cache and go to the network
npm run prices -- --keep-cache            # leave the responses for the next pass
npm run prices -- --clean                 # drop them after an interrupted run
npm run grades                            # merge, gate, write graded-values.ts
npm run grades -- --report                # every rung the gates refused, and why
npm run grades -- --coin <coin-slug>      # one coin: every figure, every decision
```

**`npm run grades -- --coin <slug>` is the one to reach for.** It answers the
question that otherwise costs an hour of reading JSON — why this coin has four
grade pages and the one next to it has none — by printing every figure each
source published, what each gate did with each rung, and the ladder that came
out. It writes nothing.

Four things are worth knowing before the first run.

**The sources are two, and it is a floor rather than a comfortable number.**
PCGS, Greysheet and Heritage answer 403 to a scripted request and NGC's price
guide renders from an API its page does not name — the four anybody would reach
for first, all unreadable at the scale of a series. What is left is USA Coin
Book and PriceCharting, which are at least genuinely independent: one publishes
a retail estimate with a live melt floor under it, the other computes from
completed sales. A third source is the single best improvement available to
this section, and `SOURCES` in `scripts/grade-sources.mjs` is where it goes.

**Every rung of every coin is a page, and most of them will say TBD.** That is
the owner's decision of 2026-09-22 and it is the thing most likely to surprise
you on a first run: a series of three hundred coins produces five thousand grade
pages, of which a few hundred carry a figure. The rest are complete in every
other respect — what the grade looks like on that coin, where it sits in the
ladder, how it is spelled on a slab, the metal floor, and a sold-comps search —
and say `TBD to TBD` where the range goes.

**The gates still refuse figures; they no longer refuse pages.** Two sources
minimum — not two figures, because from 1999 one guide prices five reverses of
one date and that is five figures and one opinion. A spread wider than twelve
times is one source reading a different coin. A ladder whose ceiling falls as
the grade rises has a wrong row in it, and the offending rung drops to TBD
rather than printing a figure that contradicts the one below. What a refused
rung gets is TBD, not a 404.

**Which rungs a coin can be given is a fact about how it was made.**
`eligibleRungs()` decides, and it is not about evidence at all: a proof takes
PR60–PR70 and nothing else, a Mint-set uncirculated issue takes mint state and
nothing below it, and a circulation strike takes the whole Sheldon run and no
proof rung. A series with **no `wear` points on its tag still gets nothing**,
and that is the one gate TBD does not rescue — without them the page cannot say
what any grade looks like on that coin, which is the content that makes an
unpriced page worth publishing.

**The responses are not kept.** `data/grade-prices.json` holds the figures with
their URLs and the date; the pages themselves are cached under
`data/prices/.cache` only while the crawl is being got right, and a run deletes
them as soon as it has written the feed. Use `--keep-cache` while you are fixing
a parser, or the next pass costs the whole crawl again. That is a deliberate
departure from the mintage pipeline, where every source response is in the
repository; the cost is that a source redesigning its page leaves no diff, and
`npm run prices -- --report` is what stands in for it.

**A hand-written sheet beats the feed and is not gated.** Put a sheet in
`data/grades/<coin>.tsv` for a coin worth the research — a key date, the coin
the series is searched for — and the feed is not read for it. That is where the
separation test is off, where realized auction prices and certified populations
can go, and where a person's judgement about which figures count is written
down. `data/grades/1932-d-washington-quarter.tsv` is the worked example, and
its header is the part to read.
