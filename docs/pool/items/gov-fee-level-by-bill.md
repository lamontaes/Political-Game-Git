---
id: gov-fee-level-by-bill
title: "A council bill can set a government fee's level (a park or transit fee), and the charges paid move with it"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-outside-revenue-fees
source: added with npm run pool -- add
---

**What.** No bill sets a charge's level: a government's charges move only with its budget's charges line (stopgap SG-GOV-fee-level-by-bill, owner decision). Once the owner rules whether a council sets fees by bill, let a council bill change a named fee's level in place data, read by the charge payment at the moment it is paid, so the payers pay the new level and the budget's charges line follows. The player would notice that raising a park or transit fee costs the people who use the park or ride.

**Rules.** An effect is a read, not a record: the fee in force is read when the charge is paid. No dice. One rule, all 56 places: fee schedules live in place data. This is a game, not a spreadsheet: the fee rides on the existing bill and payment writers, no new player step. Owner decisions are flagged, never waited on.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named), a council bill that raises a park or transit fee passes, the named payers' next payments of that fee rise by record id, the budget's charges line moves, and SG-GOV-fee-level-by-bill is resolved; the owner raises a fee in a council bill and later sees the charges line move and the ones who paid.

**Files.** src/core2/budgets-service-charges.ts,src/core2/modules/budgets.ts,src/core2/data/stopgaps.json

**Notes.** Split from gov-outside-revenue-fees (#5926). The owner question is under Open in docs/coordination/OWNER-DECISIONS.md.
