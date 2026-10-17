---
id: core-counted-engine-merge
title: "One engine for the counted population"
area: core
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #4842
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** One engine for the counted population. This work was sent back by the merger on 2026-10-17 and is open for any builder to finish. The reason it came back: merging main conflicts in src/core2/births-counted.ts (code or data, left for the author); resolve and push. Finish it on the existing branch claude/counted-engine-merge-s5, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/core-counted-engine-merge.md and the files that pull request #4842 changes on claude/counted-engine-merge-s5

**Notes.** core.md line 175, checked Oct 15: both files exist; counted-drift returns early where renewal is installed. Related: core-stopgap-counted-drift-aggregate-population.

Sent back 2026-10-17 from PR #4842 (branch claude/counted-engine-merge-s5): merging main conflicts in src/core2/births-counted.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
