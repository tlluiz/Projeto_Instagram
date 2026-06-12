# MCP `instagram-videos`

[MCP](https://modelcontextprotocol.io) server that collects **all public
videos** from an Instagram account **without authentication**, bringing the
basic information of each video together with the **view count** and the
**like count**.

The result is saved to `resources/videos/<account>/list.csv`, ordered by
publication date — **from newest to oldest**.

## How it works

1. **Profile resolution** — queries the public web endpoint
   `users/web_profile_info` using the website's public `x-ig-app-id`, obtaining
   the account id and the first page of the timeline.
2. **Pagination** — walks the remaining pages via the public GraphQL endpoint
   (`graphql/query`), following the `end_cursor` to the end (or up to the page
   limit provided).
3. **Filtering** — keeps only video media (`is_video === true`), including
   Reels.
4. **Error tolerance** — each request has 3 attempts with backoff. If an
   access error persists during pagination, it is **ignored**: collection is
   stopped and **only what was already downloaded is stored**.
5. **Incremental persistence** — merges with the existing CSV (dedupe by
   `shortcode`), reorders from newest to oldest and rewrites the file. On
   re-runs, by default collection **stops when it reaches the first
   already-saved video** and only prepends the most recent ones to the list.

## CSV columns

| column | description |
|---|---|
| `shortcode` | post short code (unique key) |
| `id` | internal media id |
| `type` | `video` or `reel` |
| `url` | public link to the video |
| `published_at` | ISO 8601 date/time (UTC) |
| `timestamp` | epoch in seconds (used for sorting) |
| `views` | view count |
| `likes` | like count |
| `comments` | comment count |
| `caption` | caption text |
| `video_url` | URL of the video file (when available) |
| `thumbnail_url` | URL of the cover image |
| `width` / `height` | video dimensions |

## Installation

```bash
cd resources/mcps/instagram-videos
npm install
```

## Use as an MCP tool

Register the server in your MCP client (e.g. Claude Desktop / Claude Code):

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

Exposed tool: **`fetch_instagram_videos`**

| parameter | type | description |
|---|---|---|
| `username` | string (required) | Instagram account (with or without `@`) |
| `fullRefresh` | boolean (optional) | if `true`, re-walks the entire timeline instead of stopping at already-saved videos |
| `maxPages` | number (optional) | limit on the number of pages to walk |

## Use as a CLI (for testing)

```bash
node src/index.js <account> [--full] [--max-pages=N]

# examples
node src/index.js myaccount
node src/index.js myaccount --full
node src/index.js myaccount --max-pages=5
```

## Environment variables

- `IG_QUERY_HASH` — allows overriding the timeline GraphQL query hash, in case
  Instagram changes the default value.

## Important limitations

- Instagram applies **aggressive rate-limiting (HTTP 429)** to anonymous
  requests, especially from datacenter/VPN IPs or after many calls. When that
  happens, the MCP behaves as expected: it retries, then **ignores the error
  and saves what it managed to get**. For consistent results, run it from a
  residential IP and avoid many consecutive runs.
- **Private** accounts are not accessible without authentication.
- The public endpoints and the `query_hash` may change without notice; use
  `IG_QUERY_HASH` if pagination stops working.
