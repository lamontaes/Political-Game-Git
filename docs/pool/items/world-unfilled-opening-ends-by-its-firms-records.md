---
id: world-unfilled-opening-ends-by-its-firms-records
title: "A new factory's first job can stay open for over a year while it earns nothing"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-founded-business-outside-sales-flow-starts-at-zero
lead: jobs
model: opus
effort: medium
root: none
source: CTO on #8928 (comment 6865473498, Nov 13 21:34Z), from Account lead T34's work on #9069
claimed-at:
checked:
---

**What.** A business founded in a played world posts its opening jobs at once, and with #9069 it is paid by its outside buyers only from its first hire. Nothing ends an opening that never fills. At Manley, Nebraska (US-NE 3130415, buildBenchWorld seed 2404d168289bb39dc9a8ece80cad2034fe3f23cc4a8509d7e1f8a417c05880d5, twoLevel), a manufacturer founded 2025-12-01 had no staff until month 13. Small towns took 5 to 9 months for most first hires. Seen: the town's business list and its jobs, where a new factory employs nobody for a year with its job still listed open.

**Cause.** Found in code: `reviewEmployers` (src/core2/modules/jobs.ts) withdraws an open posting only when the firm's target falls below its staff plus postings (the surplus withdrawal at `jobsWithdrawActedPerMonth`), or when `need` goes negative. `withdrawOpening` applies only to positions a public budget line funds. No path reads the opening's age against the firm's own records. `raiseUnfilledPay` raises the pay of an unfilled opening each month by what the empty seat has cost, which pulls toward a hire but bounds nothing.

**Fix.** End or change an opening that does not fill by a cause in the firm's own records (CTO, Nov 13): its cash running out (the books' cash against the months of costs it can still carry), or the firm lowering what it asks for (the role, hours or skill it requires) so more seekers qualify. No fixed number of months. Reuse the jobs engine's own readers (the cash reach already in `reviewEmployers`, the vacancy duration in `vacancyDays`).

**Time box.** 3 hours, Opus at medium effort.

**Rules.** No dice. Sliding scales, never a threshold that flips. One rule, all 56 places: the check names its place and seed. Real vacancy durations calibrate, never target.

**Done when.** A second session plays 1,095 days at Manley with the seed above and in a drawn place where a business is founded (drawn again until one is, naming the places passed over), and every founded business with an unfilled opening either hires, changes the opening, or withdraws it or closes by a cause named in its records, by organization id; a test beside src/core2/market-entry-opening-staff.test.ts covers it; a year of `speed:year` is within 20% of its base. On screen: the town's business list and its jobs.

**Waits on.** world-founded-business-outside-sales-flow-starts-at-zero (#9069, on its way to the train).

**Files.** src/core2/modules/jobs.ts

**Notes.** Filed by hand on the Account lead T34 branch.

**Measured (Account lead T34, Nov 14, with #9069 in place).** Months each founding spent after its first staffing review with no staff, and the out-of-work seeker records in its town during those months (records, not weighted by the households counted seekers stand for; "tried" counts seekers whose finding progress reached one while an opening stood near them):

| Place                                    | Founding                        | First hire         | Months waiting | Seekers in town, mean (range) | Tried, mean |
| ---------------------------------------- | ------------------------------- | ------------------ | -------------- | ----------------------------- | ----------- |
| Manley NE (3130415, seed 2404d168...)    | manufacturing 2025-12-01        | 2027-01-10         | 12             | 3.8 (0 to 6)                  | 0           |
|                                          | manufacturing 2026-04-01        | 2026-10-12         | 5              | 4.4 (4 to 5)                  | 0           |
|                                          | manufacturing 2026-11-01        | not by day 760     | 4              | 0.8 (0 to 2)                  | 0           |
| Skagway AK (0270760, seed 8f3ccb88...)   | 11 foundings 2025-03 to 2026-05 | 2025-06 to 2027-02 | 2 to 8         | 2.5 to 6.0 (1 to 6)           | 0           |
| Teaticket MA (2569205, seed 7267935d...) | 12 foundings 2025-04 to 2026-08 | 2025-09 to 2027-02 | 4 to 6         | 0.8 to 5.5 (0 to 6)           | 0           |

Seekers were in town in nearly every month of every wait, and none reached a finding progress of one while the opening stood (two late foundings at Teaticket saw one such seeker in their first month). So the waits come from the pace at which seekers find work (`regionalPull`, built monthly from the CPS spell rate), not from an empty town. Whoever builds this should read that pace against the opening before adding any end to it.
