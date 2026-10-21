---
id: office-stopgap-office-day-state-missing-core-api
title: "Stopgaps in office-day-state (missing-core-api): 1 open"
area: office
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5247
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/office-day-state.ts, kind missing-core-api"
claimed-at:
---

**What.** Replace or clear the 1 open missing-core-api stopgap row(s) in src/core2/office-day-state.ts: SG-STATE-dev-seat-player. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/office-day-state.ts

**Notes.** First row: Dev mode's custom start as a sitting state officeholder ends the seat's serving term and writes the player's term into the offices engine's table directly, keeping the previous holder's party; it is not reached in ordina
Sent back 2026-10-20 from PR #5247 (branch claude/pool-state-seat-person-2): Morning check failed because stopgap row SG-STATE-dev-seat-player was deleted from stopgaps.json instead of marked resolved; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5247 (branch claude/pool-state-seat-person-2): src/core2/data/stopgaps.json deletes SG-STATE-dev-seat-player, as the body also states. The merger rule forbids deleting registered stopgap rows: retain the row, mark it resolved, name seatPerson and its reader in the resolution, and remove only the obsolete code marker. Rerun changed-file checks after merging main.; finish on that branch, merge main into it first.
