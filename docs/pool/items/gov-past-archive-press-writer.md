---
id: gov-past-archive-press-writer
title: "Archive stories are written by the press engine under its own archive kind and the news archive kinds are deleted"
area: gov
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #4787
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Archive stories are written by the press engine under its own archive kind and the news archive kinds are deleted. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/core2/press-desk.ts (code or data, left for the author); resolve and push. Finish it on the existing branch claude/gov-past-archive-press-writer, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-past-archive-press-writer.md and the files that pull request #4787 changes on claude/gov-past-archive-press-writer

**Notes.** Split from gov-past-deaths-closures-archive. The press session had not named an archive kind when the archive was built (asked on PR #4190).

Sent back 2026-10-16 from PR #4787 (branch claude/gov-past-archive-press-writer): merging main conflicts in src/core2/press-desk.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
