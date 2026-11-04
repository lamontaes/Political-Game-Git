---
id: core-one-map-reader
title: "One place map: every place one row, one reader module"
area: core
kind: cleanup
priority: 1
size: M
status: claimed
claimed-by: one-map-reader
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T19:54:30.468Z
---

**What.** Generate one map of every place (town, county, state, country) with its level, parent and form of government from existing files, and one reader module every system reads places through.

**Rules.** One engine per mechanic; the level is a parameter. One rule, all 56 places: no state named in logic. A gap is reported, never filled with national numbers.

**Done when.** place-map.json holds a row for every place in all 56 jurisdictions; src/core2/place-map.ts is the reader; a check over every row prints its gaps.

**Files.** src/core2/place-map.ts, src/core2/data/places/place-map.json, scripts/maps/build-place-map.ts

**Notes.** TODO
