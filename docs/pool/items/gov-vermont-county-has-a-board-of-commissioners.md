---
id: gov-vermont-county-has-a-board-of-commissioners
title: "Vermont counties get a Board of Commissioners, commissioner races, an assessor, clerk and treasurer that do not exist"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "Playtester P3, Nov 13, 2026 (crew line #8928, comment 6844698994)"
checked:
claimed-at:
---

**What.** A Vermont town's Calendar and Politics list 'The Lamoille County Board of Commissioners meets' every two weeks ('took up no business'), and after the town election the player's ballot list shows Commissioner Districts 1 to 7, a county assessor, a county clerk and a county treasurer for November 2026. Vermont counties have no commission; they elect two assistant judges, a sheriff, a state's attorney and a probate judge. Seen: Politics, Government and Elections, and the Calendar, in a Vermont town.

**Cause.** Found in code: data/research/government/county-election-schedule-by-state.json marks VT countyGovernment 'full' with a body row, although the same row's citation says 'no county commission exists'; boardOffices in src/core2/offices-local.ts (line 215) then builds a county-board with its districts and the default row offices. Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89 (Playtester P3, Nov 13, 2026).

**Fix.** Make the Vermont row say what its citation says: the county's elected offices are the assistant judges, sheriff, state's attorney and probate judge, with no county board, and have boardOffices build no board where the row has none (the way it already does for CT and RI, marked 'none'). Check the other 'full' rows' citations for the same contradiction and list any found in the PR body.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the fix is in the data row, never a state named in code. Research before building: cite the source for each office kept.

**Done when.** A second session starts a new life on main in a drawn place in Vermont (drawn among that state's places, named with its seed) and finds no county board meeting in the Calendar and no county commissioner race in Elections; the county's offices shown are the ones Vermont elects, and a new test over every state's row finds no state whose citation denies a county board while the row builds one.

**Waits on.** Nothing.

**Files.** data/research/government/county-election-schedule-by-state.json, src/core2/offices-local.ts
