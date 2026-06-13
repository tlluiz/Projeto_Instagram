---
name: ig-analyze-storytelling
description: >-
  Analyzes STORYTELLING in an Instagram creator's Reels — narrative
  construction: arco da história, personagens e exemplos concretos, loops
  abertos e payoffs, estrutura de argumento (listas, jornadas), batidas
  emocionais, e o uso do específico vs. abstrato. Use when the user mentions
  storytelling, narrativa, "como ele conta história", "estrutura", "exemplos",
  "arco". Accepts pasted transcriptions or a folder of transcription files.
---

# ig-analyze-storytelling — narrative analysis

Analyze **how the creator constructs narrative and argument** across their
videos — the shapes they use to turn a point into something you stay for.

## How to run

1. **Load the lens.** Read `.claude/skills/ig-context/SKILL.md` first and judge
   by Instagram's yardstick (a 30s Reel is not a novel — reward structure that
   works in short form).
2. **Get the input — two ways, both supported:**
   - Text pasted directly in the prompt, or
   - A **folder path** to transcription files (the `.txt` files from the
     `video-transcription` MCP, e.g. `resources/videos/<account>/downloads/`).
3. **If a folder:** read every `*.txt` (Glob + Read) and treat them as **one
   corpus**.
4. **Analyze for PATTERNS across the corpus** — the creator's storytelling style
   in general, not a single video.
5. **Output must be practical and specific**, with **verbatim** quotes. No
   generic advice.

## What to analyze

- **Arco da história** — the shape: setup → tension → resolution; problem →
  agitation → solution; before/after; mini-journey. Which arcs recur?
- **Personagens e exemplos concretos** — does the creator use real people, named
  characters, "eu", "meu amigo", concrete scenarios — or stay abstract?
- **Loops abertos e payoffs** — narrative promises opened early and paid off
  later (distinct from retention loops: here it's the *story* debt).
- **Estrutura de argumento** — lists ("3 motivos"), step-by-step journeys,
  contrast/antithesis, myth→truth.
- **Batidas emocionais** — where it goes for surprise, indignação, humor,
  identificação, alívio. The emotional beats and their order.
- **Específico vs. abstrato** — concrete detail ("R$ 37,50", "terça-feira de
  manhã") vs. vague generality. Specificity is what makes it believable.

## Deliverable

- The creator's **go-to story templates** (named, ranked), each with a verbatim
  example and the arc broken into beats.
- How they use **characters / concrete examples**, with quotes.
- Their **specific-vs-abstract** tendency, with contrasting examples.
- A **reusable skeleton** the creator could drop a new topic into.
