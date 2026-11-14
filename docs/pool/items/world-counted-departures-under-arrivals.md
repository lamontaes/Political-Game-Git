---
id: world-counted-departures-under-arrivals
title: "A town's counted departures come due at under its arrivals' rate, so a town grows 2 to 3 percent a year on moving alone"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-town-net-moving-negative
blocked-on:
lead: m0-m2
model: opus
effort: medium
root: none
source: Account lead T28, Nov 13 (measured on #9057)
claimed-at:
checked:
branch:
---

**What.** Seen on the Metrics tab as the town's people count: with arrivals paid by each place's due (#9057), Perth Amboy, New Jersey still gains 2.2 and 2.8 percent a year to moving, against New Jersey's net migration well under one percent. Its counted departures come due at about 4.3 percent of its people a year and its arrivals at 5.8 percent. The payout is no longer the cause, since each place's balance is paid within a household; the dues themselves differ. Seen: the town's people count on the Metrics tab, rising every year in a town whose state barely grows.

**Cause.** Measured: on branch claude/project-thread-ojvmv1 at a3684f14 (the train eb349e5d plus #9057), `drawPlace("289d4e90", "students-measure")`, Perth Amboy, New Jersey (3458200), two played years: 55,454 to 56,682 to 58,279 people; counted arrivals 3,239 and 3,564 people, counted departures 2,394 and 2,333, full departures 12 and 3. Everson, Pennsylvania (d4) shows a smaller gap (49 in against 44 out). Draft #8528 found the same in Washington, District of Columbia (world seed 03dcde00…): departures about 4.4 percent a year against about 10 percent arriving. Not yet traced to a line. Suspects in `month` (src/core2/modules/counted-moves.ts): a household's out-of-state due is its weight times `(1 - inState)` and its in-state due times `remainderShare`, while the arrivals it is checked against are the survey's county inflow; `holdNorm`, the web factor and the pushes multiply the leaving weight after the normalization.

**Fix.** Needs cause. Trace one played year in Perth Amboy and in Washington, D.C.: the departure due by its factors (ACS rate, `holdNorm`, web, pushes, `(1 - inState)`, `remainderShare`) against the arrival due by its sources (other states' flows, in-state movers, abroad), and name the factor that differs from the survey's county departures. Do not tune either side to the other.

**Time box.** 4 hours for one Opus session at medium effort.

**Rules.** No dice; real rates check totals and never decide a pass; one rule, all 56 places.

**Done when.** A second session plays a year with buildBenchWorld in three places drawn from all 56 (a played world, named with place and seed) and prints each town's counted departures and arrivals as a share of its people beside the ACS county departure and arrival rates for its state, with the factor that set each.

**Waits on.** world-town-net-moving-negative (#9057).

**Files.** src/core2/modules/counted-moves.ts

**Notes.** Filed by Account lead T28 on branch claude/project-thread-ojvmv1.
