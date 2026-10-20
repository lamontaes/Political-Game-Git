---
id: core-speed-date-parse
title: "Parsing the same dates again and again takes 3 percent of a dense town's year: makeIsoDate and epochDayOf"
area: core
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b), makeIsoDate takes 5.5 seconds and epochDayOf 2.6 seconds of 251, about 3 percent. Callers turn the same date strings into day numbers over and over, every day for every person and flow. Find the callers by their share of the time and parse each date once, keeping the day number beside the string where the record is written.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Replace, never layer: the repeated parse is removed at its callers, not hidden behind a second cache that nothing clears.

**Done when.** A profile of npm run speed:year -- --seed m7b --exclusive after the change shows makeIsoDate and epochDayOf together below 1 percent of the year, and the date tests in src/core2/kernel and the golden-path suite pass.

**Files.** src/core2/kernel/dates.ts, src/core2/work-pay-period.ts

**Notes.** TODO
