---
id: release-spelling-sweep-red-oct19
title: "american-english tests fail on main again: British forms in new pool items, handoff notes, a workflow comment and tests, and a FEMA incident name"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/spelling-green-now
pr: #5266
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:17:25.533Z
---

**What.** The two American English tests (tests/american-english-sweep.test.ts and tests/american-english.test.ts) fail on main again, because new pool items, the Oct 16 and Oct 19 handoff notes, PATCH_NOTES, a workflow comment, two tests and a FEMA incident name carry British forms. Respell each with `npm run spelling -- --write`, change "local authority" to "local government power" in the two English data names that say it (bill-sections.json and question-names.json), exempt the FEMA declarations file as fetched source (the agency's incident name "Sulphur Fire"), and remove the done pool item whose own id was British, since its twin keeps the record. This repeats release-spelling-sweep-red-oct17 (PR #4957) for what has been added since.

**Rules.** American English everywhere, enforced by the sweep; persisted identifiers keep their spelling, and the sweep is not weakened except for the FEMA names as fetched. Replace, never layer: the British forms are respelled, not allowed.

**Done when.** `npm run spelling` lists nothing, and tests/american-english-sweep.test.ts and tests/american-english.test.ts pass on the changed branch, shown by the changed-file checks named at the top of the pull request.

**Files.** data/english/bill-sections.json, data/english/question-names.json, scripts/prose-eval/american-english-scope.ts, docs/pool/items/, docs/coordination/, PATCH_NOTES.md, tests/release/release-workflow.test.ts

**Notes.** Found Oct 19 by running the tests/ directory on clean main: 688 pass and these two fail. Supersedes the unmerged parts of #4957; the same edits merge cleanly.
