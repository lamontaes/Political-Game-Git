---
id: core-speed-date-parse
title: "Parsing the same dates again and again takes 3 percent of a dense town's year: makeIsoDate and epochDayOf"
area: core
kind: cleanup
priority: 2
size: S
status: done
claimed-by:
pr: #5381
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b), makeIsoDate takes 5.5 seconds and epochDayOf 2.6 seconds of 251, about 3 percent. The largest callers are business foundings (2 seconds), the closeness elapsed-time read (1.2), the work pay period (0.7) and news (0.6). They turn the same date strings into day numbers over and over, every day for every person and flow. Parse each date once where the record is written and keep the day number beside the string.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Replace, never layer: the repeated parse is removed at its callers, not hidden behind a second cache that nothing clears.

**Done when.** A profile of npm run speed:year -- --seed m7b --exclusive in the played world after the change shows makeIsoDate and epochDayOf together below 1 percent of the year, and the date tests in src/core2/kernel and the golden-path suite pass.

**Files.** src/core2/kernel/dates.ts, src/core2/modules/business.ts, src/core2/closeness.ts, src/core2/work-pay-period.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5381 (branch claude/speed-date-parse): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5381 (branch claude/speed-date-parse): The body explicitly says the done-when profile was not run: core-speed-date-parse requires a seed-m7b played-year profile with makeIsoDate and epochDayOf together below 1 percent. A microbenchmark and a combined timing with three other PRs do not supply that proof. Run and report the named profile on this merged head before completing the item.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5381 (branch claude/speed-date-parse): The named m7b profile now addresses the earlier missing-profile return, but the body itself reports civilDay 2.39 seconds plus makeIsoDate 0.05 seconds out of 227 seconds, about 1.075 percent, and says this remains above the item's below-1-percent date-parsing target. Moving the parser into civilDay does not remove its cost from that acceptance. The body also does not provide the golden-path pass named in Done when. Complete and report the named acceptance, or track the demonstrated partial optimization under a bounded item while keeping the remaining target open. No full suite was run here and no local gate pass is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5381 (branch claude/speed-date-parse): The new caller item records the remaining work, but this PR still names the original core-speed-date-parse item whose Done when requires combined date-reading cost below 1 percent and the golden-path pass. Its body still reports about 1.075 percent and the author comment says golden path was not run here. A separate remaining-work item does not complete the unchanged original acceptance. Either finish it with the caller fixer and report the final proof, or put this demonstrated partial optimization under its own bounded item while retaining the original target open. Add the required Done when evidence table for the actual completed item. No local gate pass is claimed here.; finish on that branch, merge main into it first.
