---
id: core-one-map-counties
title: "Every county-area lookup goes through the place map reader"
area: core
kind: cleanup
priority: 1
size: S
status: claimed
claimed-by: one-map-counties
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T23:51:54.206Z
---

**What.** Nine files that looked up a town's counties their own way now ask the place map reader, which also gives Puerto Rico towns their municipio.

**Rules.** One engine per mechanic; one rule, all 56 places.

**Done when.** No file but the reader and the Census reference calls the county-part functions; tests pass.

**Files.** src/core2/place-map.ts

**Notes.** TODO
