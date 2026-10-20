---
id: research-opening-capital-sourced-parameters
title: "Research: sourced parameters for the opening's firm cash and owner funding"
area: core
kind: research
priority: 2
size: M
status: claimed
claimed-by: claude/research-capital
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from core-stopgap-opening-capital-estimated-private-opening-cash-crosswalk, core-stopgap-opening-capital-modeled-unfunded-unsupported-opening-owner, core-stopgap-opening-capital-unmeasured-opening-private-cash-buffer-distribution"
claimed-at: 2026-10-20T01:42:50.800Z
---

**What.** Source the numbers behind the opening's firm cash and owner funding. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 3 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/core/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-P8-opening-private-cash-buffer` in src/core2/data/opening-capital.json: Generated private-employer opening cash stock from real JPMC quartile/median anchors and an explicitly estimated WHO prior times scheduled payroll plus a compatible IRS nonwage accounting-cost proxy; not observed individual cash or an owner equity transaction. Replacement: Recorded firm opening balances and capital provenance, or a matched ALL-debit/balance cohort adapter with honest distributions and measured crosswalk evidence. (parameter rows: src/core2/data/parameters.json:openingEmployerCashBufferDaysAll, src/core2/data/parameters.json:openingEmployerCashBufferDaysRestaurants, src/core2/data/parameters.json:openingEmployerCashBufferDaysRepair, src/core2/data/parameters.json:openingEmployerCashBufferDaysRetail, src/core2/data/parameters.json:openingEmployerCashBufferDaysConstruction, src/core2/data/parameters.json:openingEmployerCashBufferDaysPersonalServices, src/core2/data/parameters.json:openingEmployerCashBufferDaysWholesale, src/core2/data/parameters.json:openingEmployerCashBufferDaysMetalMachinery, src/core2/data/parameters.json:openingEmployerCashBufferDaysHealthCare, src/core2/data/parameters.json:openingEmployerCashBufferDaysHighTechManufacturing, src/core2/data/parameters.json:openingEmployerCashBufferDaysProfessionalServices, src/core2/data/parameters.json:openingEmployerCashBufferDaysHighTechServices, src/core2/data/parameters.json:openingEmployerCashBufferDaysRealEstate)
- `SG-P8-opening-unsupported-owner-funding` in src/core2/data/opening-capital.json: Fresh generated public, institution, nonbusiness and unknown owners open with modeled zero-funded prototype journal cash pending genuine dated funding. Replacement: REVIEW16 public-budget and national modules must supply genuine dated funding authority, appropriations and treasury/account receipts for represented institutions; other unsupported owners need separately source-qualified recorded funding.
- `SG-P8-opening-private-cash-buffer-spread` in src/core2/data/opening-capital.json: A WHO-only stable per-firm startup cash-buffer rank and continuous quantile curve with one authored tail-span coefficient. Replacement: Recorded individual firm liquidity/capital provenance or an independently observed matched ALL-cash-debit/balance cohort distribution with identified crosswalk and tail evidence. (parameter rows: src/core2/data/parameters.json:openingEmployerCashBufferTailSpan)

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/opening-capital.json, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/core/

**Notes.** Folded from: core-stopgap-opening-capital-estimated-private-opening-cash-crosswalk, core-stopgap-opening-capital-modeled-unfunded-unsupported-opening-owner, core-stopgap-opening-capital-unmeasured-opening-private-cash-buffer-distribution. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
