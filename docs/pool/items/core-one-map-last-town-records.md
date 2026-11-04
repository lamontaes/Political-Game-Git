---
id: core-one-map-last-town-records
title: "The candidate pool and homeless count read the town from the one place map"
area: core
kind: cleanup
priority: 2
size: S
status: claimed
claimed-by: one-map-last-town-records
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T23:59:16.877Z
---

**What.** Delete the last two townOf records in game code; both read the town from the place map.

**Rules.** One engine per mechanic.

**Done when.** No townOf outside housing in game code; tests no worse than main.

**Files.** src/core2/candidate-pool.ts, src/core2/modules/homeless-count.ts

**Notes.** TODO
