---
id: gov-succession-vp-foreign-born-red
title: "succession.test.ts fails on main: the vice president is drawn foreign-born and the birth-record test expects native"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #4759
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** succession.test.ts fails on main: the vice president is drawn foreign-born and the birth-record test expects native. The failure reproduces on clean main when the test file is run on its own with the repository's test command. Find the root cause in the code the test reads and fix it there, keeping the test's expectation unless the expectation itself is the defect.

**Rules.** Replace, never layer: fix the cause where it lives and delete anything the fix makes dead, rather than adding a parallel path or loosening the test. Ask why: the PR body names the root cause by file and line and says why the test and the code disagreed.

**Done when.** src/core2/succession.test.ts passes on clean main with the repository's test command, in a drawn place and a seed the builder did not choose wherever the test draws one, and the PR body names the root cause by file and line and the test run that proves it.

**Files.** src/core2/succession.test.ts

**Notes.** TODO

Checked Oct 16 (claude/vp-foreign-born) on main at 77fbeb0efd: src/core2/succession.test.ts passed 7 runs in a row, each in a different drawn place and seed (5 of 5 tests). The cause it names is already handled: `fillInIdentity` passes `qualified: true` to `nativityFact` for the seats `seat:US:president` and `seat:US:vice-president` (state.ts around line 2236), so a sitting president or vice president is never drawn foreign-born. It no longer reproduces; recommend the CTO sets it done. The body of this item was never filled in (all TODO), so it would fail the pool quality gate if reopened.

Sent back 2026-10-16 from PR #4707 (branch claude/pool-found-oct16): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4726 (branch claude/vp-foreign-born): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4707 (branch claude/pool-found-oct16): Merging current main into claude/pool-found-oct16 conflicts in docs/pool/items/gov-reach-rows-read-by-an-engine.md, docs/pool/items/gov-special-election-races-outside-town.md, docs/pool/items/gov-succession-vp-foreign-born-red.md. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4759 (branch claude/succession-vp): The Government succession fix adds eligibleForPresidency to RecordedIdentity and changes fillInIdentity in Core-owned src/core2/state.ts. No Core-area agreement is recorded in the PR body or discussion. Have the Core-area session land that identity seam on its own branch, then keep this PR to officials/succession wiring, or record the owning-area agreement before resubmitting; the morning check refuses outside-area edits; finish on that branch, merge main into it first.
