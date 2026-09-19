import type { APIRoute } from 'astro';
import { full, LLMS_LOCKED_NOTICE } from '../lib/llms';
import { DISCOVERABLE, NOINDEX_DIRECTIVE } from '../lib/site';

/** See llms.txt.ts -- same lockdown behaviour. */
export const GET: APIRoute = () =>
  new Response(DISCOVERABLE ? full() : LLMS_LOCKED_NOTICE, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...(DISCOVERABLE ? {} : { 'X-Robots-Tag': NOINDEX_DIRECTIVE }),
    },
  });
