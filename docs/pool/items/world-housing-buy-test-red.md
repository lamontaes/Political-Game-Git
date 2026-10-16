---
id: world-housing-buy-test-red
title: "housing.test.ts renter-buys test fails on main: expected a household payer record, got undefined"
area: world
kind: bug
priority: 1
size: S
status: in-pr
claimed-by:
pr: #4637
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** housing.test.ts renter-buys test fails on main: expected a household payer record, got undefined. The failure reproduces on clean main when the test file is run on its own with the repository's test command. Find the root cause in the code the test reads and fix it there, keeping the test's expectation unless the expectation itself is the defect.

**Rules.** Replace, never layer: fix the cause where it lives and delete anything the fix makes dead, rather than adding a parallel path or loosening the test. Ask why: the PR body names the root cause by file and line and says why the test and the code disagreed.

**Done when.** src/core2/housing.test.ts passes on clean main with the repository's test command, in a drawn place and a seed the builder did not choose wherever the test draws one, and the PR body names the root cause by file and line and the test run that proves it.

**Files.** src/core2/housing.test.ts

**Notes.** TODO

Sent back 2026-10-16 from PR #4637 (branch claude/world-housing-buy-test-red): Sent back by the merger: npm run release:check -- --mode pr fails on this branch merged with current main (the release gate refuses to build on it). Run it, read the message, fix the declaration under docs/release/changes/, merge main and push; finish on that branch, merge main into it first.
