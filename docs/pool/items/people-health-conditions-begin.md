---
id: people-health-conditions-begin
title: "Conditions begin during life from age, income and strain, and other engines read them"
area: people
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: 
blocked-on:
milestone:
source: split from people-stopgap-health-missing-mechanic by pool feeder Oct 20
---

**What.** Let chronic conditions begin during a played life, not only at the opening. The health module (`src/core2/modules/health.ts`) gives each resident the opening conditions from the condition pack's prevalence cells (income-ranked) and a serious illness when strain crosses the person's own resilience line, but no one develops a condition after day one. Add a yearly incidence derived from the pack: the rise in prevalence from one age band to the next, adjusted for deaths of those with the condition, which is the standard way to get incidence from cross-sectional prevalence. A person acquires a condition when their accumulated exposure (age, the household's income rank, strain and the condition's own pack weight) crosses their own keyed line, the same pattern as the resilience line, written as a typed condition-begins event and a new entry in the condition holdings the mortality rule already reads.

**Rules.** No dice: onset follows age, income rank, recorded strain and the person's own keyed line; the CDC and condition-pack prevalence only check totals. Sliding scales and causes: nothing flips at a threshold, exposure accumulates. An effect is a read, not a record: the mortality rule multiplies strain by the new condition's weight, the jobs engine reads health need for staying and leaving work, and medical spending reads the condition. One model, two tiers: counted groups acquire conditions at the same rates times their count, and a person filled in has the conditions their group's mix says. One rule, all 56 places: nothing names a place. Estimate, never UNKNOWN: incidence is ESTIMATED from prevalence with its spread.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) residents of higher age and lower income rank acquire conditions at higher rates, a named person's new condition is traced by event id to the strain and income record that crossed their line, and the mortality rule's weight and the jobs engine's health read use it, shown in src/core2/health-onset.test.ts with the place and seed named.

**Files.** src/core2/modules/health.ts, src/core2/condition-pack.ts, src/core2/data/health.json, src/core2/health-onset.test.ts

**Notes.** Split from people-stopgap-health-missing-mechanic Oct 20. Coverage, medical spending and poverty effects are already separate items (people-coverage-record-monthly-pass, people-coverage-counted, world-medical-spending-categories).
