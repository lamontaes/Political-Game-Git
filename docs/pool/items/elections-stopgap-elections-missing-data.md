---
id: elections-stopgap-elections-missing-data
title: "Stopgaps in elections (missing-data): 1 open"
area: elections
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-elections-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/elections.ts, kind missing-data"
---

**What.** Replace or clear the 1 open missing-data stopgap row(s) in src/core2/modules/elections.ts: SG-GOV-filing-fallbacks. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/elections.ts

**Notes.** First row: Where a place's filing row carries no filing office, minimum age or voter-registration rule (county offices in Alaska, Connecticut, Rhode Island, D.C. and the territories; municipal offices in Hawaii and two territories;

Folded into research-elections-sourced-parameters (CTO, Oct 19, 2026).
