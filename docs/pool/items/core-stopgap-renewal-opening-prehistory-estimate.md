---
id: core-stopgap-renewal-opening-prehistory-estimate
title: "Stopgaps in renewal (opening-prehistory-estimate): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-core-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/renewal.ts, kind opening-prehistory-estimate"
---

**What.** Replace or clear the 1 open opening-prehistory-estimate stopgap row(s) in src/core2/modules/renewal.ts: SG-M1-opening-pregnancies. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/renewal.ts

**Notes.** First row: Opening still-pregnant plans use current opening money, housing, health and temperament as pre-opening proxies, with real recorded partnership and child dates. Reviews occur at 91-day phases anchored to partnership or yo

Folded into research-core-sourced-parameters (CTO, Oct 19, 2026).
