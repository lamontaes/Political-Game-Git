---
id: gov-m3-01-ban-blocks-the-seats-bill
title: "A bill the state bans is blocked from the seat with its reason and never reaches a vote, proven in a played world"
area: gov
kind: wiring
priority: 1
size: S
status: claimed
claimed-by: pool/gov-m3-01-ban-blocks-the-seats-bill
pr: #8251
blocked-on:
after: gov-m3-01-phase-in-by-dated-steps
lead: governing
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
source: governing lead, Nov 1 (phase B map)
checked: fable 2026-11-10
claimed-at: 2026-11-10T22:46:36.931Z
branch: pool/gov-m3-01-ban-blocks-the-seats-bill
---

**What.** M3-01 says a clear higher-level ban blocks a bill, but the player's own route is not proven: bill-paper.test.ts skips any draft that is not drafted, and the preemption case is tested only through draftBill in a small createLifeCore world (src/core2/legislature.test.ts:911-933). policy-authority.test.ts:117-180 does use buildBenchWorld and expects a blocked status with reason level-lacks-power, but it never goes through the seat. This unit extends those two tests so the ban is checked through seatView, seatAct and holdVote, the route the draft card uses.

**Cause.** Found in code: src/core2/legislature.test.ts (lines 911-933) tests the preemption ban only through draftBill in a createLifeCore world, and src/core2/policy-authority.test.ts (line 56) expects level-lacks-power without going through seatView or seatAct in src/bench/legislature.ts.

**Fix.** Extend those two tests (no new file) to draw a preempting place with buildBenchWorld and check the ban through seatView, seatAct and holdVote by bill id, printing the place and seed.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the place is drawn by data from the places whose state preempts the town (never a named state), with the place and seed printed. An effect is a read: the blocked status is checked where the seat view and the vote read it, by bill id. Replace, never layer: extend the existing tests, no new test file beside them.

**Done when.** A second session, in a buildBenchWorld place drawn from the preempting places with its seed printed, finds the seat view marking the item not allowed with its reason key, seatAct leaving the bill blocked with the rule's reason by bill id, holdVote keeping it blocked, and no vote row for that bill; the same checks pass for a power the level lacks in src/core2/policy-authority.test.ts.

**Waits on.** Nothing. (gov-m3-01-phase-in-by-dated-steps, which it followed, is done.)

**Files.** src/core2/legislature.test.ts, src/core2/policy-authority.test.ts, src/bench/legislature.ts

**Notes.** Phase B map (Nov 1, 14:18 UTC) unit 2, with the review's fix: extend the existing tests instead of adding src/bench/bill-ban.test.ts. About 1 hour.

Claimed by next for muse-8740 (Muse Spark in Muse Code, tier mid) (2026-11-10 22:46 UTC) on branch pool/gov-m3-01-ban-blocks-the-seats-bill.
