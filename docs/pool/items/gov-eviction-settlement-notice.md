---
id: gov-eviction-settlement-notice
title: "Complete the eviction settlement notice PR after integrating current housing code"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr: #5390
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** This item continues a branch, claude/eviction-settlement-notice (PR #5390, sent back twice), whose purpose was that a tenant represented by a lawyer receives the settlement notice that reflects the recorded payment plan. The branch's files, `src/core2/housing-notices.ts` and `src/core2/eviction-notice.test.ts`, are not on main, and `src/core2/modules/housing.ts` has since changed (it now writes a case at stage `notice`, and a settlements table and lawyer hearing exist). Nothing on main or in a ruling says what the notice should be, so it is not buildable from this file.

**Cause.** Needs cause. Looked at the item and `src/core2/modules/housing.ts` (the settlements table at about line 1711, the lawyer hearing at about line 2001): there is no settlement-notice producer on main and no ruling or design names one.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one sonnet session, to read the branch and the current housing module and write down what notice is missing and what record it should read.

**Rules.** Use the existing housing and law engines. One rule, all 56 places. No dice. Look before you ask: read OWNER-DECISIONS, the decision register and `docs/` for the eviction settlement before registering a decision.

**Done when.** A second session reads the branch claude/eviction-settlement-notice against main and either rewrites this item with `Found in code:` or `Measured:` and a real Fix (what notice a represented tenant receives, from which settlement and law records), or records that the housing module's `notice` case already covers it, with the record ids seen in a drawn `buildBenchWorld` place and seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts

**Notes.** Sent back 2026-10-23 from PR #5390 (branch claude/eviction-settlement-notice): current main conflicts in src/core2/modules/housing.ts; preserve both readers, merge stopgaps by ID and regenerate the pool index; finish on that branch, merge main into it first. No existing matching pool item was found by PR, branch or settlement-notice title.

Sent back 2026-10-24 UTC from PR #5390 (branch claude/eviction-settlement-notice): Missing required Done-when evidence table: identify the drawn-world test plus settlement, notice, law and treasury journal records required by the pool item; narrative Chain/Proof sections do not supply the table; finish on that branch, merge main into it first.
