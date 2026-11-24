---
id: release-director-literals-red
title: "Director test red on main: number literals in speech-builder.ts and words.ts"
area: words
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #4634
blocked-on:
source: merger run Oct 16 after #4477
claimed-at:
---

**What.** Director test red on main: number literals in speech-builder.ts and words.ts. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/director/speech-builder.ts (code or data, left for the author); resolve and push. Finish it on the existing branch claude/director-literals, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/release-director-literals-red.md and the files that pull request #4634 changes on claude/director-literals

**Notes.** Found by the merger after merging #4477; the merger had run only the changed test files and missed this neighbor. A second director case, the world moments, is separately red on main (director-world-moments-red-on-main).

Sent back 2026-10-16 from PR #4634 (branch claude/director-literals): merging main conflicts in src/director/speech-builder.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4634 (branch claude/director-literals): Sent back by the merger: merging main conflicts in src/director/speech-builder.ts (code or data, left for the author); resolve and push Finish on this branch (merge main into it first), then it goes back in line; finish on that branch, merge main into it first.
