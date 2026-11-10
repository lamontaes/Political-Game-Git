---
id: research-work-schedule-and-attendance-sourced
title: "Research: sourced work schedule shapes and sourced rates of missing work"
area: core
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: researcher
model: sonnet
effort: medium
root: none
source: stand-in triage T5, Nov 10, 2026 (docs/stopgaps/triage-2026-11-10/p8.md)
---

**What.** Every job's weekly schedule is one of a few authored shapes (office, farm and the rest), and whether a worker attends or misses a scheduled day is scored from needs, traits, mood and a work-goal prior with no figure behind either. Find the real figures, record them as SOURCED or ESTIMATED with a spread, and check a played year against them in total. Closes SG-P8-work-schedule-data and SG-P8-attendance-choice.

**Cause.** Found in code: src/core2/data/work.json holds the authored schedule shapes (`stopgapId` SG-P8-work-schedule-data, source text "GAME ASSUMPTION" from the old engine), read by src/core2/work-state.ts (the marker at line 140); the attendance score is src/core2/modules/work.ts (markers at lines 540 and 838, `SG-P8-attendance-choice`).

**Fix.** Find, with year and unit: (1) hours worked on a weekday and on a weekend day by employed people, by occupation group (BLS American Time Use Survey), and the share working a fixed day shift against other shifts (BLS, Job Flexibilities and Work Schedules); (2) the share of employed people absent from their job in a week and the reasons (BLS Current Population Survey), and paid-leave days taken (BLS National Compensation Survey). Put each in data/research/core/ with a reader in scripts/research/, set the shape weights and the absence totals in data/work.json and data/parameters.json as SOURCED or ESTIMATED with their spreads, and resolve the two rows naming the files. The choice stays a score with no dice; the research only gives the totals a played year must reproduce.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No percentage roll picks one worker's day: real rates check totals only. One rule, all 56 places: no place named in logic. Keep a registered stopgap for any figure that cannot be found.

**Done when.** A second session runs the research check script in a drawn place it names with its seed and reads, for one played year, the share of scheduled days missed and the hours by weekday beside the sourced ranges, each inside its range; and opens dev mode's Trace on one worker in the running game and reads the schedule's source as sourced or estimated with its citation.

**Waits on.** Nothing.

**Files.** src/core2/data/work.json, src/core2/data/parameters.json, src/core2/modules/work.ts, src/core2/work-state.ts, src/core2/data/stopgaps/p8.json
