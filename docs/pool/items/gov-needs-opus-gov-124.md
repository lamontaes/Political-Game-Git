---
id: gov-needs-opus-gov-124
title: "Needs from other sessions listed in OPUS-GOV.md (line 124): 3 lines"
area: gov
kind: wiring
priority: 2
status: done
claimed-by: claude/gov-124
pr: #4524
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/OPUS-GOV.md "Needs from other sessions" (line 124)'
claimed-at: 2026-10-15T23:36:49.450Z
---

**What.** Three requests remain from OPUS-GOV: core rows in `outside-flows.json` for the treasury and federal borrowing so the stricter M0-08 money check passes (with `setStandingContractAmount` for recipient-income contracts, SG-GOV-opening-award-level), a rerate for the residents' retirement flows, and a budget bill with no executive carrying `departmentRequests` lines (`legislature.ts` line 439). The money rows are being built by the gov-outside-revenue items; the rest need checking on main. Verify each line, close what is built, and split what is not into small items.

**Rules.** Wire to the world: each line closes when another engine reads what it wrote in a played year, named by record id; One model, two tiers: the retirement rerate applies to counted retirees by the same rule as full ones times their count; An effect is a read, not a record: a benefit level change is read by the payment on its next due date; Placeholders: SG-GOV-opening-award-level and SG-GOV-counted-* rows close only when the amounts follow the law; Look before you ask: check the gov-outside-revenue-* items first so nothing is built twice.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a Social Security cut or raise in a federal budget changes the retirement award of a named full person and of a counted retiree group from the next due date, `setStandingContractAmount` carries the new level on the journal, and a no-executive budget bill carries its `departmentRequests`. Each of the three lines in `docs/archive/2026-10-23/coordination/OPUS-GOV.md` is struck with an id. The owner plays it: cuts Social Security in a bill and watches a retiree's check shrink.

**Files.** src/core2/budgets-treasury.ts, src/core2/finance-state.ts, src/core2/modules/legislature.ts, src/core2/data/outside-flows.json, docs/archive/2026-10-23/coordination/OPUS-GOV.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

**Checked Oct 15 (claude/gov-124, no code written).** Line 1 (core rows in `outside-flows.json` for the treasury and borrowing): tracked by the `gov-outside-revenue-*` items, which are replacing the plug rows. Line 2 (retirement rerate): counted retirees follow the federal line (`rerateCountedRetirement`, called from `applySocialSecurityLevel`) and awards claimed in play follow it through `setObligationAmount`; the awards the opening wrote for full people do not, because `setStandingContractAmount` (`finance-state.ts`) refuses a recipient-income contract, and the retirement funding that pays them (`opening-income-funding.ts`) is built from each award's recorded monthly amount and checks it against the contract. Changing the amount means changing the funding term with it; that is its own item, `core-opening-award-level-rerate` (stopgap SG-GOV-opening-award-level). Line 3 (a budget bill with no executive carries `departmentRequests`): built, `councilBudget` in `legislature.ts` drafts the bill from `departmentRequests` when no executive set priorities.
