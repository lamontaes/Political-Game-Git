---
id: gov-outside-spending-payees
title: "Treasury spending that leaves the town goes to real payees: contractors, public workers elsewhere, benefit recipients, bondholders"
area: gov
kind: stopgap
priority: 1
size: M
status: done
claimed-by: claude/gov-outside-spending-payees
pr: #4499
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-15T22:39:05.665Z
---

**What.** Treasury spending that leaves the town (federal and state contracts, public workers who live elsewhere, benefit recipients, bondholders) is paid to the outside account in an even twelfth each month instead of to a named payee. Pay each line to real payees: contractors as business records, public workers on the government's payroll, benefit recipients through their programs, and bondholders through the same lender records the borrowing item creates. The player would notice that a cut or a raise in a spending line changes what named workers, contractors and recipients receive.

**Rules.** The chain is the acceptance: follow one spending dollar from the treasury to a named contractor or recipient and on to what they bought; An effect is a read, not a record: the line's amount is read from the budget in force when it pays, and recipients are read from program eligibility; One model, two tiers: counted recipients and workers are paid by the same rule as full ones times their count; No dice: the program's rules and the budget decide who is paid, never a roll; One rule, all 56 places: no place named; payee shares are place data; Estimate, never UNKNOWN: an unsourced payee split starts from the real average marked ESTIMATED with source and spread; Replace, never layer: the spending share of the plug is deleted in the same change; Speed: payments post on due dates through existing writers.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): `scripts/core2-year/closures.mjs` check 6 shows no unmatched spending flows, `SG-GOV-public-employers-outside` is closed or narrowed, and the PR body names one contractor, one public worker and one benefit recipient traced to treasury journal entries by record id. Tests beside `src/core2/budgets.test.ts` cover each family. The owner plays it: cuts a department's line and reads who lost pay or a contract.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/modules/work.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps.json

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`).
