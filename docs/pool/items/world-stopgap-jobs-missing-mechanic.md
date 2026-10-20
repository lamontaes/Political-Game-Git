---
id: world-stopgap-jobs-missing-mechanic
title: "Stopgaps in jobs (missing-mechanic): 1 open"
area: world
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/fs11vb-jobsmm
pr: #5300
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/jobs.ts, kind missing-mechanic"
claimed-at: 2026-10-20T17:22:16.967Z
---

**What.** Replace or clear the 1 open missing-mechanic stopgap row(s) in src/core2/modules/jobs.ts: SG-WORLD-jobs-benefits. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/jobs.ts

**Notes.** First row: A spell of unemployment pays no unemployment insurance.

Sent back 2026-10-20 from PR #5300 (branch claude/ui-state-fund): the stopgap replacement text carries a 'Resolved Oct 19' date note; resolve the row properly without the date; finish on that branch, merge main into it first.
