---
id: core-outside-flow-rows
title: "Outside-flow table names the five recorded exchanges the closure check could not match"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/core-outside-flow-provenance-gate
pr: #4413
blocked-on:
milestone:
source: "split from core-outside-flow-provenance-gate (#4352 left the sixth closure check red)"
---

**What.** `src/core2/data/outside-flows.json` lacked rows for counted arrivals, mover departures, entrants, price-rule settlements and property tax, so the sixth check of `scripts/core2-year/closures.mjs` called real exchanges unmatched. Each now has a row naming the record behind it. The treasury and federal-borrowing flows are rows too, marked plug under the existing stopgap `SG-GOV-outside-revenue-monthly`, so the report names what is left.

**Rules.** An effect is a read, not a record; replace, never layer (no engine changed).

**Done when.** The closure check's `unmatched` list is empty on a played-world year; only the plug rows remain.

**Files.** src/core2/data/outside-flows.json

**Notes.** The rest of the gate is `gov-outside-revenue-real-payers`.
