---
id: law-reach-money-handlers-load-cycle
title: "The outcome web's unwired and matrix writers stop at load on main: the law-reach money handlers are read before their file finishes loading"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/law-reach-money-handlers-lazy
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T16:29:10.375Z
---

**What.** On main after #5892, scripts/outcome-web/write-unwired.ts and scripts/outcome-web/effect-matrix.ts stop at load with ReferenceError: Cannot access 'paidLeave' before initialization (src/core2/law-reach/group-a.ts:48). The money handlers file reaches the treasury and budget engines, which load the group A registry back through law reach, so the registry's handler table reads paidLeave, parksFunding and housingLineMeasure before group-a-money.ts has finished loading. The same cycle was fixed for the voting handler by reading it when a law takes effect (commit 6466e7b5df). Read the three money handlers the same way, so the effects lead's rerun after every merge can run.

**Rules.** Fix at the root on main; never narrow a writer or a test to get past it. Replace, never layer: the handler table names the call-time handlers, nothing else.

**Done when.** On main with the fix, node --import tsx scripts/outcome-web/write-unwired.ts and node --import tsx scripts/outcome-web/effect-matrix.ts both run to the end (the unwired count and the matrix summary in the PR body), src/core2/law-reach-group-a.test.ts and src/core2/outcome-web-unwired.test.ts pass, and without the fix the unwired writer fails at load with the error quoted.

**Files.** src/core2/law-reach/group-a.ts

**Notes.** Filed Oct 25 by the effects lead, found rerunning the matrix after #5892 merged.
