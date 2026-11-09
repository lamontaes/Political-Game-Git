---
id: words-batch-4
title: "Batch 4: twenty scenes played from the game as dialogue trees, numbered for voice grading"
area: words
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: story/batch-4
pr: 8071
blocked-on:
lead: words
milestone: play-first
source: 'owner, Nov 9, about 12:50 p.m.: "maybe it should give me scenes instead of just snippets of conversations ... I get the narrator and then the dialogue, and then I get 4 options and they tell me what they''re testing"; about 1:20 p.m.: "go in dev mode and actually trigger these scenes ... and give me ... the dialogue trees"'
claimed-at: 2026-11-09T18:10:00.000Z
---

**What.** Batch 4 is playable scenes, not snippets: each scene opens with the narrator naming when, where and who, then the people talking, and at each choice the options, each labeled with what it tests (the move, the tone, the personality). Every scene is played in a world drawn from all 56 places by the game's own functions and walked at every choice, so each line is exactly what the game shows with its placeholders filled.

**Rules.** No hand-written player text: every line is a bank piece the game said in play, cited by key. Sliding scales and causes: his grades on these lines land on the grade map by key, moving weights rather than banning lines.

**Done when.** docs/coordination/batches/2026-11-09-batch-4.json (a tree of scenes, nodes and choices) and .md are on main; scripts/dialogue-batch/batch-four.test.ts checks the shape, the numbering and that every key is a bank piece; the .md lists the scenes that could not be triggered and the lines that read wrong once filled.

**Time box.** 3 hours.

**You will see.** Twenty scenes you can click through, mixed kinds, each line numbered so you can grade it by voice.

**Screenshot.** Not a screen; the CTO's batch page built from the JSON.
