---
id: history-past-work-moved-on-for-lower-pay
title: 'A past job that began before the published pay series ends "moved on" for one paying about half'
area: world
kind: bug
priority: 2
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
root: design-one-model-two-tiers
checked: Account lead 2026-11-14
source: Account lead T48 on #9089, measured at Trenton UT
---

**What.** At Trenton, Utah (key 4977230), seed 7e3fe2d09c9fefa1a561aee66a6fb893b275fe8261f2fe6c8cbac48600b355f1 (drawPlace(49e8f924, "t48-b"), `buildBenchWorld` with the default player), person:press:outlet:newspaper:1:jurisdiction_7ba67101ad731657:owner:0 holds past-work:...:owner:0:1 from 2006-01-01 ("before-the-run") at $33.29 an hour, ends it "moved on" on 2020-02-21, and takes past-work:...:owner:0:2 at $16.54 an hour. Someone who quits for other work should take a job that pays more. The same on the train and on #9089. Seen: that person's history and Journal lines about their past jobs.

**Cause.** Measured: at Trenton UT (key 4977230), seed 7e3fe2d09c9fefa1a561aee66a6fb893b275fe8261f2fe6c8cbac48600b355f1, two parts in src/core2/past-work.ts. First, `payOn` moves today's rate back by the month's hourly earnings over the latest, but the published hourly earnings series starts in 2006-03; a spell begun before it reads a month with no earnings and keeps the ratio 1, so the 2006 job is paid in today's dollars. Second, the better-offer hire (`hire` with `better`) compares that pay against each firm's going rate today (`firm.hourlyMinor`, unscaled), finds none higher, and falls back to the firm with the most openings, whose pay `payOn` then moves back to 2020 dollars (about 0.77 of today's).

**Fix.** Compare like with like: give `hire` the better-offer threshold in today's dollars (the left job's pay over the month's ratio), and for a month before the first published earnings, use the first published month's ratio, the way SG-PEOPLE-whole-past-first-month-economy already does for the economy's first month. A quit with no better-paying opening in town should not become a lower-paying hire.

**Time box.** 2 hours for one Sonnet session.

**Rules.** No dice; the jobs engine's better offer decides. One rule for full people and counted ones.

**Done when.** A second session starts a new life at a drawn place with an older player, opens a working adult's history, and sees no past job left for one that pays less. At the place, seed and person above, no past-work spell that ends "moved on" is followed by one paying less in the same year's dollars, and a test over a drawn place with a 35-year-old player asserts it for every person, naming place and seed.

**Waits on.** Nothing.

**Files.** src/core2/past-work.ts, src/core2/past-work.test.ts

**Notes.** Filed by Account lead T48 from #9089. Pre-existing on the train; not caused by #9089.
