---
id: people-household-firearms
title: "Households record whether they own a gun, so child access prevention reaches owners"
area: people
kind: stopgap
priority: 2
size: S
status: done
claimed-by:
pr: #4689
blocked-on:
source: "split from laws-stopgap-reach-group-a-missing-record, Oct 16"
claimed-at:
---

**What.** Child access prevention records its storage duty on every adult in a household with a child, not only gun owners, because gun ownership is not recorded (SG-GOV-REACH-A-firearms). Give each household a firearm-ownership fact drawn at generation from the state's survey rate, so the duty lands on households that own guns and the others are untouched. A household that owns a gun and has a child is then a real thing to find.

**Rules.** No dice: the law decides who is reached; the seeded draw only decides which households own a gun. One rule, all 56 places: the rate is state data with its source. Estimate, never UNKNOWN: a state without a survey rate takes the national rate, marked ESTIMATED.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) the storage duty is recorded on the adults of gun-owning households with a child and on no one else, shown by household record ids, and the share of owning households matches the state's survey rate within its spread; SG-GOV-REACH-A-firearms is resolved and the test in src/core2/law-reach-group-a.test.ts passes.

**Files.** src/core2/law-reach/group-a-records.ts, src/core2/population.ts, src/core2/data/stopgaps.json

**Notes.** Split from laws-stopgap-reach-group-a-missing-record. Counted households carry the same rate as a group count.

Sent back 2026-10-16 from PR #4689 (branch claude/household-firearms): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
