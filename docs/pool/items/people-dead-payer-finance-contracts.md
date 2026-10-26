---
id: people-dead-payer-finance-contracts
title: "A mortgage or lease in a dead person's name keeps drawing their account, and a surviving adult at home never takes it over"
area: people
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/people-dead-payer-contracts
pr: #4829
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T00:10:01.709Z
---

**What.** A mortgage or lease in a dead person's name keeps drawing their account, and a surviving adult at home never takes it over. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/core2/finance-state.ts (code or data, left for the author); resolve and push. Finish it on the existing branch claude/people-dead-payer-contracts, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/people-dead-payer-finance-contracts.md and the files that pull request #4829 changes on claude/people-dead-payer-contracts

**Notes.** Found while taking people-estate-drained-by-living-costs, whose fix (branch claude/estate-living-costs) moves only the residents engine's own flows. Finance cash settlement checks a contract's payers against its admission (`sameIds(original.payerIds ...)` in src/core2/finance-cash.ts), so a payer change must update that trace too.

Sent back 2026-10-16 from PR #4829 (branch claude/people-dead-payer-contracts): merging main conflicts in src/core2/finance-state.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
