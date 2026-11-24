---
id: gov-succession-vp-foreign-born-red
title: "succession.test.ts fails on main: the vice president is drawn foreign-born and the birth-record test expects native"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4759
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** succession.test.ts fails on main: the vice president is drawn foreign-born and the birth-record test expects native. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks. Finish it on the existing branch claude/pool-found-oct16, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-succession-vp-foreign-born-red.md and the files that pull request #4707 changes on claude/pool-found-oct16

**Notes.** TODO

Checked Oct 16 (claude/vp-foreign-born) on main at 77fbeb0efd: src/core2/succession.test.ts passed 7 runs in a row, each in a different drawn place and seed (5 of 5 tests). The cause it names is already handled: `fillInIdentity` passes `qualified: true` to `nativityFact` for the seats `seat:US:president` and `seat:US:vice-president` (state.ts around line 2236), so a sitting president or vice president is never drawn foreign-born. It no longer reproduces; recommend the CTO sets it done. The body of this item was never filled in (all TODO), so it would fail the pool quality gate if reopened.

Sent back 2026-10-16 from PR #4707 (branch claude/pool-found-oct16): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4726 (branch claude/vp-foreign-born): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4707 (branch claude/pool-found-oct16): Merging current main into claude/pool-found-oct16 conflicts in docs/pool/items/gov-reach-rows-read-by-an-engine.md, docs/pool/items/gov-special-election-races-outside-town.md, docs/pool/items/gov-succession-vp-foreign-born-red.md. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4759 (branch claude/succession-vp): The Government succession fix adds eligibleForPresidency to RecordedIdentity and changes fillInIdentity in Core-owned src/core2/state.ts. No Core-area agreement is recorded in the PR body or discussion. Have the Core-area session land that identity seam on its own branch, then keep this PR to officials/succession wiring, or record the owning-area agreement before resubmitting; the morning check refuses outside-area edits; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4759 (branch claude/succession-vp): merging main conflicts in docs/release/changes/gov-succession-vp-foreign-born-red.md (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4759 (branch claude/succession-vp): merging main conflicts in docs/release/changes/gov-succession-vp-foreign-born-red.md (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
