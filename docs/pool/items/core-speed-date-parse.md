---
id: core-speed-date-parse
title: "Parsing the same dates again and again takes 3 percent of a dense town's year: makeIsoDate and epochDayOf"
area: core
kind: cleanup
priority: 2
size: S
status: in-pr
claimed-by: claude/speed-date-parse
pr: #5381
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:29:51.705Z
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b), makeIsoDate takes 5.5 seconds and epochDayOf 2.6 seconds of 251, about 3 percent. The largest callers are business foundings (2 seconds), the closeness elapsed-time read (1.2), the work pay period (0.7) and news (0.6). They turn the same date strings into day numbers over and over, every day for every person and flow. Parse each date once where the record is written and keep the day number beside the string.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Replace, never layer: the repeated parse is removed at its callers, not hidden behind a second cache that nothing clears.

**Done when.** A profile of npm run speed:year -- --seed m7b --exclusive in the played world after the change shows makeIsoDate and epochDayOf together below 1 percent of the year, and the date tests in src/core2/kernel and the golden-path suite pass.

**Files.** src/core2/kernel/dates.ts, src/core2/modules/business.ts, src/core2/closeness.ts, src/core2/work-pay-period.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5381 (branch claude/speed-date-parse): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.
