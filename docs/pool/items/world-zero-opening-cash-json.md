---
id: world-zero-opening-cash-json
title: "A zero opening treasury balance writes an undefined journal sequence"
area: world
kind: bug
priority: 1
size: S
status: claimed
claimed-by: lane-2/zero-opening-cash
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T06:49:33.637Z
---

**What.** The opening treasury writer always copies journalSequence into the government record. A legitimate zero-dollar opening transfer has no journal entry, so that optional value is undefined and the finite-JSON guard rejects the row. On pinned main 69b9126328, the unchanged legislature project-request test fails during openBudgets on replay 75ae3c9378284205, before the bill reader runs; the complete suite has five budget failures at that same write. Preserve the zero balance and omit only the absent optional sequence.

**Rules.** An effect is a read: reopening budgets must read the same openingCash marker and never fund twice. Keep the accounts transfer writer, zero balances, positive journal sequence zero, and the finite-JSON guard unchanged; no invented receipt or cash floor.

**Done when.** The unchanged legislature suite passes on the reproduced replay, a drawn New Game opens, and a played-world government with zero opening cash has a valid record without an invented journal id. Reopening budgets preserves cash and the opening marker; each of four timing years stays within 20 percent of its base.

**Files.** src/core2/modules/budgets.ts; existing regression files remain unchanged

**Notes.** Lane 2 follow-up to world-government-opening-fund-balance, merged as #7164. Main reproduction: legislature.test.ts filtered to a state member project request, replay 75ae3c9378284205, 1 failed / 19 skipped, 10.00s. Stack: government budgets.ts:485 -> openBudgets -> withCity. Read OWNER-DECISIONS Nov 3 21:15, the lane ownership/goal rules, the account transfer contract and module-data guard; searched pool for journalSequence, finite acyclic, zero-dollar and zero transfer. Earlier undefined-stage vote items are unrelated and already done.
