/**
 * The browser half of the long lists: hide the overflow, offer a button.
 *
 * The reasoning for hiding rather than not rendering is in `reveal.ts`. This
 * module is what makes it true in a browser, and it runs on every page for the
 * same reason `spot-dom.ts` does -- a grid long enough to need it appears on
 * both archive trees, on the tag pages and on a coin page's list of other
 * years, and a flag somebody has to remember fails silently. It returns on its
 * first line when the page carries no marked grid.
 *
 * THE MARKUP CONTRACT
 *
 *   data-reveal="30"          on the grid: how many to show, and to add
 *   data-reveal-noun="coins"  what the button calls them, plural
 *
 * A child of a marked grid is one item. Nothing else about the markup is
 * assumed, which is what lets one script serve the coin tiles and the melt
 * tiles without knowing the difference.
 */
import { REVEAL_STEP, revealLabel } from './reveal';

/** Hidden rather than removed: the link stays in the document for find-in-page
 *  to fail on honestly, and comes back with no re-render. `.tile`'s own
 *  `display: block` outranks the user-agent rule for [hidden], so the grid
 *  restates it in `global.css`. */
const setHidden = (el: HTMLElement, hidden: boolean): void => {
  el.hidden = hidden;
};

function wire(grid: HTMLElement): void {
  const step = Number(grid.dataset.reveal) || REVEAL_STEP;
  const noun = grid.dataset.revealNoun || 'items';
  const items = Array.from(grid.children) as HTMLElement[];
  if (items.length <= step) return;

  let shown = step;
  items.slice(shown).forEach((el) => setHidden(el, true));

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-secondary reveal-more';
  button.textContent = revealLabel(items.length - shown, step, noun);

  const row = document.createElement('div');
  row.className = 'reveal-row';
  row.appendChild(button);
  grid.insertAdjacentElement('afterend', row);

  button.addEventListener('click', () => {
    const first = items[shown];
    items.slice(shown, shown + step).forEach((el) => setHidden(el, false));
    shown = Math.min(shown + step, items.length);

    const remaining = items.length - shown;
    if (remaining === 0) row.remove();
    else button.textContent = revealLabel(remaining, step, noun);

    // The button may have just gone, and a keyboard user standing on a removed
    // element is put back at the top of the document. Send them to the first
    // thing the press produced instead, which is also where the eye goes.
    first?.focus?.();
  });
}

export function bootReveal(): void {
  const grids = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (grids.length === 0) return;
  grids.forEach(wire);
}
