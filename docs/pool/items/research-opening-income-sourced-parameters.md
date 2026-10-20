---
id: research-opening-income-sourced-parameters
title: "Research: sourced parameters for the opening's retirement income and its funding"
area: core
kind: research
priority: 2
size: M
status: claimed
claimed-by: claude/research-income
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from core-stopgap-opening-income-funding-opening-outside-flow-terms-prior, core-stopgap-opening-income-opening-generated-income-prior"
claimed-at: 2026-10-20T01:41:57.775Z
---

**What.** Source the numbers behind the opening's retirement income and its funding. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 2 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/core/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-P8-opening-retirement-funding` in src/core2/data/opening-income-funding.json: One modeled outside retirement payment boundary and exact dated funding terms linked to saved awards and income contracts. Replacement: Matched 2021 award/eligibility/amount/payment-date evidence and an actual source-qualified due provider, preserving local stock plus signed outside net-flow accounting.
- `SG-P8-opening-retirement-income` in src/core2/data/opening-income.json: Fictional summarized covered career, retirement claim/award and local retirement disbursement view. Replacement: Source-matched individual covered-career, claim/eligibility, award and SSA insured-worker payment-calendar producers, with actual award/territory/provider crosswalk and population calibration. (parameter rows: src/core2/data/parameters.json:openingRetirementCareerStartAgeYears, src/core2/data/parameters.json:openingRetirementSchoolContextYears, src/core2/data/parameters.json:openingRetirementBenefitMonthlyMinor)

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/opening-income-funding.json, src/core2/data/opening-income.json, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/core/

**Notes.** Folded from: core-stopgap-opening-income-funding-opening-outside-flow-terms-prior, core-stopgap-opening-income-opening-generated-income-prior. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
