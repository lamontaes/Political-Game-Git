---
id: laws-checker-grade-each-link-across-runs
title: "The law matrix keeps one run per law and place, so a link that needs a longer window is graded from a hand-merged file"
area: laws
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `scripts/law-wiring/matrix.ts` keeps one result per law and place: a later run file replaces an earlier one (matrix.ts:605). Some links need a longer window than the rest. An outcome link with a months-long lag needs a long run; the knowing link reads hearers inside the window. So on Oct 24 the rights-env family graded its web links from composite "weblag" files that join the links of two runs by hand. A merged file is not a run, and the matrix cannot say which run proved which link. Combined by the Oct 25 audit, one change in one seam; the parts folded in: laws-checker-empty-group-counts-as-reach (The law matrix grades reach wired from a counted group that stands for no one); laws-checker-lag-window-edge (A 12-month outcome link misses a 365-day law run by one day); laws-checker-subject-places (The law matrix grades reach over places that have the law's subject, not every run place). Each part's own done-when line is listed in Notes and is part of this item's acceptance.

**Rules.** An effect is a read: each link is graded from a played run that shows it, named by run file and record id. One rule, all 56 places: both audit towns are graded the same way.

**Done when.** `matrix.ts` grades each of the nine links for a law and place from every run file given for it, keeps the run file that proved each wired link in the matrix row, and grades a link wired only when one real run shows it. Shown in a played world (buildBenchWorld) with the rights-env family's 35-day and long runs in Prescott, Michigan (2666300, seed a91c03e7d2b84f10) and Uehling, Nebraska (3149425, seed 5e27b0c4196fd3a8), and the composite weblag files deleted. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** scripts/law-wiring/matrix.ts, docs/reports/law-wiring/families/rights-env-*.json, scripts/law-wiring/check.ts

**Notes.** From the laws lead, Oct 24 (rights-env, PR #5669).

Folded in Oct 25 from laws-checker-empty-group-counts-as-reach. Its done when: `scripts/law-wiring/matrix.ts` ignores applied records whose count is 0 when grading reach and all-places, a unit test covers it, and the rebuilt matrix from the health-schools year runs in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) grades the voucher's reach from Uehling's records alone, naming Prescott as a place with no subject.

Folded in Oct 25 from laws-checker-lag-window-edge. Its done when: `scripts/law-wiring/matrix.ts` decides "lag outlasts the run" from the month the effect lands against the run's last full month, and the rights-env family's facial recognition and clean air plan rows grade the same from their 365-day year runs in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) as from the 400-day runs, with a test for the boundary.

Folded in Oct 25 from laws-checker-subject-places. Its done when: `scripts/law-wiring/matrix.ts` grades reach and allPlaces over the run places where the law has a subject (recorded by the checker in each result), and the rights-env family's rebuilt matrix from its year runs in Prescott (seed a91c03e7d2b84f10), Uehling (seed 5e27b0c4196fd3a8), Lebanon and Troutdale grades the clean air plan and groundwater limit by their subject places, naming each run place that had no subject.
