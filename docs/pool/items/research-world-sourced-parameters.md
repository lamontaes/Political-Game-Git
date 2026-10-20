---
id: research-world-sourced-parameters
title: "Research: sourced parameters for opening finance, business compliance cost and credit"
area: world
kind: research
priority: 2
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-bk
pr: #5419
blocked-on: researcher: the 2005 PACE report tables by industry (epa.gov and census.gov PDFs) cannot be fetched from the cloud network (certificate error and 503); the minimum-loan row is done in 5419, and the national 0.4 percent of output is already the compliance parameter's source
source: "collapsed Oct 19, 2026 from world-stopgap-opening-finance-uncalibrated-opening-finance-calendar, world-stopgap-parameters-assumed-data, world-stopgap-parameters-uncalibrated-tunable"
claimed-at: 2026-10-20T13:46:26.832Z
---

**What.** Source the numbers behind opening finance, business compliance cost and credit. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 3 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/world/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-P8-opening-finance-cadence` in src/core2/data/opening-finance.json: Monthly aggregation, first-next-period-month due phase, opening assigned-cost cap, normalized opening price, mean-year steady active-schedule annualization and inherited calendar-wage fallback. Replacement: Recorded standing-term calendars or identified dated purchase/budget distributions, explicit operating claim priorities and actual supplier/cost inventory; matched empirical calibration for cadence and demand-adjusted expenditure crosswalks. (parameter rows: src/core2/data/parameters.json:openingFinancePeriodMonths)
- `SG-WORLD-business-compliance-cost` in src/core2/data/business/parameters.json: A compliance duty costs every bound business twice the manufacturing average pollution-abatement share of its operating costs. Replacement: Census PACE abatement operating costs by industry (NAICS), scaled by the standard the county misses. (parameter rows: src/core2/data/business/parameters.json:businessComplianceShareOfCosts)
- `SG-WORLD-credit-minimum-loan` in src/core2/data/credit/parameters.json: The town bank's smallest personal loan is a common published minimum ($1,000), not the bank's own product terms. Replacement: A sourced range of community-bank personal loan minimums (FDIC or call-report product data). (parameter rows: src/core2/data/credit/parameters.json:creditMinimumLoanMinor)

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/business/parameters.json, src/core2/data/credit/parameters.json, src/core2/data/opening-finance.json, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/world/

**Notes.** Folded from: world-stopgap-opening-finance-uncalibrated-opening-finance-calendar, world-stopgap-parameters-assumed-data, world-stopgap-parameters-uncalibrated-tunable. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
