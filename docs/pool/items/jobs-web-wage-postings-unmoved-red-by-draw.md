---
id: jobs-web-wage-postings-unmoved-red-by-draw
title: "jobs-web wage case red on main by draw: the one new posting pays the same in both worlds (Montrose, Arkansas, seed c0cb88e1667c71e5)"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The jobs-web wage case is red on main by draw. src/core2/jobs-web.test.ts ('a higher wage factor moves the pay of new postings') failed on clean main (514ebcf9a1, Oct 29) with WEB_LABOR_SEED=c0cb88e1667c71e5, Montrose, Arkansas: 'web labor wage twin: new postings 1->1, pay against the copied job 1.0126->1.0126', so 'expected 1.0125811688311688 to be greater than 1.0429586038961038'. The town posted one job in each world and the web's raised wage factor did not reach its pay. Other seeds pass. Found by the laws session. Guards: the pay of a new job a player reads after a law moves wages, which the jobs-web test keeps working.

**Cause.** Needs cause. Measured: WEB_LABOR_SEED=c0cb88e1667c71e5 (Montrose, Arkansas) fails src/core2/jobs-web.test.ts with pay 1.0126 in both worlds. Three candidates, none shown: the posting was priced before the shifted row was read, it copies a job's pay without the factor (src/core2/modules/jobs.ts), or the trial accepts a draw too thin to show the factor.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: a new posting's pay reads the web's wage factor on the day it is priced, by record id. One rule, all 56 places: the test keeps drawing its place, names the place and seed, and passes over by name a draw too thin to show the factor rather than asserting on it.

**Done when.** A second session, not the builder, runs src/core2/jobs-web.test.ts with WEB_LABOR_SEED=c0cb88e1667c71e5 (Montrose, Arkansas) and three further random seeds, each drawn place named, and all pass. The PR body says why Montrose's posting paid the same in both worlds (the record or rule, by file and line) and what changed.

**Waits on.** Nothing.

**Files.** src/core2/jobs-web.test.ts, src/core2/jobs-web.ts, src/core2/modules/jobs.ts

**Notes.** TODO

**Notes (re-run, 2026-11-11, main 79d23fa596).** `WEB_LABOR_SEED=c0cb88e1667c71e5 npx vitest run src/core2/jobs-web.test.ts` (Montrose, Arkansas): still red, 'a higher wage factor moves the pay of new postings': "expected 1.0333345645482257 to be greater than 1.0435520520640864". Fresh draw `WEB_LABOR_SEED=e52655e5c79530b9` (Westwego, Louisiana): red the same way: "expected 9.368058889422308 to be greater than 9.54476556249". Red on two of two draws.
