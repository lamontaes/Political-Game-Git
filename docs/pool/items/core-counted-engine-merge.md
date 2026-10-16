---
id: core-counted-engine-merge
title: "One engine for the counted population"
area: core
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
---

**What.** Fold the pieces `modules/counted-drift.ts` has and `births-counted.ts` lacks (deaths scaled by each state's age-adjusted rate, a pull to leave that builds month by month and is held back by a mortgage or children, names of the birth year, workers named by public supplier agreements) into `births-counted.ts`, then delete `counted-drift.ts` and `COUNTED_DRIFT_MODULE`. Today counted-drift stands down wherever renewal runs, so those pieces are dead in play. The result is one engine that owns births, deaths and moves for counted groups.

**Rules.** One model, two tiers; replace, never layer; no dice (the pull to leave is a cause, never a roll).

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place from all 56, a counted group's death count, departures and birth names read the state rate, the household's mortgage and the birth year, shown by record id; the counted-drift tests pass against renewal alone and the old module is gone.

**Files.** src/core2/births-counted.ts, src/core2/modules/counted-drift.ts, src/core2/life.ts, src/core2/modules/renewal.ts

**Notes.** core.md line 175, checked Oct 15: both files exist; counted-drift returns early where renewal is installed. Related: core-stopgap-counted-drift-aggregate-population.
