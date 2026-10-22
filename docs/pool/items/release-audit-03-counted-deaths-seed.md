---
id: release-audit-03-counted-deaths-seed
title: "Pin the Centennial, Wyoming seed and make the counted-deaths check statistically sound (#4886, #4903)"
area: release
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/audit-counted-deaths
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:20:14.647Z
---

**What.** src/core2/counted-deaths-opening.test.ts draws a random seed and requires counted deaths in the opening to reach at least half of the expected count, which fails on small towns where a few deaths either way is ordinary. Pin seed 140bb7872bc46f5202d12ae8c4c52ca2364da2da170593f43aeb7f7810bd5366 (Centennial, Wyoming) as a regression case that failed before the fix. Replace the half-of-expected floor with a bound that holds on small towns, for example a Poisson interval around the life-table expectation that widens as the expected count falls, so the test still fails when deaths are missing entirely.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The fix is merged, the audit report line for it is marked fixed with the PR number, and the changed test fails when the subject it needs is absent, shown by a test run with a drawn place and seed.

**Files.** src/core2/counted-deaths-opening.test.ts

**Notes.** Item 3 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
