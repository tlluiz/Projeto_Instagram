#!/usr/bin/env node
// Entry point.
//
//   - No arguments -> starts the MCP server (stdio).
//   - With arguments -> runs in CLI mode (useful for manual testing):
//         node src/index.js <videoFileOrFolder> [--force]

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import { transcribeVideo, transcribeFolder } from './transcriber.js';

function formatSummary(result) {
  const lines = [];
  if (result.mode === 'folder') {
    lines.push(`Folder: ${result.folder}`);
    lines.push(`Videos found: ${result.total}`);
  } else {
    const r = result.results[0];
    lines.push(`Video: ${r.video}`);
    if (r.txt) lines.push(`Transcription: ${r.txt}`);
  }
  lines.push(`Transcribed: ${result.transcribed}`);
  lines.push(`Skipped (already done): ${result.skipped}`);
  lines.push(`Failed (ignored): ${result.failed}`);
  return lines.join('\n');
}

async function runTool(fn, target, force) {
  const logs = [];
  const log = (msg) => logs.push(msg);
  try {
    const result = await fn(target, { force, log });
    return {
      content: [
        { type: 'text', text: formatSummary(result) },
        { type: 'text', text: 'Log:\n' + logs.join('\n') },
      ],
    };
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Transcription failed: ${err.message}\n\nLog:\n` + logs.join('\n'),
        },
      ],
    };
  }
}

async function runMcpServer() {
  const server = new McpServer({
    name: 'video-transcription',
    version: '1.0.0',
  });

  server.tool(
    'transcribe_video',
    'Transcribes a single video file to text using the OpenAI API. The audio ' +
      'is extracted and compressed first (only the audio is uploaded, never ' +
      'the heavy video), and the clean transcription is saved as a .txt file ' +
      'next to the video with the same base name. The video is skipped if its ' +
      '.txt already exists, unless `force` is true. Audio that is too large for ' +
      'the API is automatically split into chunks and stitched back together.',
    {
      videoPath: z
        .string()
        .describe('Path (absolute or relative) to the video file.'),
      force: z
        .boolean()
        .optional()
        .describe('Re-transcribe even if a .txt already exists (default false).'),
    },
    async ({ videoPath, force }) =>
      runTool(transcribeVideo, videoPath, force === true)
  );

  server.tool(
    'transcribe_folder',
    'Transcribes every video file in a folder to text using the OpenAI API. ' +
      'Each clean transcription is saved as a .txt next to its video. Videos ' +
      'that already have a .txt are skipped unless `force` is true, and if one ' +
      'video fails it is ignored so the rest still get transcribed.',
    {
      folderPath: z
        .string()
        .describe(
          'Path (absolute or relative) to the folder containing the videos.'
        ),
      force: z
        .boolean()
        .optional()
        .describe(
          'Re-transcribe videos even if a .txt already exists (default false).'
        ),
    },
    async ({ folderPath, force }) =>
      runTool(transcribeFolder, folderPath, force === true)
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // In MCP mode we do not write to stdout (reserved for the protocol).
  console.error('[video-transcription] MCP server started (stdio).');
}

async function runCli(argv) {
  const force = argv.includes('--force');
  const target = argv.find((a) => a !== '--force');
  if (!target) {
    console.error('Usage: node src/index.js <videoFileOrFolder> [--force]');
    process.exit(1);
  }

  const stat = fs.statSync(target);
  const result = stat.isDirectory()
    ? await transcribeFolder(target, { force, log: (m) => console.error(m) })
    : await transcribeVideo(target, { force, log: (m) => console.error(m) });

  console.log('\n=== Result ===');
  console.log(formatSummary(result));
}

const args = process.argv.slice(2);
const isCli = args.length > 0;

if (isCli) {
  runCli(args).catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
} else {
  runMcpServer().catch((err) => {
    console.error('Error starting the MCP server:', err);
    process.exit(1);
  });
}
