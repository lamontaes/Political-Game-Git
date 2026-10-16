---
id: gov-empty-seat-filled-by-press-staff
title: "An empty mayor's seat is filled by a television reporter (South Dakota, seed 85748008adb3)"
area: gov
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #4663
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** When the mayor's seat was vacated, the city administrator was appointed by a television reporter, `person:press:outlet:television:2:jurisdiction_d6ec256b02df8147:reporter:0`, as the seat holder, before the elected winner's term had begun. The pool for an empty seat (offices.ts near line 256) includes press and other placed staff. Fill empty seats and town posts only from residents, and from the elected successor once their term begins.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In the seed named, the April 2025 appointment is made by the sitting acting head or the elected winner, never a reporter; a test names the seat and the holder ids.

**Files.** src/core2/modules/offices.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.

Sent back 2026-10-16 from PR #4663 (branch claude/empty-seat-press): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4663 (branch claude/empty-seat-press): The new src/core2/vacancy-press-staff.test.ts silently returns when press.length or held.length is zero, so a random place can pass without checking any appointment; its final assertion is also skipped when now.personId is absent. The merger morning check refuses skipped or weakened tests. Assert or construct an applicable vacancy and verify the replacement is a non-press resident; preserve the recorded opening-day cache defect as its separate item; finish on that branch, merge main into it first.
