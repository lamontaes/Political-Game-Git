---
id: gov-standins-other
title: "Credit, business, staff, budgets, legislature and macro stand-ins replaced or relabeled as sourced estimates"
area: gov
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from gov-world-standins-oct14
---

**What.** PR #4146 (branch stopgaps/gov-world) relabeled or replaced 18 stopgap rows across several engines in one change, and it can no longer be merged: main moved on and 42 files conflict. This item redoes the credit, business, staff, budgets, legislature, interest-group, renewal and macro rows against main's current files, one engine's worth at a time. For each row, either build the real mechanic and close the row, or turn the stand-in into a labeled estimate with its source and spread and state what replaces it. The rows are: SG-GOV-staff-hire-out-of-work, SG-GOV-budget-adopted-by-rule, SG-GOV-committee-structure, SG-GOV-group-lobbyist-stand-in, SG-GOV-staff-unpaid, SG-M1-opening-pregnancies, SG-WORLD-macro-mortgage-spread, SG-WORLD-macro-public-budget, SG-WORLD-credit-line-stand-in, SG-WORLD-credit-business-applies, SG-WORLD-credit-bank-equity-only, SG-WORLD-business-counted-owner-choice, SG-WORLD-prices-household-shares, SG-WEB-outcome-drift, SG-WORLD-business-no-successor, SG-GOV-appointee-pay, SG-GOV-electorate-approval, SG-GOV-township-law-level.

**Rules.** Placeholders: a row closes only when the real mechanic or a sourced, labeled estimate replaces the fake, never by deleting the row. Replace, never layer: the stand-in is deleted in the same change. Estimate, never UNKNOWN: a value a player can see starts from the real average with a spread and a source. One rule, all 56 places: the move names no place in code.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed and place named in the PR body) each listed row that is closed shows another engine reading what replaced it, by record id, and the rows still open in src/core2/data/stopgaps.json each carry a reason; the stopgap tripwire test and the tests for the changed engine pass.

**Files.** src/core2/modules/credit.ts, src/core2/modules/business.ts, src/core2/modules/staff.ts, src/core2/modules/budgets.ts, src/core2/modules/legislature.ts, src/core2/modules/renewal.ts, src/core2/data/stopgaps.json

**Notes.** Split Oct 19 from gov-world-standins-oct14 (see PR #5120 for the conflict list). The old branch stopgaps/gov-world holds the earlier attempt at each row; read its diff for the approach, then redo it on a fresh branch from main.
