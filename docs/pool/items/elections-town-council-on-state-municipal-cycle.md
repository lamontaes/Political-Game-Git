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
after:
lead: elections
standard: 2
model: opus
effort: high
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** A town's council is not elected in the years its state's municipal law sets, so a New Game never reaches the town's own council race. Confirmer replay of Lane 1 path 1 on main c3a29bb02d, New Game in Haleyville, Alabama (0132704, replay ab5f58e9be125c95), player born 1985, played week by week in the browser: the town's five at-large council seats and its mayor show as elected 2024-07-21 with terms to 2028-09-19, so no council race is on any screen through February 2026. The state's town elections were held in August 2025, so a player starting January 20, 2025 should be offered the council race that summer. Instead the first filing that opens (November 24, 2025) is five state and federal races at one office named "State party chair; Secretary of State", and the Campaigns ballot for November 3, 2026 lists only the 13 county offices. Seen: the town's own council race appears in the years the state's law sets, on the Government and Campaigns screens (golden path).

**Cause.** Found in code: `src/core2/elections-calendar.ts` `municipal` (line 387) and the open default `SG-GOV-term-end-estimate` (row in `src/core2/data/stopgaps/gov.json`; markers in `src/core2/modules/offices.ts` and `src/core2/elections-calendar.ts`) set a town office's term end from a state-wide default estimate; the source data is `data/municipal-elections/92O-national-state-baseline.json`.

**Fix.** Read each town office's term end from its state's municipal election law or the charter row, so Haleyville, Alabama's 2025 council race is offered, replacing the default in the same change. Where a town's year is not sourced, use the state's general rule with a per-world spread, marked ESTIMATED.

**Time box.** 8 hours for one opus session.

**Rules.** One rule, all 56 places: the election year of a town office comes from the state's municipal election law or the charter in data, never a state or town named in logic. Estimate, never UNKNOWN: where a town's year is not sourced, the state's general rule with a per-world spread, marked estimated. One engine per mechanic: the one elections calendar (`src/core2/elections-calendar.ts`) and the offices engine's term ends read it. Replace, never layer: the default that sets these terms is replaced, not wrapped.

**Done when.** A second session replays New Game in Haleyville, Alabama at replay ab5f58e9be125c95 on main and sees, on the Campaigns screen in 2025, the town's council race with its filing dates, offered only while its filing is open. The same replay in two places drawn from all 56 whose towns vote in odd years (place and seed named) shows each town's council race in its real year. A test fails when the town's election year goes back to the default. The Campaigns ballot lists every race the player may file for in that election, state and federal ones included, or the PR says why not.

**Waits on.** elections-town-election-day-comes-from-the-place (same calendar function).

**Files.** src/core2/elections-calendar.ts, src/core2/modules/offices.ts, data/municipal-elections/92O-national-state-baseline.json, src/core2/data/stopgaps/gov.json, src/bench/government.ts

**Notes.** TODO
