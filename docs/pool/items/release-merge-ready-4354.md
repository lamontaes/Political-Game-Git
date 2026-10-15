---
id: release-merge-ready-4354
title: "Merge #4354 (unit suite): resolve the finance-day-order conflict by taking main's deletion"
area: release
kind: cleanup
priority: 1
status: open
claimed-by:
pr: #4354
blocked-on:
milestone:
source: 'reissue "Ready to merge"; PR #4354 branch pool/unit-suite'
claimed-at:
---

**What.** The unit-suite pull request conflicts with main because main deleted src/core2/finance-day-order.test.ts while the branch still edits it, and stopgaps.json also conflicts. Resolve by taking main's deletion of that test file and merging both sides of stopgaps.json, then the CTO merges. Nothing changes for the player. The suite exists so the owner's evening build is checked on changed files fast.

**Rules.** Replace, never layer: take main's deletion, do not restore the old test beside the new suite. Wire to the world: the stopgap rows merged into stopgaps.json must still match markers in the code. Plain merge of main, never force-push.

**Done when.** Branch merged with main with the finance-day-order test deleted, stopgaps.json valid and the stopgap tripwire test passing, and the unit suite's own tests run on the branch. A record id check: every stopgap row in the merged file has its marker in the code. The CTO merges. The owner plays it: nothing changes in play.

**Files.** src/core2/finance-day-order.test.ts, src/core2/data/stopgaps.json, docs/release/changes/

**Notes.** Not a draft.
Sent back 2026-10-15 from PR #4354 (branch pool/unit-suite): code conflict with main in src/core2/finance-day-order.test.ts, stopgaps.json; finish on that branch, merge main into it first. (PR references as of 2026-10-15.)
