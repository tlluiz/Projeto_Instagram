---
name: ig-analyze-vocabulary
description: >-
  Analyzes the VOCABULARY and way of speaking of an Instagram creator across
  their Reels — gírias, bordões, formas de tratamento, complexidade das frases,
  palavrões, referências culturais e expressões recorrentes. Use when the user
  mentions vocabulário, "como ele fala", "jeito de falar", bordões, gírias,
  "as expressões dele", "o vocabulário". Accepts pasted transcriptions or a
  folder of transcription files.
---

# ig-analyze-vocabulary — voice & vocabulary analysis

Analyze **how the creator talks** across their videos — the signature lexicon and
speech texture that make their voice recognizable.

## How to run

1. **Load the lens.** Read `.claude/skills/ig-context/SKILL.md` first. Judge by
   Instagram's yardstick: casual, BR-native speech is the goal — do **not**
   penalize slang, fragments or palavrões; they are usually the point.
2. **Get the input — two ways, both supported:**
   - Text pasted directly in the prompt, or
   - A **folder path** to transcription files (the `.txt` files from the
     `video-transcription` MCP, e.g. `resources/videos/<account>/downloads/`).
3. **If a folder:** read every `*.txt` (Glob + Read) and treat them as **one
   corpus**.
4. **Analyze for PATTERNS across the corpus** — the creator's general way of
   speaking, not a single video.
5. **Output must be practical and specific**, with **verbatim** quotes and, where
   useful, rough frequency ("aparece em quase todo vídeo"). No generic advice.

## What to analyze

- **Gírias** — slang and regionalisms, and how heavily they're used.
- **Bordões** — catchphrases and signature openers/closers the creator repeats.
- **Formas de tratamento** — how they address the viewer ("você", "mano",
  "gente", "cara", "galera", "ó", "tipo assim").
- **Complexidade das frases** — sentence length and structure; spoken/fragmented
  vs. full; one idea per breath?
- **Palavrões** — presence, intensity and function (emphasis, humor, intimacy).
- **Referências culturais** — memes, pop culture, brands, current events,
  in-group nods.
- **Expressões recorrentes** — pet phrases, transitions ("então", "olha só",
  "presta atenção"), intensifiers ("muito", "demais", "absurdo").

## Deliverable

- A **léxico / voice cheat sheet**: the creator's signature words and phrases,
  grouped by the categories above, each with a verbatim example.
- Their **tom de voz** in a sentence or two (e.g. "debochado, direto, fala como
  amigo no bar").
- A short **"fala como ele" guide** — the do's that would let someone write a new
  script in this creator's voice.
