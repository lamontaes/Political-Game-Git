---
id: tests-web-layoffs-burglary-below-researched-size
title: "The web test's layoffs-to-burglary case falls short of the researched size in some drawn places"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** src/core2/outcome-web.test.ts fails on clean main with seed aadb30b90a2c6e19e2d43de3106378f7 in Little Creek, Delaware: the case 'layoffs raise unemployment and burglary follows by the researched 3% a point' expects burglary to rise more than 3.69 and gets 3.55. Whether the town's layoffs moved unemployment less than the test assumes, or the burglary link reads a different month, is not yet known. The fix finds which one by record in that town and corrects the engine or the test's expectation, never loosens the researched size to make it pass. Guards: after layoffs the burglary rate on the Metrics tab follows the researched size in every town.

**Cause.** Found in code: the test's layoffs do not make anyone unemployed. The case (src/core2/outcome-web.test.ts lines 113 to 129) ends twelve full workers' jobs with the kernel's `api.endJob(job.id, "test:layoff")`, which ends the job and nothing else. The town's unemployment is counted from the jobs engine's seeker rows (src/core2/modules/world-metrics.ts lines 132 to 137: a `seekers` or `countedSeekers` row not employed), and only the jobs engine's own layoff writes one (src/core2/modules/jobs.ts `layOffWorker`, line 4822, through `layOff`: the record, the work.job-lost event, the state claim and the seeker row). So the twelve leave the labor force uncounted, and the month's own turnover decides whether the rate rises or falls. Measured on main (Nov 11) with GOLDEN_PATH_SEED=aadb30b90a2c6e19e2d43de3106378f7 (Little Creek, Delaware), a probe repeating the test's steps: from metrics:jurisdiction_be29655c8de99c93:2025-02-02 to 2025-03-02 employed residents fell 312 to 295 and the unemployed fell 32 to 29, so the rate fell from 9.30 to 8.95 percent, and all twelve laid-off people were still in town and out of work. That is the Nov 10 failure, `expected 9.2307… to be greater than 9.3023…` at line 167; the burglary link itself was never reached.

**Fix.** Change the test only: lay the twelve off with `layOffWorker(api, job.id)` from src/core2/modules/jobs.ts instead of `api.endJob`, skipping a job it returns null for and trying a 'worked-today' one again the next day, as the loop already does for a job mid-shift. Keep every assertion, including that unemployment rises and burglary follows by the researched size.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why (owner, Oct 14): name the cause by record before changing the test or the link. Never weaken a test to get green: no widened tolerance without the measured reason.

**Done when.** A second session sees the cause named by web month record id in this item (the unemployment change and the rows the link read in Little Creek, Delaware, seed aadb30b90a2c6e19e2d43de3106378f7, against the link's lag and size), then runs src/core2/outcome-web.test.ts on that seed and three seeds in drawn places it chose; the burglary case asserts the researched size and passes.

**Waits on.** Nothing.

**Files.** src/core2/outcome-web.test.ts, src/core2/modules/jobs.ts, src/core2/modules/world-metrics.ts

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/outcome-web.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=aadb30b90a2c6e19e2d43de3106378f7. Still red, 1 of 7, in Little Creek, Delaware, US-DE. First failing assertion as printed: `AssertionError: expected 9.230769230769232 to be greater than 9.30232558139535` at src/core2/outcome-web.test.ts:167 (the numbers differ from the item's 3.55 and 3.69).

Cause found (Nov 11, 2026, cause finder for Fable B): the probe read the town's metrics rows for February and March and the twelve laid-off people afterward. They were out of work but not seekers, so not unemployed.
