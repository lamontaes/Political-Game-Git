---
id: core-needs-fixer-51
title: "Needs from other sessions listed in fixer.md (line 51): 30 lines"
area: core
kind: wiring
priority: 2
status: done
claimed-by: claude/core-needs-fixer-51
pr: #4497
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/fixer.md "Needs from other sessions" (line 51)'
claimed-at: 2026-10-15T22:50:44.022Z
---

**What.** This list holds 30 requests the fixer left for the core and other sessions. Most of it is the stand-in figures list (111 rows in data/research/stand-in-figures-2026-10-12.json, 67 with a recommended value) and the old-engine import cleanup that blocks deleting about 1,600 old files. As of 2026-10-15 nine of the SG-P8 rows listed are already resolved in src/core2/data/stopgaps.json. Verify each line against main, apply the recommended values still open as sourced rows in the parameter table, and split the web build entry and the import moves into their own pool items.

Lines (as of 2026-10-15, from the status file):

- **OPUS-PLAY:** an app entry and build target for `/play` (root `index.html`, `review.html` and `vite.config.ts` inputs still name the deleted old app entry), so the web build works once #4036 lands.
- **OPUS-CORE / OPUS-GOV:** to delete the other ~1,600 old files, move what `src/bench/scene.ts`, `src/rules/legislatures`, `src/rules/economy` and `tests/golden-path/place.ts` import from `src/simulation` and `src/presentation` into core2 or rules.
  **Stand-in figures (CTO list, Oct 12, 3:45 p.m.).** Of the 111 rows in `data/research/stand-in-figures-2026-10-12.json`, 44 are "not research" (a missing mechanic, no number to set) and 67 have a recommended value. FIXER replaced none of the 67 itself: 61 sit in files that an open pillar branch changes (checked with `g
- **OPUS-CORE** (37 rows with a number to set; every code location is in a file an open pillar branch changes, so FIXER did not touch them):
  - `SG-P8-param-marriageReferenceAge` — researchable, high, `src/core2/data/parameters.json`
  - `SG-P8-param-careHours` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-civicHours` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-stressBaseline` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-moodBaseline` — researchable, low, `src/core2/data/parameters.json`
  - `SG-P8-param-moodHalfLifeDays` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-param-stressHalfLifeDays` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-param-traitWeight` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-param-companyHorizonDays` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-param-moneyBufferDays` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-organizationReserveMonths` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-relationContactGain` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-opening-vintage` — researchable, medium, `src/core2/population.ts`
  - `SG-P8-param-fallbackAnnualWageMinor` — researchable, high, `src/core2/data/parameters.json`
  - `SG-P8-deep-past` — bounded, medium, `src/core2/data/deep-past.json`
  - `SG-P8-opening-peer-network` — bounded, low, `src/core2/data/opening-peer-network.json`
  - `SG-P8-work-schedule-data` — bounded, medium, `src/core2/data/work.json`
  - `SG-P8-attendance-choice` — bounded, medium, `src/core2/data/work.json`
  - `SG-P8-work-time-reserve` — researchable, high, `src/core2/data/parameters.json`
  - `SG-P8-business-books-priors` — bounded, medium, `src/core2/data/parameters.json`
  - `SG-P8-business-books-dynamics` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-opening-finance-cadence` — bounded, low, `src/core2/data/opening-finance.json`
  - `SG-P8-opening-retirement-income` — researchable, high, `src/core2/data/opening-income.json`
  - `SG-P8-param-openingRetirementClaimAgeYears` — researchable, high, `src/core2/data/parameters.json`
  - `SG-P8-param-openingRetirementClaimTraitPullYears` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-param-openingRetirementCoveredFraction` — researchable, medium, `src/core2/data/parameters.json`

**Rules.** Research before building: a value comes from the cited source and is tagged SOURCED, ESTIMATED or TUNABLE with its spread, and real data checks the simulation without deciding any one actor's outcome. Replace, never layer: moving an import off src/simulation deletes the old file's use in the same change. Look before you ask: read docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md before sending any of the flagged rows to the owner.

**Done when.** For each still-open SG-P8 row, the parameter table row carries its source tag and spread and the stopgap row is resolved in stopgaps.json, shown by a test in src/core2/parameters.test.ts or the stopgap tripwire test. For the import moves, a typecheck and the golden path suite (tests/golden-path/runner.mjs) pass in a drawn place with fewer files importing src/simulation. The owner plays it: the web build opens /play from the new entry.

**Files.** src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/stand-in-figures-2026-10-12.json, src/bench/scene.ts, vite.config.ts, docs/archive/2026-10-23/coordination/fixer.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

**Triage (Oct 15, checked against main by the claiming session).**

- App entry and build target for `/play`: done. `vite.config.ts` builds `src/bench/play.html`, and the old app entry (`src/main.tsx`, `src/App.tsx`, `src/player/**`) is gone.
- Deleting the rest of the old engine (about 1,600 files down to about 940): `core-delete-old-engine`, after `core-old-imports-14`.
- The 67 stand-in figures with a number to set: 17 of the listed stopgaps are resolved on main. Every one still open already has a pool item (the `core-stopgap-*`, `people-stopgap-*`, `gov-stopgap-*`, `world-stopgap-*` and `office-stopgap-*` items name them). The seven director rows, which live in `src/director/data/stopgaps.json`, had none: `director-stopgap-parameters`.
- The 44 "not research" rows are missing mechanics, not numbers; they are the existing stopgap items.
- The stress and mood baselines wait on the owner: `owner-stress-mood-scale` (filed with `core-needs-core-172`).
