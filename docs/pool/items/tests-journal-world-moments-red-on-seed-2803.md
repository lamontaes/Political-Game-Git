---
id: tests-journal-world-moments-red-on-seed-2803
title: "The journal and world-moments tests fail on main for seed 28031889"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: #6113
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** With GOLDEN_PATH_SEED=28031889fda9c4e2a7d67d921b18e16b696b5d72, three tests fail on main's code. In journal.test.ts, drawn in Juncal, Puerto Rico, the journal writes no line for a relative's death (line 300, expected a 'My <relative> died.' line), and the schoolmate test reads facts of an undefined row (line 583). In world-moments.test.ts, drawn in Oak Grove, Tennessee, one relative a move left behind, person_b2431a547ad9c079, has no moment citing the move (line 136). The same tests pass on the default seed, so a CI run that draws this seed goes red with no change of its own.

**Rules.** One rule, all 56 places: a test that draws a place must pass in every place it can draw, or skip the draw only for a reason on record. Ask why: name the record that is missing in each place, not a flake.

**Done when.** In a played world on seed 28031889fda9c4e2a7d67d921b18e16b696b5d72, journal.test.ts and world-moments.test.ts pass in Juncal, Puerto Rico and Oak Grove, Tennessee, with the cause of each failure named by record id in the PR body and a test that failed before the fix.

**Files.** src/director/journal.test.ts, src/director/world-moments.test.ts, src/director/journal.ts

**Notes.** Found by the Words session on Oct 25 while checking #6064's merge with main. Main's journal.ts fails the same three tests on this seed, so it is not that PR's.

Sent back 2026-10-25 from PR #6113 (branch words/journal-seed-2803): move test accepts unrelated same-month summary because it ignores retained counterpartIds; require specific mover/delivery evidence and actual death/school record ids promised by Done-when; finish on that branch, merge main into it first.
