---
id: core-needs-fixer-51
title: "Needs from other sessions listed in fixer.md (line 51): 30 lines"
area: core
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/fixer.md "Needs from other sessions" (line 51)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

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

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
