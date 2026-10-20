---
id: world-counted-headcount-falls-faster-than-population
title: "In a town above 10,000 a year cuts counted workers' weighted headcount by 40 percent while its people fall 7 percent"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-yucp92-ee
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:54:38.744Z
---

**What.** A town above 10,000 opened at its Census size (countScale set to Census over 10,000) loses counted workers much faster than its people. In a drawn town of 23,800 people, the weighted headcount at employers (countedHeadcountOf summed over businesses) went from 2,753 at day 2 to 1,980 at day 182 and 1,645 at day 365, a fall of 40 percent, while the town's counted people fell 7 percent (23,803 to 22,239) and its adults 5 percent. The residents' own worker count fell 15 percent. Weighted jobs are being lost and not refilled at the household weight, so the economy shrinks by itself.

**Rules.** Wire to the world: hires and layoffs of a counted worker must move the weighted headcount by the household's weight both ways. One model, two tiers: a counted worker's job counts as many heads as the household weight says whether it is the opening job or a replacement hire. No dice: the loss comes from causes (retirement, quits, closures), each refilled by the hiring rule.

**Done when.** In a one-year played world (buildBenchWorld with countScale set to Census over 10,000, a drawn place above 10,000, seed named) the weighted headcount at employers falls by no more than the town's adults do, shown by a test in src/core2/census-weight-economy.test.ts that adds a day-365 check beside the day-2 check, and the leavers and hires are named by job record id.

**Files.** src/core2/residents-economy.ts, src/core2/modules/jobs.ts, src/core2/census-weight-economy.test.ts

**Notes.** TODO
