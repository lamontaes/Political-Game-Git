---
id: core-stopgap-parameters-uncalibrated-tunable
title: "Stopgaps in parameters (uncalibrated-tunable): 25 open"
area: core
kind: stopgap
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on: core-stopgap-parameters-uncalibrated-tunable-part-1-decision-weights, core-stopgap-parameters-uncalibrated-tunable-part-2-rest-care-horizon, core-stopgap-parameters-uncalibrated-tunable-part-3-reserve-business-books, core-stopgap-parameters-uncalibrated-tunable-part-4-appraisal-retirement-pulls, core-stopgap-parameters-uncalibrated-tunable-part-5-p15-p10-params
milestone:
model: sonnet
effort: low
root: none
lead: researcher
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind uncalibrated-tunable"
claimed-at:
checked: fable 2026-11-10
---

**What.** Of the 25 uncalibrated-tunable stopgap rows this item named, 7 are resolved since (stressBaseline, moodBaseline, stressHalfLifeDays, openingRetirementCoveredFraction, BenefitFactorMinimum, BenefitFactorMaximum and FundingEnvelopeShare) and 17 are still open in src/core2/data/stopgaps/p8.json, p15.json and p10.json: SG-P8-param-needWeight, goalWeight, driveWeight, traitWeight, emotionWeight, effortWeight, restEffect, careEffect, companyHorizonDays, organizationReserveMonths, appraisalRelationshipWeight, appraisalDistressTraitWeight, appraisalBroodingTraitWeight, SG-P8-param-openingRetirementClaimTraitPullYears, SG-P8-param-openingRetirementCoveredTraitPull, SG-P15-params-uncalibrated and SG-P10-params-uncalibrated. For each, source or calibrate the value against a named check that never picks one actor's outcome, tag it SOURCED, ESTIMATED or TUNABLE with its spread, and resolve the row with the reader named. It is built in five parts.

**Cause.** Found in code: src/core2/data/stopgaps/p8.json, p15.json and p10.json hold the 17 open rows listed above, whose values sit in src/core2/data/parameters.json (SG-P15-params-uncalibrated at line 1442 and SG-P10-params-uncalibrated at line 4733) and are read by `src/core2/modules/work.ts` (the choice weights) and src/core2/emotion.ts (`appraisalRelationshipWeight`); the stress, mood, half-life and most retirement rows are resolved.

**Fix.** For each open row: source or calibrate the value against a named check that never picks one actor's outcome, tag it SOURCED, ESTIMATED or TUNABLE with its spread in parameters.json, and resolve the row with the reader named. Built in the five parts named in blocked-on.

**Time box.** 2 hours for one Sonnet session, the closing check after the five parts. When it runs out, write what was seen in the item and stop.

**Rules.** Never close a row by deleting it; a registered stopgap closes only because the value is sourced or calibrated and its reader shown. Research before building: real data checks the simulation and never decides one actor's outcome. No dice. Every number lives in a parameter table, tagged SOURCED (with citation), ESTIMATED (with source and spread) or TUNABLE (with the spread it is checked against). Replace, never layer.

**Done when.** A second session, not the builder, runs a one-year buildBenchWorld in a drawn place (place and seed named) and, for each of the 18 rows, opens the parameter's tag and spread in parameters.json and the engine that reads it by record id, and finds the row resolved in its family file under src/core2/data/stopgaps/. All five parts are done.

**Waits on.** The five parts (core-stopgap-parameters-uncalibrated-tunable-part-1-decision-weights to -part-5-p15-p10-params).

**Files.** src/core2/data/parameters.json, src/core2/data/stopgaps/p8.json, src/core2/data/stopgaps/p15.json, src/core2/data/stopgaps/p10.json

**Notes.** First row: Prototype opening baseline on a normalized stress channel. No claim of a US population norm. Released from idle draft #5076 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/peaceful-ritchie-03780x` (2026-10-19). Cleared from the front matter and kept here.
