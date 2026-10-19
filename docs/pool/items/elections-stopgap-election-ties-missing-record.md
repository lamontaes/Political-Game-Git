---
id: elections-stopgap-election-ties-missing-record
title: "Stopgaps in election-ties (missing-record): 1 open"
area: elections
kind: stopgap
priority: 2
status: done
claimed-by: claude/elections-tie-named-member-lean
pr: #4479
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/election-ties.ts, kind missing-record"
claimed-at: 2026-10-15T22:09:15.013Z
---

**What.** Replace or clear the 1 open missing-record stopgap row(s) in src/core2/election-ties.ts: SG-GOV-tie-named-member-lean. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/election-ties.ts

**Notes.** First row: A member of a deciding body who is a named official the world has not filled in as a person has no recorded views, so their party's side stands in for their lean when they vote on a tie.
