---
id: world-agreements-re-resolve-worker
title: "A saved agreement finds a new qualifying worker when its job ends"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from core-moves-pinned-and-income-stopgaps, Oct 15"
claimed-at:
---

**What.** A saved agreement (a visitor's lodging, a public supplier contract) names a job as its provider's qualification, and the core rejects its next payment once that job ends. So the jobs engine will not end such a job and the people-moves engine will not let its holder leave (SG-WORLD-jobs-agreement-pinned, SG-P15-moves-pinned-jobs). Make the agreement re-resolve its qualifying worker to another holder of a matching job when the first one leaves or loses the job, with its own dated record.

**Rules.** Wire to the world: the agreement's payment must still reach a real payee, and every dollar balances. Replace, never layer: the pinned lookup and both stopgap markers are deleted when the agreement re-resolves.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a pinned job's holder leaves town and the agreement's next payment is made to the re-resolved worker, shown by the agreement record id, the old and new job ids and the payment record id; the jobs and moves tests pass and the two stopgaps are resolved.

**Files.** src/core2/pinned-jobs.ts, src/core2/modules/jobs.ts, src/core2/modules/moves.ts, src/core2/finance-state.ts

**Notes.** Found splitting core-moves-pinned-and-income-stopgaps. The lookup both engines read now lives in src/core2/pinned-jobs.ts (one copy, not two).
