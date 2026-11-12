---
id: core-group-quarters-turnover-part-1-settle-the-red-test
title: "Settle the red group-quarters test: who may arrive in a room"
area: core
kind: bug
priority: 2
size: S
status: merged
claimed-by: claude/pool-core-group-quarters-turnover-part-1-settle-the-red-test
pr: #8547
after:
blocked-on:
lead: speed
source: split from core-group-quarters-turnover in the pool redo, Nov 10, 2026
standard: 2
model: sonnet
effort: high
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:44:44.268Z
merged-at: 2026-11-12T05:04:16.708Z
---

**What.** src/core2/group-quarters.test.ts is red on main in every place it draws, 3 of 4 tests: an arriving household is housed in a group-quarters room ('college' in 0973980, 'nursing' in 3929428 and 5683040) where the test says no arrival may be. The moves engine now keeps a room capacity and a room queue, so rooms do admit arrivals, and either that admission or this test's rule is out of date. Decide which, and make the test say it.

**Cause.** Measured: `npx vitest run src/core2/group-quarters.test.ts` fails on main c00d0a7b6d, for example `move:in:household_194eae169e3d9dc1:2025-03-01: expected 'college' to be undefined` in place 0973980; the admission is `roomCapacity`/`roomQueue` in src/core2/modules/counted-moves.ts.

**Fix.** Read the room-capacity and queue code and the test's rule, decide which is right (an arriving household may enter a room only when the institution admits it on its calendar), and change the other to match. Do not weaken the test.

**Time box.** 2 hours for a Sonnet session.

**Rules.** One model, two tiers: an intake is a counted arrival through admitCountedHousehold, read by every engine with the same rule as a household, times its weight. Sliding scales and causes: an institution admits on its own calendar (a college each fall, a prison and a nursing home as residents leave), never by a monthly chance. One rule, all 56 places: each type is held at its row in data/research/group-quarters/census-2020-group-quarters.json scaled by the world's count, never by a place named in logic.

**Done when.** A second session runs src/core2/group-quarters.test.ts in three drawn places (places and seeds named), sees it pass, and sees the rule it checks stated in the test's own description, with an arriving household housed in a room only by the admission rule.

**Waits on.** Nothing.

**Files.** src/core2/group-quarters.test.ts, src/core2/modules/counted-moves.ts
