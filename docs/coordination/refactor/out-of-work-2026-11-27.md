# The out-of-work stock: measured, where the climb comes from, what the fix is read against (Nov 27, 2026; corrected 8:50 p.m.)

For the Opus finisher (it changes how many people have work in every place, so it is a behavior change). Written by Past and Day One from a played year on `fold2/nov27`; no code changed. **Corrected on the CTO's 8:36 p.m. line: the number to fix and to test is the player's own, `townLaborByPlace` (`modules/world-panels.ts`), the one pass the Metrics tab, the paper and the economy panel read. Economy measured it (#10958). My table below is an upper bound on a different definition, and where my first brief and Economy's note disagree, Economy's note governs.**

## The player's number first (Economy, #10958, seed oo1, `fold3/nov27`)

| Read: the economy panel's rate at the played town (`townLaborByPlace`) | Day 2 | Day 182 | Day 365 |
| ---------------------------------------------------------------------- | ----- | ------- | ------- |
| Lake Arrowhead, Maine (2337795)                                        | 4.0%  | 7.5%    | 9.7%    |
| Carter Springs, Nevada (3210200)                                       | 0.0%  | 14.6%   | 26.7%   |

I re-ran Economy's script at Carter Springs on `fold3/nov27` 7822b92f (`node --import tsx scripts/refactor/oow-measure.ts --seed oo1 --place 3210200 --days 2,182,365`) and got the same panel rates: 0.0% (0 looking of 337 in the town's labor force), 14.6% (50 of 342) and 26.7% (107 of 401). The panel's labor force is the town's own 337 to 401 people; my denominator counted the whole world's jobs, which is the main reason mine reads higher. (cf145db4 does not load for this script: the `reachALineAdditions` cycle, fixed on train 2.) Economy's note (`docs/coordination/refactor/out-of-work-economy-2026-11-27.md`) holds the third place (Southern Ute, Colorado) and the flows by heads. The fix is read against this number.

## My table: an upper bound, with its exact definition

Same seed (oo1), the two places `drawPlace` gave me, one year from day one on `fold2/nov27`. The share is **seekers (every full seeker row plus the counted seekers' heads) over seekers plus the jobs held by working residents (every open job record: one per record, local jobs only, the counted tier by its heads; no workers placed elsewhere)**. Workers' households place elsewhere (`unplacedWorkers`), which `townLaborByPlace` counts as at work, are left out of my denominator, and it is the whole played world's rows, not one town's.

| Day                                                 | Lake Arrowhead | Carter Springs |
| --------------------------------------------------- | -------------- | -------------- |
| 1 (the opening writes its seekers on the first day) | 0.0%           | 0.0%           |
| 2                                                   | 11.9%          | 8.4%           |
| 182                                                 | 21.9%          | 26.5%          |
| 365                                                 | 22.0%          | 33.4%          |

**Why it differs from the player's number (it is higher at every place and every day):** (1) local jobs only: the people who work somewhere else are missing from my denominator, which makes the share look larger; (2) one per record: a person with two job records counts twice, and the counted tier counts by heads, not by the household's weight the way the panel does; (3) every seeker: I counted every seeker row, including the ones `townLaborByPlace` does not weigh as part of the town's labor force. So the table is an upper bound on the jobless share, not a copy of what a player reads, and the 22 to 33 percent figures must not be taken for the Metrics tab's rate. Where it goes beyond the player's number, Economy's read governs, and slice 1 below is withdrawn as the first fix.

Lake Arrowhead's year of flows (mine, by rows): 112 layoffs from demand below staff, 27 from closures and 120 who started looking, about 259 in; 258 postings opened (167 for staff beyond today's, 91 to replace retirees) and 210 were filled, so about 210 out. The 112 who left work were 91 retirees, 9 deaths, 11 other and 1 moved away; none became seekers. At day 2 the whole stock is the opening's jobless (122 rows, reason `opening-unemployed`). By day 365 the mix is 147 laid off for demand below staff, 66 who started looking, 25 looking around and 27 from closed employers.

## The two causes (as I first wrote them, with Economy's correction)

1. **The opening.** `jobs.ts` lets every jobless working-age resident whom the participation chooser favors become a seeker (`OPENING_UNEMPLOYED`), with no check against the jobs the books hold. **Economy's read at the player's number: day 2 is 4.0 percent at Lake Arrowhead, about the real figure, and under 2 percent at the small towns, so the opening is not too jobless; if anything the small towns open with too few.** My day-2 11.9 and 8.4 percent came from the definition above.
2. **The climb is flows (Economy's finding, #10958; my own rows count flows by records and I did not measure an entry share).** In Economy's first measure about 41 percent of the labor force entered the stock in a year against about 22 percent in the CPS gross flows (its newer measure, #10958's follow-up, puts entries at about 26 percent at Lake Arrowhead, with exits too slow), and about 9 percent of the stock exits a month against roughly half a month. Entry is the largest flow (`jobsEnterBaseline`, TUNABLE: 81 started looking at -2.5, 34 at -3.0, 0 at -3.5 at Carter Springs); retuning it alone fixes Lake Arrowhead (6.0 percent) and leaves Carter Springs at 18.9, so it is not the fix. The away workers fall each year with nothing to replenish them as young adults enter working age. The fix Economy proposes, which I agree with: **run the same entry, layoff, find and give-up flows in the history before day one, so the opening stock is what the flows leave, and replenish the away shares as members enter working age.** Layoffs are not the problem: 112 a year at Lake Arrowhead is about 1.3 percent of the employed a month, which matches the sourced CPS flow.

## The slice, as Economy now builds it

Economy builds the fix: the flows run through the history before day one, entry and exit read from the CPS gross flows' strength (not typed counts), and the away shares replenished as members enter working age. My two slices of the first brief are withdrawn as the first fix: the opening employment rate (slice 1) would not move the climb at the player's number, and staffing against the labor force (slice 2) is the second thing to read after the flows, not before. The two causes above are where they show in the code (`jobs.ts` `reviewJobless` and `reviewCountedEntry`, `readStaffingTarget`, `openReplacements`).

## The test that proves it

A played year at three places drawn by `drawPlace` (a script that names the places and seed, `speed:year`-style, records proof for the unchanged rest). The test reads the world's own records, never a typed rate, and the number it reads is `townLaborByPlace`, the player's:

- **Day 2 and the year's path:** the rate on day 2 sits in the real range's neighborhood (CPS, near the Lake Arrowhead 4.0 percent), does not jump from 0 to a stock in one day, and the year ends within a few points of where it began, with no place at 27 or 33 percent.
- **The flows:** the year's entries against exits by heads, read against the cited ratio (entering about 22 percent of the labor force a year, from CPS gross flows LNS17400000, 1.42 to 1.56 million a month, in `src/core2/data/parameters.json`); the median completed search against the cited duration (mean 23.1 and median 10.1 weeks for calendar 2025; mean 27.1, median 11.9 in Oct 2026, FRED UEMPMEAN and UEMPMED, `data/research/labor/unemployment-duration-and-reservation-wage.json`).
- **Both:** the records proof is identical everywhere nothing the change reaches; the one-year speed bar holds (no more than 20 percent slower than base).

What is not sourced here: a monthly job-finding rate. The research file has no fetched figure for it (`b_durationDependenceJobFindingRate`: "notFound"). The duration targets above are the sourced stand-ins, and the researcher should add the flow when a page can be fetched.
