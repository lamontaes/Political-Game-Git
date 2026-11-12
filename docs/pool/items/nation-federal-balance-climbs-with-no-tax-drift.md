---
id: nation-federal-balance-climbs-with-no-tax-drift
title: "The federal ledger's surplus still climbs over twenty years with every tax amount indexed: something other than the tax on pay outgrows federal spending"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: money-tax-brackets-and-benefits-not-indexed-to-prices
blocked-on:
lead: money
model: sonnet
effort: medium
root: design-country-tier
source: added with npm run pool -- add
---

**What.** In the country tier's twenty-year run with no law changed, the federal ledger's yearly balance as a share of what the country sells climbs from about -0.1 percent in years 3 to 5 to about +0.5 percent by year 20 even when every bracket, standard deduction and the wage base move with average pay (src/core2/country-model.test.ts, seed ab12cd34ef56, brackets indexed to pay as a scratch run on Nov 11). With the law indexed to prices, as the statutes do, it reaches about +1.1 percent, against +1.8 percent with fixed amounts. Seen: the federal ledger on the Metrics tab in dev mode over twenty played years, its yearly balance as a share of what the country sells climbing with no law changed.

**Cause.** Measured: `node --import tsx` with a probe outside the repository that steps the country tier for twenty years from the test's own opening (seed ab12cd34ef56, starting law), with a temporary sum of each federal line in src/core2/country-model.ts (since undone), on main 97b13d43. As shares of the year's sales, from year 1 to year 20: tax on pay 6.45 to 7.89, profit tax 3.40 to 3.46, transfers 4.67 to 4.38, other federal spending 5.17 to 5.16, balance +0.02 to +1.81. The tax on pay's rise is bracket creep, which money-tax-brackets-and-benefits-not-indexed-to-prices (#8694) removes. The rest is transfers falling 0.3 points against sales. Found in code: retirement income in `incomesOf` (src/core2/country-model.ts, about line 518) is idle people × `prices` × `rules.retirementYear[fifth]`, held to prices only ("Retirement income and other aid keep up with prices, as their law has them do"). Social Security sets each new retiree's benefit from wage-indexed earnings (the average wage index) and only then follows prices, so the average benefit grows with pay. Over twenty years real pay rises (sales index 1.47 against prices 1.42), so a benefit held to prices shrinks as a share. The other federal spending (`federalOther`, line 1597) already grows with nominal sales, and the profit tax holds its share.

**Fix.** After #8694 lands, grow the oldest band's retirement income as the law does. Each year's average benefit moves with the average wage index for new awards and with prices for those already retired: blend the tier's pay scale and its price index by the share of retirees who are new each year, a sourced parameter from the SSA's award counts against beneficiaries, tagged SOURCED. Keep other aid on prices, as its law says. Then add the test this item's Done when names: over twenty years with no law changed, the balance stays within a quarter of a point of its early years, printing each federal line's share by year as above.

**Time box.** 4 hours for one Sonnet session, one of them for the SSA figures. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sliding scales and causes: no flow is scaled by a typed factor. The law decides: a spending line grows as its own law says. One rule, all 56 places.

**Done when.** A test in src/core2/country-model.test.ts shows, over twenty years with no law changed, the federal ledger's yearly balance as a share of sales within a quarter of a point of its early years, naming each federal line's share by year. A second session plays twenty years in dev mode in a drawn place on a seed nobody chose (named) and sees on the Metrics tab the federal ledger's yearly balance as a share of what the country sells hold steady with no law changed.

**Waits on.** money-tax-brackets-and-benefits-not-indexed-to-prices (#8694), which removes the bracket creep that is most of the climb on main.

**Files.** src/core2/country-model.ts, src/core2/country-model.test.ts, src/core2/data/macro/parameters.json

Nov 11 (cause finder for Fable B): split the twenty-year climb by federal line with a probe outside the repository. On main most of it is the tax on pay outgrowing sales (bracket creep, #8694). What remains is retirement income held to prices while pay grows, so transfers fall against sales. The fix ties new benefits to wages, as the law does.
