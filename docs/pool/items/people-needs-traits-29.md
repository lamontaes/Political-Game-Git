---
id: people-needs-traits-29
title: "Needs from other sessions listed in traits.md (line 29): 3 lines"
area: people
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/traits.md "Needs from other sessions" (line 29)'
---

**What.** Two real requests remain from the traits work. `turnoutBase` moved from -1 to -0.6 and `recallOrganizerEffort` from 1.3 to 0.5 so turnout and recalls still happen with the smaller trait term, and both must be re-checked against real turnout and recall counts. And appointers are party-side numbers, not people, so the nomination cannot weigh their traits until an appointer is a person. Re-check the two parameters against the sources and update their tags, then make the appointer a person in `appointments.ts`. The player would notice turnout and recalls at real-world rates and appointments that reflect who the appointer is.

**Rules.** Research before building: real turnout and recall counts check the totals and never decide one voter or organizer; Sliding scales and causes: turnout and recall effort slide with traits, never flip at a threshold; No dice: appointments follow the appointer's traits and the candidates' records, never a roll; Estimate, never UNKNOWN: each parameter is tagged SOURCED or ESTIMATED with source and spread in the parameter table; An effect is a read, not a record: the nomination reads the appointer's person record; One rule, all 56 places: no place named in code; One model, two tiers: counted voters use the same turnout rule as full people times their count.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): national and local turnout and the recall count land within each parameter's stated spread (the measured numbers in the PR body), and a nomination in the year lists the appointer as a person with the traits weighed (nomination and person ids). Tests in `src/core2/appointments.test.ts` and a turnout calibration test. The owner plays it: sees an appointment explained by who the mayor is.

**Files.** src/core2/data/parameters.json, src/core2/electorate.ts, src/core2/modules/recalls.ts, src/core2/appointments.ts

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
