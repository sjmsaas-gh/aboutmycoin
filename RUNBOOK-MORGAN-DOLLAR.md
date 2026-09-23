# Adding the Morgan dollar, end to end

> Written for: whoever runs the next series, at the terminal. It assumes
> `ADDING-A-SERIES.md` for the reasoning and repeats only what is specific to
> this series. Everything here was verified against the live sources on
> 2026-09-22; where a step is blocked, the blocker was reproduced rather than
> guessed at.

The Morgan dollar is the second series through this pipeline and the first that
is not a quarter. **Roughly half the work below is one-off code that makes the
pipeline series-aware and never has to be done again**; the rest is the same
five commands the Washington quarter used.

Do it in this order. Each phase ends somewhere you can stop.

---

## Where this run got to, 2026-09-22

**The catalogue is complete. Phases 0 to 4 are done; phase 5, the prices, is
not, and is deliberately not** -- the owner's instruction was to finish the
coins first and mark every figure TBD until the prices are researched.

| | |
| --- | --- |
| Coins | **126**, 1878-1921, every mint, every Philadelphia proof, and the two 1878 reverses. 86 figures confirmed by all four sources, 32 by three, 7 by two, 1 settled by hand |
| Sources | Wikipedia, Numista, **coinmintages.com**, **landofcoins.com** |
| Still disputed | **two**, the 1890-O and the 1898-O, both published with the spread stated on the page |
| Grade ladders | **all 126**, 2,259 rungs, 620 priced and 1,639 TBD. `npm run grades` builds a ladder for every coin in the catalogue, priced or not, so this cost no network |

### What the last session added

**The twenty-six missing Philadelphia proofs, 1878-1904.** Two new sources were
found for them, because Numista alone could not be enough: `usacoinbook` has no
1878-1904 proof page but the 1895, `silverrecyclers` has no Morgan page at all,
PCGS answers 403 to a script and its metered key was spent. **coinmintages.com**
carries a row per (date, finish) and **landofcoins.com** a three-column chart
with a proof column; both were checked against Numista row by row before either
was registered, and they agree with it on every Philadelphia proof of the run
bar one -- 832 against 833 in 1888, which is inside `NEAR_ENOUGH`. Every one of
the twenty-six now stands on three sources.

They also settled most of what was outstanding on the dates already published:
the ties fell from seven to two and nothing is left on a single source.

**The 1878 tail feathers, as pages of their own.** The owner's decision, and it
reverses "a variety is listed and never followed" for these two and nothing
else. There are now three 1878 Philadelphia pages per finish: the year
(10,508,800, with a `mintageNote` saying the figure is the two added together
and a checklist step telling the reader to count), the eight-feather reverse
(749,500) and the seven-feather one (9,759,300). The seven-over-eight stays a
`varieties` row, because its coins are counted inside the seven-feather figure.

**The machinery under both is not Morgan-specific.**

- **`gaps` on a source in `fetch-mintages.mjs`.** A declared gap is not an
  exclusion. The merge still refuses to invent a coin the primary does not
  carry -- that rule is what keeps the 1976 Bicentennial out -- but "this table
  does not cover proofs" is a different claim from "this table was told to
  leave the Bicentennial out", and it now says so in a form the merge can read.
  `MIN_GAP_SOURCES` is two, which is a higher bar than a coin the primary
  carries has to clear.
- **`SOURCES` in `verify-mintages.mjs` is per series**, with a third shape --
  `pages`, the whole series on one chart -- and `npm run verify -- <series>`
  narrows a run without dropping the other series' votes.
- **`hubs` on `SeriesInfo`**, the fourth axis of an issue after the year, the
  mark and the finish, with its own permanent slug token.
- **`take` in `ADJUDICATED` may be a figure**, needed exactly once: inside a
  gap both sources are secondary, so "take the primary" names nothing.

### Two copy bugs it turned up, both already shipped

- **"one of 3,837 struck with the design on yours"** was printed on every proof
  page on the site, including the twenty-two 1936-1964 quarters, where the year
  has one design and the clause implies there were others. It was written for
  the quarter from 1999 and was right there. Same trap as `article()`.
- **"the same metal, and the same value, as an 1878-CC"** on the 1878
  Philadelphia page. The clause only ever meant "the mint mark does not matter
  here" and it was crossing a scarcity boundary: an 1878-CC is a two-million
  Carson City dollar worth several times a Philadelphia one. It is now filtered
  to siblings the thresholds put on the same rung.

**What is still worth doing, in order:**

1. **Phase 5, the PCGS fetcher**, which is the prices. It is worth more on this
   series than it was on the quarter, because the free guides are weakest on
   exactly the dates people search for -- see "the key dates come out TBD"
   under phase 4. 1,606 pairs were unasked as of 2026-09-22, about seventeen
   more days on one key.
2. ~~Grade ladders for the thirty new coins.~~ Done — `npm run grades`, offline.
   Note for the next series: the importer loops over `COINS` rather than over
   the feed, so a coin with no figures still gets a full TBD ladder. A missing
   grade page means the import has not been re-run, not that a price is absent.
3. **Wire the PCGS populations and realized sales into `GradedLadder`.** They
   are in the ledger already and cost no further calls.

---

## The short version

```bash
npm run discover -- morgan-dollar          # what is missing; writes nothing
# ... fill coin-taxonomy.ts by hand (phase 1) ...
npm run verify -- morgan-dollar             # sources 3 and 4 -> mintage-consensus.json
npm run mintages                           # all four, voted -> data/mintages.json
npm run coins                              # + taxonomy      -> coin-generated.ts
npm run report                             # only what is still undecided
# ... make the price sources series-aware (phase 3) ...
npm run prices -- morgan-dollar            # both guides    -> data/grade-prices.json
npm run grades                             # merge + gate   -> graded-values.ts
npm run pcgs -- morgan-dollar --budget 300 # phase 5, once it exists
npm run check && npm test && npm run test:build
```

---

## Phase 0 — look before touching anything

```bash
npm run discover -- morgan-dollar
```

It fetches nothing it has not cached, writes nothing, and prints exactly what is
missing. As of 2026-09-22 it says:

```
TAXONOMY
  run: 1878–1921
  mints: (none), CC, O, S, D
  BLOCKING — no coins generate until these are filled:
    - denomination
    - country
    - compositions[].specs
  missing, and each costs a generated sentence rather than the series:
    - markPositions
    - compositions[].obverse / .reverse / .edgeLooks
    - wear (needed for grade pages)
    - mints[].years
```

So the tag already carries the run, the mints, the composition era, the key
dates and the varieties. **What it does not carry is everything a page is
written from.**

Two notes on that output:

- `NUMISTA_API_KEY not set` in the Source 2 block is the script not loading
  `.env`, not a missing credential. Export it first if you want that section to
  report: `export $(grep -E '^NUMISTA_' .env | xargs)`.
- Source 1 found **`Morgan dollar`, one wide table, 34 rows, readable.** One
  page covers the whole series — unlike the quarter, which needed four.

---

## Phase 1 — the editorial registry (by hand, and only this)

Everything else on this page is a command. This is the part a person types,
because no feed knows where a mint mark sits. In `src/data/coin-taxonomy.ts`,
on the `morgan-dollar` tag's `series` block:

| Field | Why it blocks |
| --- | --- |
| `denomination` | `import-coins.mjs` refuses a series without one — it is the URL's second segment |
| `country` | same refusal |
| `compositions[].specs` | weight, diameter, silver content. Without them the importer invents nothing and generates no coin |
| `markPositions` | where the mark sits — below the wreath on the reverse. One generated sentence per page |
| `compositions[].obverse` / `.reverse` / `.edgeLooks` | the identification copy |
| `mints[].years` | **Carson City struck 1878–1885 and 1889–1893, which is two ranges.** `Mint.years` is a LIST for exactly this reason; one range claims it never stopped |
| `wear` | **required for grade pages.** Five plural noun phrases — see `WearPoints` in `grades.ts` |

### `wear` is the one to get right

It is what every grade page's definition block is built from, and it gates the
whole grade section: no `wear`, no grade pages, and TBD does not rescue it.

Five slots, **every one a PLURAL noun phrase with no appositive**, because each
is dropped into the middle of a generated sentence. The Washington quarter
shipped `"Washington's cheek and jaw, the largest open fields on the coin"` and
that comma read as a splice on seventy-five pages. For the Morgan, roughly:

```
obverse: 'the hair above Liberty’s ear and the cotton bolls in her cap'
reverse: 'the eagle’s breast feathers and the tops of its wings'
legend:  'E PLURIBUS UNUM and the date'
detail:  'the individual feathers of the eagle’s wings and the cotton leaves'
lustre:  'the open fields of Liberty’s cheek and neck'
```

Check them against a real coin before committing — they are printed on every
grade page of the series.

---

## Phase 2 — the dates and mints

```bash
npm run mintages     # add --refresh to go to the network again
npm run coins
npm run report
```

Before the first run, register the series in two places:

1. **`SERIES` in `scripts/fetch-mintages.mjs`** — the `Morgan dollar` Wikipedia
   page, shape `wide`, one entry. Simpler than the quarter's four.
2. **`NUMISTA_SERIES` in `scripts/numista.mjs`** — the second opinion. Not
   optional: the house rule is four sources vote, and two sources can only agree
   or disagree.

`npm run report` prints **only what is still undecided** — one block per coin
with no page, every figure each source states, and a ready-made `ADJUDICATED`
entry to paste into `fetch-mintages.mjs`. Run it as often as useful; it touches
no network.

### The proofs need a third and fourth source, and here they are

```bash
npm run verify -- morgan-dollar   # coinmintages.com + landofcoins.com
npm run mintages                  # then merge them in
```

The primary table carries **no proof figures at all** except the 1895, and says
so in its `missing` field. That is a declared gap rather than an exclusion, so
the secondary sources may build the coins inside it — see `gaps` in
`fetch-mintages.mjs` — but two sources can only agree or disagree, and Numista
was the only one that had them. Both of the others were found by looking for
the FIGURES rather than for a source, which is the right way round: each was
checked against Numista row by row before it was registered.

What is not reachable, recorded so it is not rediscovered: `usacoinbook` has no
1878–1904 proof page but the 1895, `silverrecyclers` has no Morgan page at all
under any URL shape worth trying, PCGS and Greysheet answer 403, and NGC's coin
explorer renders from an undocumented API its page does not name.

### The 1878 tail feathers are pages, and that was a decision

USA Coin Book lists **five** 1878-P pages — 8 tail feathers, 7 tail feathers,
7-over-8, and two reverse sub-types — and **no plain `1878-P`**. The house rule
says a variety is listed and never followed, and the owner overruled it on
2026-09-22 for the 8TF and 7TF: they are separate reverse hubs with separate
published mintages, told apart by counting, at 749,500 against 9,759,300.

They are `hubs` on the series now, not `varieties`. The year's own page
survives and states the combined total. **The 7-over-8 is still a `varieties`
row** and must stay one: its coins are counted inside the seven-feather figure,
so a page for it would either state a mintage it has not got or restate one
that is already somewhere else.

One figure needed settling. Numista puts the eight-feather reverse at 750,000
and coinmintages at 749,500, and only the second adds up to the primary
source's year total of 10,508,800 — Numista's own year total is 10,509,300, the
same rounding carried through. That is an `ADJUDICATED` entry with the
arithmetic written out, and it is the one place in the list where `take` is a
figure rather than the name of a source.

---

## Phase 3 — make the price sources series-aware (one-off code)

**`scripts/grade-sources.mjs` is hardcoded to quarters in seven places.** This
is the real work of this run and it is done once for every series after.

Verified blockers, each reproduced on 2026-09-22:

### 3a. The mint-mark regex does not know CC or O

```
parseIssueName('1889 CC')  ->  { year: 1889, mark: 'P', design: 'CC' }
parseIssueName('1884 O')   ->  { year: 1884, mark: 'P', design: 'O'  }
```

Every Carson City and New Orleans Morgan currently parses as a Philadelphia coin
with a design called "CC". `^([PDSW])\b` must become something like
`^(CC|[PDSOW])\b` — **CC before C**, and the same fix is needed in the USA Coin
Book path regex `^(\d{4})-([PDSW])$`.

### 3b. The source lists are quarter-only

- PriceCharting: four `coins-*-quarter` consoles → **`coins-morgan-dollar`**,
  one console, about 690 rows across five cursor pages.
- USA Coin Book: five `/coins/quarters/<cat>/` pages → **`/coins/dollars/morgan/`**,
  138 rows.
- The index regex `/game/coins-(?:washington|state|...)-quarter/` and the
  path regex `/coins/\d+/quarters/` both need the series in them.

Make `SOURCES` take the series slug rather than closing over quarter constants.

### 3c. VAMs will swamp PriceCharting unless the filter learns them

This is the one that will quietly ruin the run. PriceCharting's Morgan console
is **dominated by VAM varieties**:

```
1878-78tf-strong        1878-78tf-vam-37
1878-78tf-strong-vam-37 1878-78tf-vam-38
1878-78tf-strong-vam-38 ...
```

The design-count rule (a source listing more pages for an issue than the Mint
struck designs has a variety in its list) **will not save you here** — a Morgan
has one design, so PriceCharting would be refused for nearly every date and the
whole series would come out one-source and therefore all TBD.

So `variety()` must gain `vam-\d+[a-z]?` and the tail-feather tokens (`78tf`,
`7tf`, `8tf`, `7over8`, `strong`, `weak`) **before** the count rule sees the
list. Check the effect with `npm run prices -- morgan-dollar --report`, which
fetches nothing and prints what matched.

### 3d. Check the proof mapping

Morgan proofs are Philadelphia and markless, so they collide with the
circulation strike on a bare `1889`. The quarter solved this in `FINISH_SLUG`
and the pass-two matcher; verify it holds here rather than assuming.

---

## Phase 4 — the grades from the free guides

```bash
npm run prices -- morgan-dollar --report      # what matched; fetches nothing
npm run prices -- morgan-dollar               # the real run, ~40 min
npm run grades
npm run grades -- --report                    # every refusal, with its reason
npm run grades -- --coin 1889-cc-morgan-dollar
```

### The key dates come out TBD, and that is the gate working

This was the expectation before the run and it was wrong, in an interesting
direction: **the free guides are least useful on exactly the coins people
search for.**

PriceCharting computes from completed sales and a scarce date has almost none,
so its algorithm produces figures that are not close to a market. Its own
1889-CC page states $1,128.10 ungraded, then **$37.00 in VG8** and **$311,475
in MS70** -- a grade that coin has never been awarded. Against USA Coin Book's
$1,384 for the same VG8, that is 37x apart, and the spread gate refuses the
rung. The 1889-CC keeps **one rung of nineteen**.

A common date behaves as expected: the 1921 Philadelphia keeps five rungs and
the two guides sit within a factor of three of each other on all of them.

So the shape of this series is: **common dates priced thinly, key dates almost
entirely TBD.** The failure is a placeholder rather than a wrong figure, which
is the right way round and is not the same as being solved. Do not reach for
the gates -- raising `SPREAD_LIMIT` to let the 1889-CC through would publish
"$37 to $1,384" for a coin worth a thousand, which is worse than TBD in every
way. The fix is phase 5.

**Keep the cache while you are fixing a parser** — `--keep-cache` — or every
pass costs the whole crawl again. A run deletes it once it has written the feed.

---

## Phase 5 — PCGS CoinFacts, the one that fills the ladders

**The fetcher exists now: `npm run pcgs`.** It ran once, on 2026-09-22, on one
key.

```bash
npm run pcgs -- morgan-dollar --numbers        # resolve PCGS numbers, no calls
npm run pcgs -- morgan-dollar --plan           # what it WOULD ask, no calls
npm run pcgs -- morgan-dollar --budget 95      # spend the day
npm run grades                                 # and merge it in
```

**Run it once a day until the queue is empty.** It is resumable by design: the
ledger at `data/pcgs/morgan-dollar.json` is committed, a pair is never asked
twice, and each key's daily count lives in that file rather than in the
process, so a second run on the same day spends nothing it has already spent.

What the first day bought, at 94 calls:

- **86 of 96 coins have a PCGS number**, resolved from Numista for free. The
  ten that do not are the dates where the catalogue lists several numbers for
  one year -- one per reverse hub or variety -- and picking one would price a
  variety as the ordinary coin. `1903-S` is the worked example: 7288 and 7306.
- **82 guide figures**, plus every one of their certified populations and up to
  ten realized auction sales apiece. Only the guide figure reaches a page
  today; the sales and the populations are in the ledger waiting for the pass
  that wires them into `GradedLadder`, because the expensive part is the call
  and it has been made.
- **1,606 pairs still unasked**, which is about seventeen more days on one key.

And it forced one change to the gates, which is recorded in CLAUDE.md: **with
three sources an outlier is outvoted instead of refusing the rung.** The 1889-CC
went from one priced rung to seven the moment PriceCharting's $37 could be
outvoted rather than obeyed. Nothing about two sources changed, so the whole
Washington quarter is untouched.

### Budget arithmetic

100 a day per key. A Morgan is 20 eligible rungs, so a coin is a fifth of a
day, and 96 coins is about three weeks on one key or a week on three. The queue
is ordered key dates first, then scarce, then ascending mintage -- and within a
coin, G4 to MS67 first, then AG3, then MS68 to MS70 last, because those three
are almost never awarded to a coin struck for circulation and are the last
thing worth a call.

### The endpoint



```
GET https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByGrade
      ?PCGSNo=<n>&GradeNo=<n>&PlusGrade=false
Header: authorization: bearer <COINFACTS_API_KEY>
```

One call returns `PriceGuideValue`, `Population`, `PopHigher` **and** an
`AuctionList` of up to ten realized sales with house, month and price. That is
all three evidence types a hand-written research sheet carries, which is why
this single source is worth more than the two free guides together.

### What the fetcher does, and why each part is there

All five were requirements before it was written and all five are in
`scripts/fetch-pcgs.mjs`. They are restated here because changing one of them
is how the allowance gets spent twice.

- **Budget and resume.** A pair already in the ledger is never requested again,
  answered or empty. Each key's daily count is in `data/pcgs/<series>.json`
  rather than in the process, for the same reason `/api/spot` keeps its guards
  in the cached document. The ledger is written after **every** call, not at the
  end: an interrupted run has already spent what it spent, and the only thing
  worse than a lost call is a lost call nobody knows was made.
- **Extra keys rotate and are counted separately.** `COINFACTS_API_KEY_2` and
  `_3`. A key is named in the ledger by eight characters of a digest, because
  that file is in git.
- **`CoinFactsNotes` is stripped before anything is written.** Several
  kilobytes of somebody else's prose per response, and it must never reach a
  page.
- **`IsCAC` sales go in a list of their own.** On the 1932-D MS65 the ordinary
  sales run $5,280–$9,150 and one CAC coin fetched $19,520. Folded in, that
  doubles the range and the importer then accepts it as evidence of its own
  range.
- **PCGS numbers come from Numista, and ambiguity is refused.** `npm run
  mintages` now carries the reference on every issue it caches, so this costs
  nothing against an allowance the build already spends. Where a coin resolves
  to more than one number, none is taken.

### What is still to wire up

The ledger holds a certified **population** and up to ten **realized sales** for
every pair already asked, and neither reaches a page yet: a ladder's `sale` and
`population` fields are filled from a hand-written sheet only. That is the next
piece of plumbing and it costs no calls at all — the data is already bought and
committed.

---

## Phase 6 — verify

```bash
npm run check && npm test && npm run test:build
```

Then read three pages: a key date with figures (1889-CC), an ordinary date, and
a proof. The things that go wrong are copy, not data — a clause spliced with a
capital letter, a grade definition that reads as a comma splice, a sentence
written for one coin that is false on a hundred.

---

## What is NOT in this runbook

**Committing.** Nothing here commits. `data/grade-prices.json`,
`data/mintages.json`, `src/data/coin-generated.ts` and
`src/data/graded-values.ts` are all generated and all committed; the source
pages behind the prices are not kept.

**`sections`.** A generated coin has none and its page ends at the pull quote,
which is a complete page. An issue with a story is moved into `coin-seed.ts` by
hand.
