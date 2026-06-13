# Projeto_Instagram

A small project built around three **MCP servers** plus a set of **Claude Code
skills** that work with the public videos of an Instagram account — **without
authentication** (no login, cookies or tokens). Together they form a simple
pipeline:

1. **`instagram-videos`** — collects all public videos of an account (basic info
   + view and like counts) and saves them to a CSV.
2. **`instagram-top-videos-download`** — reads that CSV, ranks the videos by
   likes and downloads the most-liked ones as `.mp4` files.
3. **`video-transcription`** — transcribes the downloaded videos to text with
   the OpenAI API, saving a clean `.txt` next to each video.
4. **Analysis skills** — read those transcriptions and break down *how* the
   creator communicates (hooks, retention, storytelling, vocabulary).
5. **Synthesis skill** — merges those analyses into one reusable **communication
   profile** of the creator, ready to rewrite any copy in their voice.

See [`resources/docs/pipeline.excalidraw`](resources/docs/pipeline.excalidraw)
for a diagram of the full pipeline (open it with the Excalidraw editor).

## What's here

| Path | Description |
|---|---|
| `resources/mcps/instagram-videos/` | MCP that collects an account's videos into a CSV. See its [README](resources/mcps/instagram-videos/README.md). |
| `resources/mcps/instagram-top-videos-download/` | MCP that downloads the top-liked videos from that CSV. See its [README](resources/mcps/instagram-top-videos-download/README.md). |
| `resources/mcps/video-transcription/` | MCP that transcribes the downloaded videos to text via the OpenAI API. See its [README](resources/mcps/video-transcription/README.md). |
| `.claude/skills/` | Claude Code skills that analyze the transcriptions (`ig-context` + four `ig-analyze-*` skills) and synthesize them into a profile (`ig-communication-profile`). |
| `resources/prompts/` | The task prompts that defined each MCP and the skills. |
| `resources/docs/` | Excalidraw diagrams, including [`pipeline.excalidraw`](resources/docs/pipeline.excalidraw) — the full pipeline end to end. |
| `resources/videos/<account>/list.csv` | Per-account video list produced by the first MCP (git-ignored). |
| `resources/videos/<account>/downloads/` | Downloaded `.mp4` files (and their `.txt` transcriptions) produced by the second and third MCPs (git-ignored). |

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

## 3. The `video-transcription` MCP

Exposes two tools, **`transcribe_video`** (one file) and **`transcribe_folder`**
(every video in a folder), which:

- extract and compress each video's audio to mono/16 kHz/low-bitrate Opus using
  a **bundled ffmpeg** (`ffmpeg-static` — nothing to install, cross-OS), so only
  the audio is uploaded, never the heavy video;
- transcribe it with the **OpenAI API** (key read from a `.env` at the project
  root; fails with a clear message if it is missing);
- work around the OpenAI size cap (~25 MB) by **splitting large audio into
  chunks** and stitching the pieces back into one transcription;
- save the clean text as `<video-basename>.txt` next to the video, **skip**
  videos that already have a `.txt` (unless `force` is set), and **ignore**
  per-video errors so the rest still get transcribed.

### Quick start

```bash
cd resources/mcps/video-transcription
npm install

# create a .env at the project root with your key (see .env.example)
#   OPENAI_API_KEY=sk-...

# CLI mode (manual testing) — single video or whole folder
node src/index.js <videoFileOrFolder> [--force]
# e.g. node src/index.js resources/videos/thiagomilk_/downloads --force
```

See its [README](resources/mcps/video-transcription/README.md) for parameters,
environment variables and limitations.

## 4. The analysis skills

Once the videos are transcribed, a set of **Claude Code skills** (in
[`.claude/skills/`](.claude/skills)) analyzes *how a creator communicates*. Point
a skill at a folder of transcriptions (the `.txt` files from the
`video-transcription` MCP) or paste them directly, and it merges everything into
one corpus and surfaces the creator's **recurring patterns** — with verbatim
examples, not generic advice.

| Skill | What it analyzes |
|---|---|
| **`ig-context`** | The shared **lens**: how Reels virality actually works (hooks, retention, lo-fi tone, comment triggers, loops, BR internet culture). Each analysis skill reads it first; it does not analyze on its own. |
| **`ig-analyze-hooks`** | The **openings** — hook types, why each stops the scroll, the opening templates the creator reuses. |
| **`ig-analyze-retention`** | What **keeps you watching** — pattern interrupts, curiosity gaps, cliffhangers, mid-video re-hooks, pacing, closing loop/CTA. |
| **`ig-analyze-storytelling`** | The **narrative** — story arcs, characters and concrete examples, open loops and payoffs, argument structure, emotional beats. |
| **`ig-analyze-vocabulary`** | The **way of speaking** — slang, catchphrases, forms of address, sentence complexity, swear words, cultural references. |

The four `ig-analyze-*` skills are **independent** (run one at a time or all
together) and each reads `ig-context` as its lens before analyzing. They are
invoked from a Claude Code session by name (e.g. "analyze the hooks in
`resources/videos/<account>/downloads`").

## 5. The synthesis skill

Once the dimensions are analyzed, **`ig-communication-profile`** merges them into
a single, reusable **communication profile** of the creator, saved as a Markdown
file.

| Skill | What it produces |
|---|---|
| **`ig-communication-profile`** | A prescriptive, self-contained **voice profile** — voice principles, hook, vocabulary/tone (with an "avoid" list), narrative structure, retention/rhythm, a bank of literal examples, and a step-by-step + checklist for applying the voice. Anchored throughout in verbatim quotes. |

Unlike the analysis skills, this one is **not a report to read and forget**: you
hand the file to the AI later — even pasted into a fresh conversation — together
with any copy, and it rewrites that copy in the creator's voice. It accepts the
**finished analyses** (straight to synthesis) or just the **raw transcriptions**
(it runs the four `ig-analyze-*` skills first, then synthesizes), so it works end
to end on its own. By default it saves to `communication-profile-<creator>.md` in
the current directory.

## Registering the MCP servers

All three servers are registered in the project's [`.mcp.json`](.mcp.json). To
use them in your own MCP client (e.g. Claude Desktop / Claude Code):

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
    },
    "video-transcription": {
      "command": "node",
      "args": ["resources/mcps/video-transcription/src/index.js"]
    }
  }
}
```

## Notes

- Requires **Node.js >= 18**.
- The `video-transcription` MCP needs an **`OPENAI_API_KEY`** in a `.env` at the
  project root (see [`.env.example`](.env.example)).
- Instagram applies aggressive rate-limiting (HTTP 429) to anonymous requests;
  for consistent results, run from a residential IP and avoid many consecutive
  runs. Both MCPs tolerate failures and can be re-run to fill in the gaps.
- Private accounts and removed posts are not accessible without authentication.
- The public endpoints, `query_hash` and `doc_id` can change without notice; see
  each MCP's README for the relevant environment-variable overrides.
