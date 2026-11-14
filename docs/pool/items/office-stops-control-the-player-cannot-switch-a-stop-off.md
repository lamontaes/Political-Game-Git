---
id: office-stops-control-the-player-cannot-switch-a-stop-off
title: "Give a seated player a control to switch each stop off and on; today no screen can, so the absent path is unreachable"
area: office
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: Account lead T56 (claude-sonnet-5-5)
pr:
after: office-vote-cast-for-a-member-the-meeting-did-not-hold
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: "Account lead T51, Nov 14, 2026, building office-vote-cast-for-a-member-the-meeting-did-not-hold (#9109); the lead asked for it filed with measured stop counts"
checked:
claimed-at: 2026-11-14
---

**What.** The owner's card of Nov 14, 2026, 02:03Z ("Stop me at every vote") made every meeting, floor vote and desk stop on by default. The player switches a stop off to be absent from that kind of vote and to leave desk bills waiting. No screen lets a player switch any stop, so every seated player is stopped at everything, and the "Absent: you did not attend" line in Your office never appears in play. Seen: Politics, then Your office (no stops section); `setStops` is reached only from tests.

**Cause.** Found in code: the stop buttons on the seat screen were removed in 06030c4fe8 ("Office day on the play page: the meeting and the desk are scenes; the seat screen's buttons are gone"). `setStops` and `stopsOf` in src/core2/modules/office-day.ts still exist, but nothing in src/bench calls `setStops`, and src/bench/handler.ts has no route for it. `chooseWeek` in src/core2/office-day-federal.ts (a member of Congress spending a week at home) has no route or control either.

**Measured.** Every stop at its default, the player leaving each office stop to "Decide for me", one played year from Jan 20, 2025 (/mnt/project-files/t51/stops.ts, copied into the checkout and run with `node --import tsx`, BenchPlayer day by day):

| Seat                | Place, seed                                                                                              | Office stops a year                     | Weeks with any stop | Most stops in one week | Director moments in the same year |
| ------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------- | ---------------------- | --------------------------------- |
| Council member      | Heber Springs, Arkansas (0531090), seed fb9b371a2c260c1e5bd2ea80924b870a320f30742d81a7daca8fe7535f0c943d | 24 meetings (about one every two weeks) | 38                  | 7                      | 71                                |
| State senator       | Danville, Iowa (1918435), seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6                                      | 3 state floor votes                     | 10                  | 3                      | 12                                |
| U.S. Representative | St. Peter, Minnesota (2758036), seed t51-walk-a                                                          | 3 federal floor votes                   | 5                   | 2                      | 4                                 |

A council seat carries most of the weight: a meeting every two weeks, each one a stop. The state and federal seats stop for few floor votes in a year. Whether that is too few is a separate question, for the legislature's floor agenda.

**Fix.** Design: a stops control on Your office, one switch per registered stop kind (`stopKinds()`), each worded through controls.json and calling `setStops` through a new `/api/office/stops` route. It shows the kinds that apply to the player's seat (meeting kinds for a local seat, floor-vote for a legislator, desk for an executive). For a member of Congress, add the week choice: at home in the district, or in Washington.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** No hand-written player text in code; the labels go through controls.json with the Words lead's read. Words-bar screens at three places.

**Done when.** A second session plays a council member in a drawn place, on main, switches "every meeting" off on Your office, and the next meeting passes without stopping them. Your office then lists "Absent: you did not attend" for that meeting's items. They switch it back on, and the meeting after stops them again.

**Waits on.** office-vote-cast-for-a-member-the-meeting-did-not-hold reaching the train (#9109).

**Files.** src/bench/play.mjs, src/bench/handler.ts, src/bench/office.ts, src/bench/data/controls.json

**Notes.**
Built by Account lead T56 on claude/project-thread-srmz44 (PR onto the train). Council, state and federal switches shipped; the member-of-Congress week choice split out as office-congress-week-at-home-has-no-control.
