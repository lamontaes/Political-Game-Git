---
id: core-every-life-work
title: "Every life is simulated, unit 3: relatives living elsewhere work, lose work, find work, change jobs and retire"
area: core
kind: feature
priority: 1
size: M
status: done
claimed-by: lives/work-elsewhere
pr: #7049
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T20:10:34.441Z
---

**What.** Unit 3 of core-every-life-simulated. People living elsewhere have no work at all. On the jobs engine's monthly review they get the pre-start working life's quarterly pulls at their state's unemployment, their age and their traits' leans; day one from CPS 2024 by age.

**Rules.** One engine per mechanic: the working-life pulls of past-work.ts are shared, not copied, and the jobs engine runs them on its own review day. No dice: pulls add up from rates, causes and traits, with CPS rates checking totals and seeding only who exists on day one.

**Done when.** In a generated world of a place drawn from all 56, the share employed after a year and the year's layoffs and job moves are within the CPS and JOLTS rates' spread (src/core2/jobs-elsewhere.test.ts, three draws); in a buildBenchWorld run with a seed the builder did not choose, a relative's work record is named by id and in the player's knowledge; speed:year within 20% of base.

**Files.** src/core2/jobs-elsewhere.ts, src/core2/past-work.ts, src/core2/modules/jobs.ts, src/core2/jobs-elsewhere.test.ts

**Notes.** Split from core-every-life-simulated by the lives lead, Nov 1; stacked on PR #7032.
