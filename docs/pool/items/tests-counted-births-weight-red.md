---
id: tests-counted-births-weight-red
title: "The counted births weight test reads the month's counts record with bookkeeping off, so it fails on every draw"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/counted-births-weight-bookkeeping
pr: #5993
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T07:06:39.559Z
---

**What.** src/core2/counted-births-weight.test.ts turns bookkeeping off and then reads the renewal engine's monthly counts record (core2-renewal-v1, table counts). Since d3e204ac90 (Oct 17, table-unread-renewal-counts-parameters) that record is kept only with bookkeeping on, so every drawn town reads no rows, expects no births, is skipped, and after six draws the test throws 'no drawn town with enough counted people in 6 places'. It fails so on main 01f5cd4715 in two runs (Oct 25). Turn bookkeeping on in the test, as counted-illness.test.ts was changed in the same commit.

**Rules.** Bookkeeping is a debug switch: the record stays kept only with bookkeeping on; the test, which reads it, turns bookkeeping on. One rule, all 56 places: the test keeps drawing its town from all 56.

**Done when.** `src/core2/counted-births-weight.test.ts` passes on main with the fix and fails on the same main without it, the drawn place and seed it played named in the PR from the test's own output line.

**Files.** src/core2/counted-births-weight.test.ts

**Notes.** Found by the speed lead running the renewal tests for core-speed-counted-renewal-pass; fails identically on base main. A fix that keeps main green (freeze exception).
