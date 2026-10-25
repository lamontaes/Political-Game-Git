---
id: world-weight-release-jobless-seek-work
title: "A counted household that takes a filled-in record's weight stands for people with no job, and they never look for one"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-counted-weight-release-grows-employer-staff
source: added with npm run pool -- add
---

**What.** When a household is filled in at a town's Census size, the households its record stood for spread over its group, and the jobs they held stay with their employers. The households that take the weight therefore stand for more people than their jobs' heads, and those added people hold no job. The jobs engine reads counted seekers from records, so they never look for work, and the town's jobless count drifts from what its people would do. Stopgap SG-WORLD-weight-release-jobless-not-seeking marks it in src/core2/counted-groups.ts.

**Rules.** One model, two tiers: a counted record's working-age people beyond its jobs' heads are read by the jobs engine with the same chooser as a full person, times their count. No dice: who looks for work follows their traits, money and the place's conditions.

**Done when.** In a played world built with buildBenchWorld at Census scale in a place drawn from all 56 (seed named), after fill-ins the jobs engine reads the jobless heads a weighted record gained as counted seekers, and one is hired by record id within a year, shown by a test in src/core2; SG-WORLD-weight-release-jobless-not-seeking is resolved.

**Files.** src/core2/counted-groups.ts, src/core2/modules/jobs.ts, src/core2/data/stopgaps.json

**Notes.** Filed from PR #5866 at the merger's request (send-back of Oct 23): the body's job-seeker limit needed an item and a registered stopgap.
