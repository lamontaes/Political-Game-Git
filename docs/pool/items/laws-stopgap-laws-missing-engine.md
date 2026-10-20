---
id: laws-stopgap-laws-missing-engine
title: "Stopgaps in laws (missing-engine): 1 open"
area: laws
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/political-game-pool-3xfqef-25
pr: #5285
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/laws.ts, kind missing-engine"
claimed-at: 2026-10-20T06:32:32.907Z
---

**What.** Replace or clear the 1 open missing-engine stopgap row(s) in src/core2/modules/laws.ts: SG-GOV-public-pay-floor-owner. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/laws.ts

**Notes.** First row: The public pay floor's employer-to-level map is a first cut (public schools count as town employers), and a later public hire is held to the floor at the next monthly review rather than on the day it is hired. Councils,

Public hire held to floor on day of hire was resolved in PR #5285 via publicPayFloorHourly; employer-to-level map (school districts as own level) remains open.

