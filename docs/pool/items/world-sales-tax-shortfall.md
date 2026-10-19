---
id: world-sales-tax-shortfall
title: "Sales tax collected but the treasury is short (budgets.test.ts:237)"
area: world
kind: bug
priority: 1
status: done
claimed-by:
pr: #4419
blocked-on:
milestone:
source: "reissue item 9; overnight pool item 11"
---

**What.** budgets.test.ts "the sales tax in force is collected on the town's purchases, each level's share to its treasury" fails on main with GOLDEN_PATH_SEED=cto1: the treasury's liquid balance is below what the tax collected. Follow the dollar to where it goes if not the treasury and fix at the root.

**Rules.** Every dollar balances through postJournal; fix at the root, never loosen the test.

**Done when.** The test passes on seed cto1; run with --dir src so stale copies under .claude/worktrees are not picked up.

**Files.** src/core2/budgets.test.ts, budgets.ts, budgets-treasury.ts

**Notes.** Pre-existing on main.
