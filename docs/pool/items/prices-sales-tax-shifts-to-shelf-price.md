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
after:
blocked-on:
standard: 2
model: opus
effort: high
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The game's prices are tax-inclusive: raising or cutting a sales tax, or exempting groceries, changes only what sellers remit, and a buyer's cash and the shelf price do not move. The laws lead's prices helper found in Colome, South Dakota (Oct 25, branch claude/laws-nine-links-prices) that the grocery exemption showed in what 3 of 6 grocery sellers remitted and in no buyer's spending. Research on sales tax incidence finds the tax largely shifted to buyers (Poterba 1996 and Besley and Rosen 1999 are the usual sources). Calibrate how much of a sales tax change reaches the shelf price from those sources, with the rest kept by or charged to sellers, in a sourced pass-through parameter with its spread. Seen: a bill card's line for who a sales tax change reached, in dollars, and the shelf price and a buyer's spending.

**Cause.** Found in code: `syncSalesTax` in src/core2/modules/budgets.ts (line 1039) sets each level's share of a price as rate / (100 + total) and leaves the price itself alone, so a tax change moves only what sellers remit.

**Fix.** Add a sourced pass-through parameter (Poterba 1996, Besley and Rosen 1999, fetched and quoted, and any study of grocery exemptions) so a sales tax change moves the shelf price buyers pay, with sellers remitting the full change, replacing the tax-inclusive split in `syncSalesTax` (no second price path beside it).

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: fetch and quote the sources; research calibrates the share and its spread and never decides one actor's outcome. Replace, never layer: the tax-inclusive split is changed, not run beside a second price path. One rule, all 56 places. Every number lives in a parameter table tagged SOURCED or ESTIMATED.

**Done when.** A second session (not the builder) plays a year of `buildBenchWorld` in a drawn place (place and seed named) with the grocery exemption enacted and a control world without it: named buyers' grocery spending falls by the pass-through share of the exempted tax, named by journal id, and the sellers' remittances fall by the full exempted tax. The parameter is tagged with its quotes. src/core2/law-wiring-prices.test.ts and src/core2/prices-web.test.ts pass.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/purchase-tax.ts, src/core2/data/laws/reach-group-b-parameters.json, src/core2/law-wiring-prices.test.ts, src/core2/prices-web.test.ts

**On screen.** Nothing yet: it would show on Politics, then Budgets, and nothing there reads it.

**Notes.** Laws lead, Oct 25. Until this lands, the grocery exemption's lawApplied rows record buyers as reached with no amount and sellers with the remittance they kept (prices family PR #5986).
