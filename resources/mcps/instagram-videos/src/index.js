#!/usr/bin/env node
// Entry point.
//
//   - No arguments -> starts the MCP server (stdio).
//   - With a username -> runs in CLI mode (useful for manual testing):
//         node src/index.js <account> [--full] [--max-pages=N]

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { collectAccountVideos } from './collector.js';

async function runMcpServer() {
  const server = new McpServer({
    name: 'instagram-videos',
    version: '1.0.0',
  });

  server.tool(
    'fetch_instagram_videos',
    'Collects all public videos from an Instagram account (without ' +
      'authentication), including basic information, view count and ' +
      'like count. Walks through as many pages as possible, ignores ' +
      'access errors and saves/updates the result in ' +
      'resources/videos/<account>/list.csv, ordered from the newest ' +
      'video to the oldest. Can be run multiple times: by default it only ' +
      'prepends the most recent videos to the top of the list.',
    {
      username: z
        .string()
        .describe('Instagram account username (with or without @).'),
      fullRefresh: z
        .boolean()
        .optional()
        .describe(
          'If true, re-walks the entire timeline instead of stopping when ' +
            'it reaches already-saved videos. Default: false.'
        ),
      maxPages: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Optional limit on the number of pages to walk.'),
    },
    async ({ username, fullRefresh = false, maxPages }) => {
      const logs = [];
      const log = (msg) => logs.push(msg);
      try {
        const result = await collectAccountVideos(username, {
          fullRefresh,
          maxPages: maxPages ?? Infinity,
          log,
        });
        const summary = [
          `Account: @${result.username}`,
          `File: ${result.csvPath}`,
          `Total media on the account (reported by IG): ${result.totalMediaCount ?? 'unknown'}`,
          `Pages walked: ${result.pagesFetched}`,
          `Videos collected in this run: ${result.fetchedVideos}`,
          `Newly added: ${result.added}`,
          `Updated: ${result.updated}`,
          `Total videos in the list: ${result.totalInList}`,
          `Stop reason: ${result.stoppedReason}`,
        ].join('\n');

        return {
          content: [
            { type: 'text', text: summary },
            {
              type: 'text',
              text: 'Log:\n' + logs.join('\n'),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text:
                `Failed to collect videos: ${err.message}\n\nLog:\n` +
                logs.join('\n'),
            },
          ],
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // In MCP mode we do not write to stdout (reserved for the protocol).
  console.error('[instagram-videos] MCP server started (stdio).');
}

async function runCli(argv) {
  const username = argv[0];
  const fullRefresh = argv.includes('--full');
  const maxPagesArg = argv.find((a) => a.startsWith('--max-pages='));
  const maxPages = maxPagesArg
    ? parseInt(maxPagesArg.split('=')[1], 10)
    : Infinity;

  const result = await collectAccountVideos(username, {
    fullRefresh,
    maxPages,
    log: (msg) => console.error(msg),
  });

  console.log('\n=== Result ===');
  console.log(JSON.stringify(result, null, 2));
}

const args = process.argv.slice(2);
const isCli = args.length > 0 && !args[0].startsWith('-');

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
