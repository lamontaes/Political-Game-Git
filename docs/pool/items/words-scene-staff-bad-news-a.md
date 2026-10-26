---
id: words-scene-staff-bad-news-a
title: "A story against an officeholder or their bill brings one of their aides in, as a scene"
area: words
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The first half of words-scene-staff-bad-news, split because the player cannot hire an aide yet (play-officeholder-hires-aide). When a printed story runs against an officeholder or a bill they sponsored, one of their own serving aides brings it in as the staff-news scene: who ran it, what it is about, and the reporter. The press desk records who a printed story names and whether it runs for or against them; the director stages the scene from that record and the day stops for it, as for the person's own filing. A story for them, or one naming neither them nor their bill, stages none, and an officeholder without an aide gets no scene.

**Rules.** Ask why: the scene cites the story record, the outlet and the bill by record id, and says only what they hold. No hand-written player text: the aide's lines are bank pieces, worded by the English engine and shippable under the owner's Oct 24 rule. An effect is a read: the story record is read by the director, which stages the scene, and the scene's reply is recorded as today. No dice: whether a story runs against someone comes from its slant on record.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a printed story against an officeholder with an aide, or against a bill they sponsored, stages the staff-news scene for them with one of their serving aides bringing it, citing the outlet and the story record id, and it stops their day; a story for them or naming neither stages none; src/director/staff-bad-news.test.ts checks every such record in the run.

**Files.** src/core2/press-desk.ts, src/director/purpose-scene.ts, src/director/scheduling.ts, src/director/data/situation-types.json, src/director/data/director.json, data/english/parts/scene-talk.json, src/director/staff-bad-news.test.ts

**Notes.** TODO
