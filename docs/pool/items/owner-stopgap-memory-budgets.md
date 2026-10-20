---
id: owner-stopgap-memory-budgets
title: "Is an engineering memory budget (work-result retention weeks) a tunable parameter, not a stopgap?"
area: core
kind: owner-decision
priority: 3
size: S
status: done
claimed-by: claude/memory-budget-decision
pr: #5314
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:12:49.659Z
---

**What.** The question was whether an engineering memory budget, here the weeks of quiet work rollups kept, is a tunable parameter and not a stopgap. The owner already ruled that running memory stays small and keeps a condensed index, not every log record (Oct 12, DECISION-REGISTER "Speed and memory"), so the retention span is a tunable budget. Only the dev-why bench reads old rollups, which `core.work.rollups` confirms.

**Rules.** Look before you ask: the register answers it, so no question goes to the owner; Every number lives in the parameter table, tagged TUNABLE with the spread it is checked against.

**Done when.** `workRoutineRetentionWeeks` is TUNABLE with a stated spread and the ruling cited, `SG-P8-work-result-retention` is resolved in stopgaps.json, and the calibration, tooling and work tests pass, shown in the PR body by test names.

**Files.** src/core2/data/parameters.json, src/core2/data/stopgaps.json, src/core2/work-state.ts, src/core2/tooling/calibration-targets.json

**Notes.** Built Oct 20 on claude/memory-budget-decision.
