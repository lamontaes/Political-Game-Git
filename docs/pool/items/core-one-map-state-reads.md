---
id: core-one-map-state-reads
title: "Read a place's state through the place map, not the place record"
area: core
kind: cleanup
priority: 2
size: S
status: done
claimed-by: one-map-reads
pr: #7293
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-05T09:46:07.079Z
---

**What.** Eleven spots looked a place record up and took its state field. They now call the place map reader.

**Rules.** One map: places are read through place-map.ts. No dice.

**Done when.** No place-record chain ending in the state field outside place-map.ts; a guard fails on a new one

**Files.** src/core2/place-map.ts, tests/guards/no-private-place-lookup.test.ts

**Notes.** TODO
