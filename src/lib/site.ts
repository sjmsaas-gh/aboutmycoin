/**
 * The single source of truth for everything that identifies this site.
 *
 * RENAME: this is the first file you edit on a new site, and it should be the
 * ONLY place any of these strings appear. If you find yourself typing the site
 * name into a page, stop and import it from here instead -- that discipline is
 * what makes the next rename a five-minute job rather than a grep hunt.
 */
export const SITE = {
  /** Display name. Appears in titles, schema, the header and the footer. */
  name: 'AboutMyCoin',
  /**
   * Bare domain, no scheme and no `www`.
   *
   * This must equal the name of the directory this project lives in --
   * `/var/www/more_html/sjmsaas/<domain>/`. A mismatch between the two is the
   * greppable sign that a rename was left half-done.
   */
  domain: 'aboutmycoin.com',
  /** Canonical origin. Must match SITE_URL in astro.config.mjs; there is a test. */
  url: 'https://aboutmycoin.com',
  /**
   * One line, no trailing full stop. Used as a sentence fragment in llms.txt
   * and as the strap under the logo, so it has to read correctly mid-sentence.
   */
  tagline: 'a coin database with value calculators and identification tools',
  /**
   * The meta description default and the Organization/WebSite schema
   * description. Two or three sentences, BLUF: what it is, who it is for, and
   * the one thing that makes it different. No marketing throat-clearing.
   */
  /*
   * REWRITTEN FOR THE INFORMATION-FIRST PIVOT of 2026-09-22, and the reason is
   * that this string is not copy on a page -- it is the Organization and
   * WebSite `description` in the JSON-LD of all 21,586 real pages, and the
   * opening of llms.txt.
   *
   * It used to promise "value calculators that turn a coin's date, mint mark
   * and condition into a realistic price range". The site stopped doing that
   * on the day of the pivot: most grade pages state no range at all, by
   * design, and the ones that do state a researched figure with its sources
   * rather than a computed estimate. A machine-readable claim on every page of
   * the site that the visible pages refuse to honour is the mismatch the
   * header of schema.ts exists to warn about, at the widest scope it could
   * possibly have.
   *
   * "Starting with United States issues" rather than "US coins" or "US and
   * world coins": the first is true today and stays true on the day another
   * country lands, and the second was never true. A scope sentence that has to
   * be rewritten to stay honest is one that will not be.
   */
  description:
    'AboutMyCoin is a coin reference database, starting with United States issues: what each coin is, when and where it was struck, how many there are, and what it is made of, with a melt value worked from a stated and dated spot price. It is for collectors and for anyone who has just found a coin and wants to know what it is and what it is worth. Where there is researched market data for a grade, the page states it and names its sources; where there is none, it says so rather than printing a guess.',
  locale: 'en_US',
  /**
   * Twitter/X handle including the @, or an empty string.
   *
   * Empty is fine and is the honest default: `twitter:site` pointing at a
   * handle that does not exist is worse than omitting the tag.
   */
  twitter: '',
  /*
   * There is deliberately no `email` here.
   *
   * An address in this object ends up in Organization JSON-LD on every page and
   * in llms.txt, which is several harvestable copies of a real inbox. Contact
   * goes through /contact, where the address lives in the environment and never
   * reaches the browser at all. Putting a constant back here is how that
   * quietly gets undone.
   */
  /**
   * Origin for anything large: model weights, video, big media. Never the app
   * origin -- see the "Nothing large is served from the host" rule in README.
   *
   * Empty means "everything is served from this origin", which is correct for a
   * site with no large assets. Base.astro only emits a preconnect when it is
   * set. The moment you set it, add it to the CSP in all three host configs, or
   * it is blocked by CSP in production only.
   *
   * Only to the directives it serves: `connect-src` for anything fetched,
   * `img-src` for images, `script-src` if a script or module loads from it (an
   * ONNX Runtime .mjs loader does), `font-src` only if fonts do. An origin in a
   * directive it never uses is noise in a policy that has to be read to be
   * trusted. Upload tooling for R2 is in r2/README.md.
   */
  assetOrigin: '',
  /** GA4 measurement ID. Empty string disables analytics entirely. */
  ga4: 'G-EQ9TML37XH',
  /**
   * Webfonts to preload, as paths under /fonts.
   *
   * Empty by default, because the starter ships no font files and a preload for
   * a missing file is a 404 on every page of the site. Add entries here only
   * once `npm run fonts` has produced them -- see assets/fonts-src/README.md.
   */
  preloadFonts: ['/fonts/body-subset.woff2', '/fonts/display-subset.woff2'] as string[],
  /**
   * Theme colours for the browser chrome, light and dark.
   *
   * Plain hex rather than a CSS variable: `<meta name="theme-color">` is read
   * before any stylesheet, so a var() here resolves to nothing. Keep these in
   * step with --bg in src/styles/global.css by hand.
   */
  themeColor: { light: '#ffffff', dark: '#101009' },
} as const;

/* ===========================================================================
   PRE-LAUNCH LOCKDOWN  --  REMOVE WHEN THE SITE IS FINISHED
   ===========================================================================

   While DISCOVERABLE is false the whole site is hidden from search engines,
   answer engines and AI training crawlers. Four independent mechanisms are
   used, because any one of them alone leaks:

     1. `<meta name="robots">` on every HTML page (Seo.astro). Stops indexing
        of pages a crawler reaches by following a link from elsewhere.
     2. robots.txt Disallow for `*` and for every named AI agent
        (pages/robots.txt.ts). Stops the crawl in the first place.
     3. An `X-Robots-Tag` response header on every response, set in
        public/_headers, netlify.toml and vercel.json. This is the one that
        matters most: robots.txt only asks, and a `<meta>` tag cannot appear
        in /llms.txt, /sitemap-0.xml or an OG image. The header covers them.
     4. /llms.txt and /llms-full.txt serve a "not published yet" notice
        instead of the site summary.

   Mechanism 2 alone is actively harmful without 1 and 3: a Disallow stops the
   crawl but NOT the indexing of a URL discovered via an inbound link, which is
   how "no information is available for this page" results happen.

   TO GO LIVE:
     - Set DISCOVERABLE to true here.
     - Delete the X-Robots-Tag line from public/_headers, netlify.toml and
       vercel.json.
     - Rebuild and run `npm run test:build`. Its lockdown check is
       all-or-nothing, so it fails if you did one and not the other.
     - `grep -rl noindex dist` should then list only dist/404.html and
       dist/checkout-complete/index.html, which are noindex on purpose.
   =========================================================================== */
export const DISCOVERABLE = true;

/**
 * The value for `<meta name="robots">` and `X-Robots-Tag` while locked down.
 * `noarchive` and `nosnippet` are belt-and-braces for engines that have
 * already cached something.
 */
export const NOINDEX_DIRECTIVE =
  'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate';

/**
 * The real home page's title and description.
 *
 * Here rather than inline in `src/pages/index.astro` so that the limits are
 * measured against the constant by `tests/build-smoke.test.mjs` as well as
 * against the built page. They are the copy for the most important page on
 * the site, and the pair they replaced shows what goes unmeasured otherwise:
 * `SITE.name + SITE.tagline` is 77 characters against a ceiling of 65, and
 * `SITE.description` is 388 against 165.
 *
 * `SITE.description` is not shortened to fix that. It is the Organization and
 * WebSite description and the opening of llms.txt, none of which has a
 * ceiling and all of which want the full three sentences. This is the same
 * site said in what a result list has room for, which is a different job.
 *
 * The title leads with the query rather than the brand because `Seo.astro`
 * appends the brand anyway, and "what is my coin worth" is what the H1 asks.
 */
export const HOME_COPY = {
  title: 'What Is My Coin Worth? Coin Values and Melt Prices',
  description:
    'What your coin is, and what the metal in it is worth: the date, the mint, the mintage, and a melt value worked from a stated and dated silver or gold price.',
} as const;
