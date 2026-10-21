---
id: gov-outside-revenue-fees
title: "Charges, fees and miscellaneous revenue are paid by the people and businesses that use the service"
area: gov
kind: stopgap
priority: 1
size: M
status: claimed
claimed-by: claude/gov-outside-revenue-fees
pr:
blocked-on: gov-outside-revenue-fees-wiring
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:15:36.337Z
---

**What.** Charges, fees and miscellaneous general revenue (tuition at public colleges, hospital and park charges, transit fares, permits, utility charges) reach each treasury today as an even twelfth of Census revenue from the outside account, with nobody paying them. Replace that share so each charge is paid by the households and businesses that use the service, on the day they use it, at the price the law and the budget set, into the treasury of the government that runs it. The player would notice that raising a park or transit fee costs the people who use the park or ride, and that a fee nobody uses brings in nothing.

**Rules.** Wire to the world: every fee moves a payer's money to a treasury on the journal, proven in a generated world, and covers every service line in the module; An effect is a read, not a record: the price in force is read from the law and budget at the moment the service is used or billed; One model, two tiers: counted households pay by the same rule as full people times their count; This is a game, not a spreadsheet: no new form, receipt or payment step is added for the player; the fee rides on the existing purchase, tuition or fare writers; No dice: use decides who pays, never a roll; One rule, all 56 places: no state or city named; fee schedules live in place data; Estimate, never UNKNOWN: an unsourced fee level starts from the real average marked ESTIMATED with source and spread; Replace, never layer: the fee share of the monthly plug is deleted in the same change; Speed: fees post on the day of use through existing writers, with no new world scan.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): `scripts/core2-year/closures.mjs` check 6 shows no unmatched plug dollars for the fees family, the treasury's charges revenue equals the sum of named payers' payments on the journal, and a named household's fare or fee is traced from its cash to the treasury. Add the test beside `src/core2/budgets.test.ts`. The owner plays it: raises a transit or park fee in a council bill and later sees the budget's charges line move and the ones who paid.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/modules/purchase-tax.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps.json

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`).
