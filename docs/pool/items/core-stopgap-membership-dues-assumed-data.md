---
id: core-stopgap-membership-dues-assumed-data
title: "Stopgaps in membership-dues (assumed-data): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by: claude/political-game-pool-pdqjm6
pr:
blocked-on: 1.0 (owner, Oct 20)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/membership-dues.ts, kind assumed-data"
claimed-at: 2026-10-19T22:42:08.819Z
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/membership-dues.ts: SG-WORLD-business-union-members. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/membership-dues.ts

**Notes.** First row: A union local's members are the place's employed at its state's 2025 membership rate (the nation's where BLS has no row), paying dues from the wider population's pooled cash; nobody is recorded as a member.

Oct 20: Owner ruled that unions and membership rules come with 1.0, so replacing the assumed union membership rate waits for 1.0.

Oct 20 (pool feeder): not specced; the owner ruled Oct 20 that unions and membership rules come with 1.0 (OWNER-DECISIONS.md), so it stays blocked on 1.0. The membership record itself is world-union-membership-record.
