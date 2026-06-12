# MCP `video-transcription`

[MCP](https://modelcontextprotocol.io) server that **transcribes video files to
text** using the **OpenAI API**. It extracts and compresses the audio first
(only the audio is uploaded, never the heavy video), saves a **clean
transcription** as a `.txt` next to each video, **skips** videos that were
already transcribed, and **works around the OpenAI size limit** by chunking.

## How it works

1. **Input** — transcribe a **single video file** (`transcribe_video`) or
   **every video in a folder** (`transcribe_folder`). Paths are accepted
   flexibly (absolute or relative, any folder structure).
2. **Audio extraction** — for each video the audio is extracted and compressed
   to **mono, 16 kHz, low-bitrate Opus** optimized for voice — the smallest size
   that keeps speech clear. The original (possibly large) video is never
   uploaded. This uses the **ffmpeg/ffprobe binaries bundled via npm**
   (`ffmpeg-static` / `ffprobe-static`), so **nothing has to be installed** on
   your machine — it is portable across operating systems.
3. **Transcription** — the compressed audio is sent to the OpenAI audio
   transcription API. The **API key is read from a `.env` file at the root of
   the project**; if it is missing, the MCP fails with a clear message instead
   of crashing.
4. **Size-limit workaround** — the OpenAI endpoint rejects files above its size
   cap (~25 MB). If a video's audio is too large, it is **split into time-based
   chunks** that each stay under the limit, every chunk is transcribed, and the
   pieces are **stitched back together** into one continuous transcription —
   transparently, one transcription per video.
5. **Output** — the transcription is saved as a `.txt` **next to the video**, in
   the same folder, with the **same base name** (e.g. `1_abc.mp4` →
   `1_abc.txt`). The file contains **only the clean spoken text** — no headers,
   no metadata, no timestamps.
6. **Resilience** — videos that already have a `.txt` are **skipped** (use
   `force` to re-transcribe); if one video fails it is **ignored** so the rest
   still get transcribed.

## Installation

```bash
cd resources/mcps/video-transcription
npm install
```

## Configuration

Create a `.env` file at the **root of the project** with your OpenAI key:

```dotenv
OPENAI_API_KEY=sk-...
# optional — defaults to whisper-1
OPENAI_TRANSCRIBE_MODEL=whisper-1
```

## Use as an MCP tool

Register the server in your MCP client (already added to the project's
`.mcp.json`):

```json
{
  "mcpServers": {
    "video-transcription": {
      "command": "node",
      "args": ["resources/mcps/video-transcription/src/index.js"]
    }
  }
}
```

Exposed tools:

**`transcribe_video`**

| parameter | type | description |
|---|---|---|
| `videoPath` | string (required) | path to the video file |
| `force` | boolean (optional) | re-transcribe even if a `.txt` already exists (default `false`) |

**`transcribe_folder`**

| parameter | type | description |
|---|---|---|
| `folderPath` | string (required) | folder containing the videos |
| `force` | boolean (optional) | re-transcribe even if a `.txt` already exists (default `false`) |

## Use as a CLI (for testing)

```bash
node src/index.js <videoFileOrFolder> [--force]

# single video
node src/index.js resources/videos/thiagomilk_/downloads/1_abc.mp4

# whole folder, forcing re-transcription
node src/index.js resources/videos/thiagomilk_/downloads --force
```

## Environment variables

- `OPENAI_API_KEY` — **required**. Your OpenAI API key (read from the project
  `.env`).
- `OPENAI_TRANSCRIBE_MODEL` — overrides the transcription model (default
  `whisper-1`).

## Notes

- Recognized video extensions: `.mp4 .mov .mkv .webm .avi .m4v .flv .wmv .mpeg
  .mpg .m2ts .ts .3gp`.
- Temporary audio files are written to the OS temp folder and cleaned up after
  each video.
