---
id: office-interim-committee-schedules
title: "Each legislature's own interim committee schedule replaces the shared day of the month"
area: office
kind: research
priority: 3
size: M
status: blocked
claimed-by:
pr:
blocked-on:
after:
source: added with npm run pool -- add
---

**What.** Between sessions a state legislator's calendar has one committee day, the same day of every month in every state: interimCommitteeDayOfMonth is 15, ESTIMATED with a spread of 1 to 28, read by src/core2/office-day-state.ts (the interim-committee entry, about line 375). Real interim committees meet by their own schedule: some monthly, some quarterly, some only when the leadership calls them, on days each legislature sets. Collect each state legislature's interim committee schedule (how many meetings a year, in which months, on what day or weekday), cite the source for each, and put it in a table office-day-state.ts reads in place of the single day, so a member's interim calendar differs by state.

**Rules.** Research before building: every row cites its source (NCSL's interim committee tables or the legislature's own rules) and is SOURCED, or ESTIMATED with the spread where a legislature leaves it to each committee; the schedule checks the calendar and never decides a member's choice to go. One rule, all 56 places: the table is data keyed by state, no state is named in code, and the territories' legislatures are in it or marked as having no interim committees. Estimate, never UNKNOWN: a state with no found schedule starts from the national pattern marked ESTIMATED. Replace, never layer: interimCommitteeDayOfMonth and its marker are deleted in the same change. An effect is a read, not a record: office-day-state.ts reads the table when it builds a member's interim entries.

**Done when.** src/core2/data/office-day/interim-committees.json holds a row for every state and territory legislature with meetings a year, months or weekday, source and tag; a played world (buildBenchWorld) in a drawn place with a state legislature, place and seed named in the PR body, gives a member an interim committee entry on the dates their state's row sets (and none in a state whose row says it has none), shown by the office-day entry's date and the state key; a test in src/core2/office-day-state.test.ts covers it and interimCommitteeDayOfMonth is gone from state-parameters.json.

**Files.** src/core2/office-day-state.ts, src/core2/data/office-day/state-parameters.json, src/core2/data/office-day/interim-committees.json, src/core2/office-day-state.test.ts

**Notes.** Written Oct 20 (claude/interim-spec) from the code. The shared day is read at `office-day-state.ts` lines 375 to 385; the parameter is in `state-parameters.json` with its NCSL source note. Many states do not publish a single schedule, so expect a share of ESTIMATED rows.

Oct 20 (pool feeder): the spec was already complete from the Oct 20 write-up; only the blocked-on text was stale and is now cleared. It is research plus a small reader, so it needs no other item; verified against office-day-state.ts and state-parameters.json that interimCommitteeDayOfMonth exists.
