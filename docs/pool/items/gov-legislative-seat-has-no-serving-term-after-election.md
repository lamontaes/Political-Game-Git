---
id: gov-legislative-seat-has-no-serving-term-after-election
title: "After the November election, a state legislative seat sometimes has no serving term when its winner should be seated"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
model: opus
effort: medium
root: none
lead: wire-office-budgets-justice
source: "Account lead T1, Nov 13, 2026, while gating #8939; the failure is also on clean main"
---

**What.** In `src/core2/world-races.test.ts`, "every race this November resolves, and winners take their seats on the real dates" fails on some seeds: a state legislative seat that was elected and whose seating date has passed has no serving term. `terms.query("bySeatStatus", [seatId, "serving"])[0]` is undefined, where the race's winner party was expected. The player's own legislature would show an empty seat. Seen: the roster of a state legislature after an election, with every seat held.

**Cause.** Measured: seed c72660cec9f522959fd06ecba08f9899 on the train at 32a994212b, the test's own world (town 3665739 in New York). Kathy Hawkins (`official:term:seat:US-NY:lower:013:0:2026-10-20`) holds Assembly district 13. In November 2026 she is the officials engine's candidate for the U.S. House seat `seat:US-NY:us-house:19` and wins it, and the same night her party holds district 13. `seatRaceWinner` (src/core2/modules/voting.ts) reads "the sitting holder's party won" as "the sitting holder was re-elected" (`reelected`), so it seats her again on January 1, 2027. On January 3 she is sworn into the House, `enforceIncompatibility` (src/core2/modules/offices.ts) ends her two-day-old Assembly term as "accepted incompatible office", and district 13 has no serving term. One of 6,249 legislative races at this seed. `officialCandidate` (src/core2/modules/officials.ts) records the seat a candidate runs from on its row (`fromSeatId`), and `seatRaceWinner` never reads it: nothing tells the legislative race that its holder is on another ballot that day. The item's earlier seats (NY lower 026, DE lower 024 and 007, NH lower 509) were measured on main; they were not replayed here.

**Fix.** A holder who runs for another seat that day is not standing for their own.

1. In src/core2/modules/officials.ts, one exported reader says whether a person is that election's candidate for a different seat (a `candidates` row for the year with their person id and another `seatId`).
2. `seatRaceWinner` sets `reelected` only when the sitting holder is not such a candidate. Otherwise the seat is won by the winning party's named candidate, or by a newcomer drawn as for any open seat, and the player's legislature shows a new member in the seat, never an empty one.
3. The race's count gives a seat's holder an incumbency reason (`electorateReasons`). Read whether the same holder gets it in a race they are not in, and say in the pull request what was found.
4. The test is pinned to this seed and one more that held the fault before the fix (skill pinned-tests).

**Time box.** 3 hours.

**Rules.** One engine per mechanic (owner, Oct 27): the fix is made in the one race writer and the offices engine that already seat winners, never in a second seater beside them. No dice: who is seated comes from the race's recorded winner, never a roll.

**Done when.** A second session, in the running game at a place it draws and writes down with its seed, plays past the January after a November election and opens Politics for its state legislature: every seat has a member. `world-races.test.ts` passes at seed c72660cec9f522959fd06ecba08f9899, where district 13's winner is a person other than the new member of Congress, by term id, and fails there with the new check taken out.

**Waits on.** Nothing.

**Files.** src/core2/world-races.test.ts, src/core2/modules/voting.ts (`seatRaceWinner`), src/core2/modules/officials.ts (`officialCandidate`), src/core2/modules/offices.ts (`enforceIncompatibility`, read only)

**Notes.** Filed by hand on the #8939 branch. Evidence logs: /mnt/project-files/g1-queue/8939-runs/replay-main.log, replay-main2.log, branch-1.log, branch-2.log. Cause found by Fable B, Nov 15, 2026, with a probe that replays the test's world and prints the seat's terms and the holder's other terms.
