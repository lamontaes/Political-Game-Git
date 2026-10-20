---
id: test-counted-weight-unplaced-draw-without-flow
title: "counted-weight-unplaced and counted-weight-macro fail on drawn places that open with no unplaced-wage flow or no workers"
area: core
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/weight-test-draws
pr: #5622
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T13:54:36.138Z
---

**What.** counted-weight-unplaced.test.ts asserts base.unplaced > 0 for any drawn place, and counted-weight-macro asserts workers grow with scale; places with no unplaced flow (Nessen City, Michigan 2656960, seed c5c8d898...; Chalan Laulau MP, seed 156730cb...) fail the same on the base branch.

**Rules.** Retry the draw until the place has the thing under test, and fail if none does (as the other tests do); no loosened tolerance.

**Done when.** Both tests pass on any drawn seed across 20 repeated runs.

**Files.** src/core2/counted-weight-unplaced.test.ts, src/core2/counted-weight-macro.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5622 (branch claude/weight-test-draws): merge conflict in counted-weight-macro.test.ts after #5626 changed the same test; finish on that branch, merge main into it first.
