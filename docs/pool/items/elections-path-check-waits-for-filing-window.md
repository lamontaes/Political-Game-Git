---
id: elections-path-check-waits-for-filing-window
title: "path-check waits for filing to open, so it finds the player's race in every fixed town"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer run of Lane 1 path 2 on main fb000259ca: GOLDEN_PATH_SEED=<replay> GOLDEN_PATH_PLACE_KEY=<key> node --import tsx src/bench/path-check.ts in all eight fixed towns (Haleyville 0132704 ab5f58e9be125c95, Murray 3133425 1d3f0e18ca4ba7e5, Meadow Lakes 0247735 f835dd278d7312a1, Brookside 1009850 4d50e1f88df997f9, Storrs 0973980 storrs-1, Washington 1150000 dc-closures-a, Cabo Rojo 7209861 f857db7436bf7449, Santa Rita territory:GU:santa-rita 6f539fcfdf6d96f9-5) prints 'steps reached none; no contest the player can enter' and exits 1 in each, its day ending between January 28 and August 15, 2025. In the browser on the same main, a New Game in Storrs offers the Selectman race from June 10, 2025 and in Murray the council race from June 2, 2026: filing now opens on a set day (#7168), and path-check gives up before it does. Path 2's measurement (holders' share, holders losing, a first-timer winning within three tries) has no working run on main; scripts/core2-year/incumbency-totals.ts, named on the lane page, is not on main either.

**Rules.** One engine per mechanic: path-check plays the routes the screens call and waits the way the Week control does (start-life.mjs's fileWhenFilingOpens is the browser form). Never skip a town that has no race yet; report when its first race opens. One rule, all 56 places.

**Done when.** path-check reaches election night in Storrs, Connecticut at storrs-1 and Murray, Nebraska at 1d3f0e18ca4ba7e5 on main, naming the race and its filing day, and in each of the other six fixed towns either does the same or names the first race date it waited for; a test fails when path-check stops before a filing window opens.

**Files.** src/bench/path-check.ts, src/bench/start-life.mjs

**Notes.** TODO
