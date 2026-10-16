---
id: people-dead-payer-finance-contracts
title: "A mortgage or lease in a dead person's name keeps drawing their account, and a surviving adult at home never takes it over"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #4829
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A finance contract (a mortgage `mortgage:<household>:household-purchase` or a lease `lease:<household>`) lists a dead person as its payer and stays open, so it keeps drawing their account every month (276,476 minor units a month in Kaanapali, Hawaii, seed 0d0cd9dae4176168) until the estate is empty and then falls into arrears, while a living spouse or adult at home never takes it over. The estates engine pays only the account obligations the person owed at death. When the payer dies, a living adult at home should become the contract's payer from the next due date, or with none left the estate should pay the debt first and the contract should end with its lien settled. Keep the money balanced: a mortgage's unpaid principal is the lender's asset.

**Rules.** An effect is a read: the contract reads who is alive when it falls due. No dice: the oldest living adult at home takes over. Replace, never layer: one hand-over rule shared with the living-cost bills (`livingPayerOf` in `src/core2/modules/residents.ts`). Every dollar still balances. One rule, all 56 places.

**Done when.** In a one-year played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, both named in the PR body) a resident who pays a mortgage or lease dies, the contract names a living adult at home as its payer from the next due date (or ends with the debt paid from the estate where no one is left), the dead person's account is not drawn on by it, and the finance closure check (`scripts/core2-year/closures.mjs`) passes. A test in src/core2/estate-contracts.test.ts proves it and fails on current main.

**Files.** src/core2/finance-state.ts, src/core2/estates.ts, src/core2/modules/residents.ts, src/core2/modules/housing.ts

**Notes.** Found while taking people-estate-drained-by-living-costs, whose fix (branch claude/estate-living-costs) moves only the residents engine's own flows. Finance cash settlement checks a contract's payers against its admission (`sameIds(original.payerIds ...)` in src/core2/finance-cash.ts), so a payer change must update that trace too.
