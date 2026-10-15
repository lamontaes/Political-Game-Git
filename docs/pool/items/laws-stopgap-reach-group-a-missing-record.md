---
id: laws-stopgap-reach-group-a-missing-record
title: "Stopgaps in reach-group-a (missing-record): 3 open"
area: laws
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/laws/reach-group-a.json, kind missing-record"
---

**What.** Replace or clear the 3 open missing-record stopgap row(s) in src/core2/data/laws/reach-group-a.json: SG-GOV-REACH-A-citizenship, SG-GOV-REACH-A-convictions, SG-GOV-REACH-A-firearms. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/laws/reach-group-a.json

**Notes.** First row: Partnering with immigration enforcement reaches an estimated count of noncitizen adults (national share) instead of named noncitizens.
