---
id: gov-stopgap-justice-law-estimated-rule
title: "Stopgaps in justice-law (estimated-rule): 1 open"
area: gov
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on:
milestone:
after:
size: M
source: "src/core2/data/stopgaps.json, src/core2/justice-law.ts, kind estimated-rule"
---

**What.** Replace SG-GOV-justice-forfeiture-by-place in src/core2/justice-law.ts. convictionForfeitsOffice and bribeProceedsForfeited answer the same for every place (all offices vacate on conviction, on the day, and all proceeds are forfeited) and both call api.stopgap. Research each state and territory's rule once into data/research/justice/forfeiture-2026.json, the way prison-voting-2026.json is kept: whether a felony conviction vacates an office, the moment it does (conviction, sentencing or final appeal), and the share of a bribe's proceeds the court may take, each row SOURCED from the state constitution or code or ESTIMATED with the spread. Read it in both functions and in convict (src/core2/modules/justice.ts, vacateSeat around line 927) so the seat falls on the day the place's rule names.

**Rules.** One rule, all 56 places: the file has a row for every state, D.C. and each territory, and logic names none; a place with no found rule starts from the common rule marked ESTIMATED. Research before building: every row cites its statute or constitutional clause. Estimate, never UNKNOWN: a missing row is the common rule with its source, never a blank. An effect is a read, not a record: the vacancy date is read by the offices engine that opens the special election, and the forfeited share by the treasury journal. Replace, never layer: both api.stopgap calls and the all-places answer are deleted.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, a convicted official's seat falls on the date the place's row names and the forfeiture journal entry equals the row's share of the bribe, both by record id, and two places with different rows differ; src/core2/justice-forfeiture.test.ts proves it, the research-data reader guard passes, and the stopgap row is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/justice-law.ts, src/core2/modules/justice.ts, data/research/justice/forfeiture-2026.json, src/core2/justice-forfeiture.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Every place vacates an office on a felony conviction, on the day of the conviction.

Oct 20 (pool feeder): spec written; the small justice engine vacates on the conviction day, so a place whose rule waits for sentencing or final appeal needs the vacate step to move to that event; the small engine has no appeal step, so 'final appeal' rows read as the sentencing date until appeals exist (record that in the row, ESTIMATED).
