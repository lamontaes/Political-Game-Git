---
id: world-press-outlet-revenue-wage-gap
title: "An outlet's standing revenue falls behind its payroll within a year and the station closes (Fort Defiance, Arizona: sales 91 percent of wages by July)"
area: world
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/public-post-hours
pr: #5013
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T00:12:36.560Z
---

**What.** An outlet's standing revenue (`startOutletRevenue`, `src/core2/press-money.ts`) is a flow set once at the opening from `capacityMinor = max(audience revenue, payroll times one plus the bureau margin)`, sized from the rows' annual pay figures. The payroll actually paid is higher than those figures, so the outlet runs a small deficit and, with no cash behind it, closes. In Cobb Island, Maryland (place 2418200, seed all56, `buildBenchWorld`) the newspaper's account in its first 180 days took in $77,916 from `accounts.transfer:outside-sales` (about $12,990 a month, the row's $153,788 a year once payroll taxes are covered in the pull request on people-press-small-town-outlets-close) and paid out $72,375 in wages (`work-payroll`) and $5,999 in employer taxes. That is $146,700 a year in wages against $132,500 from the head's and reporter's annual pay figures (+11 percent), and about $159,000 a year of cost against $155,000 of revenue. Find why the wages paid run 11 percent over the pay rows (pay periods, hours or a raise from the minimum wage law in force) and size the revenue from what is paid. In the Fort Defiance, Arizona case in the title, sales were 91 percent of wages by July.

**Rules.** Wire to the world: the revenue is a payment from a named payer's own account, read at payment time. Every dollar balances. One model, two tiers: the counted audience pays by the same rule as a full reader times their count. No dice.

**Done when.** In the played world (`buildBenchWorld`, the drawn place Cobb Island with seed all56, and one random place) an outlet's revenue covers the wages and taxes it pays through two years, shown by transfer id, and the local outlets in Cobb Island stay open for two years; a test in `src/core2/press-money.test.ts` names the place and seed.

**Files.** src/core2/press-money.ts, src/core2/modules/press.ts, src/core2/modules/residents.ts

**Notes.** Measured Oct 17 (claude) while taking people-press-small-town-outlets-close. The opening cash buffer in that item's pull request delays the closures from 2 months to 8 to 15 months; closing the 11 percent gap should keep them open.

**Fixed Oct 17 (claude, claude/public-post-hours).** `startPublicJob` now sets a post's hourly rate over the minutes the copied schedule runs (`hourlyMinor` times the template's stated week over the commitment's expected week), and the job's `wageDailyMinor` stays the posted daily pay. In Cobb Island the newspaper's payroll in the first 180 days fell from $72,375 to $60,310, so wages and the revenue sized from them agree, and none of the five local outlets closed through January 2027 (before: all five had lost their reporters by September 2026). `src/core2/press-pay-matches-schedule.test.ts` checks every local press job pays its posted annual pay over its schedule's minutes; on main it is 6.6 percent over in Texhoma, Texas (seed a9747c3b9e6fc5e2:0). The same mismatch is in the opening's supplied schedules for other jobs (9 of 29 in Cobb Island ran at 1.2), which this does not change.
