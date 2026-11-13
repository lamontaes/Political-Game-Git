---
id: world-founded-business-outside-sales-flow-starts-at-zero
title: "A new shop or factory opens and its outside customers pay it nothing"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: jobs
model: opus
effort: medium
root: none
source: found by Account lead T30 while checking world-business-founding-no-purchase-kinds
claimed-at:
checked:
---

**What.** A business founded in a played world gets its customers from the incumbents by `shiftPurchaseShare`, and the founding record says it won a positive monthly customer spend. But in a played 600-day world at Skagway, Alaska (US-AK 0270760, buildBenchWorld seed 8f3ccb88950177eb7865cdf9e9309e08981110a90485863070461caa82dfce65, drawn as `a:1` for the purpose founding-sweep, twoLevel), 5 of 9 founded businesses ended with an outside-sales flow whose `amountMinor` is 0: manufacturing founded 2025-06-01, 2025-07-01, 2025-09-01 and 2026-07-01, and an inn founded 2026-02-01 (flow ids `entrant:organization:founded:<kind>:<founder>:<date>:0`). The other four founded businesses and all 21 other live outside-sales flows in that world pay a positive amount. The player sees a new factory or inn that opens, hires and takes a loan, and never sells outside, so it earns nothing from outside buyers and closes or limps along. One inn (2025-09-01) did close on 2026-05-01. Seen: the town's business list and its founders' books in a played world.

**Cause.** Needs cause. Where to look: the entrant's flow is created in `shiftPurchaseShare` (src/core2/residents-economy.ts ~440-470) with a positive amount and a base of `amount / factor`; the monthly scaling in the same file (~529-546) sets `amountMinor = round(base * factor * limitOf(payee) * shareOfFlow(flow))`, and `limitOutsideSales` (~596-630) does the same. A zero comes from one of factor, limit or share being 0 (or the base being cleared) for an entrant flow; find which, and why only for these five.

**Fix.** None until the cause is found.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** Wire to the world: the share an entrant wins is read by the same monthly scaling as everyone's. No dice. One rule, all 56 places: the check draws its place and names it with the seed.

**Done when.** A second session (not the builder) plays a 600-day played world at Skagway AK seed 8f3ccb88... and two drawn places, every business founded in the run that won outside buyers has a positive outside-sales amount a year later, named by flow id; a test beside src/core2/market-entry.test.ts covers it; a year of `speed:year` is within 20% of its base. On screen: nothing yet; it would show on the town's business list and its jobs, and the founders' books.

**Waits on.** Nothing.

**Files.** src/core2/residents-economy.ts, src/core2/modules/business.ts, src/core2/market-entry.test.ts

**Notes.** Filed by hand on the Account lead T30 branch. The seed is the hash of "a:1" and "founding-sweep" through drawPlace in scripts/core2-year/place.ts.
