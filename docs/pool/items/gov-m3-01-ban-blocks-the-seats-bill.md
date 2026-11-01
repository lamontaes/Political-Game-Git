---
id: gov-m3-01-ban-blocks-the-seats-bill
title: "A bill the state bans is blocked from the seat with its reason and never reaches a vote, proven in a played world"
area: gov
kind: wiring
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
after: gov-m3-01-phase-in-by-dated-steps
source: added with npm run pool -- add
---

**What.** M3-01 says a clear higher-level ban blocks a bill, but the player's own route is not proven: bill-paper.test.ts skips any draft that is not drafted, and the preemption case is tested only through draftBill in a small createLifeCore world (src/core2/legislature.test.ts:911-933). policy-authority.test.ts:117-180 does use buildBenchWorld and expects a blocked status with reason level-lacks-power, but it never goes through the seat. This unit extends those two tests so the ban is checked through seatView, seatAct and holdVote, the route the draft card uses.

**Rules.** One rule, all 56 places: the place is drawn by data from the places whose state preempts the town (never a named state), with the place and seed printed. An effect is a read: the blocked status is checked where the seat view and the vote read it, by bill id. Replace, never layer: extend the existing tests, no new test file beside them.

**Done when.** In a buildBenchWorld place drawn from the preempting places with its seed printed, the seat view marks the item not allowed with its reason key, seatAct leaves the bill blocked with the rule's reason by bill id, holdVote keeps it blocked, and no vote row for that bill exists; the same checks pass for a power the level lacks in policy-authority.test.ts.

**Files.** src/core2/legislature.test.ts, src/core2/policy-authority.test.ts, src/bench/legislature.ts

**Notes.** Phase B map (Nov 1, 14:18 UTC) unit 2, with the review's fix: extend the existing tests instead of adding src/bench/bill-ban.test.ts. About 1 hour.
