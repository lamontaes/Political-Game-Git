---
id: play-stopgap-dev-mode-missing-core-api
title: "Stopgaps in dev-mode (missing-core-api): 1 open"
area: play
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The core's law-reach count across both tiers of the population is being built by OPUS-CORE and has not landed.
milestone:
source: "src/core2/data/stopgaps.json, src/bench/dev-mode.ts, kind missing-core-api"
---

**What.** Replace or clear the 1 open missing-core-api stopgap row(s) in src/bench/dev-mode.ts: SG-PLAY-dev-law-reach-full-only. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/bench/dev-mode.ts

**Notes.** First row: Dev mode's count of who a law reached reads only the law-effects, law-reach and law raise records that name the law: full people by id, counted people where a record names one or carries a count. A law's effect that leav
