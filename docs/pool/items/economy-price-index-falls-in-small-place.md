---
id: economy-price-index-falls-in-small-place
title: "A small place's mean price index falls 6% in three years while its firms grow: find which engine moves it"
area: world
kind: bug
priority: 3
size: M
status: open
standard: 2
lead: money
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** In a random small place (drawPlace('nov8a','biz') in the Jobs session's scratchpad probe, played 3 years on main 03b2d7f87c) the mean of price over anchorPrice across open firms goes 1.000, 0.986, 0.957, 0.940 at years 0 to 3, while firms ever opened go 30, 46, 54, 58 and open firms 30, 45, 50, 50. A firm's price follows generalPriceFactor and wagePriceFactor from the macro conditions plus its own costs and demand. A steady fall may be the national price index falling, entrants' competition, or both, and has not been separated. Seen: the prices the player pays and the Metrics price index in a small town, which fall 6% in three years for no known reason.

**Cause.** Needs cause. Measured: the probe above (a small place played 3 years on main 03b2d7f87c, mean price over anchorPrice 1.000, 0.986, 0.957, 0.940); the probe lives in the Jobs session's scratchpad, not the repo. Candidates named but not read: the national price index, entrants' competition, or both (`src/core2/finance-state.ts`, `src/core2/modules/macro.ts`, `src/core2/modules/business.ts`).

**Fix.** None until the cause is found.

**Time box.** 5 hours for one Sonnet session, to separate the causes and then fix the engine that owns the number.

**Rules.** Prices and the national price level are Money's files. Find the owner of the number and fix it there: one engine per mechanic, no second price engine. No dice. Every number sourced or registered. Prove with the macro priceIndex, the firms' prices and entrants by record id.

**Done when.** A second session plays 3 years in a drawn place (the same probe's place if it can be found, and one other place from all 56; names and seeds written down) and finds the mean firm price index and the macro priceIndex printed by year with the entrants' count. The fall is explained by named causes (macro inflation, entry competition, costs) by record id, and a fall that no cause explains is fixed at its engine.

**Waits on.** Nothing.

**Files.** src/core2/finance-state.ts, src/core2/modules/macro.ts, src/core2/modules/business.ts

**Notes.** Jobs and economy, Nov 8. Not started. Found while looking for a jobs, prices or rents defect; lead is money because prices are its files.
