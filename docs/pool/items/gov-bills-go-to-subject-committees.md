---
id: gov-bills-go-to-subject-committees
title: "Every bill goes to one committee named 'general', so legislatures vote in lockstep"
area: gov
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/bills-subject-committees
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T10:02:23.271Z
---

**What.** In all ten audit places every bill was sent to the 'general' committee with the same members and bills held there record 0 to 0; floor tallies repeat (Wyoming's House voted 56 to 6 on 12 of 16 votes). Route each bill to a subject committee by what its sections touch (legislature-committees.ts has the subject map), seated by the leadership engine, so votes differ by bill.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In a one-year run of a drawn place bills go to different committees whose members' votes differ, by bill and committee ids.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-committees.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.
