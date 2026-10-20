---
id: core-stopgap-opening-employment-opening-allocation
title: "Stopgaps in opening-employment (opening-allocation): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (County-resident employment and firm/occupation supported capacity matched with source spreads, preserving original records....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/opening-employment.ts, kind opening-allocation"
---

**What.** Replace or clear the 1 open opening-allocation stopgap row(s) in src/core2/opening-employment.ts: SG-P8-opening-employment. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/opening-employment.ts

**Notes.** First row: Adds fictional opening jobs against sourced sector stock and age-target priors at existing recorded employers.
