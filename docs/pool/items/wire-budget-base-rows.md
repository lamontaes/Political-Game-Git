---
id: wire-budget-base-rows
title: "Budget bases from rows: one base row per government in public-budget-bases.json, the five level branches in publishedBudgetFor deleted"
area: gov
kind: feature
priority: 1
size: S
status: in-pr
claimed-by: claude/wire-budget-base-rows
pr: #6553
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T05:59:20.342Z
---

**What.** Line 29 of the engine map (E4). publishedBudgetFor in src/core2/modules/budgets.ts builds each government's base by a branch (federal, island area, state, local split by county share). The exporter writes one row per government per place; the engine reads the row the government names.

**Rules.** Replace, never layer: the branches, the county-share helper and the territory block are deleted in the same PR. One engine per mechanic (AGENTS.md first bullet). Guards pass.

**Done when.** In a drawn world (place and seed named) every government's opening budget is its row: no level branch left in publishedBudgetFor (grep named), published lines within rounding of main's for every place, budgets-world test green.

**Files.** src/core2/modules/budgets.ts,scripts/research/export-public-budget-bases.py,data/research/money/public-budget-bases.json

**Notes.** Split from wire-office-budgets-justice (line 29) so each line ships on its own PR. lead: wire-office.
