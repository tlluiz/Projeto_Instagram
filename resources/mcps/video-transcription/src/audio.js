// Audio handling, fully portable: uses the ffmpeg/ffprobe binaries bundled via
// npm (ffmpeg-static / ffprobe-static), so nothing has to be installed on the
// host machine.

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const ffprobePath = ffprobeStatic && ffprobeStatic.path;

// Runs a bundled binary and resolves with its stdout/stderr, or rejects with a
// trimmed error if it exits non-zero.
function run(bin, args) {
  return new Promise((resolve, reject) => {
    if (!bin) {
      reject(new Error('Bundled ffmpeg/ffprobe binary not found.'));
      return;
    }
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const tail = stderr.trim().split('\n').slice(-3).join(' ');
        reject(new Error(`${path.basename(bin)} exited with code ${code}: ${tail}`));
      }
    });
  });
}

// Extracts speech audio from a video: mono, 16 kHz, low-bitrate Opus optimized
// for voice — the smallest size that keeps speech clear. Only the audio is
// touched, the (possibly heavy) video is never uploaded.
export async function extractAudio(videoPath, outPath) {
  await run(ffmpegPath, [
    '-y',
    '-i', videoPath,
    '-vn',
    '-ac', '1',
    '-ar', '16000',
    '-c:a', 'libopus',
    '-b:a', '16k',
    '-application', 'voip',
    outPath,
  ]);
  return outPath;
}

// Returns the duration of an audio/video file in seconds (0 if unknown).
export async function getDurationSeconds(filePath) {
  const { stdout } = await run(ffprobePath, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const d = parseFloat(stdout.trim());
  return Number.isFinite(d) ? d : 0;
}

// Splits an audio file into time-based segments of `segmentSeconds` each,
// written to `outDir`. Returns the chunk paths in order.
export async function splitAudio(audioPath, segmentSeconds, outDir) {
  const pattern = path.join(outDir, 'chunk_%04d.ogg');
  await run(ffmpegPath, [
    '-y',
    '-i', audioPath,
    '-f', 'segment',
    '-segment_time', String(segmentSeconds),
    '-c', 'copy',
    pattern,
  ]);
  const files = (await fs.readdir(outDir))
    .filter((f) => /^chunk_\d+\.ogg$/.test(f))
    .sort();
  return files.map((f) => path.join(outDir, f));
}
