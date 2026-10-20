---
id: core-stopgap-work-uncalibrated-choice-mapping
title: "Stopgaps in work (uncalibrated-choice-mapping): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/work.json, kind uncalibrated-choice-mapping"
after:
claimed-at:
---

**What.** A worker's choice to attend or miss a scheduled shift is scored in src/core2/modules/work.ts from needs, traits, affect and an ongoing work-goal prior, with `workCommitmentUrgency` and the daily-segment policy uncalibrated and no health or care constraint. Add the causes that real absences have and calibrate the total, not the person. Give the absence offer `reasonBindings` that read the worker's own illness (`careNeedOf` in src/core2/modules/health.ts), the care a child or relative at home needs, the state's paid-sick-leave law in force (whether the missed shift is paid, which sets what the miss costs), and the worker's cash cushion; let the employer side read the missed-work record in the jobs engine's review (repeated unpaid misses are an input to a warning or layoff decision, not a roll). Then tune `workCommitmentUrgency` so full-time workers lose about 1.7 percent of scheduled hours (BLS CPS 2023 Table 46: absence rate 3.1 percent, lost worktime rate 1.7 percent, spread 1.2 to 2.5, illness about two thirds), with the state paid-sick-leave law moving it modestly by state.

**Rules.** No dice: attendance follows illness, care duties, cash, traits and the law in force, and the 1.7 percent real rate only checks the total, never decides one worker's day. Sliding scales and causes: worse health or a sick child raises the pull to stay home a little at a time, with no threshold. One rule, all 56 places: paid-sick-leave rules are law rows per state, not a named state. An effect is a read, not a record: the jobs engine's review must read the missed-work records. Ask why: each recorded absence keeps the reasons it was scored on. One model, two tiers: counted workers' absences are the same scores times their count in the group's wage flow. Numbers in the parameter table are SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), full-time workers' missed share of scheduled minutes lands within 1.2 to 2.5 percent, a worker with a recorded illness or a sick child misses more than a healthy one with the reasons recorded on their absence record id, a place with a paid-sick-leave law row pays the missed shift and one without does not, and the employer's review reads the absence records; src/core2/work-attendance-calibration.test.ts proves it and the row is resolved in stopgaps.json.

**Files.** src/core2/modules/work.ts, src/core2/data/work.json, src/core2/data/parameters.json, src/core2/modules/jobs.ts, src/core2/data/laws/starting-law.json, src/core2/work-attendance-calibration.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Scores attendance versus absence from current needs, traits, affect and an ongoing work-goal prior.

Oct 20 (pool feeder): spec written; the target (1.7 percent, 1.2 to 2.5) is already in data/research/stopgaps-oct19/A-people-behavior-1.json; the jobs engine does not read absences yet (no absence or missed-work reference in modules/jobs.ts), so the employer-review read is part of this item.
