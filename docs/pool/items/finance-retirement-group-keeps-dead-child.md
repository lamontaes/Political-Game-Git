---
id: finance-retirement-group-keeps-dead-child
title: "A retiree's death leaves the group funding contract listing their ended award, and the next due date throws (Kagman, Northern Mariana Islands)"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/retirement-group-death
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T14:17:00.332Z
---

**What.** A retiree's death ends their award, but the funding contract that pays their group's awards kept listing it, so the next due date threw "Outside obligation refers to missing, inactive or unmatched recipient terms" and the year stopped (Kagman, Northern Mariana Islands, seed ac8f26bab5: the retiree died December 4, 2025 and the group's January 1, 2026 due date failed). The opening groups full retirees behind one funding contract per payer and due date, and the settlement checks that its amount equals the sum of the actual awards it lists. When a listed retiree dies, the funding now drops the award and its amount, and ends when no award is left.

**Rules.** Every dollar balances: the funding falls by exactly the ended award's amount. Wire to the world: the settlement reads the shortened list. No dice. Replace, never layer: the death path owns the change, nothing else edits the list.

**Done when.** In a played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a retiree in a group of two or more awards dies, the group's funding drops their award and amount (contract ids named), and the next due date settles without a throw; the Kagman seed's year now runs to its end. A test in src/core2/retirement-group-death.test.ts covers it.

**Files.** src/core2/finance-state.ts, src/core2/retirement-group-death.test.ts

**Notes.** Found by a scan of 40 random places for a year-run crash. A person who moves away with their award is a separate stopgap (core-income-award-follows-person).
