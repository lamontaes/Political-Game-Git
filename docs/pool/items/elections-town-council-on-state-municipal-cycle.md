---
id: elections-town-council-on-state-municipal-cycle
title: "A town's council is elected in the years its state's municipal law sets, so a New Game reaches the town's own council race"
area: elections
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer replay of Lane 1 path 1 on main c3a29bb02d, New Game in Haleyville, Alabama (0132704, replay ab5f58e9be125c95), player born 1985, played week by week in the browser: the town's five at-large council seats and its mayor show as elected 2024-07-21 with terms to 2028-09-19, so no council race is on any screen through February 2026. The state's town elections were held in August 2025 (the state moved them from 2024 to 2025), so a player starting January 20, 2025 should be offered the council race that summer. Instead the first filing that opens (November 24, 2025, week 44) is five state and federal races at once (U.S. Senator, U.S. Representative, Governor, State Senator, State Representative) at one office named 'State party chair; Secretary of State', and the Campaigns ballot for November 3, 2026 lists only the 13 county offices, none of those five races. Path 1 asks for one race offered, an at-large council as one pooled race (elections-at-large-race-pooled), and the clerk and panel giving one date; in Haleyville the player never meets a council race to check.

**Rules.** One rule, all 56 places: the election year of a town office comes from the state's municipal election law or the charter in data, never a state or town named in logic. Estimate, never UNKNOWN: where a town's year is not sourced, the state's general rule with a per-world spread, marked estimated. One engine per mechanic: the one elections calendar (src/core2/elections-calendar.ts) and the offices engine's term ends read it. Replace, never layer: the default that sets these terms is replaced, not wrapped. Look first: SG-GOV-term-end-estimate (src/core2/data/stopgaps/gov.json) and research-offices-sourced-parameters hold the open default for town offices.

**Done when.** A fresh session replays New Game in Haleyville, Alabama at replay ab5f58e9be125c95 on main and sees, on the Campaigns screen in 2025, the town's council race with its filing dates, offered only while its filing is open; the same replay in two places drawn from all 56 whose towns vote in odd years (place and seed named) shows each town's council race in its real year; a test fails when the town's election year goes back to the default; the ballot on Campaigns lists every race the player may file for in that election, state and federal ones included, or the PR says why not.

**Files.** src/core2/elections-calendar.ts, src/core2/modules/offices.ts, data/municipal-elections/92O-national-state-baseline.json, src/core2/data/stopgaps/gov.json, src/bench/government.ts

**Notes.** TODO
