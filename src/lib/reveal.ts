/**
 * How long a list of coins is before a reader has to ask for the rest.
 *
 * ---------------------------------------------------------------------------
 * WHY THE WHOLE LIST IS IN THE HTML ANYWAY
 * ---------------------------------------------------------------------------
 *
 * /coin-info/tagged/us-coin lists seven hundred coins and /coin-info/tagged/
 * 90-percent-silver lists three hundred and seventy. That is a wall, and a
 * wall is not a way in. But the answer is never to send fewer links: a page
 * that gives a crawler more than it gives a reader is cloaking, and this site
 * builds its `ItemList` schema from the same array the tiles come from, so a
 * truncated grid under a complete schema would be the mismatch Google issues
 * manual actions for -- the same rule the `Product` schema follows one
 * section over.
 *
 * So every tile is rendered. The script in `reveal-dom.ts` HIDES the overflow
 * and offers a button for it; without JavaScript nothing is hidden and the
 * page is exactly what it was. The reveal is a convenience laid over a
 * complete page, which is the only arrangement where the reader and the
 * crawler are looking at the same document.
 *
 * The button itself is the one thing this site renders in the browser only,
 * and it has to be: with no script nothing is hidden, so a server-rendered
 * "show more" would be a control with nothing to reveal. That is the opposite
 * of the calculators' rule rather than an exception to it -- there the figures
 * exist without the script, here the button exists only because the script
 * took something away.
 */

/** Tiles shown before the first "show more", and revealed by each press. */
export const REVEAL_STEP = 30;

/** "coins" -> "coin" when there is one of it. Nothing here is irregular. */
const countNoun = (n: number, noun: string): string =>
  n === 1 && noun.endsWith('s') ? noun.slice(0, -1) : noun;

/**
 * The label on the button, worked from what is left rather than from what has
 * been shown. A reader deciding whether to press it wants the size of the rest
 * of the list, and on the last press wants to know it is the last.
 */
export const revealLabel = (remaining: number, step: number, noun: string): string =>
  remaining <= step
    ? `Show the last ${remaining} ${countNoun(remaining, noun)}`
    : `Show ${step} more ${countNoun(step, noun)} (${remaining} left)`;
