---
id: core-one-map-elections-state
title: "Elections open the town's state from the one place map"
area: core
kind: cleanup
priority: 2
size: S
status: done
claimed-by: one-map-budgets-elections
pr: #7280
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T23:55:29.679Z
---

**What.** The elections module reads the town's state from the place map reader, not from the place record.

**Rules.** One engine per mechanic.

**Done when.** Elections open reads placeStateKey; typecheck and elections tests no worse than main.

**Files.** src/core2/modules/elections.ts

**Notes.** TODO
