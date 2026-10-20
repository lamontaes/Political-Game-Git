---
id: release-red-service-charges-census-totals
title: "service-charges-data test: Berry, Kentucky (US-KY), seed ce65df0e: the table is 13.9 percent off the Census totals against a 10 percent bound (service-charges-data.test.ts:54)"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/political-game-pool-3xfqef-8
pr: #5396
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:58:04.929Z
---

**What.** The service-charges-data test fails in Berry, Kentucky (US-KY), seed ce65df0e4a98d185f9843fabea23f7bb: the table is 13.9 percent off the Census table's own totals, against a bound of 10 percent (service-charges-data.test.ts:54). Find whether the data row for the state or the way the table sums it is wrong. The table should agree with the Census totals within ten percent in every drawn place.

**Rules.** Fix at the root: a red test is fixed in place or the code it guards is, never skipped or loosened. No dice. One rule, all 56 places: place facts come from data, and the test names the place and seed it drew.

**Done when.** In Berry, Kentucky with that seed and in two other drawn places the service-charge table agrees with the Census totals within ten percent, and src/core2/service-charges-data.test.ts passes.

**Files.** src/core2/service-charges-data.test.ts, src/core2/data/service-charges

**Notes.** Found running src/core2 on main, Oct 19 to 20 (release-suite-red-list-on-main): 'expected 0.1389 to be less than 0.1'.
