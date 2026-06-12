// Orchestrates the full collection: fetch -> merge -> save.
// Used by both the MCP tool and the CLI mode.

import { fetchAccountVideos } from './instagram.js';
import { loadExisting, mergeVideos, saveCSV, csvPathForAccount } from './store.js';

/**
 * @param {string} username
 * @param {object} [options]
 * @param {number}  [options.maxPages]
 * @param {boolean} [options.fullRefresh]
 * @param {(msg:string)=>void} [options.log]
 */
export async function collectAccountVideos(username, options = {}) {
  const { maxPages = Infinity, fullRefresh = false, log = () => {} } = options;

  const cleanUsername = String(username || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();

  if (!cleanUsername) {
    throw new Error('Please provide an Instagram username.');
  }

  const existing = await loadExisting(cleanUsername);
  const knownShortcodes = new Set(
    existing.map((r) => r.shortcode).filter(Boolean)
  );
  log(`${existing.length} video(s) already saved for @${cleanUsername}.`);

  const result = await fetchAccountVideos(cleanUsername, {
    maxPages,
    knownShortcodes,
    fullRefresh,
    log,
  });

  const { rows, added, updated } = mergeVideos(existing, result.videos);
  const file = await saveCSV(cleanUsername, rows);

  return {
    username: cleanUsername,
    csvPath: file,
    relativeCsvPath: csvPathForAccount(cleanUsername),
    fetchedVideos: result.videos.length,
    added,
    updated,
    totalInList: rows.length,
    pagesFetched: result.pagesFetched,
    stoppedReason: result.stoppedReason,
    totalMediaCount: result.totalMediaCount,
  };
}
