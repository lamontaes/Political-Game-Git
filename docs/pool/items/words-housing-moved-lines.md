---
id: words-housing-moved-lines
title: "A household's move into a new home has journal and scene words from the English engine"
area: words
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-yucp92-bp
pr: #5708
blocked-on: words: the merger accepts edits under src/director and data/english only from the Words session; the CTO must confirm a non-Words branch or hand this to the Words line (merger comment, Oct 20)
source: added with npm run pool -- add
claimed-at: 2026-10-20T14:15:53.647Z
---

**What.** A household's move into a new home has journal and scene words from the English engine. The housing engine writes the move and the director can fire a situation from it, but no banked piece words 'we moved into a new place' for the journal or the scene. Mine and grade pieces for the move from the real home and rent records, and wire them through the English engine so the player reads who moved where and what it cost.

**Rules.** No hand-written player text: every word comes from the English engine's banks in data/english/parts/, nothing is typed into code or a screen. Ask why: each line cites the move and the home record that earns it. American English (npm run spelling). Speed: composing reads the records at the moment of the line.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 and a seed the builder did not choose (name both in the PR body), a household that moved has a journal line and a scene opener composed from banked pieces, each citing the move and home record ids, and a test beside src/director/journal.test.ts passes.

**Files.** data/english/parts/journal.json, data/english/parts/scene-words.json, src/director/journal.ts, src/director/scene.ts

**Notes.** Words and director line. Grade with the owner's bench once the pieces exist.

Sent back 2026-10-20 from PR #5178 (branch claude/political-game-pool-khi2o3): edits src/director by a session that is not the Words session; finish on that branch, merge main into it first.
