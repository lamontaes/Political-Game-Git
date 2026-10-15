---
id: gov-stopgap-budgets-treasury-faked-mechanic
title: "Stopgaps in budgets-treasury (faked-mechanic): 2 open"
area: gov
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/budgets-treasury.ts, kind faked-mechanic"
---

**What.** Replace or clear the 2 open faked-mechanic stopgap row(s) in src/core2/budgets-treasury.ts: SG-GOV-public-employers-outside, SG-GOV-opening-award-level. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/budgets-treasury.ts

**Notes.** First row: The opening's public employers in town (schools, police, fire, county offices) pay their workers from outside accounts; the treasury's lines for that work pay the outside account instead of those employers.
