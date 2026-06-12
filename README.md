# Projeto_Instagram

A small project built around two **MCP servers** that work with the public
videos of an Instagram account — **without authentication** (no login, cookies
or tokens). Together they form a simple pipeline:

1. **`instagram-videos`** — collects all public videos of an account (basic info
   + view and like counts) and saves them to a CSV.
2. **`instagram-top-videos-download`** — reads that CSV, ranks the videos by
   likes and downloads the most-liked ones as `.mp4` files.

## What's here

| Path | Description |
|---|---|
| `resources/mcps/instagram-videos/` | MCP that collects an account's videos into a CSV. See its [README](resources/mcps/instagram-videos/README.md). |
| `resources/mcps/instagram-top-videos-download/` | MCP that downloads the top-liked videos from that CSV. See its [README](resources/mcps/instagram-top-videos-download/README.md). |
| `resources/prompts/` | The task prompts that defined each MCP. |
| `resources/docs/` | Excalidraw diagrams (overview / MCP flow). |
| `resources/videos/<account>/list.csv` | Per-account video list produced by the first MCP (git-ignored). |
| `resources/videos/<account>/downloads/` | Downloaded `.mp4` files produced by the second MCP (git-ignored). |

## 1. The `instagram-videos` MCP

Exposes a single tool, **`fetch_instagram_videos`**, which:

- resolves a public Instagram profile via the public web endpoints (no login);
- walks the timeline through the public GraphQL endpoint, keeping only video
  media (including Reels);
- tolerates access errors — on a persistent failure it stops and keeps whatever
  it already downloaded;
- saves to `resources/videos/<account>/list.csv`, ordered newest-first, and
  merges incrementally on re-runs (dedupe by `shortcode`).

### Quick start

```bash
cd resources/mcps/instagram-videos
npm install

# CLI mode (manual testing)
node src/index.js <account> [--full] [--max-pages=N]
```

See its [README](resources/mcps/instagram-videos/README.md) for the full CSV
schema, parameters and limitations.

## 2. The `instagram-top-videos-download` MCP

Exposes a single tool, **`download_top_videos`**, which:

- reads the CSV produced above (path accepted flexibly; the account is taken
  from the CSV's folder name);
- ranks the videos by the `likes` column (most liked first; views ignored);
- resolves each video's `.mp4` URL fresh from its `shortcode` via the public
  GraphQL endpoint (CSV `video_url` values expire, so they are not used);
- downloads the top `N` videos as `<rank>_<shortcode>.mp4` into a `downloads`
  subfolder next to the CSV, skipping files that already exist and ignoring
  per-video errors.

### Quick start

```bash
cd resources/mcps/instagram-top-videos-download
npm install

# CLI mode (manual testing)
node src/index.js <csvPath> <count>
# e.g. node src/index.js resources/videos/thiagomilk_/list.csv 10
```

See its [README](resources/mcps/instagram-top-videos-download/README.md) for
parameters, environment variables and limitations.

## Registering the MCP servers

Both servers are registered in the project's [`.mcp.json`](.mcp.json). To use
them in your own MCP client (e.g. Claude Desktop / Claude Code):

```json
{
  "mcpServers": {
    "instagram-videos": {
      "command": "node",
      "args": ["resources/mcps/instagram-videos/src/index.js"]
    },
    "instagram-top-videos-download": {
      "command": "node",
      "args": ["resources/mcps/instagram-top-videos-download/src/index.js"]
    }
  }
}
```

## Notes

- Requires **Node.js >= 18**.
- Instagram applies aggressive rate-limiting (HTTP 429) to anonymous requests;
  for consistent results, run from a residential IP and avoid many consecutive
  runs. Both MCPs tolerate failures and can be re-run to fill in the gaps.
- Private accounts and removed posts are not accessible without authentication.
- The public endpoints, `query_hash` and `doc_id` can change without notice; see
  each MCP's README for the relevant environment-variable overrides.
