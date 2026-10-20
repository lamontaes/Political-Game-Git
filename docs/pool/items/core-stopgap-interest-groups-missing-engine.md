---
id: core-stopgap-interest-groups-missing-engine
title: "Stopgaps in interest-groups (missing-engine): 1 open"
area: core
kind: stopgap
priority: 3
status: done
claimed-by: claude/pool-lobbyist-owner
pr: #5267
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/interest-groups.ts, kind missing-engine"
claimed-at: 2026-10-19T23:27:30.009Z
---

**What.** Replace or clear the 1 open missing-engine stopgap row(s) in src/core2/modules/interest-groups.ts: SG-GOV-group-lobbyist-stand-in. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/interest-groups.ts

**Notes.** First row: An employers' group's lobbyist is the best-paid town resident working for the member business the bill costs most; businesses themselves decide to join and pay dues.
