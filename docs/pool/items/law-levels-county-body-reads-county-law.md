---
id: law-levels-county-body-reads-county-law
title: "Law levels: a county body weighs a bill against the county's own law in force"
area: laws
kind: bug
priority: 2
size: S
status: claimed
claimed-by: law-levels-county-rows
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-06T17:36:30.374Z
---

**What.** billLevel folded a county body into the town, so provisionStance read the amount in force from the town's jurisdiction instead of the county's (docs/reports/law-levels-2026-11-05.md, Part B item 5).

**Rules.** Each body against its own state and county; the level is a parameter; no dice.

**Done when.** provisionStance reads the body's own jurisdiction (billJurisdiction) for the amount in force; a drawn-place test shows a county rate and the town's give different readings.

**Files.** src/core2/modules/legislature.ts,src/core2/county-body-reads-county-law.test.ts

**Notes.** TODO
