---
id: gov-withholding-local-exemptions
title: "A local income tax on wages or AGI is taken after the personal exemption the law row carries"
area: gov
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: split from gov-stopgap-budgets-assumed-data by pool feeder Oct 20
---

**What.** Replace SG-WORLD-withholding-local-base. withholdPay in src/core2/modules/budgets.ts takes a county or city flat income tax on a paycheck's gross pay when the law row's base is wages or AGI, and after the standard deduction only (localStandardDeduction in src/core2/tax-withholding.ts) when the base is taxable income, because the law rows name the base but carry no exemption or adjustment amounts. Research the personal exemption or allowance each local income-tax row in src/core2/data/laws/starting-law.json allows (with its source), add it to the row as terms.personalExemption (dollars a year, per person) next to the existing base, and read it in withholdingFor so the local tax is the rate times pay less the exemption, spread over the pay periods.

**Rules.** Research before building: each amount cites the local ordinance or the state's local-tax guide and is SOURCED, or ESTIMATED with a spread where the row names none. One rule, all 56 places: the amounts are terms on the law rows and no jurisdiction is named in code. Estimate, never UNKNOWN: a row with no exemption found keeps zero marked ESTIMATED with its source. An effect is a read, not a record: the exemption changes the withheld dollars the treasury receives and the worker's net pay. This is a game, not a spreadsheet: pre-tax contributions (retirement, health premiums) are real paycheck steps the game does not model, so they are left out and raised as a question for the owner in the PR body, not built. Every dollar balances: the withheld line equals the treasury's receipt.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a local income tax row and a seed the builder did not choose, a worker's local withholding equals the row's rate times pay less the personal exemption, shown by paycheck record id and law row id, and the treasury receipt equals the line; src/core2/tax-withholding.test.ts proves it and SG-WORLD-withholding-local-base is resolved (or narrowed to pre-tax contributions) in src/core2/data/stopgaps.json.

**Files.** src/core2/modules/budgets.ts, src/core2/tax-withholding.ts, src/core2/data/laws/starting-law.json, src/core2/tax-withholding.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): split from gov-stopgap-budgets-assumed-data. CTO call recommended: pre-tax deductions are not built (game, not spreadsheet); the row is narrowed to name them.
