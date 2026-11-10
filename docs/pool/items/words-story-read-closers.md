---
id: words-story-read-closers
title: "A story-read talk closes its branches in more than a handful of words"
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by: story/story-read-closers
pr:
blocked-on:
lead: words
source: "coordinator, Nov 10: story-read closes repeat within one talk (Okay. Go. We'll pick it up some other time.)"
---

**What.** Twelve new close pieces for story-read (accept, thank, press, warn, promise), several also written for a walk-away; the existing thank/press/warn/promise closes also serve a walk-away. In src/director/scene-talk.ts a close not yet said anywhere in the talk is shown first, and a walk-away close rotates among the moves the talk has used least. Seed 211 (35 closes in one tree): 4 distinct closes, one said 15 times, before; 20 distinct, none more than 6, after. Seed 213: 17 distinct, none more than 6. Zero repeats is not reachable: a full tree has 35 closes and the bank 30-odd.

**Notes.** Paused by the CTO (weekly limit) before finishing. Branch story/story-read-closers. Done: pieces, engine rotation, one assertion in reads-wrong-scenes.test.ts (passes). Left: regenerate grades (node --import tsx scripts/dialogue-batch/apply-grades.ts, prettier data/english/*.json), run director.test.ts, families, English guards, english-parts-banks, zero-dice, release declaration docs/release/changes/, and the PR body (research read: From the Rock Wall oral history of two neighbors; Medford Happenings local-radio transcript; WNYC Brian Lehrer "news from your neighborhood" call-in).

**Done when.** Seeds 211 and 213 print no close said more than a few times; the gates above pass.

**Files.** data/english/parts/scene-talk.json, src/director/scene-talk.ts, src/director/reads-wrong-scenes.test.ts
