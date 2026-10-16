---
id: world-customers-move-between-sellers
title: "Customers move between sellers month by month, so shrinking firms lay people off"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A seller's customers change only when a business opens or closes (`splitMarketDemand` runs at entry only), so layoffs run at 0.04% of jobs a month against 1.4% in JOLTS. Re-split each residents' purchase share monthly by sellers' prices and capacity, so a firm that loses customers shrinks and lays people off.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of a drawn town, layoffs at shrinking firms follow their lost customers, by business and purchase-share record ids, and the layoff rate is checked against JOLTS.

**Files.** src/core2/modules/residents.ts, src/core2/modules/business.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.
