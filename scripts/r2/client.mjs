/**
 * The four R2 operations this project needs, over the S3-compatible API.
 *
 * No wrangler, no AWS SDK, no ambient credential discovery -- see env.mjs.
 */
import { sign, canonicalUri } from './sigv4.mjs';

/** Turn an S3 XML error body into something readable. */
function describeError(status, body) {
  const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1];
  const msg = body.match(/<Message>([^<]+)<\/Message>/)?.[1];
  if (code) return `${status} ${code}: ${msg ?? ''}`.trim();
  return `${status} ${body.slice(0, 300)}`;
}

async function request(cfg, { method, key = '', query, headers, body }) {
  const host = cfg.endpoint;
  const path = `/${cfg.bucket}${key ? '/' + key.replace(/^\/+/, '') : ''}`;

  const signed = sign({
    method,
    host,
    path,
    query,
    headers,
    body: body ?? '',
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
  });

  const qs = query
    ? '?' +
      Object.keys(query)
        .sort()
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
        .join('&')
    : '';

  let res;
  try {
    res = await fetch(`https://${host}${canonicalUri(path)}${qs}`, {
      method,
      headers: signed,
      body: body && body.length ? body : undefined,
    });
  } catch (cause) {
    // undici surfaces DNS/TLS problems as a bare "fetch failed". Name the host,
    // because the usual cause is a wrong account id in the endpoint.
    const err = new Error(
      `Could not reach https://${host} — ${cause?.cause?.code ?? cause.message}. ` +
        `Check R2_ACCOUNT_ID in .env.r2 (it forms the endpoint hostname).`,
    );
    err.network = true;
    throw err;
  }

  const text = res.headers.get('content-type')?.includes('xml') || !res.ok
    ? await res.text()
    : '';

  if (!res.ok) throw new Error(describeError(res.status, text));
  return { status: res.status, text, headers: res.headers };
}

/** Upload one object. */
export function putObject(cfg, key, body, { contentType, cacheControl }) {
  return request(cfg, {
    method: 'PUT',
    key,
    body,
    headers: {
      'content-type': contentType,
      'content-length': String(body.length),
      ...(cacheControl ? { 'cache-control': cacheControl } : {}),
    },
  });
}

/** Returns metadata, or null if the object is absent. */
export async function headObject(cfg, key) {
  try {
    const r = await request(cfg, { method: 'HEAD', key });
    return {
      size: Number(r.headers.get('content-length') ?? 0),
      etag: r.headers.get('etag')?.replace(/"/g, '') ?? '',
      contentType: r.headers.get('content-type') ?? '',
      cacheControl: r.headers.get('cache-control') ?? '',
    };
  } catch (e) {
    if (/^404/.test(e.message)) return null;
    throw e;
  }
}

/** List every key in the bucket (paginated). */
export async function listObjects(cfg, prefix = '') {
  const out = [];
  let token;
  do {
    const query = { 'list-type': '2', ...(prefix ? { prefix } : {}) };
    if (token) query['continuation-token'] = token;
    const { text } = await request(cfg, { method: 'GET', query });
    for (const m of text.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      out.push({
        key: m[1].match(/<Key>([^<]+)<\/Key>/)?.[1] ?? '',
        size: Number(m[1].match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0),
      });
    }
    token = text.match(/<NextContinuationToken>([^<]+)</)?.[1];
  } while (token);
  return out;
}

/** Apply the bucket CORS policy. R2 supports PutBucketCors over the S3 API. */
export function putBucketCors(cfg, rules) {
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<CORSConfiguration>` +
    rules
      .map(
        (r) =>
          `<CORSRule>` +
          (r.AllowedOrigins ?? []).map((o) => `<AllowedOrigin>${o}</AllowedOrigin>`).join('') +
          (r.AllowedMethods ?? []).map((m) => `<AllowedMethod>${m}</AllowedMethod>`).join('') +
          (r.AllowedHeaders ?? []).map((h) => `<AllowedHeader>${h}</AllowedHeader>`).join('') +
          (r.ExposeHeaders ?? []).map((h) => `<ExposeHeader>${h}</ExposeHeader>`).join('') +
          (r.MaxAgeSeconds != null ? `<MaxAgeSeconds>${r.MaxAgeSeconds}</MaxAgeSeconds>` : '') +
          `</CORSRule>`,
      )
      .join('') +
    `</CORSConfiguration>`;

  return request(cfg, {
    method: 'PUT',
    query: { cors: '' },
    headers: { 'content-type': 'application/xml' },
    body: Buffer.from(xml, 'utf8'),
  });
}

export function getBucketCors(cfg) {
  return request(cfg, { method: 'GET', query: { cors: '' } }).then((r) => r.text);
}
