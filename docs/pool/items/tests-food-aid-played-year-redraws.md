---
id: tests-food-aid-played-year-redraws
title: "The food-aid played-year test redraws until SNAP is in force instead of returning early"
area: laws
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/food-aid-redraw
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T11:39:25.221Z
---

**What.** src/core2/law-reach/group-b-food-aid.test.ts 'pays qualifying households from the federal treasury' returns early, asserting only that nothing is paid, when the drawn place has no SNAP law (a territory on a block grant). In such a draw the payment path is never checked. A merger sent #5443 back for it; that PR's code reached main through the law-wiring-health-schools branch (merge e1e06a334c), early return included.

**Rules.** TODO

**Done when.** The test draws places from all 56 with a bounded number of redraws until one has SNAP in force, asserts the payments there, fails when the redraws run out, and names each drawn place and seed; the no-SNAP case keeps its own assertion that nothing is owed.

**Files.** src/core2/law-reach/group-b-food-aid.test.ts

**Notes.** TODO
