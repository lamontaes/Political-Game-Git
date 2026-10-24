---
id: research-residents-cadence-sourced
title: "Research: wider-population spending and pay timing, absence and turnover by industry (SG-CORE-residents-cadence)"
area: people
kind: research
priority: 2
size: M
status: open
claimed-by:
pr: #5796
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Split from research-residents-sourced-parameters. SG-CORE-residents-cadence in src/core2/residents.ts: the wider population's purchases are merged per seller, kind and week of the month and paid monthly instead of after each household's own paydays; counted workers always work their full schedule and are paid on the employer's cadence (semimonthly approximated as two monthly dates). Source what the replacement will read: the counts' pay dates and income, and absence and turnover rates by industry from BLS JOLTS and CPS (BLS is not reachable from cloud sessions, so use a reachable publisher or mark the row ESTIMATED with its source). Where the replacement is a mechanic, source what it reads and leave the mechanic to the people builder, naming the pool item.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each row is SOURCED or ESTIMATED in the parameter table with a citation and a spread; SG-CORE-residents-cadence is resolved or its remaining mechanic is named in a pool item with the sourced rows it reads; the research-data-reader guard, tripwire and calibration-guard tests pass; a one-year played world (buildBenchWorld, a drawn place, seed named) reports each band and where the town landed.

**Files.** src/core2/residents.ts,src/core2/data/parameters.json,src/core2/data/stopgaps.json,data/research/people/

**Notes.** TODO

Review correction 2026-10-23 for PR #5796 (branch claude/residents-cadence): the count-map objection was withdrawn because keys are created only from actual job-change records; the current head is being re-reviewed and gated.

Sent back 2026-10-23 from PR #5796 (branch claude/residents-cadence): verified in a Census-weighted Olney world: turnover-check.ts:60-65 reports 3154 job records instead of 6995.687 represented jobs; job work-relationship_002e0e940f6cf21b represents 3.5797 but counts as one; use weighted employment and consistent event units, with a weighted-world regression (the prior count-map objection is withdrawn); finish on that branch, merge main into it first.
