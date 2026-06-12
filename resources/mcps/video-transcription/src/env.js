// Loads configuration from a .env file at the root of the project and exposes
// the OpenAI settings. If the API key is missing, fails with a clear message
// instead of an obscure crash.

import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Walks up from `startDir` looking for `filename`; returns its path or null.
function findUp(filename, startDir) {
  let dir = startDir;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = path.join(dir, filename);
    if (fssync.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null; // reached the filesystem root
    dir = parent;
  }
}

let loaded = false;

export function loadEnv() {
  if (loaded) return;
  // Look for a .env starting from the working directory, then from the MCP's
  // own folder — whichever is found first wins. dotenv does not override
  // variables that are already set in the real environment.
  const envPath = findUp('.env', process.cwd()) || findUp('.env', __dirname);
  if (envPath) dotenv.config({ path: envPath });
  loaded = true;
}

export function getOpenAIKey() {
  loadEnv();
  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim()) {
    throw new Error(
      'OPENAI_API_KEY is not set. Create a .env file at the root of the ' +
        'project and add a line like:\n\n    OPENAI_API_KEY=sk-...\n\n' +
        'Then try again.'
    );
  }
  return key.trim();
}

export function getTranscribeModel() {
  loadEnv();
  return (process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1').trim();
}
