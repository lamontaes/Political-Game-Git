---
id: world-jobs-quit-rate-jolts
title: "Quits under the shared chooser fall far below JOLTS: recalibrate the leave and look terms"
area: world
kind: stopgap
priority: 2
size: M
status: claimed
claimed-by: claude/quit-rate-jolts
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T13:16:09.597Z
---

**What.** Since full and counted workers decide by the same chooser (world-jobs-counted-choices-one-rule), quitting and looking around while employed win only on a large pay gap, so a played year has far fewer quits than JOLTS reports; counted quits fell from 67 to a handful in one town. Recalibrate quitScore and the look terms (jobsLookBaseline, jobsPayGapWeight and the unemployment weights) so a played year's quits per worker match JOLTS total private quits, from reasons on the record, and resolve SG-WORLD-jobs-quit-rate-uncalibrated.

**Rules.** No dice: a quit follows from the worker's own reasons (pay gap, tenure, strain, savings, scarcity), never a monthly rate applied to one person. Research before building: JOLTS quits calibrate the town's total, fetched with a quote. One model, two tiers: the same terms for full and counted workers.

**Done when.** In one-year runs of the played world (buildBenchWorld, at least six places drawn from all 56, seeds named in the PR body) the pooled monthly quit rate per employed worker falls within the JOLTS total private quits band quoted from a fetched page, shown by job-change record ids, the jobs tests pass, and the tripwire test shows SG-WORLD-jobs-quit-rate-uncalibrated resolved.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/parameters.json, src/core2/data/stopgaps.json

**Notes.** Filed with the PR on claude/counted-job-choices, which registered the row.

Measured Oct 21 (claude; scratch probe, `buildBenchWorld` two-level, a year from January 20, 2025, bookkeeping off; places `drawPlace(seed, "quits")` for seeds q1 to q6: Scranton, North Dakota; Vieques, Puerto Rico; Jobos, Puerto Rico; Gypsum, Kansas; Lamont, Iowa; Diagonal, Iowa). The premise is out of date. Quit records in the year (kind `quit` in the jobs `changes` table): 13, 43, 28, 14, 39 and 7 (144 in all). Counted private workers the monthly quit review (`reviewCountedQuits`) weighs, averaged over the year: 14, 190, 118, 31, 45 and 21 (419). Per reviewed worker that is 2.9 percent a month pooled, against JOLTS total private quits of 1.9 [1.4, 2.3] (`jobs.json` turnover, 2001 to 2019): high by about half, not far below. The monthly pulls themselves sit near 2 percent a worker (Vieques, Puerto Rico: 5.4 pulls over 229 workers in February, 2.0 over 160 in November, scores -4.5 to -2.5), the same as the neutral-worker check in `jobs.test.ts`. Two caveats stop me resolving `SG-WORLD-jobs-quit-rate-uncalibrated`: the quit count also holds full people's quits and counted job-to-job moves, which the reviewed denominator leaves out, so 2.9 is an upper bound; and most employed people in these worlds (1,654 to 1,805 of them) are not private counted workers (public and press staff, full people), so no quits per all employed can be read. A fair test needs the per-tier quit count and its own denominator in one run, in at least six places; do that before touching any weight. Claim released.
