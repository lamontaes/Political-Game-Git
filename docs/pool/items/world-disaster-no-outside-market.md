---
id: world-disaster-no-outside-market
title: "A disaster payout stops the game in a drawn place with no outside market"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5260
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-20 from PR #5260 (branch claude/disaster-no-outside-market): Merge main f11fbba3498d into claude/disaster-no-outside-market conflicts in: src/core2/modules/disasters.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5260 (branch claude/disaster-no-outside-market): The added edge fixture in src/core2/disasters.test.ts draws up to twelve worlds looking for a disaster but never fails if none is found, then only asserts advanceCore does not throw. It never asserts a disaster occurred or that a repair payment reached the selected outside account, so it can pass without exercising the changed branch. Assert a positive declared disaster and actual repair journal record with its payee; keep the no-market/no-payment case distinct, and provide the played-world place/seed and record proof for the claimed crash fix.; finish on that branch, merge main into it first.
