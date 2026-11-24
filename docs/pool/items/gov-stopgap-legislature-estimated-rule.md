---
id: gov-stopgap-legislature-estimated-rule
title: "Stopgaps in legislature (estimated-rule): 1 open"
area: gov
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-legislature-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/legislature.ts, kind estimated-rule"
---

**What.** Replace or clear the 1 open estimated-rule stopgap row(s) in src/core2/modules/legislature.ts: SG-GOV-committee-structure. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/legislature.ts

**Notes.** First row: Committee seats go to each party's most senior members by the chamber's party ratio; real committees are appointed by the presiding officer or a committee on committees. Committee size is now sourced (about 11 members, 5

Folded into research-legislature-sourced-parameters (CTO, Oct 19, 2026).
