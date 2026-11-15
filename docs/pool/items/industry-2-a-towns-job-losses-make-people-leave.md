---
id: industry-2-a-towns-job-losses-make-people-leave
title: "When a town loses its jobs, people move away by the town's own unemployment, not the state's"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: industry-1-largest-employers-sized-from-county-establishments
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "owner, Nov 15 21:09Z (industries, coal and farms, a town at one plant that closes, people leaving; most of it probably built); Account lead's rulings 21:15Z; survey by T54 at /mnt/project-files/account-lead/t54-industry-gaps.md"
---

**What.** A plant closing leaves its workers jobless, but the town does not shrink. People weigh moving by their state's unemployment against other places', never their own town's (survey: /mnt/project-files/account-lead/t54-industry-gaps.md, gap 2). Owner, Nov 15 21:09Z: "that power plant closes, and then that town" (21:09Z). Seen: the town's population and the Jobs screen a year after a large closing, and dev mode's Trace of a household's move.

**Cause.** Found in code: `stateUnemployment` (src/core2/modules/counted-moves.ts:280) builds the jobless table by state, and `pullBetween` (counted-moves.ts:320) reads `jobless.get(from)` for the home side, so the town's groups carry their state's rate.

Evidence (factories/freight tracer, Lebanon KY on 29ef4685, /mnt/project-files/account-lead/industry-law-traces/factories-freight.md): the larger plant's outside orders cut through the engine's own output limit; it laid off in months 4 to 6 and closed in month 7, 430 jobs, a third of the town's; nobody moved away (369 out against 370 left alone), nobody rehired them, stores lost 4.5% of sales and the wholesaler 3.8%; no paper story, scene or journal line. `layOff` (src/core2/modules/jobs.ts:2069) does emit `work.job-lost` for a counted worker (as `counted-subject`, line 2178), so the counted layoffs and the closing that fire none go by another path; the plan names it by function and line before building.

**Fix.** Two halves, in this order (Account lead, Nov 15 22:14Z).

1. The people. A counted layoff or closing is a job lost for the people who held it: the path that ends their jobs goes through the one `layOff` separation (or emits the same `work.job-lost` and claim), so the same leaving, job search and spending steps act on them as on anyone who loses a job, with no second path. For the played town's own groups (and the full households weighed the same way), the home side of the pull reads the town's unemployment from its own records (seekers against workers, the jobs engine's counts), the state's elsewhere. One rule with one parameter (`countedMovesUnemploymentPull`); no new mover engine.
2. The telling. The closing reaches the paper and the player through the records the first half writes, with lines from the Words lead (pool item play-local-layoffs-on-screen, claimed for it).

**Time box.** 3 hours, Opus, medium.

**Rules.** No dice: a household moves from the pull it accrues, never a roll. One model, two tiers: counted and full households read the same town rate. Sliding scales: the pull slides with the rate, no threshold.

**Done when.** At Gillette WY and Lebanon KY with seeds, a closing of the largest employer (through the game's own close path in dev mode) is followed for twelve months: households leaving by month, with and without the change, named by record id; year 1 and time per record at three places with and without, twice a side, alternated. A second session sees at a drawn place it names with its seed that the town shrinks after a closing.

**Waits on.** industry-1 (so a town can lose most of its jobs).

**Files.** src/core2/modules/counted-moves.ts and its test.
