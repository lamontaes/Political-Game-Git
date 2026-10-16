---
id: core-recovery-hours-per-offer
title: "Work recovery hours are a daily leisure total, not one offer's length"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** `workWakingRecoveryHours` (5.16) is a day's leisure total used as the length of one recovery offer (`SG-P8-work-time-reserve`). Set it to the length of one offer and keep the total as a separate figure.

**Rules.** Every number is SOURCED, ESTIMATED or TUNABLE with a spread.

**Done when.** A test shows a worker's day in a drawn place using the per-offer length and the time-use check (scripts/core2-year/time-use.ts) still printing the same leisure share, with the stopgap resolved and the parameter row named.

**Files.** src/core2/data/parameters.json, src/core2/modules/people.ts

**Notes.** core.md line 194, checked Oct 15.
