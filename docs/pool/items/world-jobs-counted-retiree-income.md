---
id: world-jobs-counted-retiree-income
title: "A counted retiree draws a benefit from their own earnings record"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A counted worker who retired from a job used to be handed their place's average retiree income. They now claim through the retirement-claims engine on the day they retire, and the award is sized from their own age and covered work and paid from the Social Security payer, once. The average-income flow and its code are deleted and the stopgap row is resolved.

**Rules.** One model, two tiers: a counted retiree is paid by the same claim rule as a full person. Replace, never layer: addCountedRetiree is deleted in the same change. No dice: the award comes from age, work and the law in force.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56) every counted worker who retired and has a claim is paid the retirement-claim flow with their person id, and no residents:retirement:added flow exists, proven by src/core2/jobs-counted-retire-claim.test.ts.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/retirement-claims.ts, src/core2/residents-economy.ts, src/core2/data/stopgaps.json

**Notes.** Built on claude/political-game-pool-yucp92-c.
