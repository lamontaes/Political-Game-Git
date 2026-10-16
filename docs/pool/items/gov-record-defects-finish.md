---
id: gov-record-defects-finish
title: "Finish #4343: three officeholder record fixes"
area: gov
kind: bug
priority: 1
status: open
claimed-by:
pr: #4480
blocked-on:
milestone:
source: "reissue item 11; PR #4343 branch gov/session-c-record-defects"
claimed-at:
---

**What.** PR #4343 fixes three officeholder record defects and only needs finishing. (a) A sitting member of Congress who wins a council seat loses the House seat, because `incompatibility.json` marks every place `multipleElectiveOffices` false and `enforceIncompatibility` acts on it; the bar must come from each place's own law in data, and the filing side must read the officeholder's situation instead of a flat penalty. (b) `BillRow.title` and the new incompatibilities table need a reader in play. (c) `bodyOf` picks the first office row starting with `us-house`, which in D.C. and the territories is the delegate row, so the body kind must come from the seat's own record. The player would notice that a member of Congress can run for town council where the law allows, every passed bill shows its title, and D.C. bodies read as what they are.

**Rules.** One rule, all 56 places: the incompatibility bar and the body kind come from data for all 56 places, with Orem, Utah only as the repro seed; An effect is a read, not a record: the title and the incompatibilities table are each read by the screen or an engine at the moment it decides or shows; Ask why: a refused filing or a lost seat records the law row that caused it; Replace, never layer: the flat penalty and the pattern-matched body are deleted in the same change; No hand-written player text: the title shown is worded by the English engine, with no hand-written label.

**Done when.** Orem, Utah seed `fed-filing-1` no longer loses the House seat when the member wins a council seat where that place's data allows it, a passed bill shows its title in play, and a D.C. body reads its own kind. In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body); name the member, bill and body record ids. Tests in `src/core2/legislature.test.ts` and the incompatibility test on the PR branch. The owner plays it: wins a council seat while holding a federal seat in a place that allows it, and keeps both.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/offices.ts, src/core2/data/offices/incompatibility.json (on the PR branch as of 2026-10-15)

**Notes.** Defects 1, 2 and 5 are good as they stand. The "bill with no title" defect (batch 11, Pine Ridge 2027-2) is fixed when this merges. (as of 2026-10-15)
Sent back 2026-10-15 from PR #4343 (branch gov/session-c-record-defects): code conflict with main in src/core2/modules/legislature.ts, scripts/dialogue-batch/coverage-batch.ts, stopgaps.json; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4480 (branch claude/gov-record-defects-finish): merging main conflicts in src/core2/data/candidacy/parameters.json, src/core2/modules/candidacy.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
