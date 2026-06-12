// Resolves the .mp4 URL of an Instagram video from its shortcode using the
// public (web) GraphQL endpoint, without authentication (no login/cookies/tokens).
//
// Strategy: GET https://www.instagram.com/graphql/query with a persisted query
// `doc_id` and variables={"shortcode":"<shortcode>"}, then read
// data.xdt_shortcode_media.video_url. Instagram may rotate the doc_id over time,
// so it can be overridden via the IG_DOC_ID environment variable.

// Public app id used by the Instagram website for anonymous calls.
const IG_APP_ID = '936619743392459';

// Persisted GraphQL query id for the shortcode -> media lookup.
const DOC_ID = process.env.IG_DOC_ID || '10015901848480474';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Browser-like headers for anonymous requests. */
export function buildHeaders(shortcode) {
  return {
    'x-ig-app-id': IG_APP_ID,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-Requested-With': 'XMLHttpRequest',
    Referer: shortcode
      ? `https://www.instagram.com/p/${encodeURIComponent(shortcode)}/`
      : 'https://www.instagram.com/',
    Origin: 'https://www.instagram.com',
  };
}

/**
 * GET with retries and backoff. Throws if all attempts fail.
 */
async function fetchJson(url, headers, log) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error('Response is not JSON (likely a block/login wall)');
      }
    } catch (err) {
      lastError = err;
      log(`    attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
      }
    }
  }
  throw lastError;
}

/**
 * Resolves the direct .mp4 URL for a given shortcode.
 *
 * @param {string} shortcode
 * @param {object} [options]
 * @param {(msg:string)=>void} [options.log]
 * @returns {Promise<string>} the video_url
 */
export async function resolveVideoUrl(shortcode, options = {}) {
  const { log = () => {} } = options;
  if (!shortcode) throw new Error('empty shortcode');

  const variables = encodeURIComponent(JSON.stringify({ shortcode }));
  const url = `https://www.instagram.com/graphql/query?doc_id=${DOC_ID}&variables=${variables}`;

  const payload = await fetchJson(url, buildHeaders(shortcode), log);

  const media = payload?.data?.xdt_shortcode_media;
  if (!media) {
    throw new Error('xdt_shortcode_media not found (removed or login wall)');
  }
  const videoUrl = media.video_url;
  if (!videoUrl) {
    throw new Error('no video_url on the media (not a video or unavailable)');
  }
  return videoUrl;
}
