---
id: pins-29-moves-from-the-world
title: "Who leaves a county, where they go and who arrives from abroad come from the world, not survey shares"
area: people
kind: feature
priority: 2
size: L
status: in-pr
standard: 2
claimed-by: claude/happy-bell-8rj52e-pins-29
pr: 9967
after:
blocked-on:
root: none
lead: play-first
model: opus
effort: medium
source: Pins lane, Nov 17 (the CTO's LIFT THE PINS family 29 on issue 9747; plan 6937525840)
---

**What.** Counted households left at a rate renormalized to a "typical" household and to a fixed hold, went to their home state at the CPS share of in-state moves, chose destinations from a fixed IRS table, and arrived from abroad at the ACS rate. Each pinned the count or the share in every world. Now the country tier's own leaving rate, the place's own conditions and each household's own pushes and holds set how many leave, the dues the world's own places hold set where they go, and the tier's own month brings arrivals from abroad. Seen: dev mode's Trace box opens a move row with the tier's rows it read.

**Cause.** Found in code: src/core2/modules/counted-moves.ts `accumulate` and `monthlyReview` renormalized to typical and read `countedMovesInStateShare`; the destination table `destinations.json` (deleted here) and an `abroadRate` set the rest.

**Fix.** Delete `holdNorm`, every `/typical`, the in-state share, the destinations table and the abroad rate. Leaving is the tier's rate times one fitted scale times the web times the place's conditions; the home state is one more destination at a fitted pull; each leaving record goes to the largest remaining due among its place's movers; arrivals come from the tier's month.

**Time box.** 8 hours.

**Rules.** No dice: each record goes to the largest remaining due, a deterministic order, and no seeded share picks a destination. One rule, all 56 places: dues are read for every state and territory the tier keeps, never a named one.

**Done when.** A second session plays a year at a drawn place with dev mode on, opens a move row in the Trace box and sees the tier rows it read; `src/core2/counted-moves-own-pace.test.ts` passes, and the in-state share by move records differs between two places with their dues.

**Waits on.** Nothing.

**Files.** src/core2/modules/counted-moves.ts, src/core2/modules/partnerships.ts, src/core2/modules/macro.ts, src/core2/counted-moves-own-pace.test.ts (new)
