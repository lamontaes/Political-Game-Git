---
id: core-one-map-state-readers
title: "Estates, school and election ties read the world's state from the one place map"
area: core
kind: cleanup
priority: 1
size: S
status: claimed
claimed-by: one-map-waiting
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T23:44:43.704Z
---

**What.** Replace the stateOf lookups in estates, school and election ties with the place map reader.

**Rules.** One engine per mechanic; one rule, all 56 places.

**Done when.** Those files define no stateOf; their tests pass; the guard's waiting list shrinks by three.

**Files.** src/core2/estates.ts, src/core2/modules/school.ts, src/core2/election-ties.ts

**Notes.** TODO
