---
id: web-reach-places-services
title: "Every housing, transit, roads, parks and family link in the outcome web reaches a person's records or names why not"
area: core
kind: wiring
priority: 1
size: M
status: in-pr
claimed-by: claude/web-reach-places-services
pr: #6042
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at: 2026-10-25T14:48:00.693Z
---

**What.** The outcome web holds 221 researched links; after the merged engine families about 109 reach an engine's records and 112 do not, each listed with its reason and stopgap in `src/core2/data/outcome-web/unwired.json` (written by `scripts/outcome-web/write-unwired.ts`; on the capstone branch until it merges). This item is the housing, transit, roads, parks and family family: 7 unwired links, 6 where the owning engine does not read the factor and 1 where nothing keeps the outcome. Their outcomes: housing.home-prices, housing.ac-share, transit.service-access, roads.poor-condition-pct, rail.intercity-ridership, parks.access-to-exercise and family.same-sex-marriages. Make the engine that owns each outcome multiply its own rates by the link's effect per person, so real records move, or give the link one specific reason it cannot.

**Rules.** An effect is a read, not a record: a link counts only when the owning engine reads the factor at the moment it decides or pays. One model, two tiers: full and counted people take the same factor by the same rule, with researched moderators. Research before building: size, lag and spread come from the link's citation, never a tuned guess.

**Done when.** `src/core2/outcome-web-twins.test.ts` in a drawn place (seed named) shows each link in this family moving a record kind outside the web's own tables after its lag, and `scripts/outcome-web/effect-matrix.ts` on a played year of `buildBenchWorld` grades it as reaching, with one record id per link in the PR body; any link that stays unwired keeps a specific stopgap row in the unwired list.

**Files.** src/core2/housing-prices.ts, src/core2/modules/place-prices.ts, src/core2/outcome-web-reach.ts

**Notes.** Split Oct 24 by the CTO from the effect-web audit (order `docs/work-orders/lead-effects-2026-10-24.md`). Counts from the capstone branch's unwired list on Oct 23 (effect-web-integration). Rents, building and prices already read the web (housing and prices families merged); these are the remaining links in those engines. A PR names this item on line 1 and `Lead: effects` in its body.

Oct 24, effects lead: of the six links still waiting on main, one looks wireable. `disaster-to-home-values` (size -0.052, lag 0) is marked cause-not-recorded, but the disasters engine replays FEMA's recorded incidents for each place, and the housing engine records home prices. It needs `disaster.severe` registered as an engine measure read from the disasters engine's records, and the housing engine's home price multiplied by the web's factor on `housing.home-prices`, proven in a played year in a place with a recorded severe disaster. The other five wait on a record or a size that does not exist: no engine records air conditioning use, exercise access or intercity rail riders, and the same-sex-marriage and AC links have no size. Before wiring: the research (Boustan, Kahn, Rhode and Yanguas 2020) calls a disaster severe by deaths, 25 or more in a county within a decade (the price effect holds from 20 to 100 deaths), and measures prices over that decade. The FEMA declarations the disasters engine replays carry damage, aid and damaged homes, not deaths, so mapping a declaration to "severe" and choosing how long the effect lasts is a research step (`researcher`) before the link can run.
