// Downloads a file from a URL to disk by streaming the response body.

import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { buildHeaders } from './instagram.js';

/**
 * Downloads `url` into `destPath`, streaming to avoid loading the whole file in
 * memory. On failure, removes any partially written file before rethrowing.
 *
 * @param {string} url
 * @param {string} destPath
 * @returns {Promise<number>} number of bytes written
 */
export async function downloadFile(url, destPath) {
  const res = await fetch(url, { headers: buildHeaders('') });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  if (!res.body) {
    throw new Error('empty response body');
  }

  try {
    await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  } catch (err) {
    // Clean up a partial file so a later run does not skip a broken download.
    await fs.rm(destPath, { force: true });
    throw err;
  }

  const { size } = await fs.stat(destPath);
  return size;
}
