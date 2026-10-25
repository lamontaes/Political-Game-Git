---
id: laws-income-tax-flatten-sponsor-rate
title: "A graduated income tax's repeal writes the sponsor's own flat rate, not one national rate"
area: laws
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When a catalog act repeals a graduated state or local income tax, incomeTaxAct in src/core2/law-reach/group-b-money.ts enacts one national flat rate (stateFlatIncomeTaxPercent, 4.25%) for every place. Real legislatures that flattened chose a rate tied to their own old schedule: five conversions from 2023 to 2026 set the new rate at 0.667 to 1.0 of the old top rate, sourced in data/research/laws/taxfoundation-2022-2026-flat-tax-conversions.json. The provision should carry the rate the sponsor writes from their views and the law in force, as the legislature's rate sections already do through shapedRate, so the repeal reads that rate instead of the national parameter and resolves SG-GOV-REACH-B-flat-tax-replacement.

**Rules.** Sliding scales and causes: the flat rate comes from the sponsor's views and the place's own old schedule, never one national number, and the sourced conversion band only checks the totals. Wire to the world: withholding for full and counted workers reads the enacted rate, and an affected worker receives the explanation with a director line.

**Done when.** In a drawn place from all 56 in the played world (buildBenchWorld, seed named in the PR), a repeal of a graduated income tax enacts the sponsor's rate from the provision, the law row id shows that rate, a named worker's withholding record reads it, and SG-GOV-REACH-B-flat-tax-replacement is resolved in src/core2/data/stopgaps.json, shown by src/core2/law-reach-group-b.test.ts.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/modules/legislature.ts, src/core2/data/laws/reach-group-b-parameters.json, data/research/laws/taxfoundation-2022-2026-flat-tax-conversions.json

**Notes.** TODO
