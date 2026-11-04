---
id: words-journal-spoken-date-guard-red
title: "Main red: the journal says a date with the kernel's spoken date"
area: words
kind: bug
priority: 1
size: S
status: done
claimed-by: lane3/red-journal-spoken-date
pr: #7185
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T05:49:25.202Z
---

**What.** tests/guards/english/sitting-bans.test.ts ('the director says a date in speech with the director's own spoken date') fails on main: src/director/journal.ts imports spokenDate from core2/kernel/dates, added in #7179 for the filing's election date.

**Rules.** The director says dates as people say them (src/director/words.ts spokenDate: the year only when it differs).

**Done when.** sitting-bans.test.ts passes; journal.test.ts passes; the filing line still names the election date.

**Files.** src/director/journal.ts

**Notes.** Filed by Lane 3 (Nov 4); fix on lane3/red-journal-spoken-date. Also seen: journal-kin-words.test.ts red on main at seed c75131c1ac7cb085f8f82fc46bd3357c53ad7844 (Mentone, Alabama: 'my parent' for a father), independent of this fix; evidence added to words-parent-named-mother-or-father.
