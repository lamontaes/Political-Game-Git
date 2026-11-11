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
after: 
blocked-on:
lead: money
model: opus
effort: high
root: design-country-tier
source: added with npm run pool -- add
---

**What.** In the country tier's twenty-year run with no law changed, the federal ledger's yearly balance as a share of what the country sells climbs from about -0.1 percent in years 3 to 5 to about +0.5 percent by year 20 even when every bracket, standard deduction and the wage base move with average pay (src/core2/country-model.test.ts, seed ab12cd34ef56, brackets indexed to pay as a scratch run on Nov 11). With the law indexed to prices, as the statutes do, it reaches about +1.1 percent, against +1.8 percent with fixed amounts. Seen: the federal ledger on the Metrics tab in dev mode over twenty played years, its yearly balance as a share of what the country sells climbing with no law changed.

**Cause.** Needs cause. Measured on the branch of money-tax-brackets-and-benefits-not-indexed-to-prices (Nov 11): the climb left once the tax on pay keeps pace with pay is not from withholdingFor. Candidates to check against the code: how country-model.ts scales federal spending (by households and prices, not by output; the federal lines of pull request 8388 if merged), payroll taxes' share, corporate or other federal revenue.

**Fix.** None until the cause is found.

**Time box.** 6 hours

**Rules.** Sliding scales and causes: no flow is scaled by a typed factor. The law decides: a spending line grows as its own law says. One rule, all 56 places.

**Done when.** A test in src/core2/country-model.test.ts shows, over twenty years with no law changed, the federal ledger's yearly balance as a share of sales within a quarter of a point of its early years, naming each federal line's share by year. A second session plays twenty years in dev mode in a drawn place on a seed nobody chose (named) and sees on the Metrics tab the federal ledger's yearly balance as a share of what the country sells hold steady with no law changed.

**Waits on.** Nothing.

**Files.** src/core2/country-model.ts, src/core2/country-model.test.ts
