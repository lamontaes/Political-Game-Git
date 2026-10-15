---
id: gov-outside-revenue-fees-wiring
title: "Fees and charges are paid on the day of use by the households and businesses that use the service, by service"
area: gov
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-outside-revenue-fees-data
source: added with npm run pool -- add
---

**What.** Replace the monthly stand-in for `chargesAndFees` and `miscellaneous` revenue (`closeTreasuries` in `src/core2/budgets-treasury.ts`, the `outside-revenue:` transfer) with payments by the people and businesses that use the service. The service shares are in `data/research/money/service-charges-2022.json` (Census 2022, by state and level): education tuition and charges, hospital charges, highway tolls, sewerage and solid waste, parks, and so on, and for miscellaneous revenue interest earnings, fines, sales of property and the rest. The town's own residents' share is paid by households and businesses already in the world through their existing living-cost spending: the part of the "household.outside-living-costs" lump that is a public charge goes to the local treasury instead of the outside account, so household cash does not change. The non-resident share (users from elsewhere in the state) is paid by a named outside group with the service named on the transfer. Interest earnings come from the treasury's own balance, not a payer.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug's share for these two lines goes in the same change); one model, two tiers (a counted group pays with the same rule as a full household, times its count); speed (a year under two minutes, at most 20% slower).

**Done when.** In a drawn place, a one-year run of the played world (`buildBenchWorld`), `scripts/core2-year/closures.mjs` check 6 matches no plug row for these two lines, every payment names its payer group and its service, and the year's sum equals the budget line within the data's spread. The PR body follows one named household's school or hospital charge to the treasury and back out as spending.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/modules/residents.ts (the outside living costs), src/core2/opening-finance.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps.json

**Notes.** Found while building `gov-outside-revenue-fees-data` (Oct 15): the town household's public charges are today inside one lump of outside living costs (`FIXED_SPENDING` in residents.ts), so the split is a change to the opening finance bindings and to the residents engine, which other sessions touch; claim it with that in mind. The federal line is `miscellaneousReceipts` and has no Census state split. Overlap: PR #4475 fills the bodies of the sibling outside-revenue items.
