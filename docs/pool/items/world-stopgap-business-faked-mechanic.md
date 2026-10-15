---
id: world-stopgap-business-faked-mechanic
title: "Stopgaps in business (faked-mechanic): 2 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/business.ts, kind faked-mechanic"
---

**What.** Replace or clear the 2 open faked-mechanic stopgap row(s) in src/core2/modules/business.ts: SG-WORLD-business-counted-owner-choice, SG-WORLD-business-no-successor. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/business.ts

**Notes.** First row: An owner still in the wider population (not yet filled in) takes the option whose reasons sum highest instead of choosing through the shared chooser, and their draws go to their place's pooled residents account.
