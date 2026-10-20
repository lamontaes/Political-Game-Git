---
id: world-stopgap-housing-construction-faked-mechanic
title: "Stopgaps in housing-construction (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: blocked
claimed-by: claude/housing-construction-stopgap
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/housing-construction.ts, kind faked-mechanic"
claimed-at: 2026-10-19T23:08:37.700Z
---

**What.** The stopgap row(s) SG-WORLD-housing-new-home-buyers in src/core2/housing-construction.ts mark a shortcut that is still live in play. Today new houses sell only to full renter households, and counted renters and households moving in never buy one, so unsold houses pile up. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** One model, two tiers: counted renters and arriving households buy under the same affordability rule as full ones. Sliding scales and causes: buying follows income, savings and price. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a new house is bought by a counted renter or an arriving household and the sale appears on the closing record, with the house and household record ids, named by record id. The test in src/core2/housing-construction.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: watch new houses sell to families who moved in.

**Files.** src/core2/housing-construction.ts, src/core2/data/stopgaps.json, src/core2/housing-construction.test.ts

**Notes.** First row: New houses sell only to full renter households; counted renters and households moving in never buy one, so unsold houses pile up.

Measured Oct 19 (claude, claude/political-game-pool-l9cym2-f), not built. In Manchester Center, Vermont (seed a1, `buildBenchWorld`, 365 days from the game start) the new-house stock reads 1 for sale at day 180 and 3 at day 365 with 4 projects started and 0 purchases ever (`housing/purchases` empty), so the stopgap's pile-up is real, though the starts slow as the stock grows (`housing-construction.ts` line 229). The only buyers are full renter households with a lease (`buyHomes` in `modules/housing.ts`). Counted renters have no purchase path: their rent is a part of a merged group flow (`residents-economy.ts`, `endFlowPart`/`setResidentFlowAmount`), and a counted mortgage is the same merged-flow shape, so a counted buy needs the group's down payment drawn from its fund (`counted-money.ts`), the rent part ended, a mortgage part added, and a dwelling record for the group; nothing builds those today. That is a counted-tier housing step of its own; split it as `world-counted-renters-buy` before building.
