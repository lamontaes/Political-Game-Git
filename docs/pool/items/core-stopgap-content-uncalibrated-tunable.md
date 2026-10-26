---
id: core-stopgap-content-uncalibrated-tunable
title: "Stopgaps in content (uncalibrated-tunable): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on:
after: research-content-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/content.json, kind uncalibrated-tunable"
claimed-at:
---

**What.** Replace or clear the 1 open uncalibrated-tunable stopgap row(s) in src/core2/data/content.json: SG-P8-civic-progress. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/content.json

**Notes.** First row: Prototype civic availability and organization/approach consequences, rather than complete procedures.

Oct 20: Switched from blocked to the automatic after: gate on research-content-sourced-parameters, so it opens by itself the moment those items are done.

Dropped by the Oct 25 audit: stopgap bookkeeping at priority 3. The row stays in src/core2/data/stopgaps.json and the register, where the engine work is found when it is scheduled; nothing on screen reads this item.
