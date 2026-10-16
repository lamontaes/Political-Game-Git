---
id: release-pool-main-quality-red
title: "Repair malformed priority-one and priority-two pool items on main"
area: release
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/pool-quality
pr: #4750
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T15:24:31.959Z
---

**What.** The pool quality check fails on clean main, independently of PR #4647. Several open priority-one and priority-two items still contain TODO sections or omit the required acceptance details. Complete each malformed item from its existing report and branch evidence so the backlog describes actionable work without weakening the validator.

**Rules.** Ask why: preserve the reported cause and evidence in each repaired item rather than replacing it with an unsupported claim. American English applies to the item text and its acceptance instructions.

**Done when.** The test command `npm run pool -- --check` passes on clean main after regenerating the index. Every previously reported malformed item retains its source and names the test or played world evidence needed to finish it.

**Files.** docs/pool/items/*.md, docs/pool/INDEX.md

**Notes.** Found by the merger on 2026-10-16. The same pool quality diagnostics occurred on clean origin/main and the merged head of PR #4647. Examples include core-fill-in-returning-household-absent-member, core-year-crash-press-fill-in-job-held and world-local-sales-below-opening-forecast. Keep the validator intact.

Sent back 2026-10-16 from PR #4750 (branch claude/release-pool-main-quality-red): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
