/**
 * The browser half of the header search: the index's shape, the ranking and
 * the sentences the dropdown can say. `search-dom.ts` imports this and nothing
 * else from the search code.
 *
 * WHY THIS IS ITS OWN MODULE. It was the bottom half of `search.ts`, which
 * also BUILDS the index and so imports the whole catalogue -- coins, melt,
 * questions, cheat sheets -- whose registries validate themselves when they
 * load. Importing the ranking from there bundled all of it into the header
 * script on every page: two megabytes of JavaScript and about ten seconds of
 * main-thread time on a phone, re-running the build's validators in each
 * reader's browser. Nothing in this file may import a registry; the index is
 * fetched as JSON on the first keystroke, which is the whole design.
 * `tests/build-smoke.test.mjs` fails on a client script big enough to be
 * carrying the catalogue again.
 *
 * `search.ts` re-exports everything here, so the tests and the index builder
 * read one ranking rule.
 */

/** Where the built index is served from. Written once, read by the browser. */
export const SEARCH_INDEX_PATH = '/search-index.json';

/**
 * How many suggestions are shown.
 *
 * Eight, because the list drops over the page from a bar 3rem tall and a
 * longer one runs past the fold on a phone. A reader who wanted the ninth
 * result wanted a different query.
 */
export const SEARCH_LIMIT = 8;

/**
 * What a result IS, in one word to the reader's right.
 *
 * The label is not decoration: "Silver quarters" is a metal archive and
 * "1964 Washington quarter" is a coin, and a list mixing the two without
 * saying which is which makes the reader click to find out. The weight breaks
 * ties between entries that match a query equally well -- an archive over a
 * coin, a coin over the melt page of a whole branch -- and it is deliberately
 * small: every bonus below outranks it, so a better match always wins.
 */
export const SEARCH_KINDS = {
  coin: { label: 'Coin', weight: 0.5 },
  series: { label: 'Series', weight: 0.7 },
  group: { label: 'Metal', weight: 0.7 },
  pair: { label: 'Denomination', weight: 0.7 },
  tag: { label: 'Topic', weight: 0.6 },
  question: { label: 'Question', weight: 0.6 },
  topic: { label: 'Questions', weight: 0.55 },
  sheet: { label: 'Cheat sheet', weight: 0.55 },
  melt: { label: 'Melt value', weight: 0.4 },
  page: { label: 'Page', weight: 0.5 },
} as const;

export type SearchKind = keyof typeof SEARCH_KINDS;

/**
 * One entry. The field names are one character because there are eight
 * hundred of them in a file the reader downloads: `t` is the title as it is
 * shown, `p` the path, `k` the kind, `a` words that find it but are not shown.
 *
 * `a` exists for one shape of page and is not a keyword field. The melt pair
 * archives are headed "Silver Quarter Value" -- the word "melt" is nowhere in
 * the heading, so the section a reader reaches it by typing "melt" was the one
 * section the box could not find. It holds what the page IS, never what
 * somebody might type about it: a synonym list here would be the generated
 * catalogue's failure with a dropdown in front of it, and it would be invisible
 * -- a reader never sees why a wrong result came back.
 */
export interface SearchEntry {
  t: string;
  p: string;
  k: SearchKind;
  a?: string;
}

/* ===========================================================================
   Ranking
   ===========================================================================

   A word-prefix match, and nothing cleverer. No stemming, no fuzzy distance,
   no synonym list: every one of those turns a miss into a WRONG answer, and a
   reader who typed "1964 quarter" and was shown a 1965 one has been told
   something false about their coin by a control that looked confident.

   The rule is that every word typed must begin a word in the title. So
   "quart" finds "Washington quarter", "1964 quar" finds the 1964 coins, and
   "64 quarter" finds nothing -- a year is typed in full or not at all, which
   is the right side to fail on when the alternative is matching 1864, 1964
   and 2064 alike.
   =========================================================================== */

/** Lowercase, and everything that is not a letter or a digit becomes a gap. */
export const normalise = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The words of a query, in the order they were typed. */
export const queryWords = (q: string): string[] => normalise(q).split(' ').filter(Boolean);

/**
 * Where a word begins a word in the haystack, or -1.
 *
 * The haystack is already normalised and space-separated, so a word boundary
 * is the start of the string or a space -- there is no case or punctuation
 * left to think about.
 */
const wordStart = (hay: string, word: string): number => {
  if (hay.startsWith(word)) return 0;
  const at = hay.indexOf(' ' + word);
  return at === -1 ? -1 : at + 1;
};

/**
 * What one entry scores against one query, or -1 for no match.
 *
 * Every word has to hit, so the score only ever separates entries that all
 * matched. In order of what it is worth:
 *
 *   the title IS the query          somebody typed the page's name
 *   the query opens the title       "washington quarter" over a 1964 coin
 *   how high the page sits          "melt" is the section, not one archive
 *   the first word opens the title  the reader is typing left to right
 *   the kind                        an archive over one of its coins
 *   how early the words land        a title that leads with the match
 *   how short the title is          the plainer page of two that both match
 *
 * The height term is the one worth explaining. A vague query is answered by a
 * hub and a precise one by a leaf, and the words tell them apart on their own:
 * a reader who types "1889 cc morgan" has named things no hub's title
 * contains, so the hub is already out. It is only ever read where two pages
 * matched the same words, and there the higher one is the way to the other.
 */
export function scoreEntry(entry: SearchEntry, words: string[]): number {
  if (words.length === 0) return -1;
  const hay = normalise(entry.t);
  /* The hidden words are searched and nothing else: every bonus below reads
     the title, so an entry found through `a` can never outrank one whose own
     heading the reader typed. */
  const searched = entry.a ? `${hay} ${normalise(entry.a)}` : hay;
  let positions = 0;
  for (const w of words) {
    const at = wordStart(searched, w);
    if (at === -1) return -1;
    positions += at;
  }

  const query = words.join(' ');
  let score = SEARCH_KINDS[entry.k].weight;
  if (hay === query) score += 5;
  else if (hay.startsWith(query + ' ')) score += 3;
  else if (wordStart(hay, words[0]) === 0) score += 1;

  score += 2 / entry.p.split('/').filter(Boolean).length;

  score -= positions / (100 * words.length);
  score -= hay.length / 1000;
  return score;
}

/**
 * The suggestions for a query, best first.
 *
 * Sorted on the score and then on the title, so two entries that score alike
 * come back in the same order every time: a list that reshuffles between
 * keystrokes moves the row under the reader's finger.
 */
export function search(entries: SearchEntry[], query: string, limit = SEARCH_LIMIT): SearchEntry[] {
  const words = queryWords(query);
  if (words.length === 0) return [];
  return entries
    .map((e) => ({ e, s: scoreEntry(e, words) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s || a.e.t.localeCompare(b.e.t))
    .slice(0, limit)
    .map((x) => x.e);
}

/* ===========================================================================
   The sentences the dropdown can say
   ===========================================================================

   Three of them, written here rather than in the browser module for the
   reason every other string on this site lives outside its template: a
   sentence in a DOM script is a sentence no test reads and no style check
   sees.
   =========================================================================== */

/** Nothing matched. It names the query, because the reader may have mistyped. */
export const noMatchNote = (query: string): string => `Nothing on this site matches “${query.trim()}”.`;

/** The way out of an empty result, and the same words the header's button uses. */
export const BROWSE_NOTE = 'Browse coins by metal and denomination';

/**
 * The index could not be fetched. It says so rather than saying "no results",
 * which would be the site reporting a fact about the reader's coin when what
 * failed was a file download.
 */
export const INDEX_FAILED_NOTE = 'Search is unavailable — the index could not be loaded.';
