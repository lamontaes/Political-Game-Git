---
id: core-one-map-lookups
title: "Systems read a place's state through the one place map"
area: core
kind: cleanup
priority: 1
size: M
status: done
claimed-by: one-map-lookups
pr: #7275
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T21:26:54.796Z
---

**What.** Delete the private stateOf, stateKeyOf and county lookups in game code and read a place's state through the one place map reader; add a guard against new ones.

**Rules.** One engine per mechanic; the level is a parameter.

**Done when.** No stateOf, stateKeyOf or townOf outside the guard's waiting list; the guard test passes.

**Files.** src/core2/place-map.ts, tests/guards/no-private-place-lookup.test.ts

**Notes.** TODO
