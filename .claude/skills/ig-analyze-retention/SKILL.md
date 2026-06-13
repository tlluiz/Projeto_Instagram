---
name: ig-analyze-retention
description: >-
  Analyzes RETENTION in an Instagram creator's Reels — what keeps the viewer
  watching from start to finish: pattern interrupts, lacunas de curiosidade,
  cliffhangers, re-ganchos no meio, mudanças de ritmo, gatilhos de engajamento
  e o loop/CTA de fechamento. Use when the user mentions retenção, retention,
  "o que prende", "segura até o final", "meio do vídeo", "CTA", "fechamento".
  Accepts pasted transcriptions or a folder of transcription files.
---

# ig-analyze-retention — retention analysis

Analyze what holds attention **from the hook to the close** across a creator's
videos — everything that earns the next second after the opening.

## How to run

1. **Load the lens.** Read `.claude/skills/ig-context/SKILL.md` first and judge
   by Instagram's yardstick.
2. **Get the input — two ways, both supported:**
   - Text pasted directly in the prompt, or
   - A **folder path** to transcription files (the `.txt` files from the
     `video-transcription` MCP, e.g. `resources/videos/<account>/downloads/`).
3. **If a folder:** read every `*.txt` (Glob + Read) and treat them as **one
   corpus**.
4. **Analyze for PATTERNS across the corpus** — the creator's retention style in
   general, not a single video.
5. **Output must be practical and specific**, with **verbatim** quotes. No
   generic advice.

## What to analyze

- **Pattern interrupts** — shifts in topic, tone, pace or framing that reset
  attention. Where do they fall in the video?
- **Lacunas de curiosidade / open loops** — promises of info withheld until
  later ("já já eu te mostro", "mas tem um detalhe").
- **Cliffhangers** — suspended moments that force the viewer to stay.
- **Re-ganchos no meio** — second/third hooks dropped mid-video to recapture
  drifting attention.
- **Mudança de ritmo** — sentence-length and energy changes; fast/slow beats.
- **Gatilhos de engajamento** — comment bait, "salva esse", "marca alguém",
  polêmica, perguntas diretas.
- **Loop / CTA de fechamento** — how the ending lands: does it loop back to the
  opening (seamless rewatch)? What is the closing call to action?

## Deliverable

- A **retention map** of the creator's typical video: hook → devices in order →
  close, with verbatim examples for each device.
- The **recurring retention moves** they rely on (ranked), each tied to a
  mechanic from the lens.
- Their **pacing rhythm** (e.g. short punchy sentences, one idea per breath).
- Their **default closing/loop + CTA** pattern, quoted.
- **Leak points** — places where attention likely drops, and why.
