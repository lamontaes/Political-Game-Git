---
id: words-debate-opponent-scene
title: "After a debate, your opponent comes over to confront you"
area: words
kind: wiring
priority: 1
size: S
status: in-pr
claimed-by: words/debate-opponent-scene
pr: #5975
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T18:57:23.918Z
---

**What.** The rally-opponent scene, where the other candidate confronts you in public, waits on a rally record nobody writes. The meetings engine already holds real debates between the candidates in a race and records each one (debate, naming every candidate who is a full person), but no scene fires from it. This item has the director size a debate for each candidate in it, and the rally-opponent scene fire from the debate record with another candidate on that record as the opponent who comes over after it. The talk uses lines about the debate that just ended, which outrank the lines about a rally crowd exactly when the debate fact is present.

**Rules.** Wire to the world: the scene fires from the meetings engine's own debate record, read by the director, and the opponent is another candidate that record names. Ask why: the scene names the debate record as its cause. One rule, all 56 places: the test draws places from all 56 until one holds a debate between two candidates who are full people.

**Done when.** src/director/debate-opponent-scene.test.ts in the played world (buildBenchWorld), on places drawn from all 56 with a seed nobody chose, watches the candidates in the town's races and shows each debate record firing each watched candidate's rally-opponent scene, with another candidate on that record as the opponent, composed in the lines that play with the debate fact citing the record id.

**Files.** src/director/data/director.json, src/director/data/situation-types.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/debate-opponent-scene.test.ts

**Notes.** Builds on the branch of words-staff-news-bill-lost (#5965) and the chain it carries.
