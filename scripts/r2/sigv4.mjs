/**
 * Minimal AWS Signature V4 for R2's S3-compatible API.
 *
 * Hand-rolled rather than pulling in @aws-sdk (which is tens of megabytes) --
 * we need exactly four operations and no credential-provider chain. That last
 * point matters here: the AWS SDK and wrangler both auto-discover credentials
 * from the environment and shared config files, which is precisely what we are
 * trying to avoid. This signs with the key it is handed and nothing else.
 */
import { createHash, createHmac } from 'node:crypto';

const sha256hex = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

/** RFC 3986 encoding. encodeURIComponent leaves !'()* alone; S3 wants them encoded. */
function uriEncode(str) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/** Encode a path, preserving the separators. */
export function canonicalUri(path) {
  return (
    '/' +
    path
      .replace(/^\/+/, '')
      .split('/')
      .map(uriEncode)
      .join('/')
  );
}

export function signingKey(secret, date, region, service) {
  let k = hmac(`AWS4${secret}`, date);
  k = hmac(k, region);
  k = hmac(k, service);
  return hmac(k, 'aws4_request');
}

/**
 * Returns the headers to send, including Authorization.
 *
 * @param {object} o
 * @param {string} o.method
 * @param {string} o.host
 * @param {string} o.path        Unencoded object key path, e.g. "/models/v1/a.onnx"
 * @param {Record<string,string>} [o.query]
 * @param {Record<string,string>} [o.headers]
 * @param {Buffer|string} [o.body]
 * @param {string} o.accessKeyId
 * @param {string} o.secretAccessKey
 * @param {string} [o.region]    R2 uses "auto".
 */
export function sign({
  method,
  host,
  path,
  query = {},
  headers = {},
  body = '',
  accessKeyId,
  secretAccessKey,
  region = 'auto',
}) {
  const service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20240101T000000Z
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256hex(body);

  const allHeaders = {
    ...headers,
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  // Canonical headers: lowercase names, trimmed values, sorted by name.
  const sortedNames = Object.keys(allHeaders)
    .map((h) => h.toLowerCase())
    .sort();
  const lower = {};
  for (const [k, v] of Object.entries(allHeaders)) {
    lower[k.toLowerCase()] = String(v).trim().replace(/\s+/g, ' ');
  }
  const canonicalHeaders = sortedNames.map((n) => `${n}:${lower[n]}\n`).join('');
  const signedHeaders = sortedNames.join(';');

  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`)
    .join('&');

  const canonicalRequest = [
    method,
    canonicalUri(path),
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256hex(canonicalRequest),
  ].join('\n');

  const signature = createHmac(
    'sha256',
    signingKey(secretAccessKey, dateStamp, region, service),
  )
    .update(stringToSign)
    .digest('hex');

  return {
    ...allHeaders,
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
