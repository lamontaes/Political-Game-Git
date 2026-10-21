---
id: laws-stopgap-laws-missing-engine
title: "Stopgaps in laws (missing-engine): 1 open"
area: laws
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5575
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/laws.ts, kind missing-engine"
claimed-at:
---

**What.** Replace or clear the 1 open missing-engine stopgap row(s) in src/core2/modules/laws.ts: SG-GOV-public-pay-floor-owner. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/laws.ts

**Notes.** First row: The public pay floor's employer-to-level map is a first cut (public schools count as town employers), and a later public hire is held to the floor at the next monthly review rather than on the day it is hired. Councils,

Public hire held to floor on day of hire was resolved in PR #5285 via publicPayFloorHourly; employer-to-level map (school districts as own level) remains open.

Sent back 2026-10-21 from PR #5575 (branch claude/laws-missing-engine): The conflict correction is present: the marker is data/laws/public-pay-floor.json:3 and the jobs-opening wording matches main. The remaining issue is acceptance: docs/pool/items/laws-stopgap-laws-missing-engine.md:24 requires the row resolved and its replacement read by another engine in a one-year played-world run, by record id. The changed src/core2/data/stopgaps.json row at 3429-3436 deliberately leaves school districts mapped to city employers and status open, and the PR contains no such played-world proof. Please finish that acceptance on this branch, or move this truthful registry-only correction to a bounded pool item with its own acceptance and leave the broader engine item open. This is a done-when review finding, not a missing-checks-line objection; no local gates are claimed.; finish on that branch, merge main into it first.
