---
id: web-reach-environment
title: "Every environment, disasters, farms and water link in the outcome web reaches a person's records or names why not"
area: core
kind: wiring
priority: 1
size: M
status: in-pr
claimed-by: claude/web-reach-environment
pr: #5915
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at: 2026-10-24T09:03:57.360Z
---

**What.** The outcome web holds 221 researched links; after the merged engine families about 109 reach an engine's records and 112 do not, each listed with its reason and stopgap in `src/core2/data/outcome-web/unwired.json` (written by `scripts/outcome-web/write-unwired.ts`; on the capstone branch until it merges). This item is the environment, disasters, farms and water family: 13 unwired links, 11 where the owning engine does not read the factor and 2 where nothing keeps the outcome. Their outcomes: env.particulates, env.emissions, env.litter, env.container-recycling-pct, disaster.damage, disaster.flood-damage, farmland.developed-acres, farmland.value-per-acre and water.irrigation-groundwater. Make the engine that owns each outcome multiply its own rates by the link's effect per person, so real records move, or give the link one specific reason it cannot.

**Rules.** An effect is a read, not a record: a link counts only when the owning engine reads the factor at the moment it decides or pays. One model, two tiers: full and counted people take the same factor by the same rule, with researched moderators. Research before building: size, lag and spread come from the link's citation, never a tuned guess.

**Done when.** `src/core2/outcome-web-twins.test.ts` in a drawn place (seed named) shows each link in this family moving a record kind outside the web's own tables after its lag, and `scripts/outcome-web/effect-matrix.ts` on a played year of `buildBenchWorld` grades it as reaching, with one record id per link in the PR body; any link that stays unwired keeps a specific stopgap row in the unwired list.

**Files.** src/core2/modules/disasters.ts, src/core2/outcome-web-reach.ts

**Notes.** Split Oct 24 by the CTO from the effect-web audit (order `docs/work-orders/lead-effects-2026-10-24.md`). Counts from the capstone branch's unwired list on Oct 23 (effect-web-integration). Most environment links reach people only through health; follow each to the health engine or a price, not a new measure nobody reads. A PR names this item on line 1 and `Lead: effects` in its body.
