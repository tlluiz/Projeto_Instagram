# MCP `instagram-top-videos-download`

[MCP](https://modelcontextprotocol.io) server that reads a CSV with an Instagram
account's videos (the output of the [`instagram-videos`](../instagram-videos)
MCP), ranks the videos by **likes** and **downloads the most-liked ones** —
**without authentication** (no login, cookies or tokens).

## How it works

1. **Read the CSV** — the CSV path is accepted flexibly (absolute or relative,
   any folder structure). The **account** is derived from the name of the folder
   that contains the CSV.
2. **Rank by likes** — videos are ordered by the `likes` column, from most to
   least liked (the view count is ignored). A missing/empty `likes` value counts
   as `0`.
3. **Select** — the top `count` videos are selected, most liked first. If
   `count` is larger than the number of videos in the CSV, all of them are used.
4. **Resolve the .mp4 URL** — the video URL is **not** taken from the CSV (those
   `video_url` values expire). For each video it is resolved fresh from the
   `shortcode` via the public web GraphQL endpoint:
   - `GET https://www.instagram.com/graphql/query`
     with `doc_id=10015901848480474` and
     `variables={"shortcode":"<shortcode>"}` (URL-encoded),
   - browser-like headers including `x-ig-app-id: 936619743392459`,
   - reading `data.xdt_shortcode_media.video_url`.
5. **Download** — each file is streamed to disk as `<rank>_<shortcode>.mp4`
   (most liked = `1`) into a **`downloads`** subfolder next to the CSV
   (e.g. `resources/videos/<account>/downloads/`).
6. **Resilience** — files that already exist are **skipped**; any resolve or
   download error for a single video is **ignored** so the remaining videos
   still download.

## Installation

```bash
cd resources/mcps/instagram-top-videos-download
npm install
```

## Use as an MCP tool

Register the server in your MCP client (already added to the project's
`.mcp.json`):

```json
{
  "mcpServers": {
    "instagram-top-videos-download": {
      "command": "node",
      "args": ["resources/mcps/instagram-top-videos-download/src/index.js"]
    }
  }
}
```

Exposed tool: **`download_top_videos`**

| parameter | type | description |
|---|---|---|
| `csvPath` | string (required) | path to the CSV produced by `instagram-videos` |
| `count` | number (required) | how many of the most-liked videos to download |

## Use as a CLI (for testing)

```bash
node src/index.js <csvPath> <count>

# example
node src/index.js resources/videos/thiagomilk_/list.csv 10
```

## Environment variables

- `IG_DOC_ID` — overrides the GraphQL persisted-query `doc_id` (default
  `10015901848480474`), in case Instagram rotates it.

## Important limitations

- Instagram applies **aggressive rate-limiting (HTTP 429)** to anonymous
  requests; downloads of many videos may be throttled. Individual failures are
  ignored, so re-running later will fill in the gaps (already-downloaded files
  are skipped).
- **Private** accounts and removed posts are not accessible without
  authentication.
- The public endpoint and the `doc_id` may change without notice; use
  `IG_DOC_ID` if resolution stops working.
