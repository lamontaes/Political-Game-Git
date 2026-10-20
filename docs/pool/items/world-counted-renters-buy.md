---
id: world-counted-renters-buy
title: "A counted renter household buys a new house through its group's accounts: rent part ends, mortgage part starts"
area: world
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/counted-renters-buy-g08lgv
pr: #5252
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:13:50.152Z
---

<<<<<<< HEAD
**What.** New houses sell only to full renter households, so in a played year a town's finished new houses pile up unsold and no counted renter ever buys one. A counted renter household should weigh buying by the same rule as a full one (its income, savings and the price), and when it buys, its group's rent part ends, a mortgage part starts and the builder is paid the down payment from the group's fund. The player would notice new houses selling to families in town and the town's homeownership moving with its prices.

**Rules.** One model, two tiers: a counted group buys under the same affordability rule as a full person, times its count, through keyed group accounts. Sliding scales and causes: buying follows income, savings and price, with no threshold that flips. Every dollar balances: the down payment and loan are journal records that net to the home's price. No dice: which groups buy comes from their own money and costs.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body), a counted renter group buys a finished new house, shown by the house, the group's fund and the closing record ids, the town's unsold new houses stop rising, and the stopgap SG-WORLD-housing-new-home-buyers is resolved; the test is in src/core2/housing-construction.test.ts.

**Files.** src/core2/housing-construction.ts, src/core2/modules/housing.ts, src/core2/counted-money.ts, src/core2/residents-economy.ts

**Notes.** Split from world-stopgap-housing-construction-faked-mechanic (Oct 19), which holds the measurement: Manchester Center, Vermont had 3 new houses unsold and no purchase after a year.
=======
**What.** Full renter households can buy a home (`buyHomes` in `src/core2/modules/housing.ts`): the shared chooser weighs a mortgage against the lease, the household pays a down payment, the bank lends, the lease ends and a mortgage starts. Counted renters never do, so a town's wider population is renters for ever and its ownership rate only falls. Give a counted renter household the same decision and the same money steps, through its group's accounts: its rent part (`rent:<household>`) ends and a mortgage part joins the place's merged mortgage flow (`amountByContract`, as `addCountedRetiree` joins a retiree), with the down payment paid from the group's account and the seller paid.

**Rules.** One model, two tiers: a counted renter weighs buying with the same chooser and the same affordability read as a full one, times its count; `decisionActor` already builds a counted person for the chooser. No dice: who buys follows income against payment, means and traits, never a share. Wire to the world: the loan, the down payment and the seller's proceeds move through the accounts API and every dollar balances. Speed: no scan of every counted renter each month; read the households whose rent is small against their income. Owner decision to flag: a counted household has no cash of its own (the group's cash is pooled by place), so its means for a down payment need a stand-in, registered as an `owner-decision` stopgap and written under OWNER DECISIONS NEEDED.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, place and seed named in the PR body) at least one counted renter household is shown by record id to leave its `rent:<household>` part, join the mortgage flow with a `mortgage:<household>` part, and the new owner appears in `ownedHomes` with `escrowed` true, and the group's cash, the bank's loans and the seller's account balance to the dollar. A test in `src/core2/housing.test.ts` covers it, and the town's ownership share is reported before and after.

**Files.** src/core2/modules/housing.ts, src/core2/residents-economy.ts, src/core2/housing-mortgages.ts, src/core2/housing.test.ts

**Notes.** Read Oct 19 (claude/counted-renters-buy-g08lgv), not built: full-household buy path is `buyHomes` (about line 860) with `lendMortgage`; counted mortgages are built at the opening by `housing-mortgages.ts` (one flow per place and holder, a part per household, `countedMortgageFlowId`); a part is removed by `endFlowPart` and a counted removal by `removeCountedHousehold` (`housing-homeless.ts`); `housing-foreclosure.ts` already ends counted mortgage parts. Missing: an `addFlowPart` for a mortgage, the counted down-payment source, and the bank-room check (`room`) for a new loan.
>>>>>>> origin/main
