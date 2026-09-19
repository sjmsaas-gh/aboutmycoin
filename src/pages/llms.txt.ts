import type { APIRoute } from 'astro';
import { summary, LLMS_LOCKED_NOTICE } from '../lib/llms';
import { DISCOVERABLE, NOINDEX_DIRECTIVE } from '../lib/site';

/**
 * While locked down this serves a short notice instead of the summary. A file
 * whose entire purpose is "please read and cite me" must not stay live on an
 * unfinished site, and the X-Robots-Tag is repeated here so it applies even on
 * a host whose header config has not been deployed yet.
 */
export const GET: APIRoute = () =>
  new Response(DISCOVERABLE ? summary() : LLMS_LOCKED_NOTICE, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...(DISCOVERABLE ? {} : { 'X-Robots-Tag': NOINDEX_DIRECTIVE }),
    },
  });
