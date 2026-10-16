---
id: elections-stopgap-candidacy-missing-core-api
title: "Stopgaps in candidacy (missing-core-api): 1 open"
area: elections
kind: stopgap
priority: 3
status: done
claimed-by: claude/counted-engagement
pr: #4597
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/candidacy.ts, kind missing-core-api"
claimed-at: 2026-10-16T04:21:21.945Z
---

**What.** Replace or clear the 1 open missing-core-api stopgap row(s) in src/core2/modules/candidacy.ts: SG-PW3-counted-engagement-copy. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/candidacy.ts

**Notes.** First row: A counted resident's engagement with politics, computed with a copy of the views engine's formula (their own key spread around the CES cell average) so the candidacy screen matches the value they get when filled in.
