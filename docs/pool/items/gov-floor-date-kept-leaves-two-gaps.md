---
id: gov-floor-date-kept-leaves-two-gaps
title: "A bill's kept floor date is not taken back when the leader refuses the bill, and a bill drafted between sittings still gets a sliding date"
area: gov
kind: bug
priority: 2
size: S
status: merged
claimed-by: claude/cluster11-floor-gaps
pr: #9474
blocked-on:
source: the Account lead's two questions on the floor-date fix (Nov 15), answered from the code of #9459
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** After the floor-date fix a bill's paper keeps the date the leader calendared it for, but two bills can still be told a date the floor then misses: one the chamber's leader later refuses to put on the floor, and one drafted while no legislature is sitting. The player reads the wrong date on the bill paper's "Where it is" line and floor date. Seen: on that line at any state legislature once a bill is refused or the sitting opens.

**Cause.** Found in code: `floorDateOf` in `src/core2/modules/world-legislating.ts` returns the kept `floorOn` without asking `refusedByLeader`, which `floorQueue` asks, so a refused bill keeps naming a date the floor will not take it up on. And the leader calendars a bill only in `draftBill`; a bill drafted with no sitting ahead has no `floorOn`, so once the next sitting opens its date is the projection again and slides as filings arrive, the defect the fix removed for bills drafted in session.

**Fix.** In `floorDateOf` honor a kept `floorOn` only while the leader has not refused the bill, so a refusal takes it off the calendar and a grant puts it back through `projectedFloorDate`. On the day a sitting convenes, have the one calendarer (`registerFloorCalendarer`, `projectedFloorDate`) calendar each drafted bill of its chambers that has no `floorOn`, in the order they were introduced. No second scheduler; `floorWeeks` stays the one.

**Time box.** 3 hours for one opus session.

**Rules.** No dice. One engine for every chamber and place; pinned places and fixed seeds in the test.

**Done when.** A second session, at a place and seed it did not choose, drafts a state bill between sittings and sees the date the paper names once the sitting opens be the day the floor takes it up with other filings between, and asks the leader for a hearing, is refused, and sees the paper stop naming a floor date; the drawn place, seed and bill record id are written down.

**Waits on.** gov-state-floor-never-takes-up-the-players-bill (the kept date).

**Files.** src/core2/modules/world-legislating.ts, src/core2/bill-floor-date-gaps.test.ts (new)

**Notes.** Reported by the floor-date builder before #9459 was marked ready; the sha was not moved at the Account lead's word. Pinned tests: src/core2/bill-floor-date-gaps.test.ts, one at Holiday Lakes, Texas and one at a Florida place whose legislature convenes March 4; both fail without the fix. Played in the running game: the refusal, then the sitting's opening day.
