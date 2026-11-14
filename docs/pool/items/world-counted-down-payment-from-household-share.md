---
id: world-counted-down-payment-from-household-share
title: "A counted renter's down payment comes from its share of its group's account, and leaves with it, instead of a window of today's surplus"
area: world
kind: stopgap
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: world-counted-renters-buy
blocked-on:
lead: money
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: Account lead T54 2026-11-14
source: Account lead T54 building world-counted-renters-buy (#9117, Nov 14, 2026), on the Account lead's ruling 2
---

**What.** Since #9117 a counted renter household weighs buying on its lease month with its "own savings": what is left of its income after rent and living costs each month since its lease began, capped at 60 months (`countedOwnSavings` in src/core2/housing-counted-buy.ts, stopgap SG-WORLD-housing-counted-savings-from-today, parameter `housingCountedSavingsMonths`). That is a figure worked out from today's income and rent, not money the game holds. The down payment itself is paid from the household's group account, so the means test and the money paid read two different things. Seen: which renters become owners and when, in the town's housing numbers and the home prices on the Metrics screen.

**Cause.** Design: docs/design/one-model-two-tiers.md. A counted household has no account of its own. Its money is its group's account (a fund under its place's residents account, src/core2/counted-money.ts; a group is one place, district, household kind, income band, tenure, head's age band and work), which payroll, rent, mortgages and purchases already move group by group. The household's real balance is its share of that account: `householdCash` / `householdCashReader` in src/core2/modules/residents.ts (the group's balance times its people over the group's people), the same share `departingCash` sends with a household that leaves and `moveShare` carries when `regroupHousehold` moves it to another group. Two gaps follow. (1) The means test reads the surplus window instead of that share. (2) In `buy()` (housing-counted-buy.ts) the down payment leaves the renter group's account first and `regroupHousehold` then moves the buyer's per-person share of what is left, so the other renters in the group pay all but the buyer's own fraction of its down payment.

**Fix.** In `buyCountedHomes`, weigh with `meansMinor` = the household's share (`householdCashReader`, read once per pass) per household of its weight, and drop `countedOwnSavings`, its parameter row and the stopgap row. In `buy()`, regroup the household into its owner group first (its share moves with it), then pay the down payment from the group it joined, so the down payment comes out of the money that moved with the buyer. A household's share is the same per person across its group; if that proves too flat (every renter in a group passes or fails together), say so in the PR body with the counts, rather than adding a per-household ledger.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** One model, two tiers: a counted household spends the money the books hold for it, as a full one spends its members' cash and savings. Money moves only through the existing accounts; no new tracking. No dice.

**Done when.** The pinned test in src/core2/housing-counted-buy.test.ts asserts at Bastrop, Louisiana (place 2204685) that each counted buyer's share of its group's account before the purchase covered its down payment times its weight, that a renter short of it does not buy, and that the renter group it left changed by only the buyer's share, by record id; the price table at Bastrop, Bloomingdale and Gratz at years 1, 5 and 15 with and without, and the speed table, are in the PR body. A second session runs a year in a drawn place and sees counted renters buy, with the group accounts named.

**Waits on.** world-counted-renters-buy (#9117) folded.

**Files.** src/core2/housing-counted-buy.ts, src/core2/modules/residents.ts, src/core2/data/housing/parameters.json, src/core2/data/stopgaps/world.json

**Notes.**
