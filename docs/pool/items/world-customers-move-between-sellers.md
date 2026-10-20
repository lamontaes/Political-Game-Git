---
id: world-customers-move-between-sellers
title: "Customers move between sellers month by month, so shrinking firms lay people off"
area: world
kind: feature
priority: 2
size: M
status: blocked
claimed-by: claude/fs11vb-customers-question
pr: #5210
blocked-on: owner decision: what moves a customer between sellers (OWNER-DECISIONS.md, Open)
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:01:39.372Z
---

**What.** A seller's customers change only when a business opens or closes (`splitMarketDemand` runs at entry only), so layoffs run at 0.04% of jobs a month against 1.4% in JOLTS. Re-split each residents' purchase share monthly by sellers' prices and capacity, so a firm that loses customers shrinks and lays people off. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of a drawn town, layoffs at shrinking firms follow their lost customers, by business and purchase-share record ids, and the layoff rate is checked against JOLTS.

**Files.** src/core2/modules/residents.ts, src/core2/modules/business.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.

Tried Oct 16 (built, measured, not shipped): a monthly move of each household's spending toward the target split of its place's sellers of one kind (capacity weighted by price against rivals', both against each seller's opening price), for counted purchase flows (contract by contract, so fill-in still takes back its own) and for full households' living plans, at 5 percent of the gap a month. It works and keeps every household's total unchanged, but it moves almost nothing. In Rush Valley, Utah (seed cs-1, one year, 7 of 17 kinds have two or more sellers) the median price spread among sellers of a kind is 0.06 percent and the largest is 2.4 percent, because every seller's price follows the same wage and price indexes; about $2,400 a year changed hands against a town selling millions, and layoffs stayed at 0.04 percent of jobs a month (8 in the year) with or without it. So price cannot be the cause that moves customers. The JOLTS gap needs causes that actually differ between sellers (a seller's own wages against rivals', its location against the buyer's home, a seller that closes its door at the hours its buyers are free, a new rival's opening taking share, the owner's choice to cut or raise price). Pick the cause first, then reuse `splitMarketDemand` and the contract-by-contract move in `moveCountedCustomers` (residents.ts, the pattern of `shiftToOpenSellers`) and the plan move in cost-of-living.ts. The move itself is about 150 lines and is easy to rebuild from this note.

Looked at Oct 19 (claude/political-game-pool-3xfqef-2) and handed back unbuilt: the Oct 16 note shows price cannot be the cause, and the replacement cause (a rival's wages, location, hours, an owner's price choice) is a design choice the item does not make. A builder takes it only with a named cause; consider splitting one item per cause.

## Notes

Sent back 2026-10-20 from PR #5210 (branch claude/pool-world-customers-move-between-sellers): No code built and owner decisions must not be waited on; finish on that branch, merge main into it first.

Oct 20 (claude, claude/civic-producers-government-landed), read again and left unbuilt. Reading the code, the sellers' shares are set by `splitMarketDemand` (`business-books.ts`: capacity times relative price to the elasticity) and applied only at entry by `enterResidentMarket` (`residents.ts`). Two of the candidate causes the Oct 16 note lists cannot move customers on the data that exists: a seller's price follows the same wage and price indexes as its rivals' (spread 0.06 percent), and a seller's capacity follows its own demand, so re-splitting by capacity returns the same shares. What does differ between sellers is location, which needs the dwelling and business locations in `world-dwelling-locations` (open, L), and a rival's opening or closing, which the entry path already handles. The one cause buildable from today's records is a seller's own unit labor cost passing through to its price (`projectBusinessPrice` already mixes the seller's pay share with the wage index), so a pay-heavy seller prices above its rivals; it needs a per-seller wage factor that today's indexes do not provide. Proposed split for the owner: (1) per-seller price pass-through of its own payroll per sale; (2) the monthly re-split by price and capacity (the Oct 16 move, rebuilt after 1); (3) location-based share once `world-dwelling-locations` lands. Nothing here waits on the owner: item 1 can be built next and its owner-decision stopgap registered.
