---
id: world-customers-move-between-sellers
title: "Customers move between sellers month by month, so shrinking firms lay people off"
area: world
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/customers-move
pr: #5210
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:00:32.004Z
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
