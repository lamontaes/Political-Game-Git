---
id: laws-consolidated-county-local-body
title: "Places inside a consolidated city-county or a county with no government unit get no local body (Schofield Barracks, Hawaii)"
area: laws
kind: bug
priority: 2
size: M
status: done
claimed-by: laws/consolidated-county-body
pr: #7430
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-08T09:04:51.598Z
---

**What.** A place whose county has no county-government unit in the research (191 of 3,222 counties, among them Honolulu, Nashville-Davidson, Louisville-Jefferson, Denver and the Connecticut, Rhode Island and Massachusetts counties) gets no county body, and a place that is not itself a municipality gets no body at all. Checked Nov 8: Schofield Barracks, Hawaii (1569050) has the county in its law chain (county:15003) and no local office in the offices table; Union, New Hampshire (township-board and county), Gantt, South Carolina and Schurz, Nevada (county board) resolve correctly; Urban Honolulu and Nashville are form none, so even the seat has no body.

**Rules.** One rule for all 56 places: the body comes from place data (the Census of Governments' consolidated city-counties and each state's county-equivalent), never a named place. Follow the standing rules in AGENTS.md.

**Done when.** In three drawn places that sit in a consolidated city-county or a county with no government unit (named with seeds), the player's local government is the body that really governs it and its offices exist in the offices table; resolveLawInForce sends the place's local questions to that body.

**Files.** src/core2/gov-rules/place-slots.ts, src/core2/reference/government-units.ts, src/core2/modules/offices.ts, data/research/local-government

**Notes.** TODO
