---
id: gov-empty-seat-filled-by-press-staff
title: "An empty mayor's seat is filled by a television reporter (South Dakota, seed 85748008adb3)"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/empty-seat-press
pr: #4663
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T09:09:02.058Z
---

**What.** When the mayor's seat was vacated, the city administrator was appointed by a television reporter, `person:press:outlet:television:2:jurisdiction_d6ec256b02df8147:reporter:0`, as the seat holder, before the elected winner's term had begun. The pool for an empty seat (offices.ts near line 256) includes press and other placed staff. Fill empty seats and town posts only from residents, and from the elected successor once their term begins.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In the seed named, the April 2025 appointment is made by the sitting acting head or the elected winner, never a reporter; a test names the seat and the holder ids.

**Files.** src/core2/modules/offices.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.
