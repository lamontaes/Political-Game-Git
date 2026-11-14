---
id: gov-floor-agenda-three-votes-a-year
title: "A state senator and a U.S. Representative meet only three floor votes in a played year"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: "Account lead T51, Nov 14, 2026, measuring stops for office-stops-control-the-player-cannot-switch-a-stop-off (#9109); the lead asked for it as its own item"
checked:
claimed-at:
---

**What.** A player seated in a state legislature or in the U.S. House, with every stop at its default, is stopped for a floor vote only three times in a whole played year. A real chamber takes up hundreds of bills on its floor in a session. The player's year in office is nearly empty of votes. Seen: play as a state senator or representative; the floor-vote stop comes about three times a year.

**Cause.** Measured: one played year from Jan 20, 2025, every stop at its default, BenchPlayer day by day (/mnt/project-files/t51/stops.ts):

| Seat                            | Place, seed                                                                                              | Floor-vote stops a year | Weeks with any stop |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------- |
| State senator                   | Danville, Iowa (1918435), seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6                                      | 3                       | 10                  |
| U.S. Representative             | St. Peter, Minnesota (2758036), seed t51-walk-a                                                          | 3                       | 5                   |
| Council member (for comparison) | Heber Springs, Arkansas (0531090), seed fb9b371a2c260c1e5bd2ea80924b870a320f30742d81a7daca8fe7535f0c943d | 24 meetings             | 38                  |

The code path is not traced yet. A stop is set the evening before each bill on `floorAgendaOn` for the player's chamber (`holdForFloorVotes` in src/core2/office-day-state.ts, `eveOfVotes` in src/core2/office-day-federal.ts), so either few bills reach the floor agenda (filing, committee stage) or few reach the player's own chamber.

**Fix.** Needs cause. Trace which of these thins the agenda: bills filed per session in the world's legislatures, the committee stage, or the floor agenda. Then calibrate against real floor-vote counts per session. Real data calibrates; it never sets the count.

**Time box.** 2 hours for one Opus session at medium effort to find the cause and write the fix here.

**Rules.** One rule, all 56 places. No dice. Speed: a country's year stays under two minutes.

**Done when.** A second session plays a state legislator and a U.S. Representative in drawn places, on main, for a year. Each is stopped for a number of floor votes in line with the calibration the fix records, with the place, seed and count named.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/world-legislating.ts, src/core2/office-day-state.ts, src/core2/office-day-federal.ts

**Notes.**
