---
id: traits-meetings-take-part-measured
title: "Who takes part at a meeting is measured by thirds of temperament and weighs it at the study's size"
area: people
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: claude/traits-wire-civic-rest
pr: #6143
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T04:07:53.589Z
---

**What.** meetings.take-part scales a resident's drive to stand up at public comment or fill a town hall's room, so the audit reported only a size and could not count who took part by thirds of lean (gap row 'size, not a choice'). Report each resident weighed for a room as taking part or not, with and without temperament, and refit the weight in played years against Mondak et al. 2010's extraversion odds (2.97 between thirds).

**Rules.** No dice: the meeting's time takes the most driven, and temperament scales the drive. Play is unchanged apart from the weight.

**Done when.** In the played election-window years of two drawn places, seeds named, the net odds of taking part between the thirds of lean are within a factor of 1.5 of 2.97 in both; the meetings trait test reads the same outcomes from its window; and the meetings.take-part gap row is removed.

**Files.** src/core2/modules/meetings.ts, src/core2/modules/meetings.traits.test.ts, src/core2/trait-test-kit.ts, src/core2/data/parameters.json

**Notes.** TODO

Sent back 2026-10-26 from PR #6143 (branch claude/traits-wire-civic-rest): Main integration conflicts in trait-decision-gaps.json, trait-effect-sizes.json, trait-calibrate.ts, trait-wiring-matrix.ts, modules/press.ts, trait-pairs.ts add/add and american-english.test.ts; resolve code/data on this branch before review. Merge aborted, no own runtime pass claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-27 from PR #6143 (branch claude/traits-wire-civic-rest): Main conflicts repaired; own isolated inherited parties.traits test FAIL on GOLDEN_PATH_SEED m3-tr1, Embden ND3824020: 35 joiners mean0.312404 vs5 nonjoiners mean0.443042, assertion151. Parent5657 still open with same failure; repair parent then merge here, preserving positive drawn-world comparison and rerun meeting proof. Own run102.26s one pass one fail, no complete gate claimed; finish on that branch, merge main into it first.
