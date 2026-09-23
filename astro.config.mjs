// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
/*
 * Serves `api/*` from `src/server/` while `astro dev` is running, and at no
 * other time -- the plugin declares `apply: 'serve'`, so a build never loads
 * it. Without it the contact form's token fetch 404s locally and the page
 * reports that it could not reach the server. See src/dev/api-middleware.mjs.
 */
import { devApiRoutes } from './src/dev/api-middleware.mjs';
/*
 * Imported for its side effect, and imported HERE on purpose.
 *
 * faq-registry.ts throws when two pages claim one FAQ question across the
 * catalogue, the melt section and the common questions. This file is read on
 * every build regardless of which routes are included, so the import belongs
 * here rather than in a module some builds might not reach.
 */
import './src/data/faq-registry.ts';
/*
 * The cheat sheets, for the sitemap filter below: an unwritten sheet is
 * `noindex` on the page, and a noindex URL in the sitemap is a contradiction
 * crawlers report as an error. Built from the registry rather than from a
 * hand-kept pattern so the two cannot drift -- setting `written: true` takes
 * the page out of noindex and into the sitemap in one edit.
 */
import { CHEAT_SHEETS, cheatSheetIndexable, cheatSheetPath } from './src/data/cheat-sheets.ts';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * RENAME: this must match SITE.url in src/lib/site.ts.
 *
 * It is repeated here rather than imported because Astro reads this value
 * before the app graph exists. Keeping the two in step is checked by
 * tests/build-smoke.test.mjs, which fails the build if they diverge.
 */
const SITE_URL = 'https://aboutmycoin.com';

/**
 * Paths of the cheat sheets that are noindex: not written, or written and not
 * yet checked against the sources they name. Same predicate the page's own
 * `noindex` prop uses, so the sitemap and the page cannot disagree.
 */
const UNINDEXED_CHEAT_SHEETS = CHEAT_SHEETS.filter((s) => !cheatSheetIndexable(s)).map(cheatSheetPath);

/**
 * Priority is a hint about relative importance within this site only -- it says
 * nothing to Google about ranking. Set it so the money pages outrank the
 * boilerplate, and keep it coarse on purpose.
 *
 * RENAME: adjust the paths to whatever this site's money pages turn out to be.
 */
function priorityFor(url) {
  const p = url.replace(SITE_URL, '') || '/';
  if (p === '/') return 1.0;
  // The catalogue is the site. A coin page is the page a search lands on, and
  // its archive is how the crawler gets to the next one; both outrank the
  // boilerplate by a wide margin.
  if (/^\/coin-info\/[^/]+\/[^/]+\/[^/]+$/.test(p)) return 0.9;
  if (p === '/coin-info') return 0.9;
  if (p.startsWith('/coin-info/tagged/')) return 0.7;
  if (p.startsWith('/coin-info/')) return 0.8;
  // The melt pages and the common questions are the two supporting clusters:
  // each one targets a phrase of its own, and each one feeds the catalogue
  // rather than competing with it.
  //
  // /melt-value mirrors /coin-info segment for segment, so the tests below
  // mirror the ones above -- one notch lower at every level, because a melt
  // page answers the narrower question and feeds the catalogue entry beside
  // it. Keep the two blocks in step: a level that exists in one tree and not
  // the other is a level somebody forgot to build.
  if (/^\/melt-value\/[^/]+\/[^/]+\/[^/]+$/.test(p)) return 0.8;
  if (p.startsWith('/melt-value/tagged/')) return 0.6;
  if (p.startsWith('/melt-value/')) return 0.7;
  // A topic page sits between the hub and the answers, and is worth less than
  // either: it holds no answer of its own and every question on it is one
  // click away on the hub as well.
  if (/^\/common-questions\/topic\/[^/]+$/.test(p)) return 0.5;
  if (/^\/common-questions\/[^/]+$/.test(p)) return 0.7;
  // The cheat sheets sit beside the common questions: a sheet targets a phrase
  // of its own ("wheat penny key dates") and feeds the catalogue rather than
  // competing with it. A stub is noindex and never reaches this function.
  if (/^\/tools\/cheat-sheets\/[^/]+$/.test(p)) return 0.7;
  // A calculator is a tool with a mechanism on it rather than an answer to a
  // phrase, so it sits with the sheets rather than with the catalogue.
  if (/^\/tools\/coin-calculators\/[^/]+$/.test(p)) return 0.7;
  if (
    p === '/melt-value' ||
    p === '/common-questions' ||
    p === '/tools' ||
    p === '/tools/cheat-sheets' ||
    p === '/tools/coin-calculators'
  ) {
    return 0.6;
  }
  return 0.4;
}

/**
 * Emits `dist/_redirects`, and deliberately emits NO trailing-slash rules.
 *
 * IT USED TO EMIT ONE RULE PER ROUTE -- 22,638 of them, 2.4 MB -- and that file
 * could not work on either host it was written for. Three findings, checked
 * against both vendors' own documentation on 2026-09-23, and each one alone is
 * fatal to the idea:
 *
 *   1. CLOUDFLARE PAGES CAPS `_redirects` AT 2,000 STATIC RULES (2,100 including
 *      dynamic ones). The file was ten times over. Rules past the cap are
 *      dropped, so the behaviour would have been "the first two thousand routes
 *      alphabetically", which is worse than none and invisible from here.
 *
 *   2. NETLIFY NORMALISES THE TRAILING SLASH BEFORE REDIRECT RULES RUN. It
 *      matches `/foo` and `/foo/` to the same rule and serves one form. Every
 *      one of those rules was a no-op there.
 *
 *   3. NEITHER HOST SUPPORTS A SPLAT ANYWHERE BUT THE END OF A PATH, which is
 *      what a one-line version would need. A rule whose pattern is a splat
 *      followed by a slash is not valid syntax on Netlify ("you can only use
 *      asterisks at the end of the path segment"), and Cloudflare allows a
 *      single splat with the same restriction. (That pattern cannot be written
 *      out in this comment either: it closes the comment. The line that tried
 *      held a zero-width space to stop it, which is its own small argument
 *      against the idea.) A
 *      trailing splat cannot express "ends with a slash" -- `/coin-info/*`
 *      matches the slashless form too and would redirect it to itself forever,
 *      which is the loop the old comment here was worried about and solved by
 *      enumerating the routes.
 *
 * So there is no rule to write. What handles this in production:
 *
 *   - VERCEL, the deploy target, does it natively with `"trailingSlash": false`
 *     in vercel.json. That is the real mechanism and it is one line.
 *   - NETLIFY normalises before matching, per (2).
 *   - CLOUDFLARE PAGES enforces its own convention and 308s towards the
 *     trailing-slash form. It cannot be turned off, and a rule fighting it is a
 *     redirect loop rather than a fix. If this site is ever moved there, the
 *     canonical tags and the sitemap have to move with it -- that is a decision
 *     about `trailingSlash` in this file, not a line in `_redirects`.
 *
 * The plugin stays, rather than being deleted with its rules, for two reasons:
 * it is the guard that fails the build if `public/_redirects` ever appears and
 * silently overwrites the generated file, and it is where a real redirect would
 * go if this site ever needed one. It has room for about two thousand.
 */
function trailingSlashRedirects() {
  return {
    name: 'trailing-slash-redirects',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const out = [
          '# GENERATED by astro.config.mjs -- do not edit by hand.',
          '#',
          '# Intentionally empty. Trailing slashes are handled by the host:',
          '# Vercel by "trailingSlash": false in vercel.json, Netlify by',
          '# normalising the path before redirect rules run. See the comment',
          '# over trailingSlashRedirects() in astro.config.mjs for why a rule',
          '# per route, and a single splat rule, are both wrong here.',
          '#',
          '# Cloudflare Pages caps this file at 2,000 static rules. Anything',
          '# added below is subject to that limit and is silently truncated',
          '# past it, so a generated rule set does not belong here.',
          '',
        ].join('\n');

        const target = join(fileURLToPath(dir), '_redirects');
        // public/_redirects would win if it ever existed; fail loudly rather
        // than silently emitting a file that is then overwritten.
        if (existsSync('public/_redirects')) {
          throw new Error(
            'public/_redirects exists and would overwrite the generated one. ' +
              'Delete it, or move its rules into trailingSlashRedirects().',
          );
        }
        writeFileSync(target, out, 'utf8');
        console.log('[trailing-slash] wrote dist/_redirects (no rules; the host handles it)');
      },
    },
  };
}

// Static output only. No SSR, no adapter-specific APIs -- the build must stay
// portable to Cloudflare Pages / Netlify with only a DNS change. See README.
export default defineConfig({
  site: SITE_URL,
  output: 'static',
  // The canonical form of every URL on this site has NO trailing slash. That is
  // enforced in three independent places that must keep agreeing:
  //
  //   - <link rel="canonical"> in Seo.astro strips a trailing slash.
  //   - The sitemap serializer below strips it.
  //   - The host configs 301/308 redirect `/foo/` to `/foo`.
  //
  // This setting is deliberately 'ignore' rather than 'never'. 'never' makes
  // Astro's own dev and preview servers hard-404 on `/foo/`, which does not
  // match production at all: the static build emits `dist/foo/index.html`, so
  // every real host serves `/foo/` as a directory index with a 200. 'never'
  // therefore only ever produces a false 404 during local review, while doing
  // nothing whatsoever to canonicalise the deployed site.
  //
  // Canonicalising is the host's job, and it is configured in vercel.json,
  // netlify.toml and the generated dist/_redirects. Do not put it back to
  // 'never' expecting it to redirect anything -- for a static build it cannot.
  trailingSlash: 'ignore',
  integrations: [
    preact({ compat: false }),
    sitemap({
      // A noindex page in the sitemap is a contradiction crawlers report as an
      // error -- the sitemap asks for indexing, the page refuses it. Astro
      // already excludes 404; naming it here covers a future error page too.
      //
      // RENAME: add any page you mark `noindex` in Seo props to this pattern.
      //
      // A grade page is left out for the same reason from the other side: its
      // canonical points up to its coin (see the grade route), and a sitemap
      // listing a URL whose page names a different canonical is two signals
      // that disagree. The coin's ladder table is how a crawler reaches the
      // rungs. `/coin-info/<group>/<type>/<coin>/<grade>` is the only
      // five-segment path under /coin-info.
      filter: (page) =>
        !/\/(404|500|checkout-complete)\/?$/.test(page) &&
        !/\/coin-info\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/?$/.test(page) &&
        !UNINDEXED_CHEAT_SHEETS.some((p) => page.replace(/\/$/, '').endsWith(p)),
      // No `lastmod`, anywhere. What this site states about a coin -- its
      // weight, its metal, which dates are scarce -- was settled long before
      // the page was written, so there is no honest date to give, and the
      // alternative is the build date, which tells Google every page changed
      // on every deploy. A crawler that has been told that once discounts the
      // signal for good. The spot price is the one figure with a shelf life
      // and it carries its own date on the page that prints it.
      serialize: (item) => {
        const url =
          item.url.endsWith('/') && item.url !== `${SITE_URL}/`
            ? item.url.slice(0, -1)
            : item.url;
        return {
          ...item,
          url,
          priority: priorityFor(url),
        };
      },
    }),
    trailingSlashRedirects(),
  ],
  vite: {
    plugins: [tailwindcss(), devApiRoutes()],
  },
  build: {
    inlineStylesheets: 'auto',
    // Content-hashed filenames are what make the immutable, one-year
    // Cache-Control on /_astro/* safe. Astro does this by default; it is
    // spelled out so nobody "tidies" it away and quietly breaks the caching.
    assets: '_astro',
  },
});
