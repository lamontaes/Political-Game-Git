---
id: gov-decision-to-run-off-ballot-huntington
title: "In Huntington, Utah a resident who decided to run never reached the ballot, and a council race went empty (M0-13 red on main)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
lead: governing
standard: 2
model: opus
effort: high
root: rc2-done-from-records
checked: fable 2026-11-10
---

**What.** A resident who decided to run never reaches the ballot, and a council race goes empty (golden-path M0-13 red on main by seed). The check "a named challenger runs" reads "1 adults other than the incumbent chose to run in the 4 races decided, and none was on the ballot" and "every race has someone on the ballot" reads 1 of 4 races empty. First seen in Huntington, Utah (place key 4936950, seed ca75d1e89cfcf56ed5c202205d4d2f7c1eefffc04d87f324dc5ed818233ab4c7), which passed again on Oct 26, and red on Nov 10 in Marlborough, New Hampshire, Southbridge Town, Massachusetts and Leominster, Massachusetts (key 2535075, seed 3f8277b54c6ccfe94f69e44a36bb3051241d13da2dc90faba045807fbb26ad6d). The primary-loss case is already counted, so this decision to run did not reach a filing at all, or its filing never reached the ballot.

**Cause.** Needs cause. Looked at: the replay, `GOLDEN_PATH_SEED=3f8277b54c6ccfe94f69e44a36bb3051241d13da2dc90faba045807fbb26ad6d GOLDEN_PATH_PLACE_KEY=2535075 node --max-old-space-size=6000 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` (Leominster, Massachusetts; about four minutes) fails "a named challenger runs", the only failing check of 22 (clean main caf1b49afc, Nov 10). Not yet known: at which stage a resident's decision to run stops before the ballot (the decision, the filing, or the ballot row).

**Fix.** None until the cause is found.

**Time box.** 6 hours for one opus session.

**Rules.** Never weaken a test: the check keeps failing when a decision to run never reaches a filing. Ask why: name the person's candidacy decision row, their filing record or its absence, and the race, from the records of that played year. No dice. One rule, all 56 places.

**Done when.** A second session replays the Leominster, Massachusetts world (seed above) and sees the decision to run followed by record id to its filing and the ballot (or the reason it stops named and fixed), M0-13 passing on that seed, on Huntington, Utah (seed ca75d1e8...) and on two fresh drawn places named in the PR, and no test weakened.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, tests/golden-path/played-world.node-test.ts

**Notes.** Filed Oct 25 by the effects lead: it turned PR 5915's golden-path-year red, and clean main fails identically on the same seed.

- Laws lead, Oct 25: reproduced on main 929ab16c42 in Perrysville, Indiana (place key 1859238, seed f0390569196f1442db81ee832aa105840f6bd916977c1addc22e1ae233d30c9c, the M0-13 draw for #5986's head fe40e0d021): "1 adults other than the incumbent chose to run in the 4 races decided, and none was on the ballot". The same check fails identically on #5986's head.

- Effects lead, Oct 25: also on main b3ab4d7c92 in Hobart Bay, Alaska (place key 0232550, seed bebe23902e7036383abd127d1f9d751625c9221287ce086f6d28c30192930ab8, the M0-13 draw for #6008's head 2e243b7e6b): "1 adults other than the incumbent chose to run in the 7 races decided, and none was on the ballot". It turned #6008's golden-path-year red; that PR changes only the matrix script's grading.

No longer reproduces on main (Claude worker, Oct 26, main at the time of this note). `node --max-old-space-size=6000 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` with `GOLDEN_PATH_SEED=ca75d1e89cfcf56ed5c202205d4d2f7c1eefffc04d87f324dc5ed818233ab4c7 GOLDEN_PATH_PLACE_KEY=4936950` (Huntington, Utah): 22 passed, 0 failed; "a named challenger runs: 1 named challengers in 4 races" and "every race has someone on the ballot: all 4 races had someone on the ballot". Fresh seeds: huntx1 (Enigma, Georgia 1327596): 21 passed, 0 failed, all 4 races with someone on the ballot; huntx2 (Brookings, South Dakota 4607580): 22 passed, 0 failed, 1 named challenger in 3 races. No commit I could find since the item was filed touches `candidacy.ts` for this; the cause was not traced because the failure is gone. Left open for the CTO or a merger to close as done-by-main; no code change was needed.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (done by main).

Nov 10, 2026 (CTO): still red on main by seed, in two more places. Marlborough, New Hampshire, seed ed2423c144c5caa4807feaaeca88165269abd7ee7c8f5f04ede6f4c4d787e91e (golden-path-year on PR 8093): "1 adults other than the incumbent chose to run in the 3 races decided, and none was on the ballot." Southbridge Town, Massachusetts, seed 280a66c516af44fb94ee80c6a589aef6c7b15961a9799fde169b46a7f6b06d67 (golden-path-year on PR 8125): the same, in 4 races. Neither PR touched candidacy or filing.

**Notes (Fable, Nov 10).** Again on clean main at caf1b49afc in Leominster, Massachusetts (key 2535075, seed 3f8277b54c6ccfe94f69e44a36bb3051241d13da2dc90faba045807fbb26ad6d): "a named challenger runs: 1 adults other than the incumbent chose to run in the 4 races decided, and none was on the ballot", the only failing check of 22. Drawn by the year-long golden path on pull request 8114, which does not touch candidacy. Replay: `GOLDEN_PATH_SEED=<seed> GOLDEN_PATH_PLACE_KEY=2535075 node --max-old-space-size=6000 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` (about four minutes).

**Notes (Fable, Nov 10, a fourth place).** The played-world year (M0-13) fails the same check on clean main at c8273e2e6e in Staples, Connecticut (place key 0973175, world seed 200d85d767c28088c1d1d562f2f9d08e1dd56837345373ec5786c4a3492e3870): "a named challenger runs" is the one check of 22 that fails. It turned pull request 8152 red, which changes no game code. Replay: GOLDEN_PATH_SEED=<that seed> GOLDEN_PATH_PLACE_KEY=0973175 node --expose-gc --import tsx --test tests/golden-path/played-world.node-test.ts.

**Notes (Fable's check, Nov 10).** How to find the cause: Follow one decision to run by record id to its filing and ballot in that world, and fix at the stage where it stops, in `src/core2/modules/candidacy.ts` or the filing step it hands to, without weakening the test. The St. Johnsbury red (play-golden-path-m0-13-red-st-johnsbury-part-3-races-and-ballots) shows the same symptom and waits on this.

**Notes (Fable, Nov 10, a fifth place, and the quickest replay).** The same check fails on clean main at 626f86f4bf in Mashantucket, Connecticut (place key 0945995, world seed 7a0e449feba29bda0d3d54d316d649976ee7b892f35bcb55ce8adf0a619a44c7): "a named challenger runs: 1 adults other than the incumbent chose to run in the 3 races decided, and none was on the ballot", the one failing check of 21. It turned pull request 8176 red, which changes one test file. This world builds in 5 seconds and plays its year in 22, so it is the place to trace in: `GOLDEN_PATH_SEED=7a0e449feba29bda0d3d54d316d649976ee7b892f35bcb55ce8adf0a619a44c7 GOLDEN_PATH_PLACE_KEY=0945995 node --expose-gc --import tsx --test tests/golden-path/played-world.node-test.ts`.
