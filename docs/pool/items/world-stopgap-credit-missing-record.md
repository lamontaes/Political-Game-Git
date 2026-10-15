---
id: world-stopgap-credit-missing-record
title: "Stopgaps in credit (missing-record): 1 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/credit.ts, kind missing-record"
---

**What.** Replace or clear the 1 open missing-record stopgap row(s) in src/core2/modules/credit.ts: SG-WORLD-opening-mortgage-funding. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/credit.ts

**Notes.** First row: The bank holds opening mortgages whose original funding is an unmatched opening liability, not named customer deposits. New savings deposits are actual journal transfers and are accounted for separately.
