---
id: web-lag-law-before-opening-reads-none
title: "The outcome web reads a law as absent before the opening, so repealing an opening law skips its lag"
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

**What.** The outcome web reads a law's value lagMonths back (lawValue in src/core2/modules/outcome-web.ts:145, used by effectOf). A starting policy-question row is dated at the opening (src/core2/modules/laws.ts:194, the earlier of today and the answers' date), so for any month before the opening the web reads no law. When a law in force at the opening is repealed, its lagged value reads as none, not yes, and the repeal's full effect shows in the first month instead of after the lag. Seen in the laws lead's checker run: right-to-work-to-turnout (lag 12 months) at 0.031 in Uehling, Nebraska (seed 5e27b0c4196fd3a8) in 2025-01, the month right-to-work was repealed.

**Rules.** Sliding scales and causes: a lagged effect follows its law's change by the researched lag, never the opening's bookkeeping. One rule, all 56 places: the fix reads every place's opening law the same way, from data.

**Done when.** In a played world (buildBenchWorld, a drawn place, seed named) where a policy-question law is in force at the opening, a test repeals it and shows its lagged web link moving only after lagMonths, naming the month row ids, while the control world shows no effect.

**Files.** src/core2/modules/outcome-web.ts, src/core2/modules/laws.ts

**Notes.** TODO
