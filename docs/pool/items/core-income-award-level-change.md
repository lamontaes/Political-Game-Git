---
id: core-income-award-level-change
title: "An opening retirement award follows the Social Security line"
area: core
kind: stopgap
priority: 2
size: M
status: done
claimed-by:
pr: #4661
blocked-on:
source: "split from gov-stopgap-budgets-treasury-faked-mechanic (SG-GOV-opening-award-level), Oct 16"
claimed-at:
---

**What.** When the federal Social Security line is cut or raised, `applySocialSecurityLevel` re-rates the awards claimed in play and the counted retirees, but the retirement awards the opening wrote for full people keep their amount, because the finance engine refuses to change a recipient-income contract (`setStandingContractAmount` in finance-state.ts). Let it accept a recipient-income contract's new level from its next due date. The opening also groups the awards behind one segregated payer's funding contract, so that funding must change by the same sum, and every dollar must still balance.

**Rules.** Every dollar balances: the recipient's amount and the funding contract that pays it change by the same sum from the same due date, with arrears untouched. Wire to the world: the retiree's household reads the new amount. No dice: the law's level decides the award. Replace, never layer: the opening-award exemption and its stopgap marker are deleted.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a Social Security cut or raise changes a named full retiree's award from the next due date, shown by the award contract id, the funding contract id and the cash journal record id for the first changed payment; the finance state test and src/core2/budgets.test.ts pass and SG-GOV-opening-award-level is resolved.

**Files.** src/core2/finance-state.ts, src/core2/budgets-treasury.ts, src/core2/opening-income-funding.ts, src/core2/data/stopgaps.json

**Notes.** Split from gov-stopgap-budgets-treasury-faked-mechanic. The other row in that item (public employers paid from outside accounts) is gov-public-payroll-wire. The funding contract groups awards by payer and due date (opening-income-funding.ts), so one retiree's change moves the group's sum.

Sent back 2026-10-16 from PR #4661 (branch claude/core-opening-award-rerate): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
