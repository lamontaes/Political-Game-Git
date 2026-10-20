---
id: world-staff-aides-never-attend-or-get-fired
title: "Half of an official's staff aides never come to work and are never paid or replaced: attendance is decided on traits alone because an aide has no needs"
area: world
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/political-game-pool-yucp92-by
pr: #5728
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T15:51:47.345Z
---

**What.** In the played world (`buildBenchWorld`, two-level, 120 days from the start) some staff aides of officials never go to work. Homewood, South Carolina (place key 4534765, seed `sc7` through `drawPlace(seed, "scan")`): of 8 aides on the state and United States treasuries' payrolls (`person:aide:official:term:seat:US-SC:...`, job `job:public:staff:...`), four attended all 22 of their planned days and four attended none: the secretary of state's, the U.S. representative's, the U.S. senator's and the vice president's. Their weekly work rollups read `workedDays` 0, `missedDays` 2, `utility:time:miss-recorded-work`; their cash is $0 and the cash journal has no credit for them in 200 days, while the four who attend hold about $9,000. The same appears in other places, one scan of six drawn places (seeds `sc5` to `sc10`) listed 2 to 8 aides per place who were never credited (Ardentown, Delaware; Martin, North Dakota; Tat Momoli, Arizona; Richland, Indiana; Stafford, Oregon). The work engine offers an aide both attending and staying home each day (`src/core2/modules/work.ts`, the attendance and absence actions, `SG-P8-attendance-choice`); the day's free hours are 15, so attending fits. What decides it is the person's traits alone: an aide's `needs` are all 0 (money, time, health, company, safety, dependents, schooling), because an aide's household has no living costs to run short on, so nothing pulls an aide to a paycheck. Nothing follows an absence either: the jobs engine holds no employer row for the treasury, so a worker who never shows up keeps the job, is never paid and is never replaced.

**Rules.** No dice: attendance follows needs, traits and the law, and an absence has a consequence the jobs engine reads (a worker who misses every shift is let go and the opening is refilled). Every dollar balances. One model, two tiers: the same rule for counted workers. One rule, all 56 places.

**Done when.** In a one-year run of the played world in a drawn place and a seed the builder did not choose, every official's aide either attends and is paid in each pay period or is let go and replaced, shown by aide, rollup and change record ids; the aides' households carry living costs so the money need is real. The owner plays it: an official's office has staff who turn up.

**Files.** src/core2/modules/work.ts, src/core2/modules/jobs.ts, src/core2/modules/officials.ts

**Notes.** Found scanning a played year for job holders never credited in 90 days. The scan also lists town employers whose staff are unpaid (`world-public-employer-staff-never-paid`) and a nonprofit's staff (Neighbors United). Aides at the treasury are the clearest case because the employer holds $42 billion and could pay them.

Checked across other staff (Oct 17): in Mulhall (Oklahoma), Merizo (Guam) and South Salt Lake (Utah), seeds `ab1` to `ab3` for "abs", 120 days from the start, other full workers missed 0 to 8 percent of their planned days and almost none missed all of them, while the officials' aides missed 27, 13 and 50 percent, with 3 of 11, 1 of 8 and 2 of 4 never coming. So the absence is specific to the aides (whose needs are all zero), not to staff generally.

**Fixed in part (Oct 17, claude, claude/aides-living-cost-s5).** The cause was the missing household cost. An aide hired where the office sits now comes with the cost and savings officials get (`giveLivingCost` in `src/core2/official-living.ts`, shared with official pay) and spends the cost out each staff review. At 150 days in Mulhall (Oklahoma), Merizo (Guam), South Salt Lake (Utah) and Homewood (South Carolina), aides who never came fell from 3 of 11, 1 of 8, 2 of 4 and 4 of 8 to none, and the days they missed from 27, 13, 50 and about 50 percent to 4, 0, 0 and 6. Still open: an absence has no consequence in the jobs engine (a worker who stays home is never let go), and the employers listed in `world-public-employer-staff-never-paid`.

Sent back 2026-10-20 from PR #5018 (branch claude/staff-aides-attend): merging main conflicts in src/core2/modules/staff.ts; finish on that branch, merge main into it first.
