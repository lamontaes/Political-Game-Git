---
id: laws-federal-immigration-levels-engine
title: "Engine: admitted immigrants a year, so the immigration-levels bill reaches people"
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

**What.** The bill menu has the question us-federal-positions:immigration.admit-more-immigrants, but no engine admits people, so a law that raises or lowers immigration levels reaches nobody. Waits on an engine that adds or removes counted residents by place from an annual level (Dev Tester holds the immigration test, #7591).

**Rules.** One engine per mechanic: the bill's law row is read by the engine named here at the moment it decides or pays; no dice; every number SOURCED/ESTIMATED/TUNABLE; one rule for all 56 places.

**Done when.** A law row for the annual level is read by an engine that changes the counted population by place; a played-world year shows the count move by record id in a drawn place; the question's lawApplied rows name the groups reached.

**Files.** src/core2/modules/residents.ts,src/core2/data/laws/starting-law.json

**Notes.** TODO
