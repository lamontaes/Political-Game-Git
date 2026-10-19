---
id: core-stopgap-policy-authority-missing-record
title: "Stopgaps in policy-authority (missing-record): 1 open"
area: core
kind: stopgap
priority: 2
status: done
claimed-by: claude/core-stopgap-policy-authority
pr: #4509
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/policy-authority.ts, kind missing-record"
claimed-at: 2026-10-15T23:09:08.933Z
---

**What.** The stopgap row(s) SG-GOV-policy-power-unresolved in src/core2/policy-authority.ts mark a shortcut that is still live in play. Today unmapped questions and unresolved cells of the powers catalog cannot be introduced, and the authority result records a disputed missing grant instead of resolving who may act. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** One rule, all 56 places: the grant for each office comes from the powers catalog in data for every place, never a named state. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a bill or order from an office whose power was unresolved gets a resolved grant or a recorded dispute, with the authority record id and the office, named by record id. The test in src/core2/policy-authority.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: propose an ordinance and be told by the record which body holds the power.

**Files.** src/core2/policy-authority.ts, src/core2/data/stopgaps.json, src/core2/policy-authority.test.ts

**Notes.** First row: Unmapped questions and unresolved powers-catalog cells cannot be introduced; the authority result records a disputed missing grant rather than silently permitting the action.
