---
id: desktop-hub-rebuild-note
title: "Fresh private hub build (docs note, #4268)"
area: release
kind: cleanup
priority: 2
status: done
claimed-by: desktop/hub-rebuild
pr: #4268
blocked-on:
milestone:
source: "open PR #4268"
claimed-at: 2026-10-15T23:03:02.944Z
---

**What.** This is a docs-only pull request whose only purpose is to trigger a desktop packaging run on the current main so the private hub download exists. It has no gate line in its body and conflicts with nothing in the game. The owner would notice only that a fresh desktop download is available. Close it once the packaging run produced the download, or merge it if the note itself is wanted.

**Rules.** Replace, never layer: if the note is merged it replaces the older hub note rather than sitting beside it. Look before you ask: read DECISION-REGISTER.md before adding any open question to the note. American English in the note.

**Done when.** Main merged into the branch (plain merge, never force) and the PR body carries its one gate line. The release run on the branch produced a desktop download, named by workflow run id in the PR body, and the release declaration in docs/release/changes/ says impact none. A test of the build output is the release gate itself. The owner plays it: download the private hub build and open it.

**Files.** docs/release/changes/, .github/workflows/

**Notes.** Read the PR body and any CTO comment first.
Sent back 2026-10-15 from PR #4268 (branch desktop/hub-rebuild): PR body has no gate line; finish on that branch, merge main into it first. (PR references as of 2026-10-15.)
