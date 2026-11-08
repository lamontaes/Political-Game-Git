---
id: economy-price-index-falls-in-small-place
title: "A small place's mean price index falls 6% in three years while its firms grow: find which engine moves it"
area: world
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In a random small place (drawPlace('nov8a','biz') in the Jobs session's scratchpad probe, played 3 years on main 03b2d7f87c) the mean of price over anchorPrice across open firms goes 1.000, 0.986, 0.957, 0.940 at years 0 to 3, while firms ever opened go 30, 46, 54, 58 and open firms 30, 45, 50, 50. A firm's price follows generalPriceFactor and wagePriceFactor from the macro conditions plus its own costs and demand (finance-state.ts review); a steady fall may be the national price index falling, entrants' competition, or both, and has not been separated.

**Rules.** Prices and the national price level are Money's files. Find the owner of the number, fix it there, no second price engine, no dice, every number sourced or registered. Prove with the macro priceIndex, the firms' prices and entrants by record id.

**Done when.** In a played 3 years in the same place and a place drawn from all 56 (name the place and seed), the mean price index and the macro priceIndex are printed by year with the entrants' count; the fall is explained by named causes (macro inflation, entry competition, costs) by record id, and a fall that no cause explains is fixed at its engine.

**Files.** src/core2/finance-state.ts, src/core2/modules/macro.ts, src/core2/modules/business.ts

**Notes.** Jobs and economy, Nov 8. Not started. Found while looking for a jobs, prices or rents defect; lead is money because prices are its files.
