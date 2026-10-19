---
id: gov-office-calendar-and-term-limit-per-office
title: "Races run under the wrong office rules: every state office gets the November date, and term limits apply only to the presidency (Wisconsin, Virginia)"
area: gov
kind: bug
priority: 2
size: M
status: done
claimed-by:
pr: #4694
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The Wisconsin superintendent office is titled 'nonpartisan, spring election' but held a party primary on August 12, 2025 and a general on November 4, because every state office gets the November date (elections-calendar.ts near line 130). Virginia's sitting governor also filed for a consecutive term, which Virginia bars, because term limits apply only to the presidency (voting.ts near line 1112). Give each office its own calendar, primary method and term limit from the place's data.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In the played world (buildBenchWorld) in the seeds named in the pull request, a test shows the superintendent race follows its spring nonpartisan calendar and a term-limited governor cannot file, by contest and filing record ids, and the calendar and limit come from the place's data for all 56 places.

**Files.** src/core2/elections-calendar.ts, src/core2/modules/voting.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.

Sent back 2026-10-16 from PR #4694 (branch claude/executive-term-limits): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
