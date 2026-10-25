---
id: people-births-age-shape-by-place
title: "The births plan weighs a mother's age against her own place's fertility schedule"
area: people
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: web-calibrate-choice-terms
source: added with npm run pool -- add
---

**What.** The births plan's age term reads one national center (30.0 years) and spread (8.7 years), derived from the NCHS 2024 age-specific birth rates by scripts/research/people-parameters-check.ts. Those rates are already stored for all 56 places in data/research/renewal/natality-2024.json, and the places differ: the schedule's mean age runs from 28.1 to 32.1 years and its spread from 7.7 to 9.9. The plan in src/core2/births-plan.ts and the counted standing in src/core2/births-counted.ts should read the drawn place's own center and spread through the same conversion, so a couple where women have children later weighs age as women there do. The national rows stay as the fallback for a place whose cells are suppressed.

**Rules.** One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic, so the center and spread come from the place's own natality row. No dice: the rates shape the age weight, never a chance that picks a pregnancy.

**Done when.** In a one-year run of the played world (buildBenchWorld, two drawn places from all 56 with different schedules, seeds named), each full couple's renewal plan record carries the age center and spread of its own place, src/core2/births-plan.test.ts shows the same couple's age term differs between the two places, and the town's mean age of mothers at birth is reported against its place's NCHS schedule.

**Files.** src/core2/births-plan.ts, src/core2/births-counted.ts, data/research/renewal/natality-2024.json, scripts/research/people-parameters-check.ts

**Notes.** TODO
