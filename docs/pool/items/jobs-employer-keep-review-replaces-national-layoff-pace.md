---
id: jobs-employer-keep-review-replaces-national-layoff-pace
title: "A town worker is let go by their own employer's review of them and of its books, not at a national pace"
area: world
kind: stopgap
priority: 1
size: M
status: open
standard: 2
claimed-by: claude-labor
pr:
blocked-on:
after:
lead: jobs
model: opus
effort: high
root: design-country-tier
source: Owner, Nov 16, 2026 ("Everything comes from the simulation. Stop pegging things to real numbers."), crew line #9747, the CTO's LIFT THE PINS line, family 19, pin modules/jobs.ts:2769
---

**What.** Every job in every town was let go at one published pace, whatever its employer's books said. A shop short of staff and a shop losing money let people go equally often, and the state's rate pulled each town back to where it opened.
Seen: a job loss in play whose record names no reason of the firm's, only a pace.

**Cause.** Found in code: `reviewTurnover` (src/core2/modules/jobs.ts, train line 2770) built each town job's pull from `pastWorkLayoffsPerQuarter` 0.029 (the CPS flow), times the state's rise in unemployment and an odds ratio that holds a state at its opening rate (`workConditions`, src/core2/jobs-elsewhere.ts). The employer's own staffing record was not read.

**Fix.** `reviewKeeping` replaces the town half of `reviewTurnover`: once a month each private employer weighs each worker with `letGoScore`, from the worker's tenure and record with it (`workerValues`) and from its own last staffing review (staff over the staff its sales call for, months of loss). The pull builds and acts at one whole. The separation record keeps what the review read, so dev mode's Trace on a job loss shows the firm and the reasons. The player sees it as who loses a job in town and why.

**Time box.** 4 hours for one Opus session at high effort. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice: an employer's pull builds from its records and acts at one whole. Sliding scales and causes: a small change in a firm's books is a small change in its pull. One model, two tiers: a counted job is weighed by the same rule and stands for its heads. Replace, never layer: the town's national pace is deleted in the same change.

**Done when.** A second session, on main in a drawn place with a seed nobody chose, runs `scripts/world-proofs/jobs-24-months.ts` for 24 months and sees people let go and hired in most months with the count out of work neither draining to zero nor climbing without end; in dev mode it opens Trace on three job losses in the played world and each names its employer, the staff that employer held over its sales, its months of loss and the worker's value, by record id. A search of src/core2 finds no town layoff that reads a state's rate.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/parameters.json, src/core2/data/stopgaps/labor.json, src/core2/employer-keep-review.test.ts, scripts/world-proofs/jobs-24-months.ts

**Notes.** 2026-11-17 (claude/pins-labor-employer-review): the wider-market half of the old review (counted people in regional work, away workers) keeps its pace for one more pull request, which reads each state's own month from the country tier. The review's baseline is registered as stopgap SG-LABOR-let-go-baseline: it also stands where firm-level demand shocks will be (pool item core-country-tier-town-joins-its-state-part-5-delete-the-fixed-layoff-pace).
