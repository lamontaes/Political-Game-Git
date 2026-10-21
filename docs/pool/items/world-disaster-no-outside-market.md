---
id: world-disaster-no-outside-market
title: "A disaster payout stops the game in a drawn place with no outside market"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/disaster-no-outside-market
pr: #5260
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T01:07:01.156Z
---

**What.** A declared disaster made the households in a drawn town pay for repairs on the declaration day, and in a town with no open builder the payout had no payee, which stopped the game. Main now sends the repairs to the town's outside market when no builder is open, and pays nothing where no outside market is recorded (src/core2/modules/disasters.ts). This item proves the first case in play: with every builder in town closed, a declared disaster's repairs reach the town's outside market as journal entries.

**Rules.** Wire to the world: the repair money moves on the cash journal from named households to the outside market's account, read back by record id. No dice: the disaster comes from the hazard record, not a chance.

**Done when.** src/core2/disasters.test.ts plays a year in a played world built with buildBenchWorld in a drawn place whose builders are all closed. It asserts a declared disaster in the durable log, positive repairs paid only to the town's outside-market account, and journal credits on that account at least the amount paid. It redraws a bounded number of places and fails naming every place and seed tried, and the PR body names the place, seed and record ids.

**Files.** src/core2/disasters.test.ts, src/core2/modules/disasters.ts

**Notes.** The no-market case (no payee, no payment) is guarded on main by commit 422be0ebf1.

Sent back 2026-10-20 from PR #5260 (branch claude/disaster-no-outside-market): Merge main f11fbba3498d into claude/disaster-no-outside-market conflicts in: src/core2/modules/disasters.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5260 (branch claude/disaster-no-outside-market): The added edge fixture in src/core2/disasters.test.ts draws up to twelve worlds looking for a disaster but never fails if none is found, then only asserts advanceCore does not throw. It never asserts a disaster occurred or that a repair payment reached the selected outside account, so it can pass without exercising the changed branch. Assert a positive declared disaster and actual repair journal record with its payee; keep the no-market/no-payment case distinct, and provide the played-world place/seed and record proof for the claimed crash fix.; finish on that branch, merge main into it first.
