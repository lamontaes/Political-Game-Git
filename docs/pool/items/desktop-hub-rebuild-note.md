---
id: desktop-hub-rebuild-note
title: "Fresh private hub build (docs note, #4268)"
area: release
kind: cleanup
priority: 2
status: in-pr
claimed-by:
pr: #4268
blocked-on:
milestone:
source: "open PR #4268"
---

**What.** A docs-only PR that triggers a desktop packaging run on current main. Close it once the run produced the download, or merge if the note is wanted.

**Rules.** Merge main into the PR branch (plain merge, never force); a release declaration in docs/release/changes/.

**Done when.** The PR is mergeable with its gate line; the CTO merges.

**Files.** see PR

**Notes.** Read the PR body and any CTO comment first.
