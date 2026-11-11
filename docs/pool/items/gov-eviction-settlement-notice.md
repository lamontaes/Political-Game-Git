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
model: haiku
effort: low
root: none
checked: fable 2026-11-10
---

**What.** This item continues a branch, claude/eviction-settlement-notice (PR #5390, sent back twice), whose purpose was that a tenant represented by a lawyer receives the settlement notice that reflects the recorded payment plan. The branch's files, `src/core2/housing-notices.ts` and `src/core2/eviction-notice.test.ts`, are not on main, and `src/core2/modules/housing.ts` has since changed (it now writes a case at stage `notice`, and a settlements table and lawyer hearing exist). Nothing on main or in a ruling says what the notice should be, so it is not buildable from this file.

**Cause.** Design: nothing on main, in `docs/` or in `docs/coordination/OWNER-DECISIONS.md` defines a settlement notice, and the branch's files (`src/core2/housing-notices.ts`, `src/core2/eviction-notice.test.ts`) are not on main. What main does: a household behind on rent weighs settling part of it each month, and each settlement is kept in the housing engine's `settlements` table (`src/core2/modules/housing.ts`, near line 1711). An eviction case with a lawyer goes to hearing (near line 2001), and the eviction itself reaches the household as a family scene (`feeling:event:housing.eviction` in `householdRecordScenes`, `src/director/data/situation-types.json`). A paper notice for a represented tenant that restates the payment plan adds a document nobody asked for, which the player would not see unless the tenant is the player. Under the owner's Nov 10 depth ruling it is not filed.

**Fix.** Nothing to build. Proposed: the CTO drops the item (`npm run pool -- status gov-eviction-settlement-notice dropped --by=cto`) and deletes the stale branch `claude/eviction-settlement-notice` when convenient. If the owner wants the tenant's payment plan to show, that is a line in the existing eviction scene, which the Story session writes.

**Time box.** 0.5 hours for one Haiku session, only if the CTO keeps the item.

**Rules.** Use the existing housing and law engines. One rule, all 56 places. No dice. Look before you ask: read OWNER-DECISIONS, the decision register and `docs/` for the eviction settlement before registering a decision.

**Done when.** The CTO drops the item. If it is kept, a second session plays a drawn place (named with its seed) to an eviction case with a lawyer and sees the household's payment plan in the eviction scene, by settlement and case record ids.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts

**Notes.** Sent back 2026-10-23 from PR #5390 (branch claude/eviction-settlement-notice): current main conflicts in src/core2/modules/housing.ts; preserve both readers, merge stopgaps by ID and regenerate the pool index; finish on that branch, merge main into it first. No existing matching pool item was found by PR, branch or settlement-notice title.

Sent back 2026-10-24 UTC from PR #5390 (branch claude/eviction-settlement-notice): Missing required Done-when evidence table: identify the drawn-world test plus settlement, notice, law and treasury journal records required by the pool item; narrative Chain/Proof sections do not supply the table; finish on that branch, merge main into it first.

Nov 11 (cause finder for Fable B): read on main d604b3494b. There is no producer, design or ruling for a settlement notice. Settlements are kept, and the eviction already reaches the household as a scene. I propose dropping it as depth no player sees.
