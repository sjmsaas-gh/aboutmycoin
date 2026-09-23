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

import type { SearchEntry, SearchKind } from './search-rank';

/*
 * The browser half lives in `search-rank.ts`, which imports no registry --
 * see its header for what happened when it lived here. Re-exported so the
 * tests and the index builder read the one ranking rule.
 */
export * from './search-rank';

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
