# Planned bots

> Written for: whoever builds these. Recorded 2026-09-22, **not yet built** —
> nothing in this file exists in the repository. It is here so the constraints
> are settled before somebody writes the easy version.

Two jobs, both batched, both running against the committed data files rather
than against the site. Neither is a runtime feature: this site has no database
and no backend, a bot writes a file, a build turns it into HTML.

---

## The rule that governs both

**A bot may write a figure, a date and a provenance. It may not write prose.**

Every sentence on a coin page and a grade page is generated from the facts by
`coin-copy.ts`, `catalog-copy.ts` and `grade-copy.ts`, and the duplicate checks
in `validateCatalogCopy()` and `validateGradeCopy()` are what keep that
generation honest. A bot that edits copy defeats both. If a bot's finding needs
a sentence, the fix is a field the generator reads — not a paragraph.

**A bot's output is a proposal until a check passes.** Both jobs below write
into the same pipeline the humans use, so the same validators run:
`npm run grades` re-derives the ladders, `npm run check`, `npm test` and
`npm run test:build` all have to pass before anything is committed. A bot that
commits past a failing check is a bot that has disabled the only thing standing
between a source's bad day and a published price.

---

## Bot 1 — refresh prices and sold comps

**What it does.** Walks the catalogue in batches, re-reads each coin's rungs
from the priced sources, and updates the figures, the realized sales and the
date they were read.

**Why batched.** PCGS CoinFacts is 100 calls per key per day and the endpoint is
per (PCGS number, grade). Three keys is 300 a day. A single series is thousands
of pairs, so a full refresh is a standing job measured in weeks, not a nightly
run. The batch size is a budget, not a tuning knob — see the fuse rule under
"Prices, caching and the two renderings" in `CLAUDE.md`, which exists because a
stateless job cannot count its own calls.

### Constraints this one must respect

- **The timestamp belongs to the FIGURE, not the page.** `GradedLadder.asOf` is
  the field, `valueBasis()` prints it, and that is the whole licence this
  section has for carrying a date at all. **There must be no `dateModified`, no
  `datePublished`, no sitemap `lastmod` and no "last updated" line** —
  `tests/build-smoke.test.mjs` fails on a date reappearing anywhere in the built
  HTML, and it is right to.
- **A rung it cannot price stays TBD.** It must never fill a gap with the figure
  from the rung below, an interpolation between neighbours, or last month's
  number carried forward. TBD is a true statement; a stale figure under a fresh
  timestamp is a lie with a date on it.
- **A figure that moves a long way is a flag, not an update.** The existing
  spread gate refuses two sources more than 12x apart because that is a
  transcription error rather than a market. The same reasoning applies over
  time: a rung that has moved by an order of magnitude since the last run is
  probably a source that has changed what it means by that row.
- **Sales must sit inside the range printed above them.** Already enforced by
  `validateTaxonomy()`, and it will fail the build rather than ship a page
  arguing with itself. The bot has to widen the range or drop the sale, and
  which one it did belongs in its report.
- **CAC sales are a different market** and must not be merged into an ordinary
  range. See the PCGS notes in `NEXT-SESSION.md`.
- **It must not delete a hand-written research sheet's figures.** A sheet in
  `data/grades/` is somebody's judgement about which figures counted and which
  outlier to ignore, and it beats the feed by design.

---

## Bot 2 — fact-check the catalogue

**What it does.** Walks the coins in batches and re-checks the facts that are
NOT prices — mintage, weight, diameter, metal content, which mints struck a
date, where the mint mark sits — against the sources that published them, and
reports disagreements.

**Why batched.** Same reason, different allowance: Numista is 2,000 calls a
month and shared with the mintage pipeline.

### Constraints this one must respect

- **It reports; it does not correct.** Every one of these facts was settled
  before this site existed, so a disagreement is much more likely to be a source
  changing its page than a coin changing its weight. The output is a list a
  person reads, in the shape `npm run report` already uses — the coin, what each
  source says, and a ready-made entry to paste.
- **A conflict is settled in writing, against a third source, or not at all.**
  That rule already exists for mintages (`ADJUDICATED` in
  `fetch-mintages.mjs`) and it applies here unchanged. An entry with nothing
  behind it is a preference, and a preference is what the list exists instead
  of.
- **Two sources is not enough to vote.** It is enough to detect a disagreement
  and no more. The four-source rule and the tie-breaking convention —
  **completeness first, and a tie goes to the HIGHEST figure**, because the
  worst thing this site can do to somebody holding an ordinary coin is tell
  them it is scarce — are in `CLAUDE.md` and are not the bot's to revise.
- **It must check the generated files against their sources, not against each
  other.** `data/mintages.json` and `src/data/coin-generated.ts` are two views
  of one derivation; comparing them proves the importer ran, which is what
  `npm test` already does.
- **Wikipedia's mintage column cites a collector site**, so a "second source"
  that reads both is one source. This is the trap the repo has already fallen
  into once and it is written up in the header of `scripts/numista.mjs`.

---

## What neither bot may do

- Touch anything under `src/pages/` or any `.astro` file.
- Write to `src/data/graded-values.ts` or `src/data/coin-generated.ts`
  directly. Those are generated; a bot edits the input and re-runs the importer,
  exactly as a person does.
- Add a source without adding it to `SOURCES` in `scripts/grade-sources.mjs`,
  where its methodology is described. A figure whose provenance is "a bot found
  it" is a figure this site cannot print.
- Spend a metered allowance without recording the spend in a committed file.
