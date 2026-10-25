---
id: gov-recall-bars-election-clock
title: "Recall bars counted from an election, and each state's rule after a failed recall, read by the recall engine"
area: gov
kind: stopgap
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/modules/recalls.ts reads each state's bars as days into the term and days before its end (src/core2/data/campaigns/recall-bars.json), and bars any later petition for the rest of the term once one failed. Some statutes count from an election instead: Nebraska bars a petition six months before the incumbent filing deadline, Washington stops one six months before the next general election, North Dakota bars a recall election within a year of the next regular one; those are estimated or left out of the table now. Each state's rule after a failed recall also differs (six months in Alaska, 365 days in D.C., two years in Montana, twelve months in Nebraska, the rest of the term in Nevada and North Dakota), recorded in data/research/core/recall-timing-statutes-2026.json. Read both into the recall engine, and read Mississippi's timing rule, which no session has read. Closes SG-GOV-recall-bars-national.

**Rules.** One rule, all 56 places: every bar is a per-state row in data, never a state named in logic. Research before building: each bar cites its statute in the research file, and scripts/research/check-core-research.ts keeps the engine table equal to it.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place with a petitioned local recall and the seed named in the PR), a recall petition after a failed one waits for that state's own bar, named by recall record id, a test in src/core2/recalls.test.ts covers an election-counted bar and an after-failure bar, and scripts/research/check-core-research.ts passes.

**Files.** src/core2/modules/recalls.ts, src/core2/recalls.test.ts, src/core2/data/campaigns/recall-bars.json, data/research/core/recall-timing-statutes-2026.json, src/core2/data/stopgaps.json

**Notes.** TODO
