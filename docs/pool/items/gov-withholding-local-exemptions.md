---
id: gov-withholding-local-exemptions
title: "A local income tax on wages or AGI is taken after the personal exemption the law row carries"
area: gov
kind: wiring
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
milestone:
source: split from gov-stopgap-budgets-assumed-data by pool feeder Oct 20
checked: fable 2026-11-10
---

**What.** A county or city flat income tax on a paycheck is taken on the gross pay when the law row's base is wages or AGI, and after the standard deduction only when the base is taxable income, because the law rows name the base but carry no exemption or adjustment amounts. Research the personal exemption or allowance each local income-tax row allows (with its source), add it to the row as `terms.personalExemption` (dollars a year, per person) next to the existing base, and read it in `withholdingFor` so the local tax is the rate times pay less the exemption, spread over the pay periods. This replaces the registered stopgap SG-WORLD-withholding-local-base.

**Cause.** Found in code: `withholdPay` in src/core2/modules/budgets.ts (line 1805; its stopgap marker SG-WORLD-withholding-local-base is at line 1849) and `localStandardDeduction` in src/core2/tax-withholding.ts (line 92) used by `withholdingFor` (line 112). The stopgap row is in src/core2/data/stopgaps/world.json.

**Fix.** For each local income-tax row in src/core2/data/laws/starting-law.json, find the personal exemption in the local ordinance or the state's local-tax guide, add `terms.personalExemption`, and have `withholdingFor` subtract it before the rate. A row with no exemption found keeps zero, marked ESTIMATED with its source. Pre-tax contributions (retirement, health premiums) stay out and are raised as a question for the owner in the PR body.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: each amount cites the local ordinance or the state's local-tax guide and is SOURCED, or ESTIMATED with a spread where the row names none. One rule, all 56 places: the amounts are terms on the law rows and no jurisdiction is named in code. Estimate, never UNKNOWN: a row with no exemption found keeps zero marked ESTIMATED with its source. An effect is a read, not a record: the exemption changes the withheld dollars the treasury receives and the worker's net pay. This is a game, not a spreadsheet: pre-tax contributions are real paycheck steps the game does not model.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a local income tax row and a seed the builder did not choose, both named. A worker's local withholding equals the row's rate times pay less the personal exemption, shown by paycheck record id and law row id, and the treasury receipt equals the line. src/core2/tax-withholding.test.ts proves it and SG-WORLD-withholding-local-base is resolved (or narrowed to pre-tax contributions) in src/core2/data/stopgaps/world.json.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/core2/tax-withholding.ts, src/core2/data/laws/starting-law.json, src/core2/tax-withholding.test.ts, src/core2/data/stopgaps/world.json

**Notes.** Oct 20 (pool feeder): split from gov-stopgap-budgets-assumed-data. CTO call recommended: pre-tax deductions are not built (game, not spreadsheet); the row is narrowed to name them.

**Notes (Fable's check, Nov 10).** This item also covers what is left of gov-standin-withholding-residence (proposed drop): the working town's local tax withheld on its own base, with the local law rows' exemptions and adjustments, and SG-WORLD-withholding-local-base resolved.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have researched a personal exemption for each local income tax; the withheld amount is already close and few places have one.
