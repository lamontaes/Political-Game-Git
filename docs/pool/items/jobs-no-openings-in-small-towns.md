---
id: jobs-no-openings-in-small-towns
title: "A small town's employers open no position in a whole year: Fort Laramie, Wyoming has 27 businesses, 7 separations and 0 openings"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-3xfqef
pr: #5203
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:00:27.308Z
---

**What.** In Fort Laramie, Wyoming (place 5628230, seed off:0, a played year from January 20, 2025) the jobs engine opened no position at all: 27 businesses, 7 separations (2 layoffs, 3 quits, 2 left-work) and 0 rows in the positions table, so a jobless adult of any fit got nothing to apply for. A business opens a position only when its accumulated need reaches a whole head, and a small employer's need grows by a fraction of its gap each month, so a replacement can lag a year. Read the monthly review in reviewEmployers against real turnover (JOLTS openings run near 4 to 5 percent of jobs a month) and make a lost worker's seat reopen from the employer's own books and cash on a sliding scale, not only after the need builds up.

**Rules.** No dice: an employer reopens a seat from its books, its cash and its owner's traits, never a roll or a fixed wait. One rule, all 56 places: the same read for every town, with the real turnover rate checking totals only. Replace, never layer: the slow accumulation is replaced by the read, not kept beside it.

**Done when.** In a one-year played world (buildBenchWorld, Fort Laramie 5628230 with seed off:0, and two drawn places with seeds the builder did not choose) every town with separations shows openings opened for them, shown by position record ids, openings per month within the JOLTS spread for the town's size, and the jobs tests and src/core2/jobs-player-offers.test.ts pass. The owner plays it: a jobless 18-year-old in a small town sees openings to apply for.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-player-offers.test.ts

Fixed on claude/political-game-pool-3xfqef (Fort Laramie, Wyoming, place 5628230, seed off:0, 365 days from 2026-10-12, buildBenchWorld two-level): `reviewEmployers` kept a shrink carried from earlier months as negative `need`, so a leaver's vacancy (+1) in a firm short of staff stayed under 1 for months until the leaver was cleared when the firm's demand target dipped; positions opened went from 5 to 7 of about 21 separations. The rest are firms whose demand target is below their staff, which attrition shrinks by design. Test: src/core2/jobs-leaver-refilled.test.ts.

**Notes.** Found Oct 19 measuring world-player-jobless-no-offers. In the same year the player's first offer came in week 11 in Addison, West Virginia and week 19 in Glenwood, North Carolina, and never in Fort Laramie or Orient, South Dakota.

**Measured further (claude, Oct 19, branch claude/openings-small-towns-s10), no code shipped.** I made a lost worker's seat reopen at the employer's cash-cover rate (one month's `reach` per head) instead of building at 15 percent of the gap a month. It raised hiring 25 to 30 percent in every town (Hillsborough, New Jersey 549 to 719 hires; Sharon, Wisconsin 77 to 100; Addison, West Virginia 14 to 17) but Fort Laramie went from 0 to only 1 position, so it was not the cause there and it moved the whole economy without a calibration, so I dropped it. The baseline already replaces quits one for one in larger towns (Addison 14 quits, 14 hires). In Fort Laramie the leaver-months show why: its employers are one to three people, and four times out of four the staffing target had already fallen to the headcount or below (gap about 0 or negative, target 1.999 against staff 2, projected 3.0 pulled down by observed sales), so the firm correctly does not replace; the one firm with a gap of 0.89 did open its seat. The real shortfall is the separations: 3 quits, 2 layoffs and 2 left-work in a year in a town of about 30 jobs, where JOLTS turnover would put quits alone near 10. So the next step is to check how often a small town's workers choose to quit (the monthly stay, look or leave choice) against JOLTS, not the opening rule.

**Measured again (claude, Oct 19, branch claude/quits-by-place-s12), no code shipped.** Separations in a played year from the start, as a share of jobs on record at the start (the count includes the counted tier): Washington, Illinois (1779033) 22.9 percent, Highland Heights, Kentucky (2136604) 20.3, against Addison, West Virginia 1.4 and Fort Laramie, Wyoming 0.4 (two more towns, Westbrook Center, Connecticut 11.2 and Eufaula, Alabama 26.2, were measured before the change; JOLTS total separations run near 40 percent a year, quits near 27). So the two smallest towns are the outliers. I tried one cause: the counted quit, look and enter pulls add up over the whole core and the strongest anywhere act (`strongestPulls`), so a place whose workers score lower might never see one. Counting the pulls place by place (own remainder per place) changed neither town (Fort Laramie 3 quits before and after, Addison 14 before and after), so it is not that; the change was dropped. What is left to check is the quit score itself in those towns (`quitScore` in the counted quit review: pay gap, tenure, the place's unemployment gap and the worker's restlessness), and whether the counted jobs in these towns are the ones that can quit at all.
