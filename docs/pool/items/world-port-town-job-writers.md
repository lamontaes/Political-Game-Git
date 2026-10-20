---
id: world-port-town-job-writers
title: "The town's job writers (ensureTownEmployment, fillTownJobs) return core job records, not old-world rows"
area: world
kind: wiring
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
after: world-port-town-employment
source: added with npm run pool -- add
---

**What.** Port ensureTownEmployment, fillTownJobs, writeTownEmployer and townEmployerOutlets from simulation/living-world/town-employment into src/core2 so population.ts imports nothing from the old file; the mix half is #5100 and the labor-status half is #5540. Each function moves into a core2 file with the same behavior, the old file's copies are deleted in the same change, and population.ts and its tests import only from src/core2. Write the port fresh where that is simpler than carrying the old code over, and keep the town's employers, jobs and outlets the same in a drawn place before and after.

**Rules.** Replace, never layer. One rule, all 56 places: mixes are place data. The same town opens: jobs by organization record id match before and after.

**Done when.** In a drawn place (name and seed in the PR body) a one-year buildBenchWorld shows the same jobs by organization record id before and after, the jobs engine reads each, and population.ts imports nothing from simulation/living-world/town-employment.

**Files.** src/simulation/living-world/town-employment.ts, src/core2/population.ts, src/core2/town-labor.ts

**Notes.** TODO
