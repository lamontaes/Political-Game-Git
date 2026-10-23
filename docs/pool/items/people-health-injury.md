---
id: people-health-injury
title: "Workers are injured by exposure on the job and recover over a spell the jobs engine reads"
area: people
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: people-health-conditions-begin
blocked-on:
milestone:
source: split from people-stopgap-health-missing-mechanic by pool feeder Oct 20
---

**What.** Add injuries to the health module. A worker's exposure builds from the hours they work in their occupation (the occupation's injury intensity from the BLS Survey of Occupational Injuries and Illnesses), made worse when their employer is short-staffed (the jobs engine knows heads against need) and by their own fatigue (the time need), and the worker is injured when the exposure crosses their own keyed injury line, the same pattern the resilience line uses. An injury is a typed event with a severity and a recovery spell (median days away from work by occupation from the same survey); during the spell the worker's hours are lowered and the household pays the medical cost recorded in the medical spending categories. Counted workers accrue the same exposure times their count.

**Rules.** No dice: injury follows hours, occupation, staffing and fatigue against the person's own line; BLS rates only check the yearly total. Sliding scales and causes: exposure accumulates and nothing flips at a threshold. An effect is a read, not a record: the jobs engine reads the recovery spell as absence and the housing and money engines read the lost pay and the bill. Wire to the world: lost hours reduce the paycheck by journal record. One model, two tiers: counted workers take the same exposure times their count. One rule, all 56 places: occupation rates come from data, nothing names a place. No hand-written player text: the injury scene is the director's through the English engine.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) injured workers appear in the occupations and employers with the most hours and thinnest staffing, a named worker is traced from their hours and employer headcount to the injury event id, the recovery spell and the smaller paycheck on the journal, and the year's injury rate per hundred full-time workers falls inside the BLS range for the place's industry mix, shown in src/core2/health-injury.test.ts.

**Files.** src/core2/modules/health.ts, src/core2/modules/jobs.ts, src/core2/data/health.json, src/core2/health-injury.test.ts

**Notes.** Split from people-stopgap-health-missing-mechanic Oct 20. Needs a sourced occupation injury table (BLS SOII), which the builder adds to the parameter table with its spread.
