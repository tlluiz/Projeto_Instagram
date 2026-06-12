// Thin wrapper around the OpenAI audio transcription API.

import fs from 'node:fs';
import OpenAI from 'openai';
import { getOpenAIKey, getTranscribeModel } from './env.js';

// Creates an OpenAI client. Throws (with a clear message) if the key is unset.
export function createClient() {
  return new OpenAI({ apiKey: getOpenAIKey() });
}

// Transcribes one audio file and returns the clean spoken text (no metadata).
export async function transcribeAudioFile(client, filePath) {
  const model = getTranscribeModel();
  const res = await client.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model,
  });
  return (res.text || '').trim();
}
