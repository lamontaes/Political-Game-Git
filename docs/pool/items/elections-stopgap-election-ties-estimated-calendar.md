---
id: elections-stopgap-election-ties-estimated-calendar
title: "Stopgaps in election-ties (estimated-calendar): 1 open"
area: elections
kind: stopgap
priority: 3
status: done
claimed-by: claude/tie-race-size
pr: #4822
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/election-ties.ts, kind estimated-calendar"
claimed-at: 2026-10-16T21:01:58.120Z
---

**What.** Replace or clear the 1 open estimated-calendar stopgap row(s) in src/core2/election-ties.ts: SG-GOV-tie-race-size. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/election-ties.ts

**Notes.** First row: Where a state's tie rule depends on race size (a new election for a large race, a lot for a small one) and its data row names no statute number, the line between them: 1,000 votes cast. North Carolina's row reads its sta
