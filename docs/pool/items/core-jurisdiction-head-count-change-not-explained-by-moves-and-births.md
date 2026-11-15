---
id: core-jurisdiction-head-count-change-not-explained-by-moves-and-births
title: "A jurisdiction's whole head count grows 365 in a year; moves explain 213 and births less deaths are not shown to explain the other 152 (Edmore, North Dakota, seed yrseed-3822340)"
area: core
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: none
source: "F5 turnover check on #9326, Nov 14"
claimed-at:
checked:
---

**What.** The whole head count of a jurisdiction (full people plus the weighted counted groups) changes by more than arrivals less departures plus births less deaths account for. Make the books agree, or show where the rest comes from. Guards: the counted tier's head count, so a move or birth is never added or lost silently.

**Cause.** Needs cause. Measured, not explained: Edmore, North Dakota (place key 3822340, world seed yrseed-3822340, `buildBenchWorld` two-level, `advanceCore` 365 days from the game start, bookkeeping off, head 357ab77c): day 0 holds 885 full people plus 11,031 counted (weighted) = 11,916; day 365 holds 969 plus 11,312 = 12,281; change +365. Move rows in the year: in 567, out 354, net +213 (in is 4.8 percent and in plus out 7.7 percent of the day-0 head count; 530 in and 354 out are to and from the rest of North Dakota, 35 from abroad, 2 from Texas). Births recorded: 4 full and 88 counted member records born in the year, unweighted; deaths in the year were 0 among full people, and counted deaths (`dieInPart`) were not read. So +365 less the net moves leaves +152 to be births less deaths, and the births found are 92 before weights. Found in code: not yet; the next reading is `CountedStore.weightedCount` against the weights on counted births and `dieInPart`. The turnover is a plausible share of real mobility (the ACS counts about 4 percent of people as arrivals from another county, state or abroad in a year), so the move counts themselves look reasonable; the gap is the books, not the churn.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes and set the state honestly with a one-line note.

**Rules.** Wire to the world: the head count is read from the same store the engines read. Ask why: the gap is named by record.

**Done when.** A second session, on main at Edmore, North Dakota with the same seed, runs the 365 days and sees day-365 head count equal day-0 plus arrivals less departures plus weighted births less weighted deaths, with the three figures printed; and the same in one more drawn place. A test names the place and seed.

**Waits on.** The small-town deaths fix to `applyCountedFlows` folding.

**Files.** src/core2/counted-groups.ts, src/core2/modules/counted-moves.ts, src/core2/modules/residents.ts

**Notes.** Filed by F5 on the #9326 turnover check, Nov 14. Seen: the head count on the town's population screen.

First step: First, after the small-town deaths builder's fix to `applyCountedFlows` in src/core2/births-counted.ts (a `take<1` break and the look-back emptying debts each month; counted births and deaths are booked there) folds, re-run the Edmore figures above and build nothing new if they now agree. If they still do not: read the weighted births and counted deaths of the same year in the same run, name which of them (or a fill-in that adds weight) accounts for the +152, and fix the one that adds people the records do not show.
