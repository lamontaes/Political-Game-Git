---
id: gov-record-defects-finish
title: "Finish #4343: three officeholder record fixes"
area: gov
kind: bug
priority: 1
status: claimed
claimed-by: gov/session-c-record-defects
pr: #4608
blocked-on:
milestone:
source: "reissue item 11; PR #4343 branch gov/session-c-record-defects"
claimed-at: 2026-10-16T13:29:16.867Z
---

**What.** Finish #4343: three officeholder record fixes. This work was sent back by the merger on 2026-10-15 and is open for any builder to finish. The reason it came back: code conflict with main in src/core2/modules/legislature.ts, scripts/dialogue-batch/coverage-batch.ts, stopgaps.json. Finish it on the existing branch gov/session-c-record-defects, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-record-defects-finish.md and the files that pull request #4343 changes on gov/session-c-record-defects

**Notes.** Defects 1, 2 and 5 are good as they stand. The "bill with no title" defect (batch 11, Pine Ridge 2027-2) is fixed when this merges. (as of 2026-10-15)
Sent back 2026-10-15 from PR #4343 (branch gov/session-c-record-defects): code conflict with main in src/core2/modules/legislature.ts, scripts/dialogue-batch/coverage-batch.ts, stopgaps.json; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4480 (branch claude/gov-record-defects-finish): merging main conflicts in src/core2/data/candidacy/parameters.json, src/core2/modules/candidacy.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4608 (branch claude/gov-record-defects-finish-2): merging main conflicts in src/core2/modules/legislature.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
