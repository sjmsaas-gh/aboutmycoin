/**
 * The browser half of the header search: fetch the index once, rank on every
 * keystroke, and navigate.
 *
 * The reasoning for what is in the index is in `search.ts`, which is imported
 * here rather than copied -- the ranking that decides the order is the ranking
 * the tests run, and there is no second scoring rule anywhere. This module
 * does DOM and nothing else.
 *
 * THE MARKUP CONTRACT
 *
 *   data-search             on the wrapper: one search box
 *   input[data-search-box]  the combobox itself
 *   ul[data-search-results] the listbox, shipped empty and hidden
 *
 * Every string a reader can see comes from `search.ts`. A sentence typed into
 * a DOM script is a sentence no test reads and no style check sees.
 *
 * WHY THE SUGGESTIONS ARE RENDERED ONLY IN THE BROWSER
 *
 * This is the second control on the site that exists only because a script is
 * running -- the first is the "show more" button in `reveal-dom.ts` -- and it
 * is the same argument. There is nothing for the build to render: a suggestion
 * is a function of a query that has not been typed yet, and a static site has
 * no server to ask. So with no JavaScript the box is hidden outright by the
 * `<noscript>` rule in `Header.astro` and the navigation beside it is the way
 * in, rather than an input that accepts a query and sits there. That is the
 * house rule about failing honestly, not an exception to the calculators'
 * "nothing is rendered only by the browser" -- there the figures exist without
 * the script.
 *
 * WHEN THE INDEX IS FETCHED
 *
 * On the reader's first keystroke or first focus, never on page load. It is
 * eighty kilobytes of JSON that most visits never need, and a page that
 * downloads it on load would be paying for the search box on every coin page
 * whether anybody searched or not. One fetch is shared by every box on the
 * page and is reused for the life of the document.
 */
import {
  BROWSE_NOTE,
  INDEX_FAILED_NOTE,
  SEARCH_INDEX_PATH,
  SEARCH_KINDS,
  SEARCH_LIMIT,
  noMatchNote,
  search,
  type SearchEntry,
} from './search';

/** Where "browse instead" goes: the catalogue, same as the header's button. */
const BROWSE_PATH = '/coin-info';

/** One fetch per document, shared by every box and by every keystroke. */
let index: Promise<SearchEntry[]> | undefined;

const loadIndex = (): Promise<SearchEntry[]> => {
  index ??= fetch(SEARCH_INDEX_PATH, { headers: { Accept: 'application/json' } })
    .then((r) => {
      if (!r.ok) throw new Error(`search index: ${r.status}`);
      return r.json() as Promise<SearchEntry[]>;
    })
    /* A failed fetch is not cached as an empty index: a reader on a dropped
       connection who types again should get another try, and an empty array
       would tell them their coin is not on this site. */
    .catch((err) => {
      index = undefined;
      throw err;
    });
  return index;
};

function wire(box: HTMLElement): void {
  const input = box.querySelector<HTMLInputElement>('[data-search-box]');
  const list = box.querySelector<HTMLElement>('[data-search-results]');
  if (!input || !list) return;

  /** What is on screen now, in the order shown. Empty when the list is shut. */
  let shown: SearchEntry[] = [];
  let active = -1;

  const close = (): void => {
    shown = [];
    active = -1;
    list.hidden = true;
    list.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };

  /** A row that is not a result: an empty search, or a failure to fetch. */
  const note = (text: string, href?: string): HTMLLIElement => {
    const li = document.createElement('li');
    li.className = 'search-note';
    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      li.appendChild(a);
    } else {
      li.textContent = text;
    }
    return li;
  };

  /**
   * An anchor rather than a div with a click handler, so the middle button,
   * ctrl-click and "copy link address" all work -- a suggestion is a link to a
   * page, and a control that only answers to a left click is a link that has
   * been taken away from half the ways people use one.
   */
  const row = (entry: SearchEntry, i: number): HTMLLIElement => {
    const li = document.createElement('li');
    li.id = `${list.id}-${i}`;
    li.className = 'search-result';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');

    const a = document.createElement('a');
    a.href = entry.p;
    /* Out of the tab order: the input keeps the focus and the arrows move the
       selection, which is what a combobox does. */
    a.tabIndex = -1;

    const title = document.createElement('span');
    title.className = 'search-result-title';
    title.textContent = entry.t;

    const kind = document.createElement('span');
    kind.className = 'search-result-kind';
    kind.textContent = SEARCH_KINDS[entry.k]?.label ?? '';

    a.append(title, kind);
    li.appendChild(a);
    return li;
  };

  const mark = (i: number): void => {
    const rows = list.querySelectorAll<HTMLElement>('.search-result');
    rows.forEach((el, n) => el.setAttribute('aria-selected', String(n === i)));
    active = i;
    if (i < 0) input.removeAttribute('aria-activedescendant');
    else {
      input.setAttribute('aria-activedescendant', rows[i].id);
      /* Optional because the list can be taller than its box only in a real
         browser, and the DOM the tests run in has no scrolling to do. */
      rows[i].scrollIntoView?.({ block: 'nearest' });
    }
  };

  const open = (children: Node[]): void => {
    list.replaceChildren(...children);
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    mark(-1);
  };

  const render = (entries: SearchEntry[], query: string): void => {
    shown = entries;
    if (entries.length === 0) {
      open([note(noMatchNote(query)), note(BROWSE_NOTE, BROWSE_PATH)]);
      return;
    }
    open(entries.map(row));
  };

  /** The query this render belongs to, so a slow fetch cannot overwrite a
   *  newer keystroke's results. */
  let latest = '';

  const run = (): void => {
    const query = input.value;
    latest = query;
    if (query.trim() === '') {
      close();
      return;
    }
    loadIndex().then(
      (entries) => {
        if (latest !== query) return;
        render(search(entries, query, SEARCH_LIMIT), query);
      },
      () => {
        if (latest !== query) return;
        shown = [];
        open([note(INDEX_FAILED_NOTE), note(BROWSE_NOTE, BROWSE_PATH)]);
      },
    );
  };

  const go = (i: number): void => {
    const entry = shown[i];
    if (entry) window.location.assign(entry.p);
  };

  input.addEventListener('input', run);
  /* Warms the fetch while the reader is still reaching for the first letter.
     It costs one request on a focus that goes nowhere, and it is the whole
     difference between the first keystroke showing results and showing
     nothing. */
  input.addEventListener('focus', () => {
    void loadIndex().catch(() => {});
    if (input.value.trim() !== '') run();
  });

  input.addEventListener('keydown', (e) => {
    const rows = shown.length;
    if (e.key === 'ArrowDown' && rows) {
      e.preventDefault();
      mark((active + 1) % rows);
    } else if (e.key === 'ArrowUp' && rows) {
      e.preventDefault();
      mark(active <= 0 ? rows - 1 : active - 1);
    } else if (e.key === 'Enter') {
      /* With nothing highlighted, Enter takes the first suggestion: it is what
         the reader is looking at and what every other search box does. */
      if (rows) {
        e.preventDefault();
        go(active < 0 ? 0 : active);
      }
    } else if (e.key === 'Escape') {
      /* First press shuts the list, second clears the box. Escape on an open
         list that also cleared would lose a query the reader was editing. */
      if (!list.hidden) close();
      else input.value = '';
    }
  });

  /* A press inside the list must not move the focus. Without this the input
     blurs on mousedown, the handler below empties the list, and the click that
     would have followed lands on nothing -- the suggestion a reader pressed
     navigates nowhere. Preventing the default on mousedown stops the focus
     change and nothing else, so the anchor's own click still navigates. */
  list.addEventListener('mousedown', (e) => e.preventDefault());

  /* Focus leaving the whole box shuts the list. Read off the element the focus
     is moving TO, because during a focusout the document's active element is
     the body on its way somewhere and every close would look justified. */
  box.addEventListener('focusout', (e) => {
    const to = (e as FocusEvent).relatedTarget;
    if (!(to instanceof Node) || !box.contains(to)) close();
  });

  close();
}

export function bootSearch(): void {
  const boxes = document.querySelectorAll<HTMLElement>('[data-search]');
  if (boxes.length === 0) return;
  boxes.forEach(wire);
}
