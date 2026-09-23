import type { APIRoute } from 'astro';
import { searchEntries } from '../lib/search';

/**
 * The header search box's index, built once per deploy and served as a file.
 *
 * It is a static asset rather than an endpoint with logic in it: the build
 * writes it, a visitor's request touches a file on a CDN, and there is nothing
 * here a database would do better. That is the architecture rule intact -- see
 * the header of `src/lib/search.ts` for what goes in it and what does not.
 *
 * Not in the sitemap and not linked from any page: it is data for a control,
 * not a page, and `src/lib/search-dom.ts` is the only thing that fetches it.
 * It needs no rule in the three host configs -- it falls under their HTML
 * catch-all, which caches it at the edge for a day and is purged by the deploy
 * that changes it, and that is exactly the shelf life of a file that only
 * changes when the catalogue does.
 *
 * `prerender` is stated rather than left to the default so a later adapter
 * cannot quietly turn a file into a function call per keystroke.
 */
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(JSON.stringify(searchEntries()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
