---
id: world-waiting-list-refills-name-no-reason
title: "A room an institution refills from its waiting list is recorded as a move in with no reason"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: low
root: none
source: Account lead T28, Nov 13 (found while checking #9057)
claimed-at:
checked:
branch:
---

**What.** The people a nursing home, dormitory or barracks takes in from its waiting list count toward the town's people count on the Metrics tab, and their move records name no reason, though every in-move should. Seen: the town's people count on the Metrics tab and, in dev mode, the move records behind it.

**Cause.** Measured: src/core2/modules/counted-moves.ts, `admitToRooms`, writes each refill as `direction: "in"`, `fromPlace: "waiting-list"`, `reasons: {}`. In Clinton, Connecticut (0915420), test seed 58aef94ed20727b1:a of src/core2/counted-arrivals-by-place.test.ts, move:in:household_83bffc705ca0ecda:2025-05-01 is one such row, and the new arrivals test had to pass over waiting-list rows to check newcomers' reasons.

**Fix.** Record what the room's emptying read: the vacancy it filled (the room type and the beds held against the rooms occupied, from `rt.roomCapacity`) as the reason, in the same row; keep `fromPlace: "waiting-list"`.

**Time box.** 1 hour for one Sonnet session.

**Rules.** Ask why: every move names the record that caused it.

**Done when.** A second session plays a year in a place with group quarters drawn from all 56 and sees every waiting-list in-move name its vacancy, by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/counted-moves.ts

**Notes.** Filed by Account lead T28 on branch claude/project-thread-ojvmv1.
