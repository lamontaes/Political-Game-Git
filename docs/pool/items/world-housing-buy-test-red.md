---
id: world-housing-buy-test-red
title: "housing.test.ts renter-buys test fails on main: expected a household payer record, got undefined"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/world-housing-buy-test-red
pr: #4637
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T17:15:57.830Z
---

**What.** housing.test.ts renter-buys test fails on main: expected a household payer record, got undefined. The failure reproduces on clean main when the test file is run on its own with the repository's test command. Find the root cause in the code the test reads and fix it there, keeping the test's expectation unless the expectation itself is the defect.

**Rules.** Replace, never layer: fix the cause where it lives and delete anything the fix makes dead, rather than adding a parallel path or loosening the test. Ask why: the PR body names the root cause by file and line and says why the test and the code disagreed.

**Done when.** src/core2/housing.test.ts passes on clean main with the repository's test command, in a drawn place and a seed the builder did not choose wherever the test draws one, and the PR body names the root cause by file and line and the test run that proves it.

**Files.** src/core2/housing.test.ts

**Notes.** TODO

Sent back 2026-10-16 from PR #4637 (branch claude/world-housing-buy-test-red): Sent back by the merger: npm run release:check -- --mode pr fails on this branch merged with current main (the release gate refuses to build on it). Run it, read the message, fix the declaration under docs/release/changes/, merge main and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4637 (branch claude/world-housing-buy-test-red): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
