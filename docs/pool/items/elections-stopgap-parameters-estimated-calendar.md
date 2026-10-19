---
id: elections-stopgap-parameters-estimated-calendar
title: "Stopgaps in parameters (estimated-calendar): 1 open"
area: elections
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/special-elections
pr: #5218
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/elections/parameters.json, kind estimated-calendar"
claimed-at: 2026-10-19T22:36:17.053Z
---

**What.** Replace or clear the 1 open estimated-calendar stopgap row(s) in src/core2/data/elections/parameters.json: SG-GOV-special-election-timing. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/elections/parameters.json

**Notes.** First row: The date of a special election where the state's law for that office family is not read: 90 days after the vacancy. Only California's U.S. House and legislative rows are read in special-election-law.json.
