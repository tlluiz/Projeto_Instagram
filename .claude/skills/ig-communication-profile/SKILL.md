---
name: ig-communication-profile
description: >-
  Synthesizes the separate ig-analyze-* analyses of an Instagram creator (hooks,
  vocabulary/tone, storytelling, retention) into one reusable "communication
  profile" — a prescriptive, self-contained Markdown file you later hand to the
  AI alongside any copy so it can rewrite that copy in the creator's voice. Use
  when the user mentions creating/generating a communication profile, perfil de
  comunicação, voice profile, style guide, consolidating/merging the analyses
  into a profile, or wants an artifact to write copy in someone's style. Accepts
  the finished analyses or raw transcriptions (it runs the analyses first).
---

# ig-communication-profile — synthesize the voice into a reusable profile

This is the **synthesis step** of the `ig-analyze-*` family. The other skills each
look at one dimension of a creator's Reels; this one merges them into a single
**communication profile** of the creator, saved as a Markdown file.

The profile is **not a report to read and forget**. It is a tool: you hand it to
the AI later — pasted into a fresh conversation — together with any copy, and the
AI rewrites that copy in the creator's voice. Two consequences follow and they
drive every decision in this skill:

- **Prescriptive, not descriptive.** Write actionable *rules* ("open with a
  callout, never a greeting"), not observations ("he tends to use callouts").
- **Self-sufficient.** It must work with **no** access to the transcriptions or
  the other skills. Everything needed to imitate the voice lives inside the file,
  anchored by verbatim quotes.

## How to run

1. **Load the lens.** Read `.claude/skills/ig-context/SKILL.md` first. The profile
   must encode a voice that works by **Instagram's** rules (fast hook, retention,
   casual BR-native speech, comment-driving close) — not formal writing.
2. **Get the input — two ways, both supported:**
   - **Finished analyses** pasted in the prompt → go straight to synthesis.
   - **Only raw transcriptions** (pasted text or a **folder path** to the `.txt`
     files from the `video-transcription` MCP, e.g.
     `resources/videos/<account>/downloads/`) → **first produce the analyses,
     then synthesize**, so the skill runs end to end on its own. Run the four
     dimensions — `ig-analyze-hooks`, `ig-analyze-vocabulary`,
     `ig-analyze-storytelling`, `ig-analyze-retention` — reading each skill and
     applying it to the corpus before merging.
3. **Treat the videos as one corpus and weight by consistency.** Consistency
   across several videos is what defines the profile: a trait that appears
   **once is an accident; what repeats is a signature.** Promote the repeated;
   demote or drop the one-off.
4. **Merge the dimensions into one voice:**
   - **Resolve overlaps** — a trait that surfaced in two analyses (e.g. a
     catchphrase that is both vocabulary and a closing CTA) is stated **once**,
     in its strongest place. No duplication across sections.
   - **Prioritize the signature** — lead with what *differentiates* this voice
     from a generic BR creator, not the traits everyone shares.
   - **Anchor everything in literal quotes** — every section carries verbatim
     lines from the corpus as calibration anchors. No anchor, no claim.
   - **Define what to avoid** — register anti-patterns, words, and rhythms that
     would break the voice (see the "avoid" list in Vocabulary & Tone).

## Output

Write a **single Markdown file**:

- Use the **filename given in the prompt** if there is one.
- Otherwise save to `communication-profile-<creator>.md` in the **current
  directory**, and **tell the user where it was saved**.

The file follows this **fixed template** — every analysis section must carry
verbatim examples as calibration anchors:

```markdown
# Communication Profile — <creator>

## 1. Voice summary
One short paragraph: who this voice is and how it sounds in a sentence. The
fastest possible calibration for someone who will read nothing else.

## 2. Voice principles
The 4–8 load-bearing rules of this voice. Each is a short imperative + its WHY.
- **<rule>.** Why: <what it buys on Instagram / what breaks without it>.

## 3. Hook / opening
How this creator opens, as a rule. The dominant hook type(s), the move, and
fill-in-the-blank templates.
- Rule: <do this on the opening line>.
- Templates: "<reusable hook with [slots]>".
- Anchors: "<verbatim opening 1>", "<verbatim opening 2>".

## 4. Vocabulary & tone
The signature lexicon and the texture of the speech.
- **Tom:** <one line>.
- **Bordões / catchphrases:** "<verbatim>", "<verbatim>".
- **Formas de tratamento & pet words:** <list, with quotes>.
- **Sentence texture:** <length, fragments, rhythm of speech>.
- **AVOID:** words, registers and constructions that break the voice
  (e.g. corporate/formal phrasing, words this creator never uses, over-polish).

## 5. Narrative structure
The story/argument shapes the creator drops a topic into.
- Go-to template(s): <named arc, broken into beats>.
- Use of concrete vs. abstract: <rule + quotes>.
- Reusable skeleton: <fill-in structure>.

## 6. Retention & rhythm
What holds attention hook → close, and the pacing.
- Retention moves in order: <devices with verbatim examples>.
- Pacing rule: <e.g. one idea per breath, short punchy lines>.
- Default close / loop / CTA: "<verbatim closing>".

## 7. Literal example bank
A reservoir of verbatim lines pulled straight from the corpus, grouped (hooks,
catchphrases, transitions, closes). Calibration fuel for the rewrite — quote
generously; this is the ground truth the AI matches its output against.

## 8. How to apply this to a copy
Step-by-step the AI follows when rewriting any copy in this voice:
1. <step>
2. <step>
...

### Compliance checklist
- [ ] Opens with a <hook type>, not a greeting/intro.
- [ ] Uses at least one bordão from §4.
- [ ] Sentence rhythm matches §6 (no long formal sentences).
- [ ] Ends on the creator's CTA/loop pattern.
- [ ] Contains none of the AVOID items from §4.
- [ ] <add creator-specific checks>
```

## Quality bar

- **Prescriptive throughout.** If a line could be rewritten as "you should…",
  do it. Observations are not the deliverable.
- **Every claim has an anchor.** No verbatim quote → the trait is unproven; cut
  it or downgrade it.
- **No overlap.** Each trait appears once, in its strongest section.
- **Signature first.** Spend the most ink on what makes *this* voice distinct.
- **Self-contained.** Re-read the file imagining you have nothing else. If a
  rule can't be applied from the file alone, it's not finished.
