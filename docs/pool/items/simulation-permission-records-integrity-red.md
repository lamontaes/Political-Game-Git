---
id: simulation-permission-records-integrity-red
title: "permission-records.test.ts fails on main: the global sequence and id integrity check does not throw as expected"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4672
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** permission-records.test.ts fails on main: the global sequence and id integrity check does not throw as expected. The failure reproduces on clean main when the test file is run on its own with the repository's test command. Find the root cause in the code the test reads and fix it there, keeping the test's expectation unless the expectation itself is the defect.

**Rules.** Replace, never layer: fix the cause where it lives and delete anything the fix makes dead, rather than adding a parallel path or loosening the test. Ask why: the PR body names the root cause by file and line and says why the test and the code disagreed.

**Done when.** src/simulation/law-consequences/permission-records.test.ts passes on clean main with the repository's test command, in a drawn place and a seed the builder did not choose wherever the test draws one, and the PR body names the root cause by file and line and the test run that proves it.

**Files.** src/simulation/law-consequences/permission-records.test.ts

**Notes.** TODO

Sent back 2026-10-16 from PR #4672 (branch claude/permission-records): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
