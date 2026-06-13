---
name: ig-analyze-hooks
description: >-
  Analyzes the HOOKS / openings of an Instagram creator's Reels — the first few
  seconds of each video. Classifies the type of gancho, explains why it stops
  the scroll, and maps the opening patterns the creator repeats. Use when the
  user mentions ganchos, aberturas, hooks, "como ele começa os vídeos",
  "primeiros segundos", "o que prende no início". Accepts pasted transcriptions
  or a folder of transcription files.
---

# ig-analyze-hooks — hook analysis

Analyze **only the opening** of each video (roughly the first 1–3 seconds / the
first sentence or two) across a creator's body of work, and surface the
recurring patterns they use to stop the scroll.

## How to run

1. **Load the lens.** Read `.claude/skills/ig-context/SKILL.md` first and judge
   everything by that yardstick (Instagram's rules, not formal writing).
2. **Get the input — two ways, both supported:**
   - Text pasted directly in the prompt (one transcription or several together), or
   - A **folder path** to transcription files (the `.txt` files produced by the
     `video-transcription` MCP, e.g. `resources/videos/<account>/downloads/`).
3. **If a folder:** read every transcription file (use Glob for `*.txt`, then
   Read), and treat them as **one corpus**. Isolate the opening of each video.
4. **Analyze for PATTERNS across the whole corpus** — not one isolated video.
   The goal is the creator's *opening style in general*.
5. **Output must be practical and specific**, with **verbatim** opening lines
   quoted from the transcriptions. No generic advice.

## What to analyze

- **Classify each opening by hook type.** Use (and extend) this taxonomy:
  - Pergunta / question hook
  - Afirmação ousada / contrarian or controversial claim
  - Aviso / negativity ("para de fazer isso", "ninguém te conta")
  - Lacuna de curiosidade / open loop ("o que aconteceu depois...")
  - Callout ("se você faz X, presta atenção")
  - Promessa / resultado ("em 30s você vai saber...")
  - Cold-open de história (drops you mid-story)
  - Lista / número ("3 coisas que...")
  - Confissão / relatable ("eu também fazia isso")
  - Choque / dado / estatística
  - Pattern interrupt (something visually/tonally jarring described in the words)
- For each, **explain why it stops the scroll**, tied to a mechanic from the lens.
- **Map repetition:** which opening moves the creator reuses, in what proportion.

## Deliverable

- A table: `video | opening line (verbatim) | hook type | why it works`.
- The **dominant patterns** (ranked) — the 2–4 openings this creator leans on.
- **Reusable templates** — fill-in-the-blank versions of their best hooks
  (e.g. "Se você [comportamento], você está [consequência] — e ninguém te conta").
- One or two **weak openings**, if any, and why they leak attention.
