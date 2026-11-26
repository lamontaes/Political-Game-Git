---
id: opening-jobs-held-by-the-jobs-engines-choice
title: "Day-one jobs are assigned by the jobs engine's choice, not by a second hiring rule"
area: core
kind: cleanup
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: opus
effort: high
root: none
source: added with npm run pool -- add
---

**What.** Who holds which job on day one comes from opening-town-jobs.ts, a hiring rule ported from the old engine that fills each workplace by deficit against its share, oldest resident first, with nobody weighing an offer; play hires through the jobs engine, where a seeker weighs each posting against waiting by the shared choice engine. The positions (which workplaces and roles a town has, civic minimums, hours) may stay generated: who exists is allowed by the Nov 16 ruling. Seen: the job line on a resident's card on day one, held for the reasons that move people into and out of jobs in play. Seen: the job line on a resident's card on day one, held for the reasons that move people into and out of jobs in play.

**Cause.** Found in code: `fillTownJobs` in src/core2/opening-town-jobs.ts (line 550) assigns a resident to a role by the role furthest below its share (`roleFor`) and to an employer with the fewest staff (`employer`), with no pay comparison and no seeker; `runWeek` and `hire` in src/core2/modules/jobs.ts do the same job in play through `scoreOffers` (src/core2/choice.ts). The assignment runs inside `buildPopulation` (src/core2/population.ts, the call to `openingTownJobs`), before any module or CoreState exists, so the choice engine cannot be called there; the jobs, commitments, schedules and payroll calendar are all built from that draft in population.ts. Measured Nov 26 (map row 13, #10377): the fill costs 0.09 s of a 16.8 s build at seed a1b2c3d4, place 2018325.

**Fix.** Keep the generated positions (workplaces, roles, hours, civic minimums, writableTownWeights) and move only who holds each one. Hoist the choice engine's inputs a seeker needs (traits, pay, hours, the posting) out of CoreState so buildPopulation can call scoreOffers and decisionFromScores per resident over the open positions, or add a pass in the jobs module after the world is built that reassigns holders and rebuilds the commitments and payroll calendar the draft wrote. The jobs engine owns the rule (modules/jobs.ts). Delete fillTownJobs' assignment and the two helpers it alone used in the same change, and say what was removed.

**Time box.** 12 hours

**Rules.** No dice: a resident takes the offer the choice engine scores highest, ties by id. The positions stay generated; only the assignment moves. Replace, never layer: the old assignment is deleted in the same change. Prove it in a played world, 24 months, inflow and outflow (done-proof, labor-market-proof), at a place and seed nobody chose. Changing who holds the civic roles (clerk, pastor, principal) moves every drawn-place test that reads them, so list those tests first.

**Done when.** A generated world's day-one jobs are held by the choice engine's pick: each resident's job record names the posting they chose over waiting. Before and after, the same seed's job counts by kind stay within the sourced town mix, and a second session replays the finish line on main in a place and seed nobody chose and sees a resident's card show the same job in the job list and the person's own record. 24 months of play show inflow and outflow in line with the base.

**Waits on.** Nothing. Written on the CTO's line of Nov 26, 5:42 a.m. ET on #10377 (no code tonight). Traits are a separate gap: opening-upbringing.ts is replaced when the childhood from birth lands (owner, Oct 28).

**Files.** src/core2/opening-town-jobs.ts, src/core2/population.ts, src/core2/modules/jobs.ts, src/core2/choice.ts, src/core2/opening-employment.ts
