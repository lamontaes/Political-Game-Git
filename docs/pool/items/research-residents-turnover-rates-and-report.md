---
id: research-residents-turnover-rates-and-report
title: "Source turnover reference rates and report a played year with stable event weights"
area: people
kind: research
priority: 2
size: M
status: in-pr
claimed-by:
pr: #5796
blocked-on:
source: added with npm run pool -- add
---

**What.** Source the BLS JOLTS turnover and CPS absence reference tables with citations and explicit ranges across industry rows. A generated played year reports weighted hiring, quitting, layoffs and separations from actual job-change records, retaining event-time quantities across fill-in. This bounded item preserves the useful research and turnover report while the original cadence item remains open for a comparable CPS absence measure and the separately registered counted mechanic.

**Rules.** Research before building: read the original BLS tables and distinguish published rates from derived ranges and attendance diagnostics. One model, two tiers: employment and historical event quantities count the people each record represents without reweighting old events after fill-in. One rule, all 56 places: generated-world proofs draw places from the full corpus and record their seeds and job-change ids.

**Done when.** Every JOLTS turnover table and the CPS absence reference table carries a sourced citation and a range across its industry rows. A one-year buildBenchWorld in a drawn place reports all four weighted turnover rates with its full seed and job-change record ids. Weighted employment and event-time quantity stay correct when a counted worker is filled in, as positive generated-world tests show. The research reader, tripwire and calibration guards pass or document exact clean-main failures; the original cadence item stays open for a comparable CPS absence report.

**Files.** data/research/people/jolts-cps-turnover-absence-2025.json, src/core2/turnover-check.ts, src/core2/residents-turnover-bands.test.ts

**Notes.** TODO
