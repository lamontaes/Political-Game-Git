---
id: world-counted-renters-buy
title: "A counted renter household buys a new house through its group's accounts: rent part ends, mortgage part starts"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #5367
blocked-on:
after:
lead: laws-effects
model: opus
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** Full renter households can buy a home (`buyHomes` in src/core2/modules/housing.ts): the shared chooser weighs a mortgage against the lease, the household pays a down payment, the bank lends, the lease ends and a mortgage starts. Counted renters never do, so a town's wider population is renters for ever and its ownership rate only falls. Give a counted renter household the same decision and the same money steps, through its group's accounts: its rent part (`rent:<household>`) ends and a mortgage part joins the place's merged mortgage flow, with the down payment paid from the group's account and the seller paid. This item also takes the buy half of world-apply-and-buy-reasons-vary: each home purchase carries a circumstance reason that differs between buyers, by record id. The helper names in the old notes (addCountedRetiree, addFlowPart) are not on main; the ends of a part are endFlowPart in src/core2/residents-economy.ts and removeCountedHousehold in src/core2/housing-homeless.ts. Seen: the town's ownership rate in Metrics and the housing screen, which only falls because counted renters never buy.

**Cause.** Found in code: buyHomes (src/core2/modules/housing.ts:1487) handles full renter households only; counted mortgages are built at the opening by src/core2/housing-mortgages.ts (countedMortgageFlowId, one flow per place and holder, a part per household), and nothing adds a counted renter's mortgage part afterwards.

**Fix.** Give counted renter households the buy decision through their group accounts: the rent part ends (endFlowPart), a mortgage part joins the place's counted mortgage flow, the down payment is paid from the group's account, the seller is paid, and the bank-room check applies; each purchase keeps a circumstance reason from the household's own means. Register the stand-in for a counted household's down payment as an owner-decision stopgap.

**Time box.** 10 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted renter weighs buying with the same chooser and the same affordability read as a full one, times its count; `decisionActor` in src/core2/choice.ts already builds a counted person for the chooser. No dice: who buys follows income against payment, means and traits, never a share. Wire to the world: the loan, the down payment and the seller's proceeds move through the accounts API and every dollar balances. Speed: no scan of every counted renter each month; read the households whose rent is small against their income. Owner decision to flag: a counted household has no cash of its own (the group's cash is pooled by place), so its means for a down payment need a stand-in, registered as an `owner-decision` stopgap and written under OWNER DECISIONS NEEDED.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, a drawn place from all 56, place and seed named in the PR body) and sees at least one counted renter household, by record id, leave its `rent:<household>` part, join the mortgage flow with a `mortgage:<household>` part and appear as a new owner in `ownedHomes` with `escrowed` true, with the group's cash, the bank's loans and the seller's account balancing to the dollar and each purchase carrying a circumstance reason that differs between buyers. A test in src/core2/housing.test.ts covers it, and the town's ownership share is reported before and after.

**Waits on.** Nothing. The down-payment stand-in is a registered owner-decision stopgap.

**Files.** src/core2/modules/housing.ts, src/core2/residents-economy.ts, src/core2/housing-mortgages.ts, src/core2/housing-homeless.ts, src/core2/housing.test.ts

**Notes.** Read Oct 19 (claude/counted-renters-buy-g08lgv), not built: full-household buy path is `buyHomes` (about line 860) with `lendMortgage`; counted mortgages are built at the opening by `housing-mortgages.ts` (one flow per place and holder, a part per household, `countedMortgageFlowId`); a part is removed by `endFlowPart` and a counted removal by `removeCountedHousehold` (`housing-homeless.ts`); `housing-foreclosure.ts` already ends counted mortgage parts. Missing: an `addFlowPart` for a mortgage, the counted down-payment source, and the bank-room check (`room`) for a new loan.
Sent back 2026-10-20 from PR #5243 (branch claude/counted-renters-buy): Merge conflict with main in docs/pool/items/world-counted-renters-buy.md; superseded by PR #5367.

Sent back 2026-10-20 from PR #5243 (branch claude/counted-renters-buy): The new specification is useful, but the body explicitly says no counted-renter purchase path was built. This item Done when requires the buying decision, group-account payment, mortgage/rent flows and regrouping proof. A planning note cannot complete it. Keep the implementation open and track the completed specification work separately, or supply the required played-world purchase and money record proof.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5367 (branch claude/housing-construction-stopgap): The date/ruling cleanup fixes the prior return. The body still explicitly reports zero ordinary-world purchases and says the test raises housingBuyBaseline to 30 and funds the group to obtain one. Both linked pool items require a positive one-year buildBenchWorld purchase through existing producers, naming the rent part, mortgage part, owner and balanced group/bank/seller records. That proof is not supplied by the forced calibration-and-cash fixture. Both items also prohibit scanning every counted renter monthly, which the body says remains unaddressed. Keep the edge-case fixture, supply the ordinary generated-world purchase and money chain, and satisfy the stated speed rule before completing these items.; finish on that branch, merge main into it first.

Oct 25 audit: PR #5367 changes notes and a declaration only; the build is still to do (from the dropped world-counted-renters-buy-build).

Deferred Oct 25: nothing on screen reads it yet.

Nov 14, 2026 (Account lead T49): until counted renters buy, a town's home price level (world-home-prices-from-housing) counts counted owners' sales as homes offered but no counted purchases, so its buyers-against-homes-offered pressure leans down. Measured with `node --import tsx scripts/research/home-price-paths.ts --seed d4 --place 2132428 --years 30` (Gratz, Kentucky): no buyers in 30 years, 45 owned homes down to 9, the level flat in dollars over 30 years.

Ruling, Nov 14, 2026 (Account lead, from the standing rules "one model, two tiers" and "no dice"; not put to the owner): a counted renter household's down payment comes from its own savings, worked out from its own record on the day it weighs buying (what its income left after rent and living costs since its lease began), paid from the place's pooled account; a household short of the down payment does not buy. Not an income share of the pool, and never a purchase with no savings check. Raised to P2 and built next with world-home-prices-from-housing (#9104), whose price level leans down until counted renters buy; the two fold together.
