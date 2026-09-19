# R2 configuration

For anything too large to serve from the app origin: model weights, video, big
media. Cloudflare R2 has free egress; the app host does not. Delete this folder,
the `r2:*` scripts in package.json and `scripts/r2*` if the site has nothing
large to serve.

`manifest.json` is the authority on the bucket, the public domain and the key
layout: every object the site depends on gets an entry with its `key`, and
`npm run r2:verify` checks each one. `cors.json` is applied by
`npm run r2:setup`, or pasted into the dashboard if the token is bucket-scoped
and cannot change configuration.

RENAME: `bucket` and `domain` in manifest.json, and the origins in cors.json.

Two rules that are easy to break:

- **Never overwrite a key.** Every key carries a version segment
  (`models/v1/…`), objects are uploaded with a one-year immutable
  `Cache-Control`, and anything cached in the browser is keyed by URL. A new
  version is a new path. `r2:sync` refuses to replace a key whose size changed
  unless you pass `--force`.
- **`AllowedOrigins` must list every origin the app is served from.** A missing
  origin fails only in the browser, only cross-origin, and looks exactly like a
  broken download. Vercel preview deployments get a new hostname per push and
  are deliberately not listed; verify on the production domain.

Order of operations:

    cp .env.r2.example .env.r2    # then fill it in
    npm run r2:setup              # checks the credentials, applies CORS if allowed
    # put each file under r2-assets/ at the path it should have in the bucket
    npm run r2:sync -- --dry-run
    npm run r2:sync
    npm run r2:verify             # hits the public domain, no credentials

Then set `SITE.assetOrigin` in src/lib/site.ts and add the origin to the CSP in
all three host configs, in the same change.
