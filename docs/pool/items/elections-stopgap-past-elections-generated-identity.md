---
id: elections-stopgap-past-elections-generated-identity
title: "Stopgaps in past-elections (generated-identity): 1 open"
area: elections
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: Only officeholders and the player's circle are full people (two-level population); the people who lost or left are not filled in yet.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/past-elections.ts, kind generated-identity"
---

**What.** Replace or clear the 1 open generated-identity stopgap row(s) in src/core2/past-elections.ts: SG-CORE-past-named-only. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/past-elections.ts

**Notes.** First row: The prior election's challenger, a law's sponsor or signer who left office before day one, and the predecessors who held a seat are names drawn from the seed, not people of the world.
