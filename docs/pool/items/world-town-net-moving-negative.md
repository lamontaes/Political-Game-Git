---
id: world-town-net-moving-negative
title: "A played town loses 3.6 to 4.7 percent of its residents a year to net moving; its state's net migration is within about 1 percent"
area: world
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/town-net-moving
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T14:15:00.177Z
---

**What.** `scripts/core2-year/census-components-check.ts` (new, PR for core-research-data-unread-triage) plays a year in a drawn place and sets the town's births, deaths and net moving per 1,000 residents beside its state's Census Vintage 2025 components (`data/research/renewal/moves`). Net moving is -43.3, -37.2 and -36.2 per 1,000 in Stuart, Virginia (seed cc1), Barclay, Maryland (cc3) and Dearborn, Missouri (cc4), and +5.3 in Nettie, West Virginia (cc2, 189 people); the states' net domestic migration is +0.9, -1.9, +2.2 and +3.6 and net international +5.8, +3.3, +2.0 and +0.1. A town is not its state, but three of four towns losing 3.6 to 4.3 percent a year, when the states move by about 1 percent, is a reproducible shortfall. With the pending town-moves fix (#4877) merged the result is the same (-46.8, -5.3, -37.2, -36.2).

`scripts/core2-year/moves-flow-balance.ts` (same PR) splits the counted people moved in a year: Stuart, Virginia: out 96 to other states and 356 within the state, in 75 from other states and 270 from the rest of the state (arrivals 78 and 76 percent of departures), and 25 full people left with no full arrivals; Barclay, Maryland: out 38 and in 23 (61 percent); Dearborn, Missouri: out 105 and in 69 (66 percent). The in-state flow should balance by construction (the town's people leave for the rest of the state and the rest of the state's movers arrive at the town's share of the counted people), yet arrivals are only 61 to 78 percent of departures, so the cause is in how arrivals are drawn or how departures are weighed, not in a state's pull. Suspects to check in `src/core2/modules/counted-moves.ts`: `toCounted` share against `placePeople` (the town's share of the state), `arrivals()` consuming `size` (the whole household, children included) from a due count made of band rates, the `holdNorm` that makes departures average the ACS rate, and that full people only leave (`moves.ts` departures) and never arrive.

**Rules.** One model, two tiers; no dice; real rates check totals only. A town's net moving over a year sits within about a percent of its state's, with the cause named by move record ids.

**Done when.** `census-components-check.ts` on four drawn places (name them and the seeds) shows net moving per 1,000 within 15 of the state's net domestic plus international, and `moves-flow-balance.ts` shows arrivals within 15 percent of departures in-state.

**Files.** src/core2/modules/counted-moves.ts, src/core2/modules/moves.ts

**Notes.** Found Oct 17 by comparing a played year with the Census components the repository already held, unread.

Narrowed Oct 17 (claude), same seeds with the counted-drift engine deleted (#4889) and the census check corrected to count the full people's births and deaths: births 13.5, 5.3, 5.3 and 7.6 per 1,000 against the states' 13.3, 9.6, 10.4 and 10.9 (the first run had undercounted them), net moving -33.4, 0.0, -37.2 and -38.1. Two causes are visible in the code and the counters. (1) On main the counted-drift engine still runs beside the counted-moves engine, so people move twice: in Stuart, Virginia the moves engine expected 221 people to leave in a year (counters in `counted-moves.ts`: 130 within the state, 91 to other states) and 452 left; with #4889 merged, 221 left. Merging #4889 removes it. (2) With the double move gone the counted flows across all counted places balance (Stuart: 221 out, 349 in, arrivals from other states 77 against 37 leaving), yet the town itself still loses 33 per 1,000: `arrivals()` in `counted-moves.ts` seats a newcomer household "where the household it resembles lives" (`template.placeId`), which can be any counted place in the world, not the town the arrival share was computed for. Seat arrivals in proportion to the places' share of the counted people they were computed from, and check with `moves-flow-balance.ts` per place. The census check and flow balance scripts are on `claude/research-data-roadmap-triage`.
