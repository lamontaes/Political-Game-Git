---
id: research-content-sourced-parameters
title: "Research: sourced parameters for the content engine's life utility and civic progress"
area: core
kind: research
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from core-stopgap-content-estimated-behavior, core-stopgap-content-uncalibrated-tunable"
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
lead: researcher
after:
checked: fable 2026-11-10
---

**What.** Source the numbers behind the content engine's life utility and civic progress. Each row below is a registered stopgap whose replacement waits on sourced or estimated data. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/core/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder, naming the pool item in the PR. The look-up hours (lookupHours) were delivered earlier as ESTIMATED at 0.91 hours (spread 0.72 to 1.06, BLS American Time Use Survey 2025). What is left: careNeedHalfExcessHazard stays TUNABLE because no published figure measures care per unit of condition hazard, and SG-P8-civic-progress needs a mechanic first, since the look-up, join, organize and approach acts are prototype procedures (builder item core-stopgap-content-uncalibrated-tunable). SG-P8-life-utility waits on core-stopgap-content-estimated-behavior, because the engine still scores one act per activation instead of a day's time plan.

- `SG-P8-life-utility` in src/core2/data/content.json: Prototype need, goal, affect and trait utility mappings; authored player-circle daily, local-town weekly, state monthly and inactive husk cadence; one scored discretionary act per tier activation instead of a complete activity plan; empirical individual-choice calibration remains incomplete. Replacement: Validated data coefficients and activity totals across documented P9 lives and real cohort spreads. (parameter rows: src/core2/data/parameters.json:careNeedHalfExcessHazard)
- `SG-P8-civic-progress` in src/core2/data/content.json: Prototype civic availability and organization/approach consequences, rather than complete procedures. Replacement: An identified empirical range checked by an instrument-matched or activity-plan-matched calibration test; no parameter bound inferred from an unrelated outcome. (parameter rows: src/core2/data/parameters.json:lookupHours)

**Cause.** Design: each stopgap row named below is still open in its family file under src/core2/data/stopgaps/ and waits on sourced data. The rule is AGENTS.md "Placeholders" (every shortcut registered, every number tagged SOURCED, ESTIMATED or TUNABLE), and the research is in docs/research/pool-feeder-oct20/research-content-sourced-parameters.md.

**Fix.** Source only what is left: careNeedHalfExcessHazard (no published figure yet; it stays TUNABLE unless one is found) and the inputs SG-P8-civic-progress will read once its mechanic exists. Leave a row registered with its reason where no source converts.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** A second session reads the parameter tables for careNeedHalfExcessHazard and the civic-progress inputs and finds each SOURCED or ESTIMATED with a citation (publisher, year, URL) and a spread (low, high, unit, citation). In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) it sees the engine read each new value by record id, with where the town landed reported next to the real figure; the real figure is reported only and is not a pass mark. Each stopgap row this item takes is resolved in its family file under src/core2/data/stopgaps/ with the source named, or stays open with its replacement naming the research file, the estimate's source and spread, and the item that would close it. tests/guards/research-data-has-reader.test.ts and the tripwire and calibration-guard tests pass.

**Waits on.** Nothing.

**Files.** src/core2/data/content.json, src/core2/data/parameters.json, src/core2/data/stopgaps/p8.json, data/research/core/

**Notes.** Folded from: core-stopgap-content-estimated-behavior, core-stopgap-content-uncalibrated-tunable. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Oct 20 (pool feeder): research done in docs/research/pool-feeder-oct20/research-content-sourced-parameters.md (2 rows: 0 sourced, 2 estimated, 0 mechanic).

Oct 24, 2026: split. PR 5848 (item research-content-atus-lookup-hours) delivers lookupHours as ESTIMATED at 0.91 hours (spread 0.72 to 1.06, BLS American Time Use Survey 2025), its research file and a played-year check. Still open here: careNeedHalfExcessHazard stays TUNABLE because no published figure measures care per unit of condition hazard. SG-P8-civic-progress stays open because the look-up, join, organize and approach acts are prototype procedures (builder item core-stopgap-content-uncalibrated-tunable). SG-P8-life-utility stays open because the engine still scores one act per activation instead of a day's time plan (builder item core-stopgap-content-estimated-behavior).

Sent back 2026-10-23 from PR #5848 (branch claude/dreamy-tesla-bgi3ui): The acceptance table explicitly leaves the care coefficient and both stopgap-resolution rows unmet; bound the completed ATUS and lookupHours slice separately while preserving the unidentified coefficient and mechanic work open; finish on that branch, merge main into it first.

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have sourced the content engine's life-utility and civic-progress numbers; they stay estimates, and every item that waited on it is dropped.
