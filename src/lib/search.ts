/**
 * The header search: what it can find, and how a query is ranked.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS AT ALL
 * ---------------------------------------------------------------------------
 *
 * The hero's finder is two selects (`CoinFinder.astro`) and it cannot
 * dead-end: every option is a page. That is the right control for somebody who
 * has just arrived and does not know the vocabulary. It is the wrong control
 * for somebody who already holds the answer -- a reader who knows they have a
 * 1964 quarter, or who wants the wheat penny cheat sheet, types the words and
 * expects the page. Three clicks through metal and denomination to reach a
 * page they could name is the tax this box removes.
 *
 * It searches the whole site rather than the catalogue: a question, a cheat
 * sheet and a calculator are all answers somebody types a phrase for, and a
 * search box that finds only coins is a search box a reader stops trusting the
 * first time it says nothing about "spot price".
 *
 * ---------------------------------------------------------------------------
 * WHAT IS IN THE INDEX, AND WHAT IS NOT
 * ---------------------------------------------------------------------------
 *
 * Every page a person would name, once:
 *
 *   - every coin, under the name it is listed by
 *   - every populated archive: the metals, the (metal, denomination) pairs,
 *     the series and the other tags
 *   - the melt ARCHIVES, because "silver quarters melt value" is a phrase
 *   - every common question and topic, every cheat sheet, the calculators
 *
 * Two deliberate absences, both of them the site's own rules applied here.
 *
 * The per-coin melt pages are out. A coin is one subject with two pages, the
 * coin page carries the melt figure and links to its twin, and putting both in
 * the suggestions would answer one query with the same coin twice -- which is
 * the "two pages competing for one search" rule wearing a dropdown. The melt
 * archives stay because they answer a question no catalogue page does.
 *
 * The grade pages are out, and there are thousands of them. Nobody types
 * "1964 quarter MS63" into a site search before they have found the coin, the
 * coin page lists its own ladder, and an index that carried them would be six
 * times the size to serve a query that starts on the page it would return.
 *
 * ---------------------------------------------------------------------------
 * HOW IT IS SERVED
 * ---------------------------------------------------------------------------
 *
 * `/search-index.json` is a static file built from the registries below, and
 * `search-dom.ts` fetches it on the reader's first keystroke -- never on load,
 * because most visits never touch the box. Nothing is fetched at build time
 * and no page imports the index, so the cost to a reader who does not search
 * is the markup of one input.
 *
 * It needs no host-config change: the file is same-origin, so `connect-src
 * 'self'` already allows it, and it falls under the HTML catch-all rule in all
 * three configs -- cached for a day at the edge and purged by the deploy that
 * changes it, which is exactly right for a file that only changes when the
 * catalogue does.
 */
import {
  COINS,
  coinPath,
  groupPath,
  populatedGroups,
  populatedPairs,
  populatedTags,
  tagPath,
  typePath,
  COIN_INFO_ROOT,
} from '../data/coins';
import { HUB_H1, groupH1, pairH1, tagH1, TAGGED_H1 } from './catalog-copy';
import {
  MELT_HUB_H1,
  MELT_ROOT,
  MELT_TAGGED_H1,
  MELT_TAGGED_ROOT,
  meltGroupH1,
  meltGroupPath,
  meltGroups,
  meltPairH1,
  meltPairs,
  meltTagH1,
  meltTagPath,
  meltTags,
  meltTypePath,
} from './melt';
import {
  QUESTIONS,
  QUESTIONS_ROOT,
  QUESTION_CATEGORIES,
  categoryPath,
  questionPath,
} from '../data/questions';
import { CHEAT_SHEETS, CHEAT_SHEETS_ROOT, cheatSheetH1, cheatSheetPath } from '../data/cheat-sheets';
import { TOOLS_H1, TOOLS_ROOT } from './tools';

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

/**
 * The pages somebody typed rather than generated, which is why they are a
 * list here rather than a registry read.
 *
 * The two calculators are named because their pages are hand-written too --
 * `src/pages/tools/coin-calculators/` holds one file each. A path typed in
 * this file is a path that can go stale, so `tests/search-dom.test.mjs`
 * checks every entry in the built index against the pages the build produced.
 */
const WRITTEN_PAGES: { t: string; p: string }[] = [
  { t: TOOLS_H1, p: TOOLS_ROOT },
  { t: 'Coin Calculators', p: `${TOOLS_ROOT}/coin-calculators` },
  { t: 'Silver melt price calculator', p: `${TOOLS_ROOT}/coin-calculators/silver-melt-price` },
  { t: 'Gold melt price calculator', p: `${TOOLS_ROOT}/coin-calculators/gold-melt-price` },
  { t: 'Coin cheat sheets', p: CHEAT_SHEETS_ROOT },
  { t: 'Contact', p: '/contact' },
];

/**
 * The whole index, in the order it is built rather than in any ranked order:
 * ranking is a function of the query and happens in the browser.
 *
 * Every path here comes from the same helper the route uses, and every
 * listing is filtered to the populated one, so an entry cannot point at an
 * archive the build never produced.
 */
export function searchEntries(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const add = (k: SearchKind, t: string, p: string, a?: string) =>
    entries.push(a ? { t, p, k, a } : { t, p, k });

  add('page', HUB_H1, COIN_INFO_ROOT);
  add('page', TAGGED_H1, `${COIN_INFO_ROOT}/tagged`);
  for (const g of populatedGroups()) add('group', groupH1(g), groupPath(g.slug));
  for (const { group, type } of populatedPairs()) {
    add('pair', pairH1(group, type), typePath(group.slug, type.slug));
  }
  for (const t of populatedTags()) {
    add(t.kind === 'series' ? 'series' : 'tag', tagH1(t), tagPath(t.slug));
  }
  for (const c of COINS) add('coin', c.shortName ?? c.name, coinPath(c));

  const MELT = 'melt value';
  add('melt', MELT_HUB_H1, MELT_ROOT, MELT);
  add('melt', MELT_TAGGED_H1, MELT_TAGGED_ROOT, MELT);
  for (const g of meltGroups()) add('melt', meltGroupH1(g), meltGroupPath(g.slug), MELT);
  for (const { group, type } of meltPairs()) {
    add('melt', meltPairH1(group, type), meltTypePath(group.slug, type.slug), MELT);
  }
  for (const t of meltTags()) add('melt', meltTagH1(t), meltTagPath(t.slug), MELT);

  add('page', 'Common Questions About Coins', QUESTIONS_ROOT);
  for (const c of QUESTION_CATEGORIES) add('topic', c.h1, categoryPath(c));
  for (const q of QUESTIONS) add('question', q.question, questionPath(q));

  /* The written ones, which is exactly what /tools/cheat-sheets lists. A sheet
     that is written and not yet checked is noindex and out of the sitemap and
     is still linked from its hub, so the box may offer it; an UNWRITTEN sheet
     has nothing on it and is linked from nowhere, and a suggestion is
     somewhere. */
  for (const s of CHEAT_SHEETS.filter((s) => s.written)) {
    add('sheet', cheatSheetH1(s), cheatSheetPath(s));
  }

  for (const p of WRITTEN_PAGES) add('page', p.t, p.p);

  return entries;
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
