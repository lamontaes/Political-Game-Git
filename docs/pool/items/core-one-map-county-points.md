---
id: core-one-map-county-points
title: "Place post-2020 towns under their county from the Census interior point"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: one-map-county-points
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-05T10:11:37.080Z
---

**What.** 646 towns had no county area. Each now takes the county whose Census boundary holds its interior point, from a sourced data file.

**Rules.** One map: a gap is reported, never guessed; this is sourced and checked against 1,499 known places.

**Done when.** Gap report county-area count falls from 646 to none; place-map tests pass

**Files.** src/core2/data/places/place-county-by-point.json, src/core2/tooling/place-map-build.ts

**Notes.** TODO
