---
id: docs-roadmap-m2-m3-passes
title: "Verify M2 and M3 specs in features.json and set passes where built"
area: docs
kind: cleanup
priority: 3
status: done
claimed-by:
pr: #4513
blocked-on:
milestone: M3
source: "docs/roadmap/features.json; later-specs-draft.md M2-01 to M3-10"
claimed-at:
---

**What.** All M2-01 to M3-10 specs read passes:false although most of the golden path through step 9 plays. Check each spec's test and set passes with evidence; open an item for any that is genuinely unfinished.

**Rules.** Sessions may change only passes, never test.

**Done when.** features.json reflects the truth with evidence in the PR.

**Files.** docs/roadmap/features.json

**Notes.** None.

Sent back 2026-10-16 from PR #4513 (branch claude/roadmap-m2-m3-passes): merging main conflicts in src/core2/news.test.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4513 (branch claude/roadmap-m2-m3-passes): Merger: not merged. Merging current main into this branch conflicts in docs/pool/INDEX.md (generated; `npm run pool` rebuilds it) and src/core2/news.test.ts (a test file). Please merge main, resolve the test, regenerate the index and push; finish on that branch, merge main into it first.
