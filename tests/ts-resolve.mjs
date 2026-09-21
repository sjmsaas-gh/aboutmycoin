/**
 * Lets the test runner import `./x.js` when the file on disk is `./x.ts`.
 *
 * Why this exists: the source has to say `.js` and only `.js`.
 *
 *   - Vercel typechecks `api/*.ts` with `moduleResolution: node16`, which
 *     rejects extensionless relative imports (TS2835).
 *   - Vercel's Edge bundler cannot resolve a literal `.ts` specifier at all --
 *     it reports "referencing unsupported modules".
 *   - Node's `--experimental-strip-types` does no resolution rewriting, so it
 *     needs the real filename and fails on `.js`.
 *
 * `.js`-meaning-`.ts` is the standard TypeScript ESM convention, so the source
 * follows it and this hook teaches Node the same mapping. Tests, and the
 * scripts in `scripts/` that import a module in `src/lib/` -- nothing that
 * ships is resolved through it.
 *
 * The second rule covers `src/lib/`, which imports *extensionlessly*. The two
 * halves of the source legitimately differ: `src/server/` and `api/` are
 * typechecked by Vercel under `moduleResolution: node16`, which rejects an
 * extensionless relative import outright, while `src/lib/` is only ever
 * resolved by Vite, which prefers extensionless. Rewriting one convention into
 * the other to satisfy the test runner would be the test tail wagging the build
 * dog, so the hook understands both. It is also what lets build-smoke import
 * `src/lib/pricing.ts` and `scripts/fetch-spot.mjs` import `src/lib/spot.ts`.
 */
import { register } from 'node:module';

register(
  `data:text/javascript,
   export async function resolve(specifier, context, nextResolve) {
     if (/^[.][.]?\\//.test(specifier) && specifier.endsWith('.js')) {
       try {
         return await nextResolve(specifier.slice(0, -3) + '.ts', context);
       } catch {}
     }
     if (/^[.][.]?\\//.test(specifier) && !/[.](?:js|ts|mjs|json)$/.test(specifier)) {
       try {
         return await nextResolve(specifier + '.ts', context);
       } catch {}
     }
     return nextResolve(specifier, context);
   }`,
  import.meta.url,
);
