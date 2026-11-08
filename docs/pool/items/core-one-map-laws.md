---
id: core-one-map-laws
title: "The law chain and pay areas read a town's county from the one place map"
area: core
kind: cleanup
priority: 1
size: S
status: done
claimed-by: one-map-laws
pr: #7276
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T21:43:02.362Z
---

**What.** laws-starting, town-pay and coarse-place stop calling the county-area lookup and read the one place map.

**Rules.** One engine per mechanic; one rule, all 56 places.

**Done when.** Those three files call no county lookup; law and pay tests pass; the guard lists the files still waiting.

**Files.** src/core2/laws-starting.ts

**Notes.** TODO
