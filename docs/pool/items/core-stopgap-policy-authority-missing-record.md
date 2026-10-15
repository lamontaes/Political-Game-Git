---
id: core-stopgap-policy-authority-missing-record
title: "Stopgaps in policy-authority (missing-record): 1 open"
area: core
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/policy-authority.ts, kind missing-record"
---

**What.** Replace or clear the 1 open missing-record stopgap row(s) in src/core2/policy-authority.ts: SG-GOV-policy-power-unresolved. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/policy-authority.ts

**Notes.** First row: Unmapped questions and unresolved powers-catalog cells cannot be introduced; the authority result records a disputed missing grant rather than silently permitting the action.
