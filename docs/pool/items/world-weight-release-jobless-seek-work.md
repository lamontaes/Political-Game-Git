---
id: world-weight-release-jobless-seek-work
title: "A counted household that takes a filled-in record's weight stands for people with no job, and they never look for one"
area: world
kind: stopgap
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-counted-weight-release-grows-employer-staff
lead: jobs
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** When a household is filled in at a town's Census size, the households its record stood for spread over its group, and the jobs they held stay with their employers. The households that take the weight therefore stand for more people than their jobs' heads, and those added people hold no job. The jobs engine reads counted seekers from records, so they never look for work, and the town's jobless count drifts from what its people would do. Stopgap SG-WORLD-weight-release-jobless-not-seeking marks it in src/core2/counted-groups.ts.

**Cause.** Found in code: `releaseWeight` in src/core2/counted-groups.ts (line 591, stopgap marker at line 630) adds weight to the target records but leaves each target's jobs at their heads, so the people gained beyond the jobs' heads stand for no job and the jobs engine never reads them as seekers.

**Fix.** Read the working-age heads a weighted record gained as counted seekers in src/core2/modules/jobs.ts by the same chooser as a full person, then resolve the stopgap.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the town's jobless count on the Metrics tab, which drifts once a household is clicked and filled in.

**Rules.** One model, two tiers: a counted record's working-age people beyond its jobs' heads are read by the jobs engine with the same chooser as a full person, times their count. No dice: who looks for work follows their traits, money and the place's conditions.

**Done when.** A second session, on main in a place drawn from all 56 (seed named), builds the world at Census scale with buildBenchWorld, fills in a household in dev mode, and sees the jobs engine read the jobless heads a weighted record gained as counted seekers, and one of them hired by job record id within a year. A test in src/core2 shows it, and SG-WORLD-weight-release-jobless-not-seeking is resolved.

**Waits on.** Pull requests 8157 and 8158 on main: they change how a counted record's unplaced workers are counted and how counted seekers are read in src/core2/modules/jobs.ts. After they merge, check first whether the heads a record gains through `releaseWeight` already seek work; if they do, resolve the stopgap with that proof.

**Files.** src/core2/counted-groups.ts, src/core2/modules/jobs.ts, src/core2/data/stopgaps/world.json

**Notes.** Filed from PR #5866 at the merger's request (send-back of Oct 23): the body's job-seeker limit needed an item and a registered stopgap.
