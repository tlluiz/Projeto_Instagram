// Persistence of the video list in resources/videos/<account>/list.csv.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toCSV, parseCSV } from './csv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// resources/mcps/instagram-videos/src -> goes up 3 levels to resources/
const RESOURCES_DIR = path.resolve(__dirname, '..', '..', '..');

// Order of the CSV columns.
export const COLUMNS = [
  'shortcode',
  'id',
  'type',
  'url',
  'published_at',
  'timestamp',
  'views',
  'likes',
  'comments',
  'caption',
  'video_url',
  'thumbnail_url',
  'width',
  'height',
];

/** Absolute path of an account's CSV. */
export function csvPathForAccount(username) {
  return path.join(RESOURCES_DIR, 'videos', username, 'list.csv');
}

/** Reads the existing CSV (if any) and returns the rows as objects. */
export async function loadExisting(username) {
  const file = csvPathForAccount(username);
  try {
    const text = await fs.readFile(file, 'utf8');
    return parseCSV(text);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Merges the freshly collected videos with the existing ones, removing
 * duplicates by shortcode (preferring the freshly downloaded data, which has
 * more up-to-date view/like counts) and sorting by publication date from
 * newest to oldest.
 *
 * @param {object[]} existing
 * @param {object[]} fetched
 * @returns {{ rows: object[], added: number, updated: number }}
 */
export function mergeVideos(existing, fetched) {
  const byShortcode = new Map();

  // Start with what already exists.
  for (const row of existing) {
    if (row.shortcode) byShortcode.set(row.shortcode, row);
  }

  let added = 0;
  let updated = 0;

  for (const video of fetched) {
    if (!video.shortcode) continue;
    if (byShortcode.has(video.shortcode)) {
      updated++;
    } else {
      added++;
    }
    byShortcode.set(video.shortcode, video);
  }

  const rows = Array.from(byShortcode.values()).sort((a, b) => {
    const ta = Number(a.timestamp) || 0;
    const tb = Number(b.timestamp) || 0;
    return tb - ta; // newest first
  });

  return { rows, added, updated };
}

/** Writes the final list to the account's CSV, creating the needed directories. */
export async function saveCSV(username, rows) {
  const file = csvPathForAccount(username);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, toCSV(COLUMNS, rows), 'utf8');
  return file;
}
