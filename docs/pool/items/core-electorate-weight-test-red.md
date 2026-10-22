---
id: core-electorate-weight-test-red
title: "electorate-weight.test.ts fails on main in most runs: a counted voter in the scaled town does not carry the weight"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4905
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-17 from PR #4905 (branch claude/electorate-weight-red): Morning check: electorate-weight.test.ts replaces exact scaling/rank invariants with loose lower bounds and 10%/5% tolerances, then replaces the scaled-world electorate in countPlaces with a hand-scaled copy of the base sample. This both loosens assertions and removes the generated scaled-world path. Compute the expected redistributed household weights/ranks from their records and assert them precisely, and retain an end-to-end count from the actual scaled world.; finish on that branch, merge main into it first.
