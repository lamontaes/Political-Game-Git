---
id: laws-checker-grade-each-link-across-runs
title: "The law matrix keeps one run per law and place, so a link that needs a longer window is graded from a hand-merged file"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `scripts/law-wiring/matrix.ts` keeps one result per law and place: a later run file replaces an earlier one (matrix.ts:605). Some links need a longer window than the rest. An outcome link with a months-long lag needs a long run; the knowing link reads hearers inside the window. So on Oct 24 the rights-env family graded its web links from composite "weblag" files that join the links of two runs by hand. A merged file is not a run, and the matrix cannot say which run proved which link.

**Rules.** An effect is a read: each link is graded from a played run that shows it, named by run file and record id. One rule, all 56 places: both audit towns are graded the same way.

**Done when.** `matrix.ts` grades each of the nine links for a law and place from every run file given for it, keeps the run file that proved each wired link in the matrix row, and grades a link wired only when one real run shows it. Shown in a played world (buildBenchWorld) with the rights-env family's 35-day and long runs in Prescott, Michigan (2666300, seed a91c03e7d2b84f10) and Uehling, Nebraska (3149425, seed 5e27b0c4196fd3a8), and the composite weblag files deleted.

**Files.** scripts/law-wiring/matrix.ts, docs/reports/law-wiring/families/rights-env-*.json

**Notes.** From the laws lead, Oct 24 (rights-env, PR #5669).
