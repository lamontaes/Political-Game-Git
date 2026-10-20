---
id: laws-graduated-tax-repeal-guam
title: "Repealing a graduated income tax in Inarajan, Guam leaves its people-reach rows open (law-reach-group-b.test fails on main)"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/n2-laws-graduated-tax-repeal-guam
pr: #5684
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T15:28:36.378Z
---

**What.** On main, law-reach-group-b.test.ts fails its graduated income tax case with GOLDEN_PATH_SEED 741e1fe731e2aef3a39de315f1d07c4368754d2d0409b3bbeacc39f43896b2b6 and GOLDEN_PATH_PLACE_KEY territory:GU:inarajan: after the repeal, the people-reach rows for us-policy-positions:fiscal.graduated-income-tax are still open (endedOn null) instead of ended. The town's governments are federal and state only. Find why the repeal does not end the rows there and fix it at the root.

**Rules.** One rule, all 56 places: the repeal ends the rows in every place, with no territory named in logic. Replace, never layer: fix the ending path, add no second one. An effect is a read: the rows must end with the law that wrote them.

**Done when.** The graduated income tax case in law-reach-group-b.test.ts passes for GOLDEN_PATH_SEED 741e1fe731e2aef3a39de315f1d07c4368754d2d0409b3bbeacc39f43896b2b6 and GOLDEN_PATH_PLACE_KEY territory:GU:inarajan, and for two other drawn places, with the open people rows empty after the repeal.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach-group-b.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5462 (branch claude/graduated-tax-guam): superseded by main's commit aebe5d9e3a for the same law-reach-group-b assertion; the branch conflicts in law-reach-group-b.test.ts; check whether anything is left beyond main's fix; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5684 (branch claude/graduated-tax-repeal-guam): merging main conflicts in src/core2/law-reach-group-b.test.ts (main changed it in #5694); finish on that branch, merge main into it first.
