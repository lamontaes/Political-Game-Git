---
id: elections-stopgap-voting-missing-engine
title: "Stopgaps in voting (missing-engine): 1 open"
area: elections
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/who-runs-g08lgv
pr: #5435
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/voting.ts, kind missing-engine"
claimed-at: 2026-10-20T02:15:53.327Z
---

**What.** Replace or clear the 1 open missing-engine stopgap row(s) in src/core2/modules/voting.ts: SG-GOV-who-runs-stand-in. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/voting.ts

**Notes.** First row: When filing closes, the incumbent stands again if alive, and each state or federal race gets a named challenger from the other major party.
