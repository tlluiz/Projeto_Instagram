// Orchestrates the whole flow: read CSV -> rank by likes -> resolve -> download.
// Used by both the MCP tool and the CLI mode.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseCSV } from './csv.js';
import { resolveVideoUrl } from './instagram.js';
import { downloadFile } from './downloader.js';

/** Parses a likes value into a number; missing/empty/non-numeric -> 0. */
function likesOf(row) {
  const n = Number(row.likes);
  return Number.isFinite(n) ? n : 0;
}

/** Returns true if a file already exists at `p`. */
async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the CSV, ranks the videos by likes (descending) and downloads the top
 * `count` videos into a `downloads` subfolder next to the CSV.
 *
 * @param {string} csvPath Path to the CSV (absolute or relative).
 * @param {number} count How many videos to download (positive integer).
 * @param {object} [options]
 * @param {(msg:string)=>void} [options.log]
 */
export async function downloadTopVideos(csvPath, count, options = {}) {
  const { log = () => {} } = options;

  if (!csvPath || !String(csvPath).trim()) {
    throw new Error('Please provide the path to the CSV file.');
  }
  const requested = Number(count);
  if (!Number.isInteger(requested) || requested <= 0) {
    throw new Error('The number of videos must be a positive integer.');
  }

  const absCsv = path.resolve(String(csvPath).trim());
  // The account is the name of the folder that contains the CSV.
  const account = path.basename(path.dirname(absCsv));
  const downloadsDir = path.join(path.dirname(absCsv), 'downloads');

  let text;
  try {
    text = await fs.readFile(absCsv, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`CSV file not found: ${absCsv}`);
    }
    throw err;
  }

  const rows = parseCSV(text);
  log(`Read ${rows.length} row(s) from ${absCsv} (account: @${account}).`);

  // Rank by likes, most liked first. Array.sort is stable, so ties keep the
  // CSV order (which is newest-first).
  const ranked = [...rows].sort((a, b) => likesOf(b) - likesOf(a));
  const selected = ranked.slice(0, requested);
  log(
    `Selecting top ${selected.length} of ${rows.length} video(s) by likes ` +
      `(requested ${requested}).`
  );

  await fs.mkdir(downloadsDir, { recursive: true });

  const results = [];
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < selected.length; i++) {
    const order = i + 1; // rank: most liked = 1
    const row = selected[i];
    const shortcode = (row.shortcode || '').trim();

    if (!shortcode) {
      log(`#${order}: no shortcode in this row — skipping.`);
      failed++;
      results.push({ order, shortcode: '', status: 'failed', reason: 'no shortcode' });
      continue;
    }

    const fileName = `${order}_${shortcode}.mp4`;
    const destPath = path.join(downloadsDir, fileName);

    if (await fileExists(destPath)) {
      log(`#${order} ${shortcode}: already downloaded — skipping.`);
      skipped++;
      results.push({ order, shortcode, status: 'skipped', file: fileName });
      continue;
    }

    try {
      log(`#${order} ${shortcode}: resolving video URL...`);
      const videoUrl = await resolveVideoUrl(shortcode, { log });
      log(`#${order} ${shortcode}: downloading...`);
      const bytes = await downloadFile(videoUrl, destPath);
      log(`#${order} ${shortcode}: saved ${fileName} (${bytes} bytes).`);
      downloaded++;
      results.push({ order, shortcode, status: 'downloaded', file: fileName, bytes });
    } catch (err) {
      // Ignore the error for this video and move on to the next one.
      log(`#${order} ${shortcode}: failed — ${err.message}. Skipping.`);
      failed++;
      results.push({ order, shortcode, status: 'failed', reason: err.message });
    }
  }

  return {
    account,
    csvPath: absCsv,
    downloadsDir,
    totalInCsv: rows.length,
    requested,
    selected: selected.length,
    downloaded,
    skipped,
    failed,
    results,
  };
}
