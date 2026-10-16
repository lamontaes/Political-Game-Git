---
id: people-press-staff-opening-cash
title: "The press's reporters and heads open with no cash and no savings, against the survey that 95 percent of families hold accounts"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/press-staff-opening-cash
pr: #4809
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T19:45:30.123Z
---

**What.** The press engine creates its reporters, editors and heads as one-person households (`household:person:press:outlet:...`) with a salary on the outlet's payroll but no cash at all on the opening day. In Woodman, Wisconsin (seed 62a6878363981bf1) all three television outlets' reporters, ages 26 to 56, held 0 while the town's generated residents held cash as the Survey of Consumer Finances says (95 to 99 percent of families hold an account). Give each press employee an opening balance from the same rule the generated residents use (medianTransactionBalance of their annual pay in src/core2/starting-cash.ts), so a reporter laid off or sued has savings to draw on.

**Rules.** Estimate, never UNKNOWN: the balance is the survey median for the person's pay, marked as an estimate with its source. Replace, never layer: use the starting-cash rule the residents use, not a second formula. One rule, all 56 places.

**Done when.** In a played world (buildBenchWorld) in a drawn place from all 56 (place and seed in the PR body), every press employee with a salary holds an opening balance from the survey rule, by person record id, and the test in src/core2/opening-resident-cash.test.ts no longer needs to skip ids that start with person:press.

**Files.** src/core2/modules/press.ts, src/core2/press-staff.ts, src/core2/starting-cash.ts

**Notes.** Found by src/core2/opening-resident-cash.test.ts, which skips the press's people for now. Related: people-officials-living-costs (named officeholders, PR #4757) is the same gap for officials.
