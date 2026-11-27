# The out-of-work stock: measured, two causes, two slices (Nov 27, 2026)

For the Opus finisher (it changes how many people have work in every place, so it is a behavior change). Written by Past and Day One from a played year on `fold2/nov27`; no code changed.

## What a played year does

Seed oo1, one year from day one, two places drawn by `drawPlace` (Lake Arrowhead, Maine, 2337795; Carter Springs, Nevada, 3210200). The share out of work is the full and counted seekers over seekers plus employed. It counts every working-age resident who entered the labor force, so it is an upper read, not a copy of the published rate.

| Day                                                 | Lake Arrowhead | Carter Springs |
| --------------------------------------------------- | -------------- | -------------- |
| 1 (the opening writes its seekers on the first day) | 0.0%           | 0.0%           |
| 2                                                   | 11.9%          | 8.4%           |
| 182                                                 | 21.9%          | 26.5%          |
| 365                                                 | 22.0%          | 33.4%          |

Lake Arrowhead's year of flows: 112 layoffs from demand below staff, 27 from closures and 120 who started looking, about 259 in; 258 postings opened (167 for staff beyond today's, 91 to replace retirees) and 210 were filled, so about 210 out. The 112 who left work were 91 retirees, 9 deaths, 11 other and 1 moved away; none became seekers. At day 2 the whole stock is the opening's jobless (122 rows, reason `opening-unemployed`). By day 365 the mix is 147 laid off for demand below staff, 66 who started looking, 25 looking around and 27 from closed employers.

## The two causes

1. **The opening.** The opening's jobs come from the businesses' staffing books (`createOpeningFinance`, the jobs engine's open on the first day), and then `jobs.ts` lets every jobless working-age resident whom the participation chooser (`chooseAct`, the `look` offer, `participationShift`, `unemployedNeed`) favors become a seeker (lines about `OPENING_UNEMPLOYED`). The chooser has no check against how many jobs the books hold, so the stock on day 2 is whoever has no job, not what a labor market with these jobs would hold.
2. **Staffing against the labor force.** After the opening, a vacancy exists only when an employer's staffing target (its sales-driven target in `reviewEmployers`: `readStaffingTarget`, `withdrawSurplus`, `openReplacements`) exceeds its staff, or a retiree leaves. So the people entering the labor force each year are not matched by openings, and the stock climbs. Layoffs are not the problem: 112 a year at Lake Arrowhead is about 1.3 percent of the employed a month, which matches the sourced CPS flow below. The matching (`runWeek`) fills what is posted.

## The two slices

1. **The opening employment rate first.** At the opening, the seekers the chooser writes should follow from the jobs the books hold and the people who live there, with the participation choice still deciding who is in the labor force. The behavior to change is how the first-day jobs and the jobless relate, in `jobs.ts` `openingSeekers` and `opening-employment.ts`, not the matching.
2. **Staffing against the labor force second.** An employer's target should read the labor in reach as well as its sales (how many people look for work where it is, and how long they have), so that openings follow the supply a place has. The change goes in `readStaffingTarget` and `openReplacements`, still without dice and without pinning a count: a firm's target is a smooth function of its sales and the seekers near it.

## The test that proves each slice

A played year at three places drawn by `drawPlace` (a script that names the places and seed, `speed:year`-style, records proof for the unchanged rest). The test reads the world's own records, never a typed rate, and compares relationships and totals to the cited real rates:

- **Slice 1:** the share out of work on day 2 and its first-year path; the rows by reason. It passes when the day-2 share is within the real range's neighborhood and does not jump from 0 to the stock in one day, and the year's path does not climb by more than the entry flow explains. Real rates it is read against: the unemployment duration (mean 23.1 and median 10.1 weeks for calendar 2025; mean 27.1, median 11.9 in Oct 2026, FRED UEMPMEAN and UEMPMED, `data/research/labor/unemployment-duration-and-reservation-wage.json`), and the flow into unemployment from employment (CPS gross flows, FRED LNS17400000, 1.42 to 1.56 million a month, in `src/core2/data/parameters.json`).
- **Slice 2:** the year's job-finding (postings filled against seekers), layoffs and entrants. It passes when the median completed search is within the cited duration's range at the three places, layoffs stay near the JOLTS and CPS rates they already match, and the out-of-work share ends the year within a few points of where it began, without a place at 33 percent.
- **Both:** the records proof is identical everywhere nothing the slice changes reaches; the one-year speed bar holds (no more than 20 percent slower than base).

What is not sourced here: a monthly job-finding rate. The research file has no fetched figure for it (`b_durationDependenceJobFindingRate`: "notFound"). The duration targets above are the sourced stand-ins, and the researcher should add the flow when a page can be fetched.
