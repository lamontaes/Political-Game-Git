---
id: elections-stopgap-parameters-estimated-calendar
title: "Stopgaps in parameters (estimated-calendar): 1 open"
area: elections
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/special-elections
pr:
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

Oct 19 (claude/special-elections): partial. Added the U.S. House rows for Alaska (Alaska Stat. 15.40.140: special primary 60 to 90 days after the vacancy, election at least 60 days after it) and Iowa (Iowa Code 69.14: order within 5 days, at least 40 days' notice), read from GAO-24-107789 (Sept 2024), the only state-law examples in that testimony besides Arizona, Colorado and Delaware. Arizona and Colorado's 49-day rules are the extraordinary-circumstances laws, not the ordinary timing, and Delaware's governor has discretion, so those three were not added. 53 states and the other office families are still unread, so SG-GOV-special-election-timing stays open. GAO's full state table is not published in that testimony; the next step is each state's statute, or the GAO's final report.

Also added New York (Election Law 6-114, 70 to 80 days after the proclamation; read from the struck text in bills A1860 and A1610, so tagged ESTIMATED and not yet checked against the codified section). Searched and not added: Texas (first uniform election date on or after the 36th day after the governor orders it, Election Code 203.004 and 204.021; a calendar rule, not a day count), Ohio (the governor's writ sets the date, no day count, R.C. 3521.03) and Illinois (the search returned only the U.S. Senator section). Those need a 'uniform date' and a 'governor sets it' kind in elections-calendar.ts first.
