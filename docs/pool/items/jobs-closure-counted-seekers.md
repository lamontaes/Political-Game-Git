---
id: jobs-closure-counted-seekers
title: "jobs-closure.test.ts fails on main: a closed employer's counted workers have no countedSeekers row"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/jobs-closure-counted-seekers
pr: #4442
blocked-on:
source: found by a Claude session running jobs tests for gov-follow-up; fails identically on clean main
claimed-at: 2026-10-15T20:32:14.549Z
---

**What.** `jobs-closure.test.ts` failed on clean main: a closed employer's counted workers had no `countedSeekers` row. The test emitted an `organization.closed` event by hand, but the jobs handler now reads the finance engine's closure record (`finance.closures`, `endedCountedJobIds`), which the fixture never wrote. Close the plant through the finance engine instead.

**Rules.** Replace, never layer (the hand-made event goes); the jobs handler is unchanged.

**Done when.** The test passes in drawn places (three seeds) with the closure made by `closeBusinessByChoice`.

**Files.** src/core2/jobs-closure.test.ts

**Notes.** Found while running jobs tests for gov-follow-up; fixed on this item's branch.
