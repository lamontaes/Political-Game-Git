---
id: world-regional-pay-barely-diverges
title: "M1-03: states' pay moves almost in lockstep: two drawn states differ by 0.01 points in a year against a real spread of about 7.8"
area: world
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/regional-pay
pr: #6447
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T23:56:12.505Z
---

**What.** The new M1-03 check (src/core2/tooling/m1-03-check.ts) in Cloud Creek, Oklahoma (place key 4015625, seed 9a529f875359eafe9ad32ea1c2e54df576e017ca2ffc0a32a86d7547bd23626f) drew Puerto Rico and North Carolina: their pay rose 2.893 and 2.882 percent over the year. The real December-over-December spread of state pay changes is -0.878 to 6.915 percent (CES state private average hourly earnings, data/research/regional/series/stats.json). src/core2/regional-model.ts:260 moves each region's pay with the nation's plus only a small unemployment-gap term, so states barely diverge.

**Rules.** No dice: a state's pay moves from its own conditions (its jobs, its industries, its prices), never a random draw. One rule, all 56 places: the rule reads place data only.

**Done when.** The M1-03 command run in three places drawn from all 56 shows the two drawn states' yearly pay changes differing as the real spread does and each inside it, named with place and seed in the PR body; a test fails when every state's pay moves with the nation alone. **On screen.** Nothing yet: it would show on Jobs and study, and News, and nothing there reads it.

**Files.** src/core2/regional-model.ts, src/core2/tooling/m1-03-check.ts

**Notes.** Found by the M0-M2 lead's M1 helper, Oct 24. Blocks roadmap M1-03.
