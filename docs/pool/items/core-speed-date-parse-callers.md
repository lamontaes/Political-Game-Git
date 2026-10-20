---
id: core-speed-date-parse-callers
title: "The last 1.06 percent of date reading in a dense town's year sits in about a dozen callers: news, the closeness elapsed read and the pay period dates"
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

**What.** After PR 5381 reads dates by arithmetic, the seed m7b profile (Long Hill, Connecticut, key 0943580) still shows civilDay at 2.39 s of 227 s (1.06 percent) and makeIsoDate at 0.05 s. By caller, the time is spread: news about 0.46 s, the closeness elapsed read 0.36 s, the work pay period date 0.22 s, activityAgeId 0.12 s, periodAtIndex 0.09 s, business foundings 0.07 s and about a dozen more under 0.07 s. Each calls for the same dates again and again. Keep the day number beside the string where the record is written, or compute a date's age once a day, at each of these callers.

**Rules.** Speed: no change may make a year more than 20 percent slower than its base, measured on the same base and machine. Replace, never layer: the repeated read is removed at its callers, not hidden behind a second cache.

**Done when.** A profile of npm run speed:year -- --seed m7b --exclusive in the played world (buildBenchWorld, Long Hill, Connecticut) shows civilDay and makeIsoDate together below 1 percent of the sampled time, and the golden-path suite and src/core2/kernel tests pass, with the profile top lines in the pull request body.

**Files.** src/core2/closeness.ts,src/core2/modules/news.ts,src/core2/work-pay-period.ts,src/core2/modules/work.ts

**Notes.** Split from core-speed-date-parse (PR 5381), which took the parse itself from 5.0 s to 2.4 s.
