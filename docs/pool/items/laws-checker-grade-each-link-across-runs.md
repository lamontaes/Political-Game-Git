---
id: laws-checker-grade-each-link-across-runs
title: "The law matrix keeps one run per law and place, so a link that needs a longer window is graded from a hand-merged file"
area: laws
kind: bug
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The law matrix keeps one run per law and place, so a link that needs a longer window is graded from a hand-merged file. A later run file replaces an earlier one, yet some links need a longer window than the rest: an outcome link with a months-long lag needs a long run, and the knowing link reads hearers inside the window. So on Oct 24 the rights-env family graded its web links from composite "weblag" files that join two runs by hand, and the matrix cannot say which run proved which link. Three narrower faults are folded in: a counted group that stands for no one counts as reach, a 12-month outcome link misses a 365-day run by one day, and the matrix grades reach over run places that have no subject for the law.

**Cause.** Found in code: `main` in scripts/law-wiring/matrix.ts (line 1112) builds `byPlace` with a comment "One result per law and place: a later file replaces an earlier one" (lines 1118 to 1127), so only one run per law and place survives. No composite weblag file is on main any more (searched Nov 10); the rights-env run files are in docs/reports/law-wiring/families.

**Fix.** Grade each of the nine links for a law and place from every run file given and record in the matrix row which run file proved each wired link; a link is wired only when one real run shows it. Ignore applied records whose count is 0 when grading reach and all-places. Decide "lag outlasts the run" from the month the effect lands against the run's last full month. Grade reach and all-places over the run places where the law has a subject (recorded by the checker in each result).

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read: each link is graded from a played run that shows it, named by run file and record id. One rule, all 56 places: both audit towns are graded the same way. This is a check, not play: the player notices only that the game keeps running.

**Done when.** A second session, not the builder, rebuilds the matrix from the rights-env family's 35-day and long runs in played worlds (`buildBenchWorld`) at the drawn places Prescott, Michigan (2666300, seed a91c03e7d2b84f10) and Uehling, Nebraska (3149425, seed 5e27b0c4196fd3a8). Each wired link names the run file that proved it, the facial recognition and clean air plan rows grade the same from their 365-day year runs as from the 400-day runs, a counted group of 0 is not reach, the clean air plan and groundwater limit are graded by their subject places naming each run place that had none, and a unit test covers the lag boundary.

**Waits on.** Nothing.

**Files.** scripts/law-wiring/matrix.ts, docs/reports/law-wiring/families, scripts/law-wiring/check.ts

**Notes.** From the laws lead, Oct 24 (rights-env, PR #5669). Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it changes how the matrix files its runs, a crew report no player sees.

Folded in Oct 25 from laws-checker-empty-group-counts-as-reach. Its done when: `scripts/law-wiring/matrix.ts` ignores applied records whose count is 0 when grading reach and all-places, a unit test covers it, and the rebuilt matrix from the health-schools year runs in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) grades the voucher's reach from Uehling's records alone, naming Prescott as a place with no subject.

Folded in Oct 25 from laws-checker-lag-window-edge. Its done when: `scripts/law-wiring/matrix.ts` decides "lag outlasts the run" from the month the effect lands against the run's last full month, and the rights-env family's facial recognition and clean air plan rows grade the same from their 365-day year runs in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) as from the 400-day runs, with a test for the boundary.

Folded in Oct 25 from laws-checker-subject-places. Its done when: `scripts/law-wiring/matrix.ts` grades reach and allPlaces over the run places where the law has a subject (recorded by the checker in each result), and the rights-env family's rebuilt matrix from its year runs in Prescott (seed a91c03e7d2b84f10), Uehling (seed 5e27b0c4196fd3a8), Lebanon and Troutdale grades the clean air plan and groundwater limit by their subject places, naming each run place that had no subject.
