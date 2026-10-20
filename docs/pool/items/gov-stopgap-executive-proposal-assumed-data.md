---
id: gov-stopgap-executive-proposal-assumed-data
title: "Stopgaps in executive-proposal (assumed-data): 1 open"
area: gov
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-legislature-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/legislature/executive-proposal.json, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/data/legislature/executive-proposal.json: SG-GOV-local-executive-proposal. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/legislature/executive-proposal.json

**Notes.** First row: One national rule for how a mayor or county executive brings a bill of their own: through a member who carries it at their request. Charters differ (some let the mayor introduce ordinances directly).

Folded into research-legislature-sourced-parameters (CTO, Oct 19, 2026).
