---
id: web-reach-crime-justice
title: "Every crime and justice link in the outcome web reaches a person's records or names why not"
area: core
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: CTO weekend leads, Oct 24; copied unchanged from cto/leads-2026-10-24 at 7eabe893e2b27151c39c5d853a7c74ed33bafca6
---

**What.** The outcome web holds 221 researched links; after the merged engine families about 109 reach an engine's records and 112 do not, each listed with its reason and stopgap in `src/core2/data/outcome-web/unwired.json` (written by `scripts/outcome-web/write-unwired.ts`; on the capstone branch until it merges). This item is the crime and justice family: 17 unwired links, 7 where the owning engine does not read the factor and 10 where nothing keeps the outcome. Their outcomes: crime.all, crime.larceny, crime.vandalism, crime.firearm-homicide, crime.reoffense, crime.rate-index, justice.conviction, justice.low-level-arrests, justice.pretrial-detained, justice.incarcerated-per-100k and the rest. Make the engine that owns each outcome multiply its own rates by the link's effect per person, so real records move, or give the link one specific reason it cannot.

**Rules.** An effect is a read, not a record: a link counts only when the owning engine reads the factor at the moment it decides or pays. One model, two tiers: full and counted people take the same factor by the same rule, with researched moderators. Research before building: size, lag and spread come from the link's citation, never a tuned guess.

**Done when.** `src/core2/outcome-web-twins.test.ts` in a drawn place (seed named) shows each link in this family moving a record kind outside the web's own tables after its lag, and `scripts/outcome-web/effect-matrix.ts` on a played year of `buildBenchWorld` grades it as reaching, with one record id per link in the PR body; any link that stays unwired keeps a specific stopgap row in the unwired list.

**Files.** src/core2/modules/crime.ts, src/core2/outcome-web-reach.ts

**Notes.** Split Oct 24 by the CTO from the effect-web audit (order `docs/work-orders/lead-effects-2026-10-24.md`). Counts from the capstone branch's unwired list on Oct 23 (effect-web-integration). Monthly victimization records exist (effect-web-crime merged) and the justice law family added arrests, courts and jail; read the web factor there, never in a second crime engine. A PR names this item on line 1 and `Lead: effects` in its body.

Sent back 2026-10-24 from PR #5892 (branch claude/web-reach-crime-justice): the Done-when played-year effect-matrix row explicitly says its twins were not run here and defers them to the capstone; supply the played-year grades and per-link external record IDs on this branch; finish on that branch, merge main into it first.
