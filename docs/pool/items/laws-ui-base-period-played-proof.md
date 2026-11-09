---
id: laws-ui-base-period-played-proof
title: "Unemployment claim reads the base period: a played twin pair after an hours cut, below the state's weekly maximum"
area: laws
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: laws-effects
source: added with npm run pool -- add
---

**What.** Unemployment claims read the person's pay by quarter (first four of the last five completed quarters, #7949). No played year has yet shown a claim after a real hours cut (Jobs' #7781 rehourJob) drawing the same benefit as steady hours. The first played pair found no claim because the layoff was refused for the day, and the state's weekly maximum capped both reads.

**Rules.** An effect is a read, not a record: the claim must be shown in a played world by record id. Generated-world proof, a drawn place and seed, no hand-set pay history.

**Done when.** In a drawn bench world a worker below the state's weekly maximum has hours cut in the last completed quarter before a layoff; the business's own layoff files a claim (retried the next day when layOffWorker returns worked-today); the claim equals the steady-hours twin's, named by claim record id, and SG-LAWS-ui-base-period-last-pay is narrowed to workers with no pay record.

**Files.** src/core2/jobs-benefits.ts,src/core2/unemployment-base-period.test.ts

**Notes.** Nov 9 (Laws and effects, #7949): the first played pair (Cutter AZ, seed 8a2cb07c) found no claim because layOffWorker returned worked-today, so the test must retry the layoff the next day. The twin needs a worker whose benefit is below the state's weekly maximum, since Arizona's 32,000 minor units caps both the base-period read and the last-pay read. A run takes about 13 minutes, so it is a run in the PR body, not a test in the suite.
