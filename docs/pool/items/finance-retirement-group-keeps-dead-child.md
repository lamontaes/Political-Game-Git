---
id: finance-retirement-group-keeps-dead-child
title: "A retiree's death leaves the group funding contract listing their ended award, and the next due date throws (Kagman, Northern Mariana Islands)"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/finance-retirement-dead-child
pr: #4739
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T15:55:16.305Z
---

**What.** In Kagman, Northern Mariana Islands (seed ac8f26bab5) a retiree died on December 4, 2025 and the group's January 1, 2026 due date threw "Outside obligation refers to missing, inactive or unmatched recipient terms." The opening groups full retirees' awards behind one funding contract per payer and due date, and settlement requires its amount to equal the sum of the awards it lists. A death ended the retiree's award (`endRecipientIncomeAtDeath` in `src/core2/finance-state.ts`) but left it on the funding contract's list. Drop the award and its amount from the group's funding when the retiree dies, and end the funding when no award is left.

**Rules.** An effect is a read, not a record: the next payday reads the funding contract's list and settles with the survivors. Never delete a record to hide a failure: the ended award stays on record. Speed: no daily scan; act on the day of the death.

**Done when.** In a played world (buildBenchWorld, every module installed) in a drawn place and seed, a test kills a retiree in a group of three and checks the funding lists two awards with their summed amount and the next due date settles, by contract and award record ids; the Kagman year runs to its end. It fails on the old code.

**Files.** src/core2/finance-state.ts, src/core2/retirement-group-death.test.ts

**Notes.** Body repaired from the item's title and its pull request on 2026-10-16.

Sent back 2026-10-16 from PR #4739 (branch claude/retirement-group-death): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
