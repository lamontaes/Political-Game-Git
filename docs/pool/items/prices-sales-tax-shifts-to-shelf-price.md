---
id: prices-sales-tax-shifts-to-shelf-price
title: "A sales tax change moves the shelf price buyers pay, by researched pass-through, not only what sellers remit"
area: world
lead: laws
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The game's prices are tax-inclusive: `syncSalesTax` in `src/core2/modules/budgets.ts` sets each level's share of a price as rate / (100 + total) and leaves the price itself alone. So raising or cutting a sales tax, or exempting groceries, changes only what sellers remit; a buyer's cash and the shelf price do not move. Found by the laws lead's prices helper (Oct 25, branch claude/laws-nine-links-prices): in Colome, South Dakota, the grocery exemption showed in what 3 of 6 grocery sellers remitted and in no buyer's spending. Research on sales tax incidence finds the tax largely shifted to buyers (Poterba 1996 and Besley and Rosen 1999 are the usual sources; fetch and quote them, and any study of grocery tax exemptions, before sizing). Calibrate how much of a sales tax change reaches the shelf price, from those sources, with the rest kept by or charged to sellers.

**Rules.** Research calibrates, never decides one actor's outcome; a pass-through share is a sourced parameter with its spread. One rule for all 56 places. Replace, never layer: the tax-inclusive split is changed, not run beside a second price path.

**Done when.** A sourced pass-through parameter (SOURCED or ESTIMATED, with quotes) sets how a sales tax change moves the price a buyer pays in the price engine. In a played year (`buildBenchWorld`, a drawn place and seed named) with the grocery exemption enacted, named buyers' grocery spending falls beside a control world by about that share of the exempted tax, named by journal id, and the sellers' remittances fall by the full exempted tax. `src/core2/law-wiring-prices.test.ts` and `src/core2/prices-web.test.ts` pass.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/purchase-tax.ts, src/core2/data/laws/reach-group-b-parameters.json

**Notes.** Laws lead, Oct 25. Until this lands, the grocery exemption's lawApplied rows record buyers as reached with no amount and sellers with the remittance they kept (prices family PR #5986).
