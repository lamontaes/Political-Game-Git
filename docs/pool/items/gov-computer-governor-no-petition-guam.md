---
id: gov-computer-governor-no-petition-guam
title: "computer-governor-clemency.test fails on main in Barrigada, Guam (seed e31857c583861fe1, draw 1): the governor takes up no petition in 120 days with prisoners serving"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On clean main, src/core2/computer-governor-clemency.test.ts with CLEMENCY_AI_SEED=e31857c583861fe1 CLEMENCY_AI_FROM=1 CLEMENCY_AI_TO=2 draws Barrigada, Guam (territory:GU:barrigada) and fails at its decided-petitions assertion: the governor official:term:seat:US-GU:governor:2025-01-20 took up no petition in 120 days with 16 prisoners serving in the territory. clemencyDue in src/core2/office-day-state.ts offers the governor any prisoner serving in the state on each review day, so either the review day never reaches the computer governor's day in this territory or the entry is offered but never decided. The test fails on main, so the failure is not from the branch that found it.

**Rules.** One rule, all 56 places: a territory's governor with clemency authority takes up petitions by the same rule as a state's, and the fix names no place. No dice: the decision comes from the governor's recorded reasons. Never weaken a test: the decided-petitions assertion stays as it is.

**Done when.** CLEMENCY_AI_SEED=e31857c583861fe1 CLEMENCY_AI_FROM=1 CLEMENCY_AI_TO=2 passes src/core2/computer-governor-clemency.test.ts with the governor's decided petition named by record id, a random draw over all 56 also passes, and the cause is named by file and line in the PR body.

**Files.** src/core2/office-day-state.ts, src/core2/computer-governor-clemency.test.ts

**Notes.** Found Oct 23 by claude/sleepy-carson-f8omzd while rechecking PR 5847 after a merge with main: the same draw fails on that branch (20 serving) and on clean main (16 serving).
