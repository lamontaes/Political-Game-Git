---
id: people-health-injury
title: "Workers are injured by exposure on the job and recover over a spell the jobs engine reads"
area: people
kind: feature
priority: 3
size: M
status: dropped
claimed-by:
pr:
after: people-health-conditions-begin
blocked-on:
milestone:
source: split from people-stopgap-health-missing-mechanic by pool feeder Oct 20
standard: 2
model: opus
effort: medium
root: design-life-record
lead: lives
checked: fable 2026-11-10
---

**What.** Add injuries to the health module. A worker's exposure builds from the hours they work in their occupation (the occupation's injury intensity from the BLS Survey of Occupational Injuries and Illnesses), made worse when their employer is short-staffed and by their own fatigue, and the worker is injured when exposure crosses their own keyed injury line. An injury is a typed event with a severity and a recovery spell during which the worker's hours are lowered and the household pays the medical cost. Counted workers accrue the same exposure times their count.

**Cause.** Design: docs/design/life-record.md (health and work are kinds a life keeps); the item's spec: exposure from occupation hours, staffing and fatigue crosses the worker's own line, with the recovery spell read by the jobs engine in src/core2/modules/jobs.ts.

**Fix.** Add worker injury events with a recovery spell that the jobs engine reads as absence and the money engines read as lost pay and a bill, with rates from a BLS SOII occupation table with its spread added to the parameter table.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: injury follows hours, occupation, staffing and fatigue against the person's own line; BLS rates only check the yearly total. Sliding scales and causes: exposure accumulates and nothing flips at a threshold. An effect is a read, not a record: the jobs engine reads the recovery spell as absence and the housing and money engines read the lost pay and the bill. Wire to the world: lost hours reduce the paycheck by journal record. One model, two tiers: counted workers take the same exposure times their count. One rule, all 56 places: occupation rates come from data. No hand-written player text: the injury scene is the director's through the English engine.

**Done when.** A second session runs a one-year played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) and sees injured workers appear in the occupations and employers with the most hours and thinnest staffing, and traces a named worker from hours and employer headcount to the injury event id, the recovery spell and the smaller paycheck on the journal. The year's injury rate per hundred full-time workers is reported beside the BLS figure for the place's industry mix in src/core2/health-injury.test.ts.

**Waits on.** people-health-conditions-begin.

**Files.** src/core2/modules/health.ts, src/core2/modules/jobs.ts, src/core2/data/health.json, src/core2/health-injury.test.ts (new)

**Notes.** Split from people-stopgap-health-missing-mechanic Oct 20. Needs a sourced occupation injury table (BLS SOII), which the builder adds to the parameter table with its spread.

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have given workers job injuries from an injury-rate table, with a recovery spell and a smaller paycheck; nothing on the golden path shows it. The owner can ask for it back.
