---
id: laws-grocery-exemption-reaches-buyers
title: "The grocery sales-tax exemption lowers what households pay for food, so its food-insecurity link has something to carry"
area: laws
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/laws-grocery-exemption-buyers
pr: #6665
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T17:07:49.027Z
---

**What.** The sales tax engine (src/core2/modules/purchase-tax.ts) keeps prices tax-inclusive: a household's everyday budget buys the same whatever the tax, and the tax comes out of the seller's share. So a grocery exemption leaves buyers paying the same and only lets the seller remit less (the applied row records the spared tax for the seller and nothing for the buyer). The research link grocery-exemption-to-food-insecurity (Zheng et al. 2021, Food Policy 101) measures food insecurity falling when grocery prices drop, so in the game nothing a household eats changes and the link stays a ledger number (SG-WEB-unread-household-food-insecurity). The fix is a pass-through of the exempted tax into the price households pay at grocery sellers, sized from research on grocery tax pass-through, read where the everyday plan prices its sellers (priceFactor in the settle of src/core2/cost-of-living.ts).

**Rules.** Simulate it, don't ask (owner, Oct 24): the pass-through share is researched and calibrated, not typed. One engine per mechanic: the sales tax engine and the price review stay the one place a price is set; no second price path beside them. Research calibrates and never decides one actor's outcome.

**Done when.** In a drawn buildBenchWorld place in a state that taxes groceries, named by place key and seed, enacting the exemption lowers the price a named household pays at a grocery seller by the researched pass-through on the journal, a household short of its everyday plan in the control world buys more of it, the link grocery-exemption-to-food-insecurity is carried by these engines in links.json, and the law matrix grades the exemption's web link wired by record id.

**Files.** src/core2/modules/purchase-tax.ts,src/core2/cost-of-living.ts,data/research/outcome-web/links.json

**Notes.** TODO

Oct 29 (CTO): set done; PR #6665 merged (the done flip failed while branch protection refused the flip job's push).
