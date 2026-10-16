---
id: play-seat-sheet-leavings
title: "The seat sheet lists seats the law made you leave and names each bill section"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr: #4780
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The seat sheet lists seats the law made you leave and names each bill section. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: Merging current main into claude/play-seat-sheet-leavings conflicts in src/bench/legislature.ts, src/core2/modules/officials.ts, src/core2/modules/voting.ts. Resolve and push these conflicts on this branch before local checks can run. Finish it on the existing branch claude/play-seat-sheet-leavings, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/play-seat-sheet-leavings.md and the files that pull request #4780 changes on claude/play-seat-sheet-leavings

**Notes.** TODO

Sent back 2026-10-16 from PR #4780 (branch claude/play-seat-sheet-leavings): Merging current main into claude/play-seat-sheet-leavings conflicts in src/bench/legislature.ts, src/core2/modules/officials.ts, src/core2/modules/voting.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4780 (branch claude/play-seat-sheet-leavings): eslint unused lowerFirst (see the comment on the PR); finish on that branch, merge main into it first.
