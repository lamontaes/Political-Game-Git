---
id: world-stopgap-housing-construction-faked-mechanic
title: "Stopgaps in housing-construction (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 3
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-counted-renters-buy
lead: m0-m2
model: sonnet
effort: medium
root: design-one-model-two-tiers
milestone:
source: "src/core2/data/stopgaps.json, src/core2/housing-construction.ts, kind faked-mechanic"
claimed-at: 2026-10-19T23:08:37.700Z
size: M
checked: fable 2026-11-10
---

**What.** New houses sell only to full renter households, and counted renters and households moving in never buy one, so unsold houses pile up. A counted renter's rent is part of a merged group flow and a counted mortgage is the same shape, so a counted buy needs the group's down payment drawn from its fund, the rent part ended, a mortgage part added and a dwelling record for the group. That counted-tier step is the item world-counted-renters-buy. Let counted renters and arriving households buy new houses under the full-household affordability rule, using that mechanic, and clear the row.

**Cause.** Measured: Manchester Center, Vermont (seed a1, buildBenchWorld, 365 days from the game start): 4 projects started, 0 purchases ever, and 3 unsold houses at day 365; the only buyers are full renter households with a lease (`buyHomes` in src/core2/modules/housing.ts). The marker is `takeNewHome` in src/core2/housing-construction.ts (line 198, SG-WORLD-housing-new-home-buyers).

**Fix.** Let counted renters and arriving households buy new houses under the full-household affordability rule, using the counted-renters-buy mechanic, and resolve SG-WORLD-housing-new-home-buyers.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the town's housing numbers, where new houses sit unsold because only full renter households ever buy one.

**Rules.** One model, two tiers: counted renters and arriving households buy under the same affordability rule as full ones. Sliding scales and causes: buying follows income, savings and price. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** A second session, on main in a drawn place (place and seed named in the PR body) and in Manchester Center, Vermont with seed a1, plays a year in dev mode and sees a new house bought by a counted renter or an arriving household, with the sale on the closing record and the house and household record ids, watching new houses sell to families who moved in. The test in src/core2/housing-construction.test.ts and the stopgap tripwire test show the row resolved.

**Waits on.** world-counted-renters-buy.

**Files.** src/core2/housing-construction.ts, src/core2/modules/housing.ts, src/core2/data/stopgaps/world.json, src/core2/housing-construction.test.ts

**Notes.** First row: New houses sell only to full renter households; counted renters and households moving in never buy one, so unsold houses pile up.

Measured Oct 19 (claude, claude/political-game-pool-l9cym2-f), not built. In Manchester Center, Vermont (seed a1, `buildBenchWorld`, 365 days from the game start) the new-house stock reads 1 for sale at day 180 and 3 at day 365 with 4 projects started and 0 purchases ever (`housing/purchases` empty), so the stopgap's pile-up is real, though the starts slow as the stock grows (`housing-construction.ts` line 229). The only buyers are full renter households with a lease (`buyHomes` in `modules/housing.ts`). Counted renters have no purchase path: their rent is a part of a merged group flow (`residents-economy.ts`, `endFlowPart`/`setResidentFlowAmount`), and a counted mortgage is the same merged-flow shape, so a counted buy needs the group's down payment drawn from its fund (`counted-money.ts`), the rent part ended, a mortgage part added, and a dwelling record for the group; nothing builds those today. That is a counted-tier housing step of its own; split it as `world-counted-renters-buy` before building.

Oct 20: Switched from blocked to the automatic after: gate on world-counted-renters-buy, so it opens by itself the moment those items are done.

Deferred Oct 25: nothing on screen reads it yet.
