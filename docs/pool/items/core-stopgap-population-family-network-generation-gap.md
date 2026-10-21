---
id: core-stopgap-population-family-network-generation-gap
title: "Stopgaps in population (family-network-generation-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/pool-family-network
pr: #5305
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/population.ts, kind family-network-generation-gap"
claimed-at: 2026-10-19T23:49:25.436Z
---

**What.** Replace or clear the 1 open family-network-generation-gap stopgap row(s) in src/core2/population.ts: SG-P8-family-network-coverage. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/population.ts

**Notes.** First row: Opening generation omits substantial family connections and cannot route losses to missing relatives.
