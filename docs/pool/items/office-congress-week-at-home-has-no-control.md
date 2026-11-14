---
id: office-congress-week-at-home-has-no-control
title: "Let a member of Congress choose a week at home in the district; no screen calls chooseWeek"
area: office
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: office-stops-control-the-player-cannot-switch-a-stop-off
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: "Account lead T56, Nov 14, 2026, building office-stops-control-the-player-cannot-switch-a-stop-off; the item named the week choice and the stop switches shipped without it"
checked:
claimed-at:
---

**What.** A member of Congress is in Washington on the weeks their chamber sits and at home in the district on the weeks it does not. The player cannot choose otherwise: no screen offers a week at home or a week in Washington, so the "Absent: at home in the district" line in Your office shows only on a recess week. Seen: Politics, then Your office, for a U.S. Representative (the stop switches added by office-stops-control-the-player-cannot-switch-a-stop-off have a Floor votes switch and no week choice).

**Cause.** Found in code: `chooseWeek` in src/core2/office-day-federal.ts writes the player's choice into the federal day's `weeks` table, and `whereOn` reads it; nothing in src/bench calls `chooseWeek`, and src/bench/handler.ts has no route for it.

**Fix.** Design: on Your office, for a seat of the House or Senate, a row for the coming week with the two choices (in Washington, at home in the district), worded through controls.json, calling `chooseWeek` through a new `/api/office/week` route; the choice reads through the Words lead's existing "Absent: at home in the district" line. No new table.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** No hand-written player text; labels in controls.json with the Words lead's read. A week chosen is a choice the player pressed, never one made for them. Words-bar screens at three places.

**Done when.** A second session plays a U.S. Representative in a drawn place, on main, chooses a week at home on Your office for a week their chamber sits, and Your office lists "Absent: at home in the district" for that week's floor votes. They choose Washington for the next sitting week and a floor vote holds them.

**Files.** src/bench/play.mjs, src/bench/handler.ts, src/bench/office.ts, src/bench/data/controls.json

**Notes.**
