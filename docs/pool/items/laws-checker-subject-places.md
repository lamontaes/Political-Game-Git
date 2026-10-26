---
id: laws-checker-subject-places
title: "The law matrix grades reach over places that have the law's subject, not every run place"
area: laws
kind: bug
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `reachLink` and the allPlaces link in `scripts/law-wiring/matrix.ts` grade a law partial when any run place reaches nobody, even when that place has no subject for the law and a subject-place run is in the input. In the rights-env family, Prescott, Michigan and Uehling, Nebraska have no emitter in a county that misses an air standard, and Uehling has no farm, so the clean air plan and the groundwater limit grade partial although Lebanon, New Jersey (seed e56d0ff5b0c07407) and Troutdale, Oregon (seed cd43bdb86827c2af) reach their subjects. With the audit-town results left out of the input, both laws grade wired on all nine links (measured by the rights-env helper on filtered copies, Oct 25).

**Rules.** One rule, all 56 places: a law is judged where its subject exists, and the places drawn to find that subject are named with every place passed over.

**Done when.** `scripts/law-wiring/matrix.ts` grades reach and allPlaces over the run places where the law has a subject (recorded by the checker in each result), and the rights-env family's rebuilt matrix from its year runs in Prescott (seed a91c03e7d2b84f10), Uehling (seed 5e27b0c4196fd3a8), Lebanon and Troutdale grades the clean air plan and groundwater limit by their subject places, naming each run place that had no subject.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/matrix.ts

**Notes.** From the laws lead, Oct 25, on the rights-env helper's report.

Folded into laws-checker-grade-each-link-across-runs (Oct 25 audit).
