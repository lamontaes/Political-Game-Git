# Confirmer run: Lane 1, Path 2 (a real contest)

Run Nov 4, 2026 on main fb000259ca by a session that built none of it. Path 2 is a measurement across the eight fixed towns: holders near 58% of a two-way vote, holders losing some contested races, more open and contested seats, and a hard-working first-timer winning within three tries in most towns.

**Result: fail; it can't be run on main.**

- `src/bench/path-check.ts` (the headless golden path, which stands the player in up to three races) was run in all eight towns at their replay numbers (`pathcheck8.sh`, `path-check-eight-towns.log.txt`). Every town printed "steps reached none ... no contest the player can enter" and exited 1, its day ending between January 28 and August 15, 2025. The browser shows races these runs never reach: Storrs's Selectman race opens June 10, 2025, Murray's council race June 2, 2026. path-check gives up before filing opens.
- `scripts/core2-year/incumbency-totals.ts`, the totals script the lane page names, is not on main.
- What the browser replays saw (one race each, not a measure): Storrs, the holder Avery Cooper beat the player 552 to 223 (71% of the two-way vote); Murray, a three-way open seat the player won from New Game on the first try; Haleyville, no council race until 2028.

Filed: `elections-path-check-waits-for-filing-window`. The rest of the path waits on Lane 1's units 1b and 5, which its state file shows still measuring and claimed.
