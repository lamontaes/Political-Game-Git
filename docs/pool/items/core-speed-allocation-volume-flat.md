---
id: core-speed-allocation-volume-flat
title: "Cut the dense town's allocation volume across its many small allocators"
area: core
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** An allocation profile of Long Hill, Connecticut (seed m7b, first 60 days) shows 9.2 GB allocated with no allocator above 9.3 percent: iterators over Maps and Sets 850 MB, the callbacks in births-counted.ts 735 MB (applyCountedFlows rebuilds the whole town's people list and maps each counted pass), projectCashJournal 410 MB, postCashJournal 320 MB, liveHouseholds 158 MB, staffCandidates 128 MB, countedMembers 126 MB, inCustody 110 MB. One edit moves the year by less than noise (a school-day memo cut allocation 1.4 percent and the year 0.4 seconds). The work therefore covers several of these together: cache the births pass's people and maps per counted pass, return arrays without copying from liveHouseholds and countedMembers, replace for-of over Maps in daily loops with indexed arrays, and avoid per-call closures in the journal.

**Rules.** Speed: no change makes a year more than 20 percent slower; measure each cut on the same machine one process at a time. One model, two tiers: results are identical, shown by a played-year record comparison before and after.

**Done when.** The sampled allocation of the first 60 days of Long Hill (seed m7b) falls by at least 30 percent, the same played world finishes its year faster by the same measurement, and a record-for-record comparison of the year's journal before and after is identical.

**Files.** src/core2/births-counted.ts,src/core2/journal.ts,src/core2/counted-groups.ts

**Notes.** TODO

Split Oct 24 by the speed lead (the order's step 4: an L item is split before building). Long Hill's year allocates 58 GB (sampling heap profile with collected objects, seed m7b, the by-module table in core-speed-year-over-limit-dense-town). The parts, each one module and its own measured acceptance: `core-speed-journal-posting-in-play` (the cash journal, 160,000 postings a year), `core-speed-work-attendance-in-play` and `core-speed-work-payroll-in-play` (the work engine, 9.6 GB), `core-speed-counted-renewal-pass` (counted births and deaths, the births-counted callbacks above). Not taken: the counted store's `liveHouseholds` as a kept array (the counted-moves engine retires and adds households while it walks them, so a snapshot would change who is walked). This item is done when its parts are.
