---
id: world-opening-jobs-vs-lodes-commuting
title: "Towns where most employed residents work outside their county open with no unplaced workers (Elk Creek, Nebraska 74 percent; Chimney Hill, Vermont 41 percent)"
area: world
kind: bug
priority: 2
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-ag
pr:
blocked-on: world-commuters-in-opening
source: added with npm run pool -- add
claimed-at: 2026-10-20T09:16:26.942Z
---

**What.** The opening places employed residents into the town's own employers until it reaches the ACS employment target for the residents (employmentTarget in src/core2/opening-employment.ts), so a town whose firms are numerous enough places everyone and opens with no unplaced workers, even where LEHD LODES says most residents work outside the place (Elk Creek, Nebraska about 74 percent, Chimney Hill, Vermont about 41 percent). The per-place shares now exist as sourced data in src/core2/commuting-shares.ts (commutingSharesOf gives liveWorkShare and workInShare, ESTIMATED from the national average where a place has no row). Limit how many employed residents the opening places in town firms to the target times liveWorkShare, and leave the rest as workers employed elsewhere, so the unplaced-worker income in src/core2/residents.ts pays them from outside the town and they spend the wage in town.

**Rules.** One rule, all 56 places: the shares come from the place's row in the LODES data, with the national average marked ESTIMATED where a territory has none, and no place is named in code. No dice: who commutes out follows each resident's job and the town's firms, never a roll; the totals only check against LODES. One model, two tiers: counted groups take the same live-work share as full people, times their weight. An effect is a read: the town's firms, the unplaced-wage flow and the household budgets must read the commuter split, and the cash journal balances. Estimate, never UNKNOWN: a place with no LODES row starts from the national live-work share and says so.

**Done when.** A test in src/core2/opening-employment.test.ts draws a place from all 56 with buildBenchWorld on a seed the builder did not choose, and shows the share of employed residents placed in town jobs is within 10 points of the place's liveWorkShare, naming the place, seed and the unplaced-wages record id the residents module pays. A one-year run of that played world keeps the journal balanced, and it passes for a high-commute town (such as Elk Creek, Nebraska) and a low-commute town drawn the same way.

**Files.** src/core2/opening-employment.ts, src/core2/commuting-shares.ts, src/core2/residents.ts, src/core2/opening-employment.test.ts

**Notes.** Oct 20 (pool feeder): spec written; the blocker world-commute-flow-data is done and commuting-shares.ts exists but nothing outside its own test reads commutingSharesOf yet, so this item is the first read. Jobs in town held by people who live outside (workInShare) is the other half; add it as its own item if the firms' hiring needs it.
