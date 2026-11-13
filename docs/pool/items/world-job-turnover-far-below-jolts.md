---
id: world-job-turnover-far-below-jolts
title: "M1-04: hires, quits and layoffs on record run 7 to 25 times below the state's JOLTS range in a played year"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-customers-move-between-sellers
lead: jobs
model: opus
effort: high
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The M1-04 check (src/core2/tooling/m1-04-check.ts) in Westport, South Dakota (place key 4670540, seed 9a630ad552b2eb8df5ea0f88d18e14b075f738848837c96f6be001f87687b710) measured a year-average 0.463 hires, 0.086 quits and 0.046 layoffs per 100 jobs a month, against the state's JOLTS 5th to 95th percentile ranges of 3.2 to 4.8, 1.5 to 2.6 and 1.1 to 2.0 (data/research/jobs/series/turnover.json). Unemployment averaged 1.12 percent against the state's recorded 1.7 to 8.8. Layoffs wait on customers moving between sellers; hires and quits need their own causes looked at once that lands. The ranges are what the real world did; they report the gap and do not decide a pass.

**Cause.** Found in code: four causes, measured on main at 6ee49da069 in Westport, South Dakota (the item's seed and place key 4670540) and in Wolflake, Indiana (a fresh draw: `drawPlace("cause-turnover-1", "m1-04")`, seed a7726f5184bf2bdcf64db5aaf55c398c57b669bb7f160197e0de082d73d7aaa3, place key 1885130). In Westport the check now prints 0 hires, 0 quits and 3 layoffs in a year across about 210 town jobs. In Wolflake it prints 16 hires, 0 quits and 12 layoffs across 334.

1. **Quits and job hunting never win the chooser.** `reviewWorkers` (src/core2/modules/jobs.ts, line 2046; the choice at line 2082) and `reviewCountedWorkers` (line 3949; the choice at line 3983) give each worker the single highest-scoring offer of stay, look and leave (`chooseAct`; the pick at src/core2/choice.ts line 510). The leave and look terms still carry the values tuned for the old summed pulls. `jobsQuitBaseline` (−4.65, src/core2/data/jobs/parameters.json line 309) says "calibrated so the summed pulls reproduce half the JOLTS total-private quit rate", and `jobsLookBaseline` is −2.4 (line 82). Under the highest-score rule, a pull worth a few percent a month never acts. This is the registered stopgap `SG-WORLD-jobs-quit-rate-uncalibrated` (src/core2/data/stopgaps/world.json line 223). It says the Oct 20 move to one chooser for both tiers left these terms untuned.

   Measured in Westport, among the 17 to 23 workers reviewed each month: leave minus stay had a median of −3.7 and a highest value of −1.66 to −1.86 every month, except owners and one worker with a large pay gap. Look minus stay topped out at −1.76 to −1.95. So nobody looked and nobody quit. Summed as pulls, the same scores come to 0.74 to 3.64 leavers a month, which is what the old calibration meant.

2. **Hires follow separations, so they stop too.** Openings are posted to replace leavers or to grow. In Westport 9 or 10 openings stayed open from 2025-03-01 all year, with no employed job seeker anywhere in the world and one counted seeker in town. The full unemployed seekers were press staff living elsewhere. With nobody looking around, no worker moves job to job (`hireCounted`, line 3640, and `hire`, line 4537, record the quit at the old job only on such a move), so hires stay near zero.

3. **The check misfiles quits to nothing.** A full worker who quits to nothing is recorded as `left-work` with reason `leftWork` (jobs.ts, lines 2101 to 2112). src/core2/tooling/m1-04-check.ts counts only kind `quit` as a quit (line 122) and `layoff`, `staff-shed` and `closure` as layoffs (line 124), so such a quit is counted as neither.

4. **Most town jobs are public posts that never turn over here.** Posts held by appointment or office (`job:public:` and `job:office:`) are skipped by the monthly review by design (jobs.ts, line 2055), so the jobs engine never ends one. The check still counts them as town jobs. That was 145 of Westport's 188 town jobs at the opening (77%), 114 of them held by people living elsewhere, and 187 of Wolflake's 334 (56%). The state JOLTS ranges in data/research/jobs/series/turnover.json are total nonfarm, government included.

**What the country-tier design changes.** docs/design/country-tier.md replaces the fixed layoff pace with firms losing customers (`core-country-tier-town-joins-its-state-part-5-delete-the-fixed-layoff-pace`). That is the layoff third of this item. It does not touch quits, looking around or hires, so causes 1 to 4 stand after it.

**Fix.**

1. **Tune the leave and look terms for the chooser**, as the stopgap's replacement says. Use `jobsQuitBaseline`, `jobsLookBaseline`, `jobsPayGapWeight` and `jobsQuitTenureWeight`, and keep `quitScore` and `workerOffers` (jobs.ts, line 1978) as they are. Each worker's own pay against the going rate, tenure, savings, strain and the place's unemployment then decide which workers' leave or look score passes stay, by degrees. Fit the baselines so that, in three drawn places over a year, the share of reviewed workers whose leave or look beats stay each month is near half of JOLTS total-private quits each. That is a check of the total, never a rate that picks a worker. Correct both parameters' citations, which still describe summed pulls. Do not bring back summed pulls for workers: the Oct 20 change to one chooser for both tiers stands. Retire `SG-WORLD-jobs-quit-rate-uncalibrated` when the check holds.
2. **Report quits to nothing as quits.** In src/core2/tooling/m1-04-check.ts, count a `left-work` change with reason `leftWork` as a quit. Print retirements (`left-work` with reason `retired`) on their own line, as JOLTS "other separations".
3. **Print the public posts separately.** Have m1-04 print the rates twice: over all town jobs, and over the jobs the jobs engine reviews (all but `job:public:` and `job:office:`). Name the public share, so the gap from public posts is not read as a defect in private turnover.

If, after fix 1, the crossings come all in the first month and then stop, the scores do not move month to month. Write that into this item's Notes with the month-by-month counts, rather than raising the baselines further.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the town's unemployment rate on the Metrics tab and the hires and layoffs the paper reports, now far below any real range.

**Rules.** No dice: each hire, quit and layoff comes from the worker's or employer's own situation, and the JOLTS ranges report the gap and never decide a pass (owner, Nov 8: ranges are not targets). One model, two tiers: counted workers change jobs by the same rules, times their count.

**Done when.** A second session, on main in Westport, South Dakota (seed above) and two more drawn places from all 56, plays a year and reads on News and Jobs and study that workers quit, are hired and are laid off, each with a recorded reason and decider, and the M1-04 command prints the hires, quits and layoffs per 100 jobs beside the JOLTS ranges as a report. The cause found is written into this item, and a test in a drawn place names it.

**Waits on.** Nothing for quits, looking around and hires. Layoffs belong to core-country-tier-town-joins-its-state-part-5-delete-the-fixed-layoff-pace and world-customers-move-between-sellers.

**Files.** src/core2/modules/jobs.ts (`workerOffers`, line 1978; `reviewWorkers`, line 2046; `quitScore`; `reviewCountedWorkers`, line 3949; `hireCounted`, line 3640; `hire`, line 4537), src/core2/data/jobs/parameters.json (`jobsLookBaseline`, line 82; `jobsQuitBaseline`, line 309), src/core2/data/stopgaps/world.json (line 223), src/core2/choice.ts, src/core2/tooling/m1-04-check.ts, data/research/jobs/series/turnover.json

**Notes.** Found by the M0-M2 lead's M1 helper, Oct 24. Blocks roadmap M1-04.

**Notes (cause finder, Nov 10).** Ran `GOLDEN_PATH_SEED=<seed> GOLDEN_PATH_PLACE_KEY=<key> node --max-old-space-size=8000 --import tsx src/core2/tooling/m1-04-check.ts` on main at 6ee49da069 for both places. Westport: unemployment mean 0.39%, 0 hires, 0 quits, 3 layoffs (0.118 per 100 jobs a month). Wolflake: unemployment 1.43%, 0.389 hires, 0 quits, 0.29 layoffs per 100 jobs a month. Both runs exit 1 on separate clauses: a layoff decided by a person who is no record, and a layoff naming no cause. Those are not this item.

A working-copy probe in `reviewWorkers` (undone, not committed) printed each month's choices, the quartiles of leave minus stay and look minus stay, the summed logistic pulls, the open positions and the seekers; the figures are in the Cause. A scratchpad count of each town's open full-person jobs gave the public-post shares.

Still unknown: whether 145 public posts in a town of Westport's size is right, or an opening that places other governments' staff at town employers. That is for the offices line; a separate item may be needed. Also unknown: whether the town's scores move enough month to month for a steady quit flow once fix 1 is in.

**Notes (Fable B's check, Nov 10).** Checked against main: `reviewWorkers` and `reviewCountedWorkers` in src/core2/modules/jobs.ts give each worker the one highest-scoring offer, and the stopgap SG-WORLD-jobs-quit-rate-uncalibrated says the leave and look terms were never tuned for that rule. The fix changes the parameters the one chooser already reads and adds no second path. The build is for Opus: fitting the terms so that workers cross by degrees, and stopping when the scores do not move, is a judgment inside one engine. Where the player sees it: Jobs and study lists openings that fill, News reports hires, quits and layoffs with their reasons, and the Metrics tab's unemployment moves (owner, Nov 8: "making the economy move, upswings, downswings, and so that way people react").
