---
id: tests-staff-hire-and-law-wiring-government-draw-their-place
title: "The staff-hire and government-laws tests draw a random place and go red on some draws"
area: release
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: sonnet
effort: medium
root: none
checked: Account lead 2026-11-14
source: Account lead Train, Nov 14 2026, from the changed-test run on train head 3e46229756 (#8567 and #8790 folded)
---

**What.** `src/core2/staff-hire-employed.test.ts` and `src/core2/law-wiring-government.test.ts` each draw their place when no seed is named, and each fails on some draws and passes on others, which breaks the never-red-by-draw rule. Seen: no player-visible effect; the tests are red by draw on the train.

**Cause.** Measured: on the train at 3e46229756, `staff-hire-employed.test.ts` "an aide can come from a private job, which the post's hire ends" failed at Trapper Creek, Alaska (0278680), seed 42b3f7b84d346e3fc5d2a475c15f6a14f63eb33d6f52f7be3aa5dd0c3f83dcb7 (an aide's post ended on 2025-05-05 with no dismissal row), and `law-wiring-government.test.ts` "applies each law, moves the money, moves the outcome, and a repeal ends it" failed at ward charter 1608830, attempt 4, seed 4b56cdd84c01d9abfe23c25e7a08ed04d65b92a0 ("someone hired on the raised administration line: expected 0 to be greater than 0"). Both pass on the train with named seeds: `STAFF_HIRE_SEED=f1a` (2 of 2) and `GOLDEN_PATH_SEED=f0fresh1` (3 of 3). The gate batch's own note says the first staff-hire test fails in worlds where an aide's post ends with no dismissal row (Townshend VT, Breckenridge MO).

**Fix.** Make each test choose its place the drawn-place way (skill drawn-place-tests): draw places, skip any that lack the case (no dismissal-less post ending; no hire on the raised line within the wait), name what was passed over, and fail only if no drawn place showed the case. Do not loosen an assertion for a place that has the case.

**Time box.** 2 hours for one Sonnet session.

**Rules.** No dice. A test is never red by the luck of the draw. One run on a fresh seed, plus the two named seeds above.

**Done when.** A second session runs both files on main in drawn places (drawPlace on three seeds nobody chose, each place named with its seed) and sees them pass, each naming the places it used and the ones it passed over.

**Waits on.** Nothing.

**Files.** src/core2/staff-hire-employed.test.ts, src/core2/law-wiring-government.test.ts

**Notes.** Filed by the Account lead's Train thread on the train branch at the Account lead's request (Nov 14).
