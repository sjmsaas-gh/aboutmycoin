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
import { CHEAT_SHEETS, cheatSheetPath } from './src/data/cheat-sheets.ts';
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

/** Paths of the cheat sheets that are still stubs, and therefore noindex. */
const UNWRITTEN_CHEAT_SHEETS = CHEAT_SHEETS.filter((s) => !s.written).map(cheatSheetPath);

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
  if (/^\/coin-value\/[^/]+\/[^/]+\/[^/]+$/.test(p)) return 0.9;
  if (p === '/coin-value') return 0.9;
  if (p.startsWith('/coin-value/tagged/')) return 0.7;
  if (p.startsWith('/coin-value/')) return 0.8;
  // The melt pages and the common questions are the two supporting clusters:
  // each one targets a phrase of its own, and each one feeds the catalogue
  // rather than competing with it.
  //
  // /melt-value mirrors /coin-value segment for segment, so the tests below
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
  if (/^\/cheat-sheets\/[^/]+$/.test(p)) return 0.7;
  if (p === '/melt-value' || p === '/common-questions' || p === '/cheat-sheets') return 0.6;
  return 0.4;
}

/**
 * Emits `dist/_redirects` so `/foo/` 301s to `/foo` on Cloudflare Pages and
 * Netlify. Vercel ignores this file and uses `"trailingSlash": false` in
 * vercel.json, which does the same thing.
 *
 * Note what this is NOT fixing: `/foo/` does not 404 in production. The static
 * build emits `dist/foo/index.html`, so every host already serves the trailing
 * slash form with a 200. The problem is that it serves it as a *second URL for
 * the same page*, which is a duplicate-content split. These rules collapse it.
 *
 * Every route is written out explicitly rather than using a `/*​/` splat or a
 * `/:seg/` placeholder. Both of those are shorter, and both raise the question
 * of whether they also match `/` -- which would redirect the home page to
 * itself forever. An explicit list generated from the real routes cannot
 * contain the root, so the question cannot arise.
 */
function trailingSlashRedirects() {
  return {
    name: 'trailing-slash-redirects',
    hooks: {
      'astro:build:done': ({ pages, dir }) => {
        const lines = pages
          .map((p) => '/' + p.pathname.replace(/\/+$/, ''))
          // The root has no trailing-slash variant to collapse, and 404 is
          // never requested by URL.
          .filter((p) => p !== '/' && p !== '/404')
          .sort()
          .map((p) => `${p}/  ${p}  301`);

        const out = [
          '# GENERATED by astro.config.mjs -- do not edit by hand.',
          '# Collapses the trailing-slash form of every route onto the canonical,',
          '# slashless one. Read by Cloudflare Pages and Netlify; Vercel uses the',
          '# "trailingSlash": false setting in vercel.json instead.',
          '',
          ...lines,
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
        console.log(`[trailing-slash] wrote ${lines.length} redirects to dist/_redirects`);
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
      filter: (page) =>
        !/\/(404|500|checkout-complete)\/?$/.test(page) &&
        !UNWRITTEN_CHEAT_SHEETS.some((p) => page.replace(/\/$/, '').endsWith(p)),
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
