---
id: world-counted-weight-release-grows-employer-staff
title: "A filled-in household's weight moves to its group's other households, and their employers' counted staff grows with no hire (Washington, D.C. at Census size)"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When a counted household record is filled in, releaseWeight (src/core2/counted-groups.ts) spreads the other households it stood for over its group's remaining records. A remaining record's counted job then stands for more workers (countedHeadsOf reads the household's weight), so its employer's staff and payroll grow without a hire, and layOff (src/core2/modules/jobs.ts) refuses to lay off a record that stands for more heads than the staff is over by. Washington, D.C. at its Census size (seed dc-closures-a, scale 69.4): Dixon's Bowling Lanes (organization_e2a2729e26acde67) went from 49 counted records and 3,406 heads on Jan 20 (69.5 a record) to 35 records and 2,818 heads on Dec 16 (80.5 a record), 26 percent over its sales staff of 2,232, while the same town at the sample size shrank to its target (49 to 31 plus 5 full). Its wages over 340 days were 85 times the sample's against sales 75.6 times, and it closed on 2025-12-25 when the payroll came 36,154,827 short. Find where the released weight should go so an employer's heads follow its staffing decisions, and let a record that stands for many jobs shed part of them.

**Rules.** One model, two tiers: a counted job stands for the same jobs every reader counts, and the town's people stay counted. No dice. Every dollar balances.

**Done when.** In Washington, D.C. at its Census size (seed dc-closures-a) and one more drawn place above 100,000, built with buildBenchWorld and played a year, an employer's counted heads per record move only when it hires, lays off or a worker leaves, and its staff at year end is within its sales staff the way the sample-size run's is, named by organization and record ids in a test in src/core2.

**Files.** src/core2/counted-groups.ts, src/core2/modules/jobs.ts, src/core2/residents-economy.ts

**Notes.** Found on PR #5803 (world-census-scale-closures-large-cities): it blocks that item's Washington, D.C. closure comparison after the Oct 22 main merge, which lowered the firm's residents' purchases by about 5 percent (18,574,370,233 to 17,667,652,857 minor units in 340 days) and tipped a firm already losing money at the Census size before the merge.
