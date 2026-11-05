---
id: core-one-map-housing-town
title: "Housing's town record takes its state from the one place map"
area: core
kind: cleanup
priority: 2
size: S
status: done
claimed-by: one-map-housing-town
pr: #7282
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-05T01:36:32.661Z
---

**What.** Rename housing's town builder and read its state from the place map reader; the guard's waiting list becomes empty.

**Rules.** One engine per mechanic.

**Done when.** No private place lookup left in the guard's waiting list; housing tests no worse than main.

**Files.** src/core2/modules/housing.ts

**Notes.** TODO
