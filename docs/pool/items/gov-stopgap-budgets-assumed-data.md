---
id: gov-stopgap-budgets-assumed-data
title: "Stopgaps in budgets (assumed-data): 2 open"
area: gov
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
after: laws-other-places-chains, gov-withholding-local-exemptions
size: M
source: "src/core2/data/stopgaps.json, src/core2/modules/budgets.ts, kind assumed-data"
claimed-at:
---

**What.** Roll-up for the two withholding stopgaps in src/core2/modules/budgets.ts. SG-WORLD-withholding-residence-law (a worker living outside the town reads the starting rows because other places' law chains are not recorded) is closed by the existing pool item laws-other-places-chains and its two parts, whose done-when already requires withholding to read a worker's residence chain, and this item adds nothing to it. SG-WORLD-withholding-local-base (a local income tax on wages or AGI is taken on gross pay with no exemptions) is closed by gov-withholding-local-exemptions, written Oct 20. Nothing is built under this item itself.

**Rules.** Never close a row by deleting it: each row is marked resolved with the record that closes it. Replace, never layer: the static residence map and the gross-pay base are deleted when the real reads land. An effect is a read, not a record: withholding reads the recorded chain and the exemption terms on the paycheck day.

**Done when.** Both stopgap rows are resolved in src/core2/data/stopgaps.json: in a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a worker who lives outside the town is withheld from by their residence's recorded law and a local-tax paycheck is taken after the exemption, shown by paycheck and law row ids in src/core2/tax-withholding.test.ts.

**Files.** src/core2/modules/budgets.ts, src/core2/tax-withholding.ts, src/core2/data/stopgaps.json, src/core2/tax-withholding.test.ts

**Notes.** First row: Payroll withholding for a worker who lives outside the town reads the law of the worker's residence from the starting-law rows (the town's recorded rows where a jurisdiction is shared with the town), so a law enacted in

Looked at Oct 20 (claude/political-game-pool-3xfqef-6), released unbuilt. SG-WORLD-withholding-residence-law needs each other place's law chain opened as a recorded world (enacted acts included) so a worker's residence law can be read; today only the town's chain is recorded, so it is the engine item `laws-other-places-chains` (not yet in the pool; a builder files it). SG-WORLD-withholding-local-base needs personal exemptions and adjustments as sourced numbers in the law rows (`starting-law.json` names the base and carries no amounts) and pre-tax deductions on the workers' records; the amounts are research data per state and local row, then a read in the withholding step. Neither is a change a session can finish without that input.

Oct 20 (pool feeder): spec written; the 'laws-other-places-chains' the Looked-at note says a builder must file already exists in the pool (with record and enacted parts), so no new item is needed for the residence row.
