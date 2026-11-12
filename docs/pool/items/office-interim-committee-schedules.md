---
id: office-interim-committee-schedules
title: "Each legislature's own interim committee schedule replaces the shared day of the month"
area: office
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: added with npm run pool -- add
claimed-at:
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
lead: governing
checked: fable 2026-11-10
branch: claude/pool-office-interim-committee-schedules
---

**What.** Between sessions a state legislator's calendar has one committee day, the same day of every month in every state. interimCommitteeDayOfMonth is 15, ESTIMATED with a spread of 1 to 28, and src/core2/office-day-state.ts reads it for the interim-committee entry. Real interim committees meet by their own schedule: some monthly, some quarterly, some only when leadership calls them. Collect each state legislature's interim committee schedule (meetings a year, months, day or weekday), cite the source for each, and read it in place of the single day so a member's interim calendar differs by state.

**Cause.** Found in code: src/core2/office-day-state.ts line 431 gives every state's interim committee entry on week.interimCommitteeDayOfMonth (declared at line 162), whose value is 15 for all states in src/core2/data/office-day/state-week.json (the spread is on line 6 of that file; state-parameters.json does not hold it).

**Fix.** Source each legislature's interim committee schedule into a per-state table (src/core2/data/office-day/interim-committees.json, new), read it where line 431 reads the single day, and delete interimCommitteeDayOfMonth and its marker from state-week.json and the code. Mark a state with no found schedule ESTIMATED from the national pattern.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: every row cites its source (NCSL's interim committee tables or the legislature's own rules) and is SOURCED, or ESTIMATED with the spread where a legislature leaves it to each committee; the schedule checks the calendar and never decides a member's choice to go. One rule, all 56 places: the table is data keyed by state, no state is named in code, and the territories' legislatures are in it or marked as having no interim committees. Estimate, never UNKNOWN: a state with no found schedule starts from the national pattern marked ESTIMATED. Replace, never layer: interimCommitteeDayOfMonth and its marker are deleted in the same change. An effect is a read, not a record: office-day-state.ts reads the table when it builds a member's interim entries.

**Done when.** A second session plays a state legislator in a drawn place with a state legislature (buildBenchWorld, place and seed named in the PR body) and sees interim committee entries on the dates that state's row sets, and none in a state whose row says it has none, shown by the office-day entry's date and the state key. src/core2/data/office-day/interim-committees.json holds a row for every state and territory legislature with meetings a year, months or weekday, source and tag. A test in src/core2/office-day-state.test.ts covers it, and interimCommitteeDayOfMonth is gone from state-week.json.

**Waits on.** Nothing.

**Files.** src/core2/office-day-state.ts, src/core2/data/office-day/state-week.json, src/core2/data/office-day/interim-committees.json (new), src/core2/office-day-state.test.ts

**Notes.** Written Oct 20 (claude/interim-spec) from the code. The shared day is read at `office-day-state.ts` lines 375 to 385; the parameter is in `state-parameters.json` with its NCSL source note. Many states do not publish a single schedule, so expect a share of ESTIMATED rows.

Oct 20 (pool feeder): the spec was already complete from the Oct 20 write-up; only the blocked-on text was stale and is now cleared. It is research plus a small reader, so it needs no other item; verified against office-day-state.ts and state-parameters.json that interimCommitteeDayOfMonth exists.

Released (2026-11-11): needs sourced interim committee schedules for 56 legislatures (NCSL or each legislature's rules), none fetched; ESTIMATED rows for all would change nothing real; not started. Continue on branch claude/pool-office-interim-committee-schedules.
