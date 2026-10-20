---
id: core-stopgap-parameters-estimated-data
title: "Stopgaps in parameters (estimated-data): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (Enactment years from the research for each policy answer (NCSL and state code histories), read by the law history in place of the seeded age....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/past/parameters.json, kind estimated-data"
---

**What.** Replace or clear the 1 open estimated-data stopgap row(s) in src/core2/data/past/parameters.json: SG-CORE-past-undated-law-age. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/past/parameters.json

**Notes.** First row: A law the research records only as in force at the opening (a state's policy answers, a law carried back to the start date) is given an enactment date between one and twenty years before day one, fixed by the world's see
