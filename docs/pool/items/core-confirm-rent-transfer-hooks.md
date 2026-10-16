---
id: core-confirm-rent-transfer-hooks
title: "Show counted rent renewal in housing and counted payments in world-transfer read in a played year"
area: core
kind: wiring
priority: 2
size: S
status: done
claimed-by: claude/core-rent-transfer-hooks
pr: #4526
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T07:45:49.738Z
---

**What.** Show counted rent renewal in housing and counted payments in world-transfer read in a played year. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: src/core2/counted-rent-transfer-read.test.ts fails on this branch merged with current main in 2 of 3 drawn places: 'renews a counted tenant's rent by the same rule as a full tenant's lease' gets 0 renewals ('expected 0 to be greater than 0'; Harmony, North Carolina seed a6d8bfcab6045fbd and Haworth, Oklahoma). Since #4506 merged, renewals are done by renewRentalLeases and counted tenants' renewals are keyed by their rent flow (rent:<household>), not lease:<household>; update the test to read the current renewal rows and rerun it in several drawn places. Finish it on the existing branch claude/core-rent-transfer-hooks, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/core-confirm-rent-transfer-hooks.md and the files that pull request #4526 changes on claude/core-rent-transfer-hooks

**Notes.** TODO

Sent back 2026-10-16 from PR #4526 (branch claude/core-rent-transfer-hooks): src/core2/counted-rent-transfer-read.test.ts fails on this branch merged with current main in 2 of 3 drawn places: 'renews a counted tenant's rent by the same rule as a full tenant's lease' gets 0 renewals ('expected 0 to be greater than 0'; Harmony, North Carolina seed a6d8bfcab6045fbd and Haworth, Oklahoma). Since #4506 merged, renewals are done by renewRentalLeases and counted tenants' renewals are keyed by their rent flow (rent:<household>), not lease:<household>; update the test to read the current renewal rows and rerun it in several drawn places; finish on that branch, merge main into it first.
