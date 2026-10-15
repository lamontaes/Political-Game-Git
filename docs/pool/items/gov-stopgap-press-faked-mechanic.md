---
id: gov-stopgap-press-faked-mechanic
title: "Stopgaps in press (faked-mechanic): 2 open"
area: gov
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/press.ts, kind faked-mechanic"
---

**What.** Replace or clear the 2 open faked-mechanic stopgap row(s) in src/core2/modules/press.ts: SG-PEOPLE-press-outlet-revenue, SG-PEOPLE-press-staff-turnover. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/press.ts

**Notes.** First row: An outlet's revenue (its audience's subscriptions and the advertising they see) is one standing monthly payment from the town's outside customers, sized at the opening from its audience and an estimated amount per follow
