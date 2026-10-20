---
id: release-red-budget-desk-president-stories
title: "budget-desk test: no stories on the president's signature or veto of the federal budget (expected 0 to be greater than 0, budget-desk.test.ts:62)"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-red-budget-desk
pr: #5320
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:57:12.414Z
---

**What.** The budget-desk test fails on the line that expects stories on the president's act: it finds none, so a signature or veto of the federal budget leaves nothing for the news desk to report. Find whether the president's act record is never written, or the desk never reads it, and fix the one that is wrong. The newspaper should carry the act when the president signs or vetoes the federal budget.

**Rules.** Fix at the root: a red test is fixed in place or the code it guards is, never skipped or loosened. No dice. One rule, all 56 places: the place facts come from data, and the test names the place and seed it drew.

**Done when.** In the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) the president's signature or veto of the federal budget is followed by at least one story that cites the act by record id, and src/core2/budget-desk.test.ts passes in that place.

**Files.** src/core2/budget-desk.test.ts, src/core2/modules/budgets.ts

**Notes.** Found by running src/core2 on main, Oct 19 (release-suite-red-list-on-main): AssertionError 'stories on the president's act: expected 0 to be greater than 0' at budget-desk.test.ts:62. The place and seed were not printed in the failure; the test's draw is random each run, so print them first.
