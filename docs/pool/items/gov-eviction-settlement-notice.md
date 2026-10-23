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
---

**What.** Finish the existing implementation on claude/eviction-settlement-notice. A tenant represented by a lawyer should receive the settlement notice that reflects the recorded payment plan.

**Rules.** Use the existing housing and law engines. Preserve current readers, merge main normally, and regenerate the pool index without hand editing it.

**Done when.** The branch merges main without code conflicts, eviction-notice.test.ts passes in a drawn buildBenchWorld with place and seed named, and the PR evidence table identifies the settlement, notice, law and journal records.

**Files.** src/core2/modules/housing.ts, src/core2/housing-notices.ts, src/core2/eviction-notice.test.ts

**Notes.** Sent back 2026-10-23 from PR #5390 (branch claude/eviction-settlement-notice): current main conflicts in src/core2/modules/housing.ts; preserve both readers, merge stopgaps by ID and regenerate the pool index; finish on that branch, merge main into it first. No existing matching pool item was found by PR, branch or settlement-notice title.
