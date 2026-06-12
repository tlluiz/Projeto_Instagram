# Projeto_Instagram

A small project built around an **MCP server** that collects all public videos
from an Instagram account — **without authentication** — capturing each video's
basic information along with its **view** and **like** counts, and saving the
result to CSV.

## What's here

| Path | Description |
|---|---|
| `resources/mcps/instagram-videos/` | The MCP server (Node.js). See its [README](resources/mcps/instagram-videos/README.md) for full details. |
| `resources/prompts/` | The original task prompt that defined the project. |
| `resources/docs/` | Excalidraw diagrams (overview / MCP flow). |
| `resources/videos/<account>/list.csv` | Per-account output produced at runtime (git-ignored). |

## The `instagram-videos` MCP

The server exposes a single tool, **`fetch_instagram_videos`**, which:

- resolves a public Instagram profile via the public web endpoints (no login);
- walks the timeline through the public GraphQL endpoint, keeping only video
  media (including Reels);
- tolerates access errors — on a persistent failure it stops and keeps whatever
  it already downloaded;
- saves to `resources/videos/<account>/list.csv`, ordered newest-first, and
  merges incrementally on re-runs (dedupe by `shortcode`).

It can also be run directly from the command line for testing.

### Quick start

```bash
cd resources/mcps/instagram-videos
npm install

# CLI mode (manual testing)
node src/index.js <account> [--full] [--max-pages=N]
```

To use it as an MCP tool, register the server with your MCP client (e.g. Claude
Desktop / Claude Code):

```json
{
  "mcpServers": {
    "instagram-videos": {
      "command": "node",
      "args": ["resources/mcps/instagram-videos/src/index.js"]
    }
  }
}
```

See the [MCP README](resources/mcps/instagram-videos/README.md) for the full CSV
schema, parameters, environment variables, and important limitations
(rate-limiting, private accounts, changing endpoints).

## Notes

- Requires **Node.js >= 18**.
- Instagram applies aggressive rate-limiting to anonymous requests; for
  consistent results, run from a residential IP and avoid many consecutive runs.
- Private accounts are not accessible without authentication.
