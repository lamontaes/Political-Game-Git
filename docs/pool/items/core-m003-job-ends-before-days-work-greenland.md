---
id: core-m003-job-ends-before-days-work-greenland
title: "Golden path M0-03 throws 'A job ends before its day's work' on main in Greenland, Arkansas"
area: core
kind: bug
priority: 1
size: S
status: dropped
claimed-by: claude/m003-job-ends-greenland
pr: #6018
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T05:18:14.856Z
---

**What.** The accepted golden-path spec M0-03 (the day skip that stops at the earliest interrupt, src/bench/m0-check.ts) fails on main at 9528e5e2c4 with GOLDEN_PATH_SEED=f6d4683271130ca439df7dc7c21319bcde607fca7a7f6419e917579c8e7f8e00 and GOLDEN_PATH_PLACE_KEY=0528660 (Greenland, Arkansas). It throws 'A job ends before its day's work, from calendar work.' from src/core2/job-lifecycle.ts:129, reached through player-v1.ts drive. The same error was fixed for office jobs (core-office-job-ends-before-days-work, #4917) and for a year run (core-year-crash-job-end-before-work, #4664), so a new path ends a job on a day its work is still scheduled; CI's golden-path check draws a random seed, so any PR can go red on it, as #6057 did.

**Rules.** One rule, all 56 places: the skip must hold in every place the runner can draw. Ask why: name the job, its end record and the calendar work that still pointed at it, by record id, not a flake.

**Done when.** M0-03 passes on that seed and place on main and on two fresh seeds named in the PR body, with the job, its end and the calendar entry that tripped the throw named by record id, and a test that reproduces the throw before the fix.

**Files.** src/core2/job-lifecycle.ts, src/core2/player-v1.ts, src/bench/m0-check.ts

**Notes.** Fixed by #6018 (merged as a7e1effd2d, item jobs-layoff-worked-today), checked Oct 26 by claude/m003-job-ends-greenland; CTO to mark done. **The throw, named.** At 9528e5e2c4 with the seed and place above, the job is `work-relationship_6c1cfd830feee2e9` (worker `person_de4dbae01e569144`, employer `organization_2eb5cf09757595ee`). Its end is `jobs:layoff:2025-03-01`, from the jobs engine's calendar review (`reviewEmployers` → `layOff`, run by `closeDay` in src/core2/player-v1.ts). The calendar work that still pointed at it is `work-result:2025-03-01:work-commitment:work-relationship_6c1cfd830feee2e9`: 450 minutes the controlled character attended that day (`act:2025-03-01:person_de4dbae01e569144:45`), before the review ran. **On main 280f7e76ac.** M0-03 passes on that seed and place: the skip stopped on 2025-03-02 for a big moment. It passes on two fresh seeds: Washington, District of Columbia (1150000), seed 6fcc0ac7c0a05b0103a67a1d5c4ca009f518a90fbc26e78e258401b1113fb988, and Onaga, Kansas (2052875), seed 7ba7c58de770caba8a99eb38ed67bbb4c1a1088551fbe38a723a2c83417e13fb. **The test.** src/core2/jobs-layoff-worked-today.test.ts, from #6018, reproduces the throw before the fix. With `layOff`'s worked-today guard removed it fails with "A job ends before its day's work, from calendar work.", and with the guard it passes 2 of 2.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built.
