---
id: gov-stopgap-justice-law-missing-data
title: "Stopgaps in justice-law (missing-data): 1 open"
area: gov
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/pool-appointed-ag
pr: #5317
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/justice-law.ts, kind missing-data"
claimed-at: 2026-10-19T23:44:57.805Z
---

**What.** Replace or clear the 1 open missing-data stopgap row(s) in src/core2/justice-law.ts: SG-GOV-justice-prosecutor-stand-in. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/justice-law.ts

**Notes.** First row: A state prosecutor's office where the offices data has neither a county prosecutor covering the town nor an elected attorney general.
