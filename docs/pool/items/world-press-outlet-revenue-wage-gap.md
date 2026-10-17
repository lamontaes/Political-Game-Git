---
id: world-press-outlet-revenue-wage-gap
title: "An outlet's standing revenue falls behind its payroll within a year and the station closes (Fort Defiance, Arizona: sales 91 percent of wages by July)"
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

**What.** An outlet's standing revenue (`startOutletRevenue`, `src/core2/press-money.ts`) is a flow from the town's outside customers, set once at the opening from `capacityMinor = max(audience revenue, payroll times one plus the bureau margin)`, while the outlet's payroll and the employer's payroll taxes move with its pay. The money that comes in is not what the row states. In Cobb Island, Maryland (place 2418200, seed all56, `buildBenchWorld`) the newspaper's account took in $117,585 from `accounts.transfer:outside-sales` over the first 330 days and the same $117,585 over the first 640 days, so the flow stops delivering after about ten monthly payments, against a stated revenue of $143,118 a year ($153,788 once payroll taxes are covered, pull request on people-press-small-town-outlets-close). It paid out $115,144 in wages and $9,071 in employer taxes in the first 330 days and $117,226 and $9,498 over 640, plus $29,307 of ad income from campaigns. In the Fort Defiance, Arizona case in the title, sales were 91 percent of wages by July. Find why the standing flow stops or shrinks (the group's fund the flow draws from, a first-payment date, or the flow ending when its payee's employer enrolls in the business engine as `addBusinessBooks` does in `enrollPressEmployers`) and make the payment follow the outlet's costs.

**Rules.** Wire to the world: the revenue is a payment from a named payer's own account, read at payment time. Every dollar balances. One model, two tiers: the counted audience pays by the same rule as a full reader times their count. No dice.

**Done when.** In the played world (`buildBenchWorld`, the drawn place Cobb Island with seed all56, and one random place) an outlet's account takes in each month the revenue its row states for two years, shown by transfer id, and the local outlets in Cobb Island stay open for two years; a test in `src/core2/press-money.test.ts` names the place and seed.

**Files.** src/core2/press-money.ts, src/core2/modules/press.ts, src/core2/modules/residents.ts

**Notes.** Measured Oct 17 (claude) while taking people-press-small-town-outlets-close. Without the revenue stopping, the opening cash buffer in that item's pull request would carry an outlet indefinitely; with it, the outlets still close after 8 to 15 months.
