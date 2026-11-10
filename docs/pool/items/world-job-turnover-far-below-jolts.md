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

**Cause.** Needs cause. Looked at the item and src/core2/tooling/m1-04-check.ts: the measured rates in Westport, South Dakota (seed 9a630ad552b2eb8df5ea0f88d18e14b075f738848837c96f6be001f87687b710) are 7 to 25 times under JOLTS, but no cause for hires and quits is named, and layoffs wait on world-customers-move-between-sellers.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: each hire, quit and layoff comes from the worker's or employer's own situation, and the JOLTS ranges report the gap and never decide a pass (owner, Nov 8: ranges are not targets). One model, two tiers: counted workers change jobs by the same rules, times their count.

**Done when.** A second session, on main in Westport, South Dakota (seed above) and two more drawn places from all 56, plays a year and reads on News and Jobs and study that workers quit, are hired and are laid off, each with a recorded reason and decider, and the M1-04 command prints the hires, quits and layoffs per 100 jobs beside the JOLTS ranges as a report. The cause found is written into this item, and a test in a drawn place names it.

**Waits on.** world-customers-move-between-sellers (for layoffs).

**Files.** src/core2/modules/jobs.ts, src/core2/tooling/m1-04-check.ts

**Notes.** Found by the M0-M2 lead's M1 helper, Oct 24. Blocks roadmap M1-04.
