---
id: release-suite-red-list-on-main
title: "List the red tests on current main, by directory, with the place and seed of each failure, and file each as its own item"
area: release
kind: research
priority: 2
size: M
status: open
claimed-by:
pr: #4965
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-17 from PR #4965 (branch claude/main-red-housekeeping): Morning check: the release housekeeping stack edits Words-protected data/english/bill-sections.json and data/english/question-names.json; those wording changes must land through a Words-owned PR first. Also retain the coverage-table.test.ts assertion that every civic cause names its causeRecord: the new code checks it only for awaitingProducer cases, allowing an already-matched cause to lose its record metadata unnoticed. Merge main after these corrections and rerun the changed-file gates.; finish on that branch, merge main into it first.
