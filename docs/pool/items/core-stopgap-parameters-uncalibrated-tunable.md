---
id: core-stopgap-parameters-uncalibrated-tunable
title: "Stopgaps in parameters (uncalibrated-tunable): 25 open"
area: core
kind: stopgap
priority: 3
size: L
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind uncalibrated-tunable"
claimed-at: 2026-10-19T23:07:36.109Z
---

**What.** Replace or clear the 25 open uncalibrated-tunable stopgap row(s) in src/core2/data/parameters.json: SG-P8-param-stressBaseline, SG-P8-param-moodBaseline, SG-P8-param-stressHalfLifeDays, SG-P8-param-needWeight, SG-P8-param-goalWeight, SG-P8-param-driveWeight, SG-P8-param-traitWeight, SG-P8-param-emotionWeight, SG-P8-param-effortWeight, SG-P8-param-restEffect, SG-P8-param-careEffect, SG-P8-param-companyHorizonDays, SG-P8-param-organizationReserveMonths, SG-P8-param-appraisalRelationshipWeight, SG-P8-param-appraisalDistressTraitWeight, SG-P8-param-appraisalBroodingTraitWeight, SG-P8-business-books-dynamics, SG-P8-param-openingRetirementClaimTraitPullYears, SG-P8-param-openingRetirementCoveredFraction, SG-P8-param-openingRetirementCoveredTraitPull, SG-P8-param-openingRetirementBenefitFactorMinimum, SG-P8-param-openingRetirementBenefitFactorMaximum, SG-P8-param-openingRetirementFundingEnvelopeShare, SG-P15-params-uncalibrated, SG-P10-params-uncalibrated. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/parameters.json

**Notes.** First row: Prototype opening baseline on a normalized stress channel. No claim of a US population norm.
