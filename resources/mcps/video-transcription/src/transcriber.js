// Orchestrates the whole flow: discover -> extract audio -> (chunk if needed)
// -> transcribe -> save clean .txt next to the video. Used by both the MCP
// tools and the CLI mode.

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractAudio, getDurationSeconds, splitAudio } from './audio.js';
import { createClient, transcribeAudioFile } from './transcribe.js';

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v', '.flv', '.wmv',
  '.mpeg', '.mpg', '.m2ts', '.ts', '.3gp',
]);

// Stay safely under the OpenAI transcription size cap (~25 MB).
const MAX_AUDIO_BYTES = 24 * 1024 * 1024;

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// The transcription file sits next to the video, same base name, .txt.
// e.g. /a/b/1_abc.mp4 -> /a/b/1_abc.txt
function txtPathFor(videoPath) {
  const dir = path.dirname(videoPath);
  const base = path.basename(videoPath, path.extname(videoPath));
  return path.join(dir, `${base}.txt`);
}

// Transcribes a compressed audio file, transparently splitting it into chunks
// that each stay under the API limit and stitching the pieces back together.
async function transcribeAudio(client, audioPath, log) {
  const { size } = await fs.stat(audioPath);
  if (size <= MAX_AUDIO_BYTES) {
    log('Audio within size limit — transcribing in one piece.');
    return transcribeAudioFile(client, audioPath);
  }

  const duration = await getDurationSeconds(audioPath);
  const bytesPerSec = duration > 0 ? size / duration : 0;
  // How many seconds of audio fit under the cap (with a small safety margin).
  let segmentSeconds = bytesPerSec > 0
    ? Math.floor((MAX_AUDIO_BYTES * 0.95) / bytesPerSec)
    : 0;
  if (!segmentSeconds || segmentSeconds < 1) segmentSeconds = 600; // fallback: 10 min

  log(`Audio is large (${size} bytes) — splitting into ~${segmentSeconds}s chunks.`);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vt-chunks-'));
  try {
    const chunks = await splitAudio(audioPath, segmentSeconds, tmpDir);
    log(`Split into ${chunks.length} chunk(s).`);
    const parts = [];
    for (let i = 0; i < chunks.length; i++) {
      log(`Transcribing chunk ${i + 1}/${chunks.length}...`);
      parts.push(await transcribeAudioFile(client, chunks[i]));
    }
    return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

// Transcribes one video. Returns a status object. Throws only on real errors;
// the batch caller turns those into a "failed" entry so the run continues.
export async function transcribeSingleVideo(videoPath, options = {}) {
  const { force = false, log = () => {}, client } = options;
  const abs = path.resolve(videoPath);
  const txtPath = txtPathFor(abs);
  const name = path.basename(abs);

  if (!(await fileExists(abs))) {
    throw new Error(`Video file not found: ${abs}`);
  }

  if (!force && (await fileExists(txtPath))) {
    log(`${name}: already transcribed — skipping.`);
    return { video: abs, txt: txtPath, status: 'skipped' };
  }

  // Reuse a shared client when given (batch), otherwise create one lazily so a
  // missing key only matters once we actually need to transcribe.
  const apiClient = client || createClient();

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vt-audio-'));
  const audioPath = path.join(tmpDir, 'audio.ogg');
  try {
    log(`${name}: extracting audio...`);
    await extractAudio(abs, audioPath);
    log(`${name}: transcribing...`);
    const text = await transcribeAudio(apiClient, audioPath, log);
    await fs.writeFile(txtPath, text + '\n', 'utf8');
    log(`${name}: saved ${path.basename(txtPath)}.`);
    return { video: abs, txt: txtPath, status: 'transcribed' };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

// Public: transcribe a single video file.
export async function transcribeVideo(videoPath, options = {}) {
  if (!videoPath || !String(videoPath).trim()) {
    throw new Error('Please provide the path to a video file.');
  }
  const res = await transcribeSingleVideo(String(videoPath).trim(), options);
  return {
    mode: 'single',
    transcribed: res.status === 'transcribed' ? 1 : 0,
    skipped: res.status === 'skipped' ? 1 : 0,
    failed: 0,
    results: [res],
  };
}

// Public: transcribe every video in a folder. One failing video is ignored so
// the rest still get transcribed.
export async function transcribeFolder(folderPath, options = {}) {
  const { force = false, log = () => {} } = options;
  if (!folderPath || !String(folderPath).trim()) {
    throw new Error('Please provide the path to a folder.');
  }
  const absDir = path.resolve(String(folderPath).trim());

  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error(`Folder not found: ${absDir}`);
    throw err;
  }

  const videos = entries
    .filter((e) => e.isFile() && VIDEO_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(absDir, e.name))
    .sort();

  log(`Found ${videos.length} video file(s) in ${absDir}.`);

  // One shared client for the whole batch — validates the key once, up front,
  // so a missing key fails fast with a clear message before any work starts.
  const client = createClient();

  const results = [];
  let transcribed = 0;
  let skipped = 0;
  let failed = 0;

  for (const video of videos) {
    try {
      const res = await transcribeSingleVideo(video, { force, log, client });
      if (res.status === 'transcribed') transcribed++;
      else if (res.status === 'skipped') skipped++;
      results.push(res);
    } catch (err) {
      // Ignore this video and move on — never abort the batch.
      log(`${path.basename(video)}: failed — ${err.message}. Skipping.`);
      failed++;
      results.push({ video, status: 'failed', reason: err.message });
    }
  }

  return {
    mode: 'folder',
    folder: absDir,
    total: videos.length,
    transcribed,
    skipped,
    failed,
    results,
  };
}
