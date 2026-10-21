---
id: office-stopgap-offices-missing-engine
title: "Stopgaps in offices (missing-engine): 1 open"
area: office
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: M2's election engine hasn't been built on core2 yet.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/offices.ts, kind missing-engine"
---

**What.** Replace or clear the 1 open missing-engine stopgap row(s) in src/core2/modules/offices.ts: SG-GOV-special-election-appointee. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/offices.ts

**Notes.** First row: Where the voting engine isn't running, a special election's seat goes to the best-suited eligible person on the day instead of a vote. With voting open it is a real race. Its date is the state's law for the office where
