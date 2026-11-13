---
id: gov-legislative-seat-has-no-serving-term-after-election
title: "After the November election, a state legislative seat sometimes has no serving term when its winner should be seated"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: wire-office-budgets-justice
source: "Account lead T1, Nov 13, 2026, while gating #8939; the failure is also on clean main"
---

**What.** In `src/core2/world-races.test.ts`, "every race this November resolves, and winners take their seats on the real dates" fails on some seeds: a state legislative seat that was elected and whose seating date has passed has no serving term. `terms.query("bySeatStatus", [seatId, "serving"])[0]` is undefined, where the race's winner party was expected. The player's own legislature would show an empty seat. Seen: the roster of a state legislature after an election, with every seat held.

**Cause.** Needs cause. Measured: on clean main 8f139fe909, `GOLDEN_PATH_SEED=c72660cec9f522959fd06ecba08f9899 npx vitest run --dir . src/core2/world-races.test.ts --maxWorkers=1 -t "every race this November"` fails with `seat:US-NY:lower:026:0: expected undefined to be 'Democratic'`, and seed 7868bf5edefd991065f6fd8a71c80f64 fails with `seat:US-DE:lower:024:0: expected undefined to be 'Democratic'`. Both fail identically on a branch with the #8939 changes. Seeds a7346d996f56a20d353b954ff0bbd9cf, 8c753d7ea910edf32ede05de52d3d3ad and 04239280fd871662bf13ca11d756962f pass on main. Earlier unlogged failures: US-NH lower 509, US-DE lower 007. Looked at: the failing assertion only; the seating step in `src/core2/modules/voting.ts` and `offices.ts` has not been read for this.

**Fix.** Not yet known. Replay the two seeds, find the first day the seat has a race winner but no term, and trace which step (the seat job scheduled by the race, or the vacancy and appointment engine) skips it.

**Rules.** One engine per mechanic (owner, Oct 27): the fix is made in the one race writer and the offices engine that already seat winners, never in a second seater beside them. No dice: who is seated comes from the race's recorded winner, never a roll.

**Done when.** In a buildBenchWorld played world, the two seeds above pass `world-races.test.ts` and name, by record id, each legislative seat's race winner and the serving term the offices engine kept for it, and 30 fresh logged seeds in a row pass the same test with no seat left without a serving term.

**Files.** src/core2/world-races.test.ts, src/core2/modules/voting.ts, src/core2/modules/offices.ts

**Notes.** Filed by hand on the #8939 branch. Evidence logs: /mnt/project-files/g1-queue/8939-runs/replay-main.log, replay-main2.log, branch-1.log, branch-2.log.
