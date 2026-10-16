---
id: docs-roadmap-m2-m3-passes
title: "Verify M2 and M3 specs in features.json and set passes where built"
area: docs
kind: cleanup
priority: 3
status: in-pr
claimed-by: claude/roadmap-m2-m3-passes
pr: #4513
blocked-on:
milestone: M3
source: "docs/roadmap/features.json; later-specs-draft.md M2-01 to M3-10"
claimed-at: 2026-10-15T23:11:17.926Z
---

**What.** All M2-01 to M3-10 specs read passes:false although most of the golden path through step 9 plays. Check each spec's test and set passes with evidence; open an item for any that is genuinely unfinished.

**Rules.** Sessions may change only passes, never test.

**Done when.** features.json reflects the truth with evidence in the PR.

**Files.** docs/roadmap/features.json

**Notes.** None.
