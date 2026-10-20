---
id: world-counted-headcount-falls-faster-than-population
title: "In a town above 10,000 a year cuts counted workers' weighted headcount by 40 percent while its people fall 7 percent"
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

**What.** A town above 10,000 opened at its Census size (countScale set to Census over 10,000) loses counted workers much faster than its people. In a drawn town of 23,800 people, the weighted headcount at employers (countedHeadcountOf summed over businesses) went from 2,753 at day 2 to 1,980 at day 182 and 1,645 at day 365, a fall of 40 percent, while the town's counted people fell 7 percent (23,803 to 22,239) and its adults 5 percent. The residents' own worker count fell 15 percent. Weighted jobs are being lost and not refilled at the household weight, so the economy shrinks by itself.

**Rules.** Wire to the world: hires and layoffs of a counted worker must move the weighted headcount by the household's weight both ways. One model, two tiers: a counted worker's job counts as many heads as the household weight says whether it is the opening job or a replacement hire. No dice: the loss comes from causes (retirement, quits, closures), each refilled by the hiring rule.

**Done when.** In a one-year played world (buildBenchWorld with countScale set to Census over 10,000, a drawn place above 10,000, seed named) the weighted headcount at employers falls by no more than the town's adults do, shown by a test in src/core2/census-weight-economy.test.ts that adds a day-365 check beside the day-2 check, and the leavers and hires are named by job record id.

**Files.** src/core2/residents-economy.ts, src/core2/modules/jobs.ts, src/core2/census-weight-economy.test.ts

**Notes.** TODO

Measured Oct 20 (claude, claude/political-game-pool-yucp92-ee), same town both times (Chantilly, Virginia, Census 24,036), 365 played days, bookkeeping off. Weighted headcount at business employers: at Census scale 2,760 (day 2) to 1,994 (day 182) to 1,662 (day 365); at scale one 1,145 to 858 to 862. So at scale one the headcount settles after a drop in the first half year, and at Census scale it keeps falling. The jobs engine's changes over the year: at scale one 433 quits, 62 layoffs, 461 hires, no closures; at Census scale 423 quits, 239 layoffs, 451 hires, 31 closures. Hires are the same in both (records, not heads), layoffs are four times and closures appear, and openings never wait (the positions table holds none) while 361 seekers (633 heads) go unhired. The cause is not the headcount arithmetic: at Census scale the firms lay off and close because their sales do not grow with the households' weights as their payroll does. Find the sales side that does not read the weight (the household purchases that reach each business) and make it read it, then check layoffs and closures return to the scale-one counts. The first-half-year drop of 25 percent at scale one (268 quits in a half year of 1,145 heads) is a separate question to check against JOLTS quits.

Fixed Oct 20 on claude/political-game-pool-yucp92-ee: the bench world scaled the households and the firms to the Census size but left the outside market's purchases at the 10,000-person sample's level, so a town's payroll grew with its weights and its sales did not (Chantilly at scale 2.4, day 60: payroll 7.55 million against 3.14 at scale one, sales 16.6 against 13.6 million). buildBenchWorld now multiplies the outside demand by countScale. With it, the same town's weighted headcount at businesses goes 2,765, 2,473, 2,333 over a year (16 percent down, against 40 percent) and layoffs fall from 239 to 71 (62 at scale one). Closures still read 114 job rows in that run (against 31 before and none at scale one); that is a follow-up to check. src/core2/census-weight-economy.test.ts now plays the year.
