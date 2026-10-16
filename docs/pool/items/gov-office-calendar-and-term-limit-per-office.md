---
id: gov-office-calendar-and-term-limit-per-office
title: "Races run under the wrong office rules: every state office gets the November date, and term limits apply only to the presidency (Wisconsin, Virginia)"
area: gov
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/executive-term-limits
pr: #4694
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T10:15:07.227Z
---

**What.** The Wisconsin superintendent office is titled 'nonpartisan, spring election' but held a party primary on August 12, 2025 and a general on November 4, because every state office gets the November date (elections-calendar.ts near line 130). Virginia's sitting governor also filed for a consecutive term, which Virginia bars, because term limits apply only to the presidency (voting.ts near line 1112). Give each office its own calendar, primary method and term limit from the place's data.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In the seeds named, the superintendent race follows its spring nonpartisan calendar and a term-limited governor cannot file, by contest and filing ids.

**Files.** src/core2/elections-calendar.ts, src/core2/modules/voting.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.
