---
id: words-batch-2-reach
title: "Batch 2: about 200 lines chosen so the owner's grades reach the whole game"
area: words
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: story/batch-2
pr: "#7997"
blocked-on:
lead: words
milestone: play-first
source: "owner, Nov 9, 12:30 to 12:55 a.m., through the CTO's Story brief"
claimed-at: 2026-11-09T07:30:00.000Z
---

**What.** The owner, Nov 9, 12:30 a.m.: a big batch whose grades affect a ton of the game. He grades by voice and wants one batch to touch every line. Batch 2 is chosen from every kind of scene, every register and many voices so a grade on its lines reaches as many lines as it can, three lines to a moment, each with the spans he can grade part of.

**Rules.** No hand-written player text: the batch only shows bank lines already in the game, and his grades on this batch reach every bank at once. Serves `civic-reports`: each moment is one plain sentence naming who speaks and what they are like.

**Done when.** docs/coordination/batches/2026-11-09-batch-2.md and its .json are on main; each line names its moment, speaker and traits, scene kind, register, spans with features, and how many lines a grade on it reaches; a test checks every span's offsets against the line's text and that the batch reaches at least 95% of all lines.

**Time box.** 3 hours. If not done, push what exists, open the PR and write the handoff.

**You will see.** A batch of about 200 lines to grade by voice or on the grading page.

**Screenshot.** Not a screen; the coverage numbers in the PR body.

**Files.** docs/coordination/batches/, scripts/dialogue-batch/batch-two.ts
