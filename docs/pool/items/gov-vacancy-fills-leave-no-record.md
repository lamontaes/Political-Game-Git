---
id: gov-vacancy-fills-leave-no-record
title: "A filled vacancy writes a term but no appointment or took-office record, and special elections for state seats outside the town are not held"
area: gov
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #4678
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Of 41 state and federal seats vacated in ten audit worlds, 17 fell under an appointment rule and each got a new serving term the same day with no appointment or took-office record (offices.ts near line 861); 24 fell under a rule calling for a special election, and only three were held (elections.ts near line 399). Write a record for every filled vacancy and hold the special elections the rule calls for. This item and gov-empty-special-repeats share code; coordinate with the open PRs on empty races.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In a one-year run of a drawn place every vacated state and federal seat has a vacancy record and either an appointment record or a special election, by seat and record ids.

**Files.** src/core2/modules/offices.ts, src/core2/modules/elections.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.

Sent back 2026-10-16 from PR #4678 (branch claude/gov-vacancy-fills-leave-no-record): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
