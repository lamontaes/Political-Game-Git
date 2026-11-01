---
id: core-speed-prestart-history-insert
title: "Speed: past work reads past records by kind without scanning the whole history"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: speed/cut-prestart-history
pr: #7016
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T18:05:44.001Z
---

**What.** When the game fills in a person's work history, it reads every past record to find the town's economic conditions and the businesses founded before the start. That read grows with every person filled in before them. Keep those records by kind beside the history, kept by the same writers, so each fill-in reads only what it needs. Found in a profile of Storrs, Connecticut (key 0973980), the Every place nightly's slowest place (530 s, then 1,075 s a year).

**Rules.** Speed: a country's year runs under 120 seconds; never scan the whole world or a whole history again for each person or each step. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** In the played world (npm run speed:year, which builds it with buildBenchWorld), Ringgold, Louisiana over four years (seed long-1) and Storrs, Connecticut over one (key 0973980, seed storrs-1) keep dev mode's records proof identical to main in every table; src/core2/pre-start.test.ts passes with bookkeeping on, which runs the old write beside the new one and throws on any difference; and Storrs's first year runs faster, with the times in the PR body.

**Files.** src/core2/pre-start.ts

**Notes.** Lead: speed.
