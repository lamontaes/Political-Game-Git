---
id: office-stopgap-office-day-state-missing-core-api
title: "Stopgaps in office-day-state (missing-core-api): 1 open"
area: office
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/political-game-pool-l9cym2-h
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/office-day-state.ts, kind missing-core-api"
claimed-at: 2026-10-19T23:08:56.971Z
---

**What.** Replace or clear the 1 open missing-core-api stopgap row(s) in src/core2/office-day-state.ts: SG-STATE-dev-seat-player. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/office-day-state.ts

**Notes.** First row: Dev mode's custom start as a sitting state officeholder ends the seat's serving term and writes the player's term into the offices engine's table directly, keeping the previous holder's party; it is not reached in ordina
