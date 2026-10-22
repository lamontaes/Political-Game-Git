---
id: release-merge-audit-oct20-fixes
title: "Fix what the Oct 20 merge audit found in 55 merged PRs"
area: release
kind: bug
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
after: release-audit-01-news-office-proof-tests,release-audit-02-law-reach-tests,release-audit-03-counted-deaths-seed,release-audit-04-close-5019-stopgap-line,release-audit-05-journal-lines-not-shippable,release-audit-06-old-engine-imports,release-audit-07-08-duplicate-pool-and-owner-notes,release-audit-09-arrears-write-off,release-audit-10-agreement-jobs-free-test,release-audit-11-hire-test-both-halves,release-audit-12-vacuous-loop-tests,release-audit-13-grade-always-wins,release-audit-14-opening-wages-before-capital,release-audit-15-energy-cost-year,release-audit-16-governor-commute-label,release-audit-17-misstated-release-notes,release-audit-18-data-verify,release-audit-19-stale-text
source: "docs/reports/merge-audit-2026-10-20.md"
claimed-at:
---

**What.** This is the roll-up for the October 20 merge audit, which read the diffs of 55 PRs merged overnight and found three merged after their own send-back, one merged into another PR's branch, old-engine imports and hand-written journal lines on main, and weak tests and misstated release notes. The numbered list in docs/reports/merge-audit-2026-10-20.md is already split into one pool item per fix, release-audit-01 through release-audit-19 (07 and 08 share a file). Builders take those items one at a time, the bad ones first; this item closes when every one is done and the report's list names the PR for each fix.

**Rules.** An effect is a read: every fixed test must assert the feature through the records an engine wrote and fail when nothing is found, never return early. No hand-written player text: journal lines stay not shippable until the English engine has graded them. Replace, never layer: duplicated pool sections, old-engine imports and stale stopgap lines are deleted, not kept beside the fix. Look before you ask: each child item cites the audit report line it fixes rather than reopening what was decided.

**Done when.** Every child item release-audit-01 to release-audit-19 is done or carries a written reason, each fixed test fails on the old code and passes in a drawn place of a played-world year built with buildBenchWorld on a seed the builder did not choose, and docs/reports/merge-audit-2026-10-20.md lists the PR for every numbered fix.

**Files.** docs/reports/merge-audit-2026-10-20.md

**Notes.** Split by number so several builders can take one each.

Oct 20 (pool feeder): spec written as a roll-up; the 19 children already exist as pool items, so no new items were needed.
