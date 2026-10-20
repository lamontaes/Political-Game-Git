---
id: owner-stopgap-memory-budgets
title: "Is an engineering memory budget (work-result retention weeks) a tunable parameter, not a stopgap?"
area: core
kind: owner-decision
priority: 3
size: S
status: in-pr
claimed-by: claude/memory-budget-decision
pr: #5314
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:12:49.659Z
---

**What.** SG-P8-work-result-retention marks the number of quiet weekly work rollups the game keeps before deleting them, and several parameters-file stopgaps of kind authored-memory-budget are the same: an engineering limit on memory, not a missing behavior. The question: may such a budget close as a TUNABLE parameter with the spread it was checked against, instead of staying an open stopgap that blocks the release build?

**Rules.** Owner decisions are flagged, never waited on: build the simplest version, which keeps the row open. Look before you ask: checked DECISION-REGISTER.md and OWNER-DECISIONS.md and found nothing on memory budgets.

**Done when.** The owner rules yes or no in OWNER-DECISIONS.md; on yes, each authored-memory-budget row in src/core2/data/stopgaps.json is resolved with its parameter tagged TUNABLE and its spread, and the stopgap tripwire test passes in the played world.

**Files.** src/core2/data/stopgaps.json, src/core2/data/parameters.json, src/core2/work-state.ts

**Notes.** Raised Oct 19 while looking at core-stopgap-parameters-authored-memory-budget.
