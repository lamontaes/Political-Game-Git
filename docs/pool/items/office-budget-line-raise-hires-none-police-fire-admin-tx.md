---
id: office-budget-line-raise-hires-none-police-fire-admin-tx
title: "A raise to the police, fire or administration line hires nobody in some towns (Texas place 4806200, seed 34a77402…)"
area: office
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5809
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On plain main, law-reach-group-a.test.ts with GOLDEN_PATH_SEED=34a774021edaa8ce218a6f469876af0ce75cc1ac5c83724bfd2c12003c9fec43 (US-TX place 4806200) fails the police, fire and administration cases of 'hires or lays off at the public employer it funds': staff before and after a doubling of the line are 1, 1 and 3, 'expected 1 to be greater than 1'. Corrections and schools pass in the same town. The staffing worker (src/core2/law-reach/group-a-staffing.ts) hires by copying a coworker's job and payroll calendar (hire() returns false when the first current staff member has no work commitment or payroll calendar, and the loop then stops at the first failure). Find which of those the police, fire and administration staff lack there and why, and make the line's raise fill the new positions.

**Rules.** An effect is a read: a raise that funds positions must produce hires or a recorded reason none could be made. One rule, all 56 places. No dice.

**Done when.** With the seed above pinned, the three cases pass with a hire named by job record id, or the staffing row records why none could be made; the unpinned test still draws places from all 56. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** src/core2/law-reach/group-a-staffing.ts,src/core2/law-reach-group-a.test.ts

**Notes.** TODO

Sent back 2026-10-26 from PR #5809 (branch claude/budget-line-hires-tx): parent #5632 merged and PR retargeted to main, but current normal integration conflicts in production src/core2/law-reach/group-a-staffing.ts and test src/core2/law-reach-group-a.test.ts; merge aborted without code resolution; preserve both current hiring/payroll readers and unfilled-reason proof, then finish on that branch and merge main first; no completed gate claimed.
