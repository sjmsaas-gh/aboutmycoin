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
  description:
    'AboutMyCoin is a reference database for US and world coins, with value calculators that turn a coin\'s date, mint mark and condition into a realistic price range. It is for collectors and for anyone who has just found a coin and wants to know what it is and what it is worth. Every valuation shows the grade and the market data it was based on, rather than a single number with no working.',
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
  ga4: '',
  /**
   * Webfonts to preload, as paths under /fonts.
   *
   * Empty by default, because the starter ships no font files and a preload for
   * a missing file is a 404 on every page of the site. Add entries here only
   * once `npm run fonts` has produced them -- see assets/fonts-src/README.md.
   */
  preloadFonts: [] as string[],
  /**
   * Theme colours for the browser chrome, light and dark.
   *
   * Plain hex rather than a CSS variable: `<meta name="theme-color">` is read
   * before any stylesheet, so a var() here resolves to nothing. Keep these in
   * step with --bg in src/styles/global.css by hand.
   */
  themeColor: { light: '#fbfbfa', dark: '#111110' },
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
export const DISCOVERABLE = false;

/**
 * The value for `<meta name="robots">` and `X-Robots-Tag` while locked down.
 * `noarchive` and `nosnippet` are belt-and-braces for engines that have
 * already cached something.
 */
export const NOINDEX_DIRECTIVE =
  'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate';

/* ===========================================================================
   HOLDING PAGE  --  REMOVE WHEN THE SITE IS FINISHED
   ===========================================================================

   While HOME_PLACEHOLDER is true, `/` serves an empty white document: no
   header, no footer, no copy, no stylesheet, no analytics. The rest of the
   site is built and deployed exactly as before, so every page can still be
   reviewed by typing its URL -- this flag hides the front door, it is not a
   second lockdown. DISCOVERABLE is what keeps the site out of search, and the
   two are independent on purpose: the domain can go live behind a blank page
   for weeks before there is anything worth indexing.

   The document is not literally empty. It carries a title, a description, a
   canonical and one JSON-LD block, because tests/build-smoke.test.mjs requires
   all four on every page and the exemption would outlive the placeholder. A
   visitor sees a white page; a crawler that ignores the noindex header sees a
   site that says it is not published yet, which is true.

   It is OFF in `astro dev` and ON in every build, rather than a hand-flipped
   constant, because the two audiences want opposite things at the same time:
   the home page has to be worked on daily while the public must not see it.
   A constant would have to be flipped back before each deploy, and the day
   somebody forgets is the day the unfinished site is the front page.

   So: `npm run dev` shows the real home page. `npm run build`, `npm run
   preview` and every deploy show the holding page. To see the holding page in
   dev, or the real page in a build, replace the expression below with a
   literal -- and put it back.

   TO GO LIVE:
     - Replace the expression below with `false`. That is the whole reversal:
       the real home page is still in src/pages/index.astro, untouched.
     - Rebuild and check `dist/index.html` is the real page again.
   =========================================================================== */
export const HOME_PLACEHOLDER = !import.meta.env?.DEV;

/**
 * Title and description for the holding page.
 *
 * Deliberately says nothing about what is being built. A description is
 * required on every page, so this is the shortest true sentence that fills it
 * -- not a teaser, and not a feature list for a product that does not exist
 * yet.
 */
export const PLACEHOLDER_COPY = {
  title: SITE.name,
  description: `${SITE.domain} is not published yet.`,
} as const;
