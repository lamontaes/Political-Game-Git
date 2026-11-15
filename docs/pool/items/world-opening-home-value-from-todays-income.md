---
id: world-opening-home-value-from-todays-income
title: "A home's opening value comes from its household's income today, so a retiree's home sits far under its town's values"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "found by T54 checking a Carmel, IN estate sale for the Account lead, Nov 15; lead's ruling 18:10Z: file it as the system fault, candidate for T54 after first paycheck"
---

**What.** The opening gives each owned home a value from its household's income today, not from what the home is. Anyone whose income fell after they bought holds a home far under the town's values, retirees above all. That low value then feeds every reader of a home's value: estate sales, property tax, home equity, mortgages and what heirs receive. Seen at Carmel, Indiana (1810342), draw `drawPlace("d4", "counted-estate-home:0")` on #9117's head 5c3dc321:

- household_5148c94484d9721c is a counted group "one adult, income band 0, 65 and over, retired", owning since 1971-07-01.
- It opens at $147,933, against the town's typical home value of $426,819 (`townFigures`) and a median of $398,080 across 3,307 owned homes.
- At its death the estate sale (home-sale:household_5148c94484d9721c:2025-11-01) sold at $142,284 a home.

Seen: the home value on the player's own household page when a parent or grandparent is retired, an inherited home that brings a fraction of the street's prices, and a retiree's property tax bill.

**Cause.** Found in code: in src/core2/modules/housing.ts, the opening's owner rows set `valueMinor` to the county median times `incomeScale(row.income) / ownerMedianScale`. `incomeScale` is the household's income today against the town's median, raised to `housingRentIncomeElasticity`. That rule fits a rent, which is paid from today's income. A home's worth was set when it was bought, and income falling later does not shrink the house.

**Fix.** A home's opening value rests on what the game already holds about the home, not on income today:

- the town's home values (the census median the opening calibrates to);
- when the household bought (the dwelling's `since`, a mortgage's `boughtYear`);
- what the household earned then, the income the opening already knows for that age and year from the same income rule.

The value at purchase is the town's typical value then, scaled by income at purchase. It is then carried to day one by the town's own price level (housing-price-path). The owners' median stays the calibration point. No cap or floor, and no special case for retirees: the same rule for every owner, full or counted.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers. Estimate, never UNKNOWN. No dice. Every dollar balances: what the opening's mortgages, equity and property tax read follows from the one value.

**Done when.** A test pinned at Carmel (1810342) with a fixed seed shows household_5148c94484d9721c, or a named retired owner, opening within the spread of the town's typical value for a home bought when it was. The owners' median still matches the calibration point. Year 1 and time per record at three named places, before and after, are in the pull request body. A second session, at a drawn place it names with its seed, sees in dev mode a retired owner's home valued near its street's homes and an estate sale bringing that price.

**Waits on.** Nothing in the code; the builder takes it after the first-paycheck item.

**Files.** src/core2/modules/housing.ts, src/core2/housing-price-path.ts
