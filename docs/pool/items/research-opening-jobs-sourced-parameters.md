---
id: research-opening-jobs-sourced-parameters
title: "Research: sourced parameters for the opening's jobs, workgroups and pay calendars"
area: core
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from core-stopgap-opening-coworkers-estimated-behavior, core-stopgap-opening-employment-authored-content, core-stopgap-opening-employment-opening-allocation, core-stopgap-opening-payroll-calendar-estimated-opening-employer-pay-calendar"
---

**What.** Source the numbers behind the opening's jobs, workgroups and pay calendars. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 4 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/core/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-P15-coworker-groups` in src/core2/data/opening-coworkers.json: Residents of the same opening employer are split into seeded balanced workgroups of at most openingCoworkerGroupSize, and each pair knows the other by name since the later of their two start dates. Replacement: Workgroups from occupation and establishment records (BLS OEWS staffing patterns by industry) and a measured number of coworkers known, with time worked together adding to closeness on the shifts both attend.
- `SG-P8-authored-job-mix` in src/core2/data/opening-employment.json: The existing town-employment generator uses an authored workplace and role mix; sourced employment totals do not source those content options. Replacement: A source-grounded open occupation/employer mix with verified coverage and deterministic individual matching.
- `SG-P8-opening-employment` in src/core2/opening-employment.ts: Adds fictional opening jobs against sourced sector stock and age-target priors at existing recorded employers. Replacement: County-resident employment and firm/occupation supported capacity matched with source spreads, preserving original records.
- `SG-P8-opening-employer-pay-calendar` in src/core2/data/opening-payroll-calendar.json: Fresh employer-owned payroll frequency/phase/lag calendars estimated from dated business-frequency evidence and separately qualified public/education examples; no actual fictional employer term or legal compliance claimed. Replacement: Qualified employer-owned dated compensation/payroll records and government/education policy calendars, actual legal-frequency/holiday/lag treatment, shared household payday source links and empirical startup cohort checks. (parameter rows: src/core2/data/parameters.json:openingPayrollPrivatePhaseSpanFraction, src/core2/data/parameters.json:openingPayrollPeriodEndLagDays, src/core2/data/parameters.json:openingPayrollMonthlyBoundaryDay, src/core2/data/parameters.json:openingPayrollSemimonthlyFirstBoundaryDay, src/core2/data/parameters.json:openingPayrollSemimonthlySecondBoundaryDay, src/core2/data/parameters.json:openingPayrollEducationBiweeklyWeight, src/core2/data/parameters.json:openingPayrollEducationMonthlyWeight)

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/opening-coworkers.json, src/core2/data/opening-employment.json, src/core2/data/opening-payroll-calendar.json, src/core2/opening-employment.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/core/

**Notes.** Folded from: core-stopgap-opening-coworkers-estimated-behavior, core-stopgap-opening-employment-authored-content, core-stopgap-opening-employment-opening-allocation, core-stopgap-opening-payroll-calendar-estimated-opening-employer-pay-calendar. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
