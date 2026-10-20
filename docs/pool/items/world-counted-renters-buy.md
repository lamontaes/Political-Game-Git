---
id: world-counted-renters-buy
title: "A counted renter household buys a new house through its group's accounts: rent part ends, mortgage part starts"
area: world
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/counted-renters-buy
pr: #5367
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:01:09.902Z
---

**What.** Full renter households can buy a home (`buyHomes` in `src/core2/modules/housing.ts`): the shared chooser weighs a mortgage against the lease, the household pays a down payment, the bank lends, the lease ends and a mortgage starts. Counted renters never do, so a town's wider population is renters for ever and its ownership rate only falls. Give a counted renter household the same decision and the same money steps, through its group's accounts: its rent part (`rent:<household>`) ends and a mortgage part joins the place's merged mortgage flow (`amountByContract`, as `addCountedRetiree` joins a retiree), with the down payment paid from the group's account and the seller paid.

**Rules.** One model, two tiers: a counted renter weighs buying with the same chooser and the same affordability read as a full one, times its count; `decisionActor` already builds a counted person for the chooser. No dice: who buys follows income against payment, means and traits, never a share. Wire to the world: the loan, the down payment and the seller's proceeds move through the accounts API and every dollar balances. Speed: no scan of every counted renter each month; read the households whose rent is small against their income. Owner decision to flag: a counted household has no cash of its own (the group's cash is pooled by place), so its means for a down payment need a stand-in, registered as an `owner-decision` stopgap and written under OWNER DECISIONS NEEDED.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, place and seed named in the PR body) at least one counted renter household is shown by record id to leave its `rent:<household>` part, join the mortgage flow with a `mortgage:<household>` part, and the new owner appears in `ownedHomes` with `escrowed` true, and the group's cash, the bank's loans and the seller's account balance to the dollar. A test in `src/core2/housing.test.ts` covers it, and the town's ownership share is reported before and after.

**Files.** src/core2/modules/housing.ts, src/core2/residents-economy.ts, src/core2/housing-mortgages.ts, src/core2/housing.test.ts

**Notes.** Read Oct 19 (claude/counted-renters-buy-g08lgv), not built: full-household buy path is `buyHomes` (about line 860) with `lendMortgage`; counted mortgages are built at the opening by `housing-mortgages.ts` (one flow per place and holder, a part per household, `countedMortgageFlowId`); a part is removed by `endFlowPart` and a counted removal by `removeCountedHousehold` (`housing-homeless.ts`); `housing-foreclosure.ts` already ends counted mortgage parts. Missing: an `addFlowPart` for a mortgage, the counted down-payment source, and the bank-room check (`room`) for a new loan.
Sent back 2026-10-20 from PR #5243 (branch claude/counted-renters-buy): Merge conflict with main in docs/pool/items/world-counted-renters-buy.md; superseded by PR #5367.
