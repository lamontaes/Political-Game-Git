---
id: jobs-web-wage-postings-unmoved-red-by-draw
title: "jobs-web wage case red on main by draw: the one new posting pays the same in both worlds (Montrose, Arkansas, seed c0cb88e1667c71e5)"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/jobs-web.test.ts ('a higher wage factor moves the pay of new postings') fails on clean main (514ebcf9a1, Oct 29 15:00 UTC) with WEB_LABOR_SEED=c0cb88e1667c71e5, Montrose, Arkansas: 'web labor wage twin: new postings 1->1, pay against the copied job 1.0126->1.0126', so 'expected 1.0125811688311688 to be greater than 1.0429586038961038'. The town posted one job in each world and the web's raised wage factor did not reach its pay: either the posting was priced before the shifted row was read, it copies a job's pay without the factor, or the trial accepts a draw too thin to show it. Other seeds pass. Found by the laws session (it turned PR 6761's unit run red).

**Rules.** The chain is the acceptance: a new posting's pay reads the web's wage factor on the day it is priced, by record id. One rule, all 56 places: the test keeps drawing its place, names the place and seed, and passes over by name a draw too thin to show the factor rather than asserting on it.

**Done when.** jobs-web.test.ts passes with WEB_LABOR_SEED=c0cb88e1667c71e5 and three further random seeds, named in the PR body, and the PR body says why Montrose's posting paid the same in both worlds (the record or rule, by file and line) and what changed.

**Files.** src/core2/jobs-web.test.ts; src/core2/modules/jobs.ts

**Notes.** TODO
