---
id: elections-stopgap-past-elections-missing-data
title: "Stopgaps in past-elections (missing-data): 1 open"
area: elections
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/territory-past-returns
pr: #5747
blocked-on: research data: the row's replacement needs sourced data (Each territory's certified 2024 delegate and governor returns (territorial election offices) as research data, read in place of the town's ballots....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/past-elections.ts, kind missing-data"
claimed-at: 2026-10-20T19:13:27.561Z
---

**What.** Replace or clear the 1 open missing-data stopgap row(s) in src/core2/past-elections.ts: SG-CORE-past-territory-ballots. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/past-elections.ts

**Notes.** First row: A territory's prior elections (its delegate and governor) count only the town's own ballots, since territories cast no presidential vote to scale from.
