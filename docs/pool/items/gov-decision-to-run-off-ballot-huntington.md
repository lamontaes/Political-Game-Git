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
---

**What.** M0-13's played-world check fails on clean main 3bb2e63717 in Huntington, Utah (place key 4936950, seed ca75d1e89cfcf56ed5c202205d4d2f7c1eefffc04d87f324dc5ed818233ab4c7, the golden-path draw for environment PR 5915's head). The check 'a named challenger runs' reads: 1 adult other than the incumbent chose to run in the 4 races decided, and none was on the ballot. The check 'every race has someone on the ballot' reads 1 of 4 races empty (Council member, 2025-11-04). The primary-loss case is already counted (5950 on main), so this decision to run did not reach a filing at all, or its filing never reached the ballot.

**Rules.** Never weaken a test: the check keeps failing when a decision to run never reaches a filing. Ask why: name the person's candidacy decision row, their filing record or its absence, and the race, from the records of that played year.

**Done when.** In the played world for Huntington, Utah on that seed, the decision to run is followed by record id to its filing and the ballot (or the reason it stops is named and fixed in candidacy.ts), M0-13 passes on that seed and on two fresh drawn places named in the PR, and no test is weakened. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/modules/candidacy.ts, tests/golden-path/played-world.node-test.ts

**Notes.** Filed Oct 25 by the effects lead: it turned PR 5915's golden-path-year red, and clean main fails identically on the same seed.

- Laws lead, Oct 25: reproduced on main 929ab16c42 in Perrysville, Indiana (place key 1859238, seed f0390569196f1442db81ee832aa105840f6bd916977c1addc22e1ae233d30c9c, the M0-13 draw for #5986's head fe40e0d021): "1 adults other than the incumbent chose to run in the 4 races decided, and none was on the ballot". The same check fails identically on #5986's head.

- Effects lead, Oct 25: also on main b3ab4d7c92 in Hobart Bay, Alaska (place key 0232550, seed bebe23902e7036383abd127d1f9d751625c9221287ce086f6d28c30192930ab8, the M0-13 draw for #6008's head 2e243b7e6b): "1 adults other than the incumbent chose to run in the 7 races decided, and none was on the ballot". It turned #6008's golden-path-year red; that PR changes only the matrix script's grading.

No longer reproduces on main (Claude worker, Oct 26, main at the time of this note). `node --max-old-space-size=6000 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` with `GOLDEN_PATH_SEED=ca75d1e89cfcf56ed5c202205d4d2f7c1eefffc04d87f324dc5ed818233ab4c7 GOLDEN_PATH_PLACE_KEY=4936950` (Huntington, Utah): 22 passed, 0 failed; "a named challenger runs: 1 named challengers in 4 races" and "every race has someone on the ballot: all 4 races had someone on the ballot". Fresh seeds: huntx1 (Enigma, Georgia 1327596): 21 passed, 0 failed, all 4 races with someone on the ballot; huntx2 (Brookings, South Dakota 4607580): 22 passed, 0 failed, 1 named challenger in 3 races. No commit I could find since the item was filed touches `candidacy.ts` for this; the cause was not traced because the failure is gone. Left open for the CTO or a merger to close as done-by-main; no code change was needed.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (done by main).
