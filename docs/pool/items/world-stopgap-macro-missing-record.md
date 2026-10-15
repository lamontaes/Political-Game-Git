---
id: world-stopgap-macro-missing-record
title: "Stopgaps in macro (missing-record): 1 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/macro.ts, kind missing-record"
---

**What.** Replace or clear the 1 open missing-record stopgap row(s) in src/core2/modules/macro.ts: SG-WORLD-macro-income-history. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/macro.ts

**Notes.** First row: No town income-growth observation or local feedback is available before enough comparable paid-income months exist; the national economy continues from its national records.
