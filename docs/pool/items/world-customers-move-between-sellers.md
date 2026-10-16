---
id: world-customers-move-between-sellers
title: "Customers move between sellers month by month, so shrinking firms lay people off"
area: world
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/customers-move-sellers
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T18:49:51.979Z
---

**What.** A seller's customers change only when a business opens or closes (`splitMarketDemand` runs at entry only), so layoffs run at 0.04% of jobs a month against 1.4% in JOLTS. Re-split each residents' purchase share monthly by sellers' prices and capacity, so a firm that loses customers shrinks and lays people off. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of a drawn town, layoffs at shrinking firms follow their lost customers, by business and purchase-share record ids, and the layoff rate is checked against JOLTS.

**Files.** src/core2/modules/residents.ts, src/core2/modules/business.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.
