---
id: people-stopgap-drives-cause-group-spending
title: "Stopgaps in drives (cause-group-spending): 1 open"
area: people
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: Stress audit defect 2 (Oct 14): groups took donations and never spent them. The ad purchase was the one existing way to buy reach.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/drives.ts, kind cause-group-spending"
---

**What.** Replace or clear the 1 open cause-group-spending stopgap row(s) in src/core2/modules/drives.ts: SG-CORE-cause-group-ads-only. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/drives.ts

**Notes.** First row: A cause group spends its money only on ad time, bought through the campaigns engine's ad purchase; it holds no events, sends no mailers and pays none of a cause's own costs.
