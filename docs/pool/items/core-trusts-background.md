---
id: core-trusts-background
title: "Trusts simulated in the background for estate and inheritance taxes"
area: core
kind: feature
priority: 2
status: done
claimed-by: claude/core-trusts-background
pr: #4515
blocked-on:
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
claimed-at: 2026-10-16T11:08:38.507Z
---

**What.** Trusts simulated in the background for estate and inheritance taxes. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/core2/data/parameters.json (code or data, left for the author); resolve and push. Finish it on the existing branch claude/core-trusts-background, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/core-trusts-background.md and the files that pull request #4515 changes on claude/core-trusts-background

**Notes.** Ruling: OWNER-DECISIONS.md, Oct 15 afternoon. Replaces SG-CORE-owner-decision-trusts.

Sent back 2026-10-16 from PR #4515 (branch claude/core-trusts-background): merging main conflicts in src/core2/data/parameters.json (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
