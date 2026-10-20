---
id: core-stopgap-world-races-missing-data
title: "Stopgaps in world-races (missing-data): 2 open"
area: core
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/world-races-delegate
pr: #5304
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/world-races.ts, kind missing-data"
claimed-at: 2026-10-19T23:46:51.395Z
---

**What.** Replace or clear the 2 open missing-data stopgap row(s) in src/core2/modules/world-races.ts: SG-GOV-world-race-lean, SG-GOV-delegate-race-size. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/world-races.ts

**Notes.** First row: A race the town doesn't vote in is counted on the counted residents' engine at a coarser level (a House district's, the state's counties', a legislative district's eligible voters, voting as the town's counted residents

Oct 20, 2026 (research left for the session on claude/world-races-delegate, not built here): the 2024 delegate race votes cast found by search, with their quality. Puerto Rico: Hernández 530,540 at 43.48 percent, so about 1,220,000 cast (derived, not a reported total; the State Commission of Elections certifies the exact count). Guam: Moylan 15,422 at 52.69 percent and Cruz 13,703, so about 29,300 (derived). U.S. Virgin Islands: 14,167 votes cast for candidates in the certified count (Plaskett 10,397, Smith 2,323, Pickard 1,348, write-ins 99; vivote.gov). American Samoa: Radewagen 7,394 at 74.78 percent and Kuaea 1,840, so about 9,900 (derived). Northern Mariana Islands: 12,225 votes cast (King-Hinds 4,931; unofficial results). The wiring point is `racePlaces` in `src/core2/modules/world-races.ts`: `statePlaces(usps, eligible)` already takes a territory's eligible voters; size it as votes cast over the state or national CPS turnout (`cpsTurnout`) and set `votes2024` to the votes cast, then drop `api.stopgap("SG-GOV-delegate-race-size")`. Read each commission's certified results before calling the row resolved.
