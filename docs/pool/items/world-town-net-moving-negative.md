---
id: world-town-net-moving-negative
title: "A played town loses 3.6 to 4.7 percent of its residents a year to net moving; its state's net migration is within about 1 percent"
area: world
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/town-net-moving
pr: 4927
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T14:15:00.177Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Built in part Oct 17 (claude, PR 4927, stacked on #4877 and best read with #4889 merged): `arrivals()` in `counted-moves.ts` now (1) rounds a newcomer household to the nearest, as departures are, where it rounded down and lost the unreached part of every origin and band bucket for a year; (2) owes newcomers to each counted place by its share of the modeled people and seats each household in the place most owed (`rt.owed`), where it seated them in whatever place the household it resembled lived in; and (3) counts the full people who live in a counted place in that share, since they leave at the same rates and nobody replaced them. Net moving per 1,000 in the four drawn towns went from -43.3, 5.3 (corrected count 0.0), -37.2 and -36.2 (main, with the drift engine still moving people twice) to -13.5, -10.6, -16.0 and -11.4 (with #4889 and #4877 merged). Still short of the states' roughly +1 to +6 by about 1.5 percent a year; the next suspects are the first-year start-up (every bucket begins empty) and the age structure of the towns' leavers against the state's mover rates.
