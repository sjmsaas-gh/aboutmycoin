/**
 * Observations in, a priced ladder out -- and the four refusals in between.
 *
 * `npm run prices` records what each source says about each rung and decides
 * nothing. This is where it is decided, and it is kept apart from both the
 * fetch and the file writing for one reason: every rule in here is arguable,
 * the arguments are the most valuable thing in this section, and they should be
 * readable and testable without a network or a catalogue.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR GATES, POOREST EVIDENCE FIRST
 * ---------------------------------------------------------------------------
 *
 * 1. TWO SOURCES, not two figures.
 *
 *    The house rule reads "two figures minimum, or the rung is not a page", and
 *    on a hand-researched sheet that is the right test, because a person
 *    gathering figures one at a time is gathering them from different places.
 *    A feed is not: from 1999 a source prices five state reverses of one date,
 *    this catalogue has one page for all five, and that is five figures and one
 *    opinion. So the gate here counts SOURCES. It is the same rule the mintage
 *    pipeline learned -- two can only agree or disagree -- pointed at the
 *    failure a feed actually has.
 *
 * 2. A SPREAD THAT IS A DISAGREEMENT, NOT A MARKET.
 *
 *    Two retail guides on one rung of one coin land within a factor of a few of
 *    each other; condition within a grade, eye appeal and the day of the week
 *    account for that and the range is the honest way to print it. An order of
 *    magnitude is not a wide market, it is one of the two reading a different
 *    coin -- a variety page matched onto the plain date, a column shifted by
 *    one. `SPREAD_LIMIT` refuses those. The rung goes; the coin keeps its
 *    other rungs, because the failure is per figure.
 *
 * 3. SEPARATION, which is the owner's decision of 2026-09-21 reversed for this
 *    fan-out and reversed knowingly.
 *
 *    A rung earns a URL where its price separates from the rung below it. The
 *    1932-D shipped its full certified ladder without this test and the reasons
 *    against were put and overruled; three hundred coins is where the argument
 *    changes side, because the thing that made sixteen rungs defensible on one
 *    famous coin -- that somebody types "1932-D quarter VF30" -- is not true of
 *    a 1961-D, whose bottom six rungs are the same melt figure six times. A
 *    page whose entire content is a range identical to the range one click
 *    below it is the scaled-content shape, and the reader it fails is the one
 *    who clicked expecting a difference.
 *
 *    `SEPARATION` is a step in the MIDPOINT of the range rather than in either
 *    end, because adjacent guide ranges overlap by design -- the low is the
 *    weakest figure found and the high the strongest -- and a test on
 *    non-overlap would reject ladders that are plainly climbing.
 *
 * 4. TWO RUNGS, or the coin gets no grade pages at all.
 *
 *    A ladder of one is a point. Every comparative thing a grade page does --
 *    the step up from the grade below, prev and next, the sentence that says
 *    what the difference is worth establishing -- needs a second rung to point
 *    at, and with one rung the page is the coin page's value line on a URL of
 *    its own, competing with it. This is also, and not by design, what keeps
 *    every proof issue out: of the proof rungs the sources publish, one has two
 *    sources behind it.
 */

/** Beyond this, the two sources are not describing the same coin. */
export const SPREAD_LIMIT = 12;

/** The midpoint step a rung must make over the rung below to earn a URL. */
export const SEPARATION = 1.15;

/** A ladder shorter than this is a point, not a ladder. */
export const MIN_RUNGS = 2;

/** Sources agreeing this closely are quoting one figure, and it is not two. */
const round = (n) => Math.round(n * 100) / 100;

/**
 * One rung's observations -> one range, or a reason there is none.
 *
 * `low` is the weakest figure any source published and `high` the strongest,
 * which is the same convention the hand-written sheets use and the reason
 * adjacent ranges overlap: this is what the data looks like, and a range that
 * hid it would be a point with error bars drawn on by the site.
 */
/**
 * THREE SOURCES VOTE; AN OUTLIER IS OUTVOTED RATHER THAN OBEYED.
 *
 * This is the mintage pipeline's lesson, arriving here the day a third source
 * did. Two sources can only agree or disagree, so a disagreement is a rung with
 * no figure -- and on this section that is not a rare accident, it is the
 * normal case on exactly the coins people search for. PriceCharting computes
 * from completed sales and a scarce date has almost none, so it extrapolates:
 * its 1893-S mint state ladder runs $18,916 to $1,036,470 in a smooth curve
 * while the other two guides and the certified census agree the coin is worth
 * several hundred thousand. Twelve times apart, refused, TBD.
 *
 * With three sources the odd one out is identifiable, which is the whole
 * difference. A source whose figure is more than the spread limit away from the
 * MEDIAN of the sources is dropped, the rest are used, and what was dropped is
 * recorded -- a figure this site did not print is part of the evidence for the
 * one it did.
 *
 * WITH TWO SOURCES NOTHING CHANGES. There is no median to be an outlier from,
 * the rung is refused exactly as before, and every ladder built before a third
 * source existed is untouched.
 */
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function rangeFor(observations) {
  const sources = new Set(observations.map((o) => o.source));
  if (sources.size < 2) {
    return { refused: `one source only (${[...sources].join(', ') || 'none'})` };
  }
  const usable = observations.filter((o) => Number.isFinite(o.price) && o.price > 0);
  if (usable.length === 0) return { refused: 'no figure' };

  let kept = usable;
  let outvoted;
  if (sources.size > 2) {
    /*
     * One vote per SOURCE, not per figure. A guide that prices five reverse
     * designs of one year supplies five figures and one opinion, which is the
     * same reason the two-source gate counts sources -- so the vote is taken on
     * each source's own middle figure.
     */
    const bySource = new Map();
    for (const o of usable) bySource.set(o.source, [...(bySource.get(o.source) ?? []), o.price]);
    const votes = [...bySource].map(([source, prices]) => [source, median(prices)]);
    const centre = median(votes.map(([, price]) => price));
    const out = votes
      .filter(([, price]) => price / centre > SPREAD_LIMIT || centre / price > SPREAD_LIMIT)
      .map(([source, price]) => ({ source, price: round(price) }));
    if (out.length > 0 && bySource.size - out.length >= 2) {
      kept = usable.filter((o) => !out.some((x) => x.source === o.source));
      outvoted = out;
    }
  }

  const prices = kept.map((o) => o.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  if (high / low > SPREAD_LIMIT) {
    return { refused: `sources ${round(high / low)}x apart (${low}-${high})` };
  }
  return {
    low: round(low),
    high: round(high),
    sources: [...new Set(kept.map((o) => o.source))].sort(),
    ...(outvoted ? { outvoted } : {}),
  };
}

/**
 * The gated rungs of one coin, in ladder order, with a line per refusal.
 *
 * `order` is the ladder position of a rung slug, supplied by the caller so this
 * module never imports the catalogue. `chain` is the colour ladder a rung
 * belongs to; separation is judged within one, because a cent in MS64 Red and
 * the same cent in MS65 Brown are not a step apart.
 */
export function ladderFor(coinSlug, observations, { order, chain }) {
  const refusals = [];
  const priced = [];

  for (const [rung, rows] of Object.entries(observations)) {
    if (order(rung) === undefined) {
      refusals.push(`${coinSlug} ${rung}: no such rung is registered`);
      continue;
    }
    const range = rangeFor(rows);
    if (range.refused) {
      refusals.push(`${coinSlug} ${rung}: ${range.refused}`);
      continue;
    }
    if (range.outvoted) {
      // Recorded, not hidden. A figure this site did not print is part of the
      // evidence for the one it did, and a source quietly dropped on one rung
      // of one coin is how a parser gone blind stays invisible.
      refusals.push(
        `${coinSlug} ${rung}: ${range.outvoted
          .map((o) => `${o.source} at $${o.price}`)
          .join(', ')} outvoted by ${range.sources.join(' and ')} (printed without it)`,
      );
    }
    priced.push({ rung, ...range });
  }

  priced.sort((a, b) => order(a.rung) - order(b.rung));

  const kept = [];
  const lastIn = new Map();
  for (const row of priced) {
    const c = chain(row.rung);
    const previous = lastIn.get(c);
    /*
     * SEPARATION NO LONGER DECIDES WHETHER A RUNG IS A PAGE.
     *
     * Owner's decision of 2026-09-22, which reverses the one taken the day
     * before. Every rung of every eligible coin now gets a page, and a rung the
     * site has no trustworthy figure for says TBD rather than 404 -- so there
     * is nothing left for a separation test to gate. It would only be choosing
     * between printing a figure the site HAS and printing TBD in its place,
     * and throwing away a known price to print a placeholder is not a trade
     * anybody wants.
     *
     * The check is kept and still reports, because the thing it measures is
     * worth knowing -- a run of rungs that do not separate is a coin where
     * grade does not move the price, which is a fact about the coin. It just
     * no longer removes anything.
     */
    const mid = (row.low + row.high) / 2;
    if (previous && mid < ((previous.low + previous.high) / 2) * SEPARATION) {
      refusals.push(
        `${coinSlug} ${row.rung}: $${row.low}-${row.high} does not separate from ${previous.rung} ($${previous.low}-${previous.high}) (printed anyway)`,
      );
    }
    // The ceiling has to rise too, and not only the midpoint.
    //
    // A rung can carry a higher midpoint and a lower top -- one source quotes a
    // wide band at the grade below and a tight one here -- and the importer
    // refuses a ladder whose high falls, rightly, because on a hand-written
    // sheet that is a row filed under the wrong grade. Caught here it costs one
    // rung; left to the importer it fails the whole run, and the message points
    // at a file nobody typed.
    // A falling ceiling still drops the FIGURE -- not the page. A ladder that
    // goes down as the grade goes up is evidence one of the two rows is wrong,
    // and an unknown price is better than a wrong one. The rung reappears
    // downstream as TBD.
    if (previous && row.high < previous.high) {
      refusals.push(
        `${coinSlug} ${row.rung}: tops out at $${row.high}, below ${previous.rung} at $${previous.high}`,
      );
      continue;
    }
    lastIn.set(c, row);
    kept.push(row);
  }

  /*
   * The two-rung minimum is gone too, and for the same reason.
   *
   * It existed because a ladder of one rung gave the page nothing to compare
   * with: no step up, no prev, no next. Now every eligible rung of the coin is
   * in the ladder whether or not it has a figure, so the comparisons always
   * have somewhere to point -- at a TBD, which is itself a true statement about
   * what this site knows. `MIN_RUNGS` stays exported because the tests pin the
   * old behaviour of the gate that still runs.
   */

  return {
    values: kept.map((r) => ({ grade: r.rung, low: r.low, high: r.high })),
    sources: [...new Set(kept.flatMap((r) => r.sources))].sort(),
    refusals,
  };
}
