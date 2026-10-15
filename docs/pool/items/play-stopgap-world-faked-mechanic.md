---
id: play-stopgap-world-faked-mechanic
title: "Stopgaps in world (faked-mechanic): 1 open"
area: play
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/bench/world.ts, kind faked-mechanic"
---

**What.** Replace or clear the 1 open faked-mechanic stopgap row(s) in src/bench/world.ts: SG-PLAY-opening-economy-fallback. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/bench/world.ts

**Notes.** First row: A /play town whose opening has a kin move dated after the opening day opens without the core’s opening economy (retirement income, customers) and outside market, on the finance-only route.
