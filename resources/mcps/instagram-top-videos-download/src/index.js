#!/usr/bin/env node
// Entry point.
//
//   - No arguments -> starts the MCP server (stdio).
//   - With arguments -> runs in CLI mode (useful for manual testing):
//         node src/index.js <csvPath> <count>

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { downloadTopVideos } from './collector.js';

function formatSummary(result) {
  return [
    `Account: @${result.account}`,
    `CSV: ${result.csvPath}`,
    `Downloads folder: ${result.downloadsDir}`,
    `Videos in CSV: ${result.totalInCsv}`,
    `Requested: ${result.requested}`,
    `Selected (top by likes): ${result.selected}`,
    `Downloaded: ${result.downloaded}`,
    `Skipped (already present): ${result.skipped}`,
    `Failed (ignored): ${result.failed}`,
  ].join('\n');
}

async function runMcpServer() {
  const server = new McpServer({
    name: 'instagram-top-videos-download',
    version: '1.0.0',
  });

  server.tool(
    'download_top_videos',
    'Reads a CSV with an Instagram account\'s videos, ranks them by number of ' +
      'likes (most liked first) and downloads the top N videos. The .mp4 URL ' +
      'is resolved fresh (public, no authentication) from each shortcode via ' +
      'the public GraphQL endpoint. Files are saved as <rank>_<shortcode>.mp4 ' +
      'in a "downloads" subfolder next to the CSV. Already-downloaded files are ' +
      'skipped, and individual resolve/download errors are ignored so the rest ' +
      'still download.',
    {
      csvPath: z
        .string()
        .describe(
          'Path (absolute or relative) to the CSV file produced by the ' +
            'instagram-videos MCP. The account is taken from the CSV folder name.'
        ),
      count: z
        .number()
        .int()
        .positive()
        .describe('How many of the most-liked videos to download.'),
    },
    async ({ csvPath, count }) => {
      const logs = [];
      const log = (msg) => logs.push(msg);
      try {
        const result = await downloadTopVideos(csvPath, count, { log });
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
              text:
                `Failed to download videos: ${err.message}\n\nLog:\n` +
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
  console.error('[instagram-top-videos-download] MCP server started (stdio).');
}

async function runCli(argv) {
  const csvPath = argv[0];
  const count = parseInt(argv[1], 10);

  const result = await downloadTopVideos(csvPath, count, {
    log: (msg) => console.error(msg),
  });

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
