---
id: player-first-local-race
title: "Every place has a first local race: its council or the equivalent body, from data"
area: elections
kind: feature
priority: 1
size: S
status: claimed
claimed-by: governing/player-first-local-race
pr:
blocked-on:
source: governing lead, Oct 30 (owner ruling Oct 29 22:45)
lead: governing
claimed-at: 2026-10-30T02:02:17.783Z
---

**What.** The owner ruled Oct 29 that city council means whatever the equivalent is: the player's first local race is the place's own lawmaking body under whatever name it has. The filing rule listed only the council kind, so homes in towns governed by a township board and in unincorporated places had no local race at all. Per the CTO's ruling an unincorporated place is governed by its county, so its player runs for the county board and, where the county has one, the county executive.

**Rules.** One rule, all 56 places: the order (council, else township board, else county board; county executive only where no council, mayor or township board) is data rows in player-offices.json read by one rule, never a place name in code. Look before you ask: built from the Oct 29 22:45 ruling as written.

**Done when.** src/core2/player-first-race.test.ts passes over a seeded sample of localities from every one of the 56 state keys with the seed it prints: every place with local offices admits a local race, no council town admits a county or township seat, and a place with no local office is excused only when no government unit is found for it.

**Files.** src/core2/data/offices/player-offices.json, src/core2/modules/elections.ts, src/core2/player-first-race.test.ts, src/bench/government.ts

**Notes.** TODO
