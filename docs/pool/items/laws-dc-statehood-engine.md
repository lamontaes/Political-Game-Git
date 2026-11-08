---
id: laws-dc-statehood-engine
title: "Engine: statehood for D.C. changes its seats, electors and laws"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** us-federal-positions:territories-culture.statehood-for-dc is on the menu; no engine turns a district into a state with seats in the Senate and electors. Needs the offices, electoral college and law chain to read a statehood row.

**Rules.** One engine per mechanic: the bill's law row is read by the engine named here at the moment it decides or pays; no dice; every number SOURCED/ESTIMATED/TUNABLE; one rule for all 56 places.

**Done when.** Enacting the law gives the district its state-level chain, two Senate seats and its electors, shown by record id in a played world.

**Files.** src/core2/modules/offices.ts,src/core2/offices-state.ts

**Notes.** TODO
