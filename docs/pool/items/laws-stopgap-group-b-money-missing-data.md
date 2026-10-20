---
id: laws-stopgap-group-b-money-missing-data
title: "Stopgaps in group-b-money (missing-data): 2 open"
area: laws
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (OPUS-GOV budgets: public-budget-bases.json carries each island area's population and finances (Census Island Areas, PR government finances); group B t...)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/law-reach/group-b-money.ts, kind missing-data"
---

**What.** Replace or clear the 2 open missing-data stopgap row(s) in src/core2/law-reach/group-b-money.ts: SG-GOV-REACH-B-territory-residents, SG-GOV-REACH-B-flat-tax-replacement. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/law-reach/group-b-money.ts

**Notes.** First row: For an island area the budgets module records no residents, group B shares a budget line's change to the town by the Census population in its own parameter table.
