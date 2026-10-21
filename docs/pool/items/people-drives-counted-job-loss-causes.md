---
id: people-drives-counted-job-loss-causes
title: "A counted worker who loses their job takes up a cause by the same rule as a named worker, and keeps it when filled in"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A named worker laid off or closed out forms a cause drive in play (respond in src/core2/modules/drives.ts), but the job-loss and closure events name only full people, so a counted worker who loses a job never perceives it. Have those events reach their counted subjects: the layoff names its counted worker as a fact and the closure record lists its counted jobs. Each counted subject then responds by the same perception, appraisal and shared chooser, read from their counted record, and a cause they take up is kept for them until they are filled in, when it becomes theirs.

**Rules.** One model, two tiers: a counted worker responds to losing a job by the same rule as a named one, read from their own counted record. No dice: whether they take up a cause comes from their traits and the event, never a roll.

**Done when.** In a one-year buildBenchWorld played world in a place drawn from all 56 (seed named), a counted worker who lost a job holds a cause formed from that job-lost or closure event by record id, every counted perception of a job loss is scored by the shared rule, and the worker filled in holds the same drive and goal, shown by a test in src/core2.

**Files.** src/core2/modules/drives.ts, src/core2/modules/jobs.ts, src/core2/data/drives.json

**Notes.** Split from people-drives-counted-tier-causes: the job-loss and closure events, the commonest counted events in the jobs engine. The other event kinds (deaths, illness, eviction, law effects) and the share comparison stay with the parent.
