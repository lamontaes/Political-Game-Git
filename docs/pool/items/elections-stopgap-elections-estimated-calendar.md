---
id: elections-stopgap-elections-estimated-calendar
title: "Stopgaps in elections (estimated-calendar): 1 open"
area: elections
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (Each unread state's deadline rule read from its code into src/core2/data/elections/filing-deadlines.json, and each ESTIMATED row checked against the c...)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/elections.ts, kind estimated-calendar"
claimed-at:
---

**What.** Replace or clear the 1 open estimated-calendar stopgap row(s) in src/core2/modules/elections.ts: SG-GOV-filing-deadline-estimate. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/elections.ts

**Notes.** First row: A town's filing deadline where the state's municipal rule is unread (its row in filing-deadlines.json is 'unread'): the median number of days between the candidate filing deadline and the primary over the places with a 2
