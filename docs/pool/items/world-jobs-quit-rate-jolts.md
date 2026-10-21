---
id: world-jobs-quit-rate-jolts
title: "Quits under the shared chooser fall far below JOLTS: recalibrate the leave and look terms"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Since full and counted workers decide by the same chooser (world-jobs-counted-choices-one-rule), quitting and looking around while employed win only on a large pay gap, so a played year has far fewer quits than JOLTS reports. Counted quits fell from 67 to a handful in one town. Recalibrate quitScore and the look terms (jobsLookBaseline, jobsPayGapWeight and the unemployment weights) so a played year's quits per worker match JOLTS total private quits, from reasons on the record, and resolve SG-WORLD-jobs-quit-rate-uncalibrated.

**Rules.** No dice: a quit follows from the worker's own reasons (pay gap, tenure, strain, savings, scarcity), never a monthly rate applied to one person. Research before building: JOLTS quits calibrate the town's total, fetched with a quote. One model, two tiers: the same terms for full and counted workers.

**Done when.** In one-year runs of the played world (buildBenchWorld, at least six places drawn from all 56, seeds named in the PR body) the pooled monthly quit rate per employed worker falls within the JOLTS total private quits band quoted from a fetched page, shown by job-change record ids, the jobs tests pass, and the tripwire test shows SG-WORLD-jobs-quit-rate-uncalibrated resolved.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/parameters.json, src/core2/data/stopgaps.json

**Notes.** Filed with the PR on claude/counted-job-choices, which registered the row.

Measured Oct 21 (claude; scratch probe, `buildBenchWorld` two-level, a year from January 20, 2025, bookkeeping off; places `drawPlace(seed, "quits")` for seeds q1 to q6: Scranton, North Dakota; Vieques, Puerto Rico; Jobos, Puerto Rico; Gypsum, Kansas; Lamont, Iowa; Diagonal, Iowa). The premise is out of date. Quit records in the year (kind `quit` in the jobs `changes` table): 13, 43, 28, 14, 39 and 7 (144 in all). Counted private workers the monthly quit review (`reviewCountedQuits`) weighs, averaged over the year: 14, 190, 118, 31, 45 and 21 (419). Per reviewed worker that is 2.9 percent a month pooled, against JOLTS total private quits of 1.9 [1.4, 2.3] (`jobs.json` turnover, 2001 to 2019): high by about half, not far below. The monthly pulls themselves sit near 2 percent a worker (Vieques, Puerto Rico: 5.4 pulls over 229 workers in February, 2.0 over 160 in November, scores -4.5 to -2.5), the same as the neutral-worker check in `jobs.test.ts`. Two caveats stop me resolving `SG-WORLD-jobs-quit-rate-uncalibrated`: the quit count also holds full people's quits and counted job-to-job moves, which the reviewed denominator leaves out, so 2.9 is an upper bound; and most employed people in these worlds (1,654 to 1,805 of them) are not private counted workers (public and press staff, full people), so no quits per all employed can be read. A fair test needs the per-tier quit count and its own denominator in one run, in at least six places; do that before touching any weight. Claim released.

Oct 21 (claude, claude/quit-rate-jolts): measured, not built. That branch merges main into #5767's branch (claude/counted-job-choices): the labor web's participation shift now enters the shared workerOffers (leave and retire, full and counted) and the counted entry offer; jobs-web, jobs-counted-choices, jobs and jobs-full-leave pass (26 tests). Use it, or #5767 merging main the same way, as the base.

What the measure must be: JOLTS total private quits (Table 22 annual averages, https://www.bls.gov/news.release/jolts.t22.htm: "2023: 2.6, 2024: 2.3, 2025: 2.2"; Table 4 monthly, seasonally adjusted, "2.2 ... 2.1" for May to Aug. 2026) count private jobs only. A drawn town's employed are mostly full public and office jobs (Scranton, North Dakota: 1,563 of 1,630), which the review skips, so divide quits at `finance.businesses` by worker-months at businesses (full and counted).

Findings, one year each in Scranton ND (3871500), Vieques PR (7286014), Jobos PR (7238671) and Gypsum KS (2029250), drawn with seeds q1 to q4 (purpose "quits"):
- At the current values (jobsQuitBaseline -4.65, jobsLookBaseline -2.4) the business quit rate is far below JOLTS: no worker's leave or look score beats staying in the first two reviews (best leave margin -0.40 full, -2.37 counted).
- The chooser takes the best offer and the trait spread is narrow (leave margins p50 to p99 span about 1.6), so a baseline step moves whole groups at once. At jobsQuitBaseline -2.6, jobsLookBaseline -0.17 and jobsQuitTenureWeight 0.5 the pooled rate is 2.14 percent (145 quits in 6,763 worker-months), inside the band, but by tier it is full 5.5 to 7.5 percent and counted 0.6 to 0.9 percent.
- Two causes of the tier gap: (1) a full new hire's tenure term (log1p(3.9) - log1p(0.08), about 1.5 at weight 1) puts most new full hires over the line at their first review: in Jobos at weight 1, 34 of 60 quits were by people hired during the run, most 28 to 35 days in, then rehired and quitting again; (2) a counted record carries no needs, so its strain is zero; giving it the place's mean full-worker strain (0.65; time 0.52, health 0.13) lifts counted quits but without the spread a full person's own strain has.
Proposed: before retuning, give counted records their own time and health strain (from work hours, household and health records) and bound the tenure term for the first months, then calibrate the baseline so each tier, not only the pool, sits in the JOLTS band.
