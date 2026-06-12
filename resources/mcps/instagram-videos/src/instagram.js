// Collects public Instagram videos using the public web endpoints,
// without authentication (no login/session cookies).
//
// Strategy:
//   1. `web_profile_info` -> account id + first page of the timeline.
//   2. Public GraphQL endpoint -> pagination of the remaining pages.
//
// Note: Instagram changes these endpoints/hashes frequently and applies
// aggressive rate-limiting to anonymous requests. For that reason every access
// is fault-tolerant: on a persistent error we stop pagination and keep whatever
// we already managed to download (as required by the assignment).

// Public app id used by the Instagram website for anonymous calls.
const IG_APP_ID = '936619743392459';

// Hash of the user timeline GraphQL query. It can change over time;
// allows overriding via environment variable.
const TIMELINE_QUERY_HASH =
  process.env.IG_QUERY_HASH || 'e769aa130647d2354c40ea6a439bfc08';

const DEFAULT_PAGE_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1500;
const PAGE_DELAY_MS = 1200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildHeaders(username) {
  return {
    'x-ig-app-id': IG_APP_ID,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-Requested-With': 'XMLHttpRequest',
    Referer: `https://www.instagram.com/${encodeURIComponent(username)}/`,
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
      log(`  attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
      }
    }
  }
  throw lastError;
}

/**
 * Normalizes a timeline media node into a simple video record.
 * Returns null if the node is not a video.
 */
function normalizeVideoNode(node) {
  if (!node || node.is_video !== true) return null;

  const shortcode = node.shortcode || node.code || '';
  const timestamp = node.taken_at_timestamp || node.taken_at || 0;
  const isReel = node.product_type === 'clips';

  const caption =
    node.edge_media_to_caption?.edges?.[0]?.node?.text ??
    node.caption?.text ??
    '';

  const likes =
    node.edge_media_preview_like?.count ??
    node.edge_liked_by?.count ??
    node.like_count ??
    '';

  const views =
    node.video_view_count ??
    node.video_play_count ??
    node.play_count ??
    node.view_count ??
    '';

  const comments =
    node.edge_media_to_comment?.count ??
    node.edge_media_to_parent_comment?.count ??
    node.comment_count ??
    '';

  return {
    shortcode,
    id: node.id || '',
    type: isReel ? 'reel' : 'video',
    url: `https://www.instagram.com/${isReel ? 'reel' : 'p'}/${shortcode}/`,
    published_at: timestamp
      ? new Date(timestamp * 1000).toISOString()
      : '',
    timestamp: String(timestamp || ''),
    views: views === null ? '' : String(views),
    likes: likes === null ? '' : String(likes),
    comments: comments === null ? '' : String(comments),
    caption,
    video_url: node.video_url || '',
    thumbnail_url: node.display_url || node.thumbnail_src || '',
    width: node.dimensions?.width ?? '',
    height: node.dimensions?.height ?? '',
  };
}

/** Extracts the timeline media structure from any of the response formats. */
function getTimelineMedia(payload) {
  const user =
    payload?.data?.user || payload?.graphql?.user || payload?.user || null;
  return user?.edge_owner_to_timeline_media || null;
}

/**
 * Collects the videos of a public account.
 *
 * @param {string} username
 * @param {object} options
 * @param {number}  [options.maxPages=Infinity] Limit on the number of pages to walk.
 * @param {Set<string>} [options.knownShortcodes] Already-saved shortcodes (incremental mode).
 * @param {boolean} [options.fullRefresh=false] If true, ignores knownShortcodes and walks everything.
 * @param {(msg:string)=>void} [options.log] Log function.
 * @returns {Promise<{videos: object[], pagesFetched: number, stoppedReason: string, totalMediaCount: number|null}>}
 */
export async function fetchAccountVideos(username, options = {}) {
  const {
    maxPages = Infinity,
    knownShortcodes = new Set(),
    fullRefresh = false,
    log = () => {},
  } = options;

  const headers = buildHeaders(username);
  const videos = [];
  const seen = new Set();
  let pagesFetched = 0;
  let stoppedReason = 'end of timeline';
  let totalMediaCount = null;

  // --- Step 1: web profile (id + first page) ---
  let userId;
  let media;
  try {
    log(`Fetching profile of @${username}...`);
    const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
      username
    )}`;
    const profile = await fetchJson(profileUrl, headers, log);
    const user = profile?.data?.user;
    if (!user) {
      throw new Error('profile not found or account private/blocked');
    }
    userId = user.id;
    media = user.edge_owner_to_timeline_media;
    totalMediaCount = media?.count ?? null;
    log(`Profile ok (id=${userId}, total media=${totalMediaCount}).`);
  } catch (err) {
    // Failure right at the start: there is nothing we can download.
    log(`Error fetching the profile: ${err.message}`);
    return {
      videos,
      pagesFetched,
      stoppedReason: `initial error: ${err.message}`,
      totalMediaCount,
    };
  }

  // Helper that processes a page of media already fetched.
  // Returns true if we should stop pagination (incremental mode).
  function ingestMedia(mediaBlock) {
    let hitKnown = false;
    for (const edge of mediaBlock?.edges || []) {
      const video = normalizeVideoNode(edge.node);
      if (!video) continue;
      if (video.shortcode && seen.has(video.shortcode)) continue;

      if (!fullRefresh && knownShortcodes.has(video.shortcode)) {
        // Since the timeline comes from newest to oldest, when we reach
        // an already-saved video we know the following ones are saved too.
        hitKnown = true;
        continue;
      }

      seen.add(video.shortcode);
      videos.push(video);
    }
    return hitKnown;
  }

  // First page.
  pagesFetched++;
  if (ingestMedia(media)) {
    log('Reached an already-saved video — stopping (incremental mode).');
    return {
      videos,
      pagesFetched,
      stoppedReason: 'reached already-saved videos',
      totalMediaCount,
    };
  }

  // --- Step 2: pagination via GraphQL ---
  let pageInfo = media?.page_info;
  while (
    pageInfo?.has_next_page &&
    pageInfo?.end_cursor &&
    pagesFetched < maxPages
  ) {
    await sleep(PAGE_DELAY_MS);

    const variables = {
      id: userId,
      first: DEFAULT_PAGE_SIZE,
      after: pageInfo.end_cursor,
    };
    const url =
      `https://www.instagram.com/graphql/query/?query_hash=${TIMELINE_QUERY_HASH}` +
      `&variables=${encodeURIComponent(JSON.stringify(variables))}`;

    let payload;
    try {
      log(`Fetching page ${pagesFetched + 1}...`);
      payload = await fetchJson(url, headers, log);
    } catch (err) {
      // Access error: we ignore it and continue with what we already have.
      log(`Error on page ${pagesFetched + 1}: ${err.message}. Stopping.`);
      stoppedReason = `access error: ${err.message}`;
      break;
    }

    const nextMedia = getTimelineMedia(payload);
    if (!nextMedia) {
      stoppedReason = 'empty/unexpected pagination response';
      break;
    }

    pagesFetched++;
    if (ingestMedia(nextMedia)) {
      stoppedReason = 'reached already-saved videos';
      log('Reached an already-saved video — stopping (incremental mode).');
      break;
    }

    pageInfo = nextMedia.page_info;
    if (!pageInfo?.has_next_page) {
      stoppedReason = 'end of timeline';
    }
  }

  if (pagesFetched >= maxPages && pageInfo?.has_next_page) {
    stoppedReason = `reached the limit of ${maxPages} pages`;
  }

  return { videos, pagesFetched, stoppedReason, totalMediaCount };
}
