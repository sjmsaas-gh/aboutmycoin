import type { APIRoute } from 'astro';
import { SITE, DISCOVERABLE } from '../lib/site';

/**
 * Two robots.txt files in one, switched by DISCOVERABLE in lib/site.ts.
 *
 * ---------------------------------------------------------------------------
 * WHEN DISCOVERABLE IS TRUE (the intended end state)
 * ---------------------------------------------------------------------------
 * Everything is allowed, including AI training crawlers. That is a deliberate
 * decision, not an oversight -- see the note below before tightening it.
 *
 * Two distinct kinds of bot matter here, and they are often confused:
 *
 *   Retrieval bots (OAI-SearchBot, Claude-SearchBot, PerplexityBot, ...) fetch
 *   a page at query time to answer a question, and cite it with a link. These
 *   send traffic directly.
 *
 *   Training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended, ...) collect
 *   text that shapes what a model knows. These send no traffic today, but they
 *   are how an assistant recommends a tool *unprompted*, without browsing.
 *
 * Publishers who block training are protecting content that IS the product.
 * On a site like this the content is not the product -- the writing exists to
 * send people to the tool, and the acquisition plan is being the answer when
 * somebody asks the question this site is about. Being in the training data is
 * upside with no corresponding loss.
 *
 * RENAME: if a future site in this family sells the writing itself, this
 * reasoning inverts and the training crawlers should be disallowed by name
 * while the retrieval bots stay allowed. Decide it deliberately; do not inherit
 * this default without reading the paragraph above.
 *
 * ---------------------------------------------------------------------------
 * WHEN DISCOVERABLE IS FALSE (today -- pre-launch)
 * ---------------------------------------------------------------------------
 * Every agent is disallowed, and the Sitemap line is omitted so the sitemap is
 * not advertised as a crawl seed. The named agents are repeated with explicit
 * Disallow rules rather than left to the `*` group: several crawlers only honour
 * the most specific matching group, and a few historically ignored `*` outright.
 *
 * robots.txt is a request, not a control. The real enforcement is the
 * X-Robots-Tag response header in the host configs, plus the meta tag from
 * Seo.astro. Do not treat this file as the lockdown on its own.
 */
const AI_AGENTS = [
  // Answer engines and retrieval-time fetchers. These cite and link.
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'DuckAssistBot',
  'Bingbot',
  'Applebot',
  'YouBot',

  // Training crawlers. Allowed on purpose once DISCOVERABLE flips -- see above.
  'GPTBot',
  'ClaudeBot',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'meta-externalagent',
  'Meta-ExternalFetcher',
  'Amazonbot',
  'Bytespider',
  'cohere-ai',
  'Diffbot',
];

/** Crawlers that only matter while locked down: the mainstream search engines. */
const SEARCH_AGENTS = ['Googlebot', 'Googlebot-Image', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'YandexBot'];

function lockedDown(): string {
  const agents = [...new Set([...SEARCH_AGENTS, ...AI_AGENTS])];
  return [
    '# https://www.robotstxt.org/robotstxt.html',
    '#',
    '# PRE-LAUNCH LOCKDOWN. This site is unfinished and is not published yet.',
    '# Please do not crawl, index, cache or train on it. It will open up on',
    '# launch -- set DISCOVERABLE = true in src/lib/site.ts.',
    '#',
    '# Enforced for real by the X-Robots-Tag response header, not by this file.',
    '',
    'User-agent: *',
    'Disallow: /',
    '',
    ...agents.flatMap((ua) => [`User-agent: ${ua}`, 'Disallow: /', '']),
    '# No Sitemap line on purpose while locked down.',
    '',
  ].join('\n');
}

/**
 * /api/ is disallowed in every group, not only `*`: a crawler that finds its
 * own named group ignores the `*` one entirely. There is nothing to index
 * there, and a bot fetching GET /api/contact would mint a form token per hit.
 *
 * /api/spot is the one exception, and it is `Allow`ed above the `Disallow` so
 * the longest match wins. It is not there to be indexed -- it is there because
 * a rendering crawler has to be able to FETCH it.
 *
 * Every melt figure on this site is rendered twice: the build bakes in the
 * reading it had, and `src/lib/spot-dom.ts` replaces it in the browser with
 * whatever /api/spot returns. Googlebot renders JavaScript, so it sees the
 * second one -- but only if it is allowed to make that request. Blocked, its
 * renderer gets nothing, and what lands in the index is the baked-in figure,
 * as old as the last deploy. Allowing it is the difference between a crawler
 * indexing today's price and one indexing whenever the site was last built.
 *
 * It is safe to allow in a way the other endpoints are not. It is GET-only,
 * cached for an hour at the edge, and its one side effect -- refreshing the
 * price -- is behind a clock and a monthly budget that no amount of crawler
 * traffic can push past roughly one feed call a day.
 */
function open(): string {
  return [
    '# https://www.robotstxt.org/robotstxt.html',
    '',
    'User-agent: *',
    'Allow: /',
    'Allow: /api/spot',
    'Disallow: /api/',
    '',
    '# AI assistants and answer engines are welcome to read and cite this site.',
    ...AI_AGENTS.flatMap((ua) => [
      `User-agent: ${ua}`,
      'Allow: /',
      'Allow: /api/spot',
      'Disallow: /api/',
      '',
    ]),
    `Sitemap: ${SITE.url}/sitemap-index.xml`,
    '',
    '# Plain-text summaries for language models:',
    `# ${SITE.url}/llms.txt`,
    `# ${SITE.url}/llms-full.txt`,
    '',
  ].join('\n');
}

export const GET: APIRoute = () => {
  return new Response(DISCOVERABLE ? open() : lockedDown(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
