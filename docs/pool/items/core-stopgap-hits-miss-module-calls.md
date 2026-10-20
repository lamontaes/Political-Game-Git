---
id: core-stopgap-hits-miss-module-calls
title: "The stopgap hit recorder misses markers called without a context, so no usage report of open rows can be trusted"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `core.stopgapHits` (state.ts) is filled only by markers that pass the world's set, such as `api.stopgap("ID")`. About 42 files in `src/core2` import `stopgap` from `./stopgaps` and call it with no context, which records nothing. A probe on Oct 20 that ran two drawn places for two years and listed the open rows whose id never reached `core.stopgapHits` named 125 of 262 open rows as never hit, and it included rows that plainly run in play (`SG-WORLD-housing-landlord`, `SG-WORLD-property-tax-rate`). So no report of which stopgaps a played world actually uses can be trusted, and a row cannot be resolved as dead from it. Make the module-level markers reach the running world's hit set (route them through the api, or give `stopgap()` a way to find the world being run), so the set is complete.

**Rules.** Replace, never layer: one marker call records the hit, not a second copy beside the old one. Speed: recording a hit adds no per-day scan of the world. The tripwire tests that require every placeholder to carry a registered marker must keep passing.

**Done when.** In a two-year run of the played world (`buildBenchWorld`, a place drawn from all 56 with its seed named), `core.stopgapHits` contains every stopgap id whose marker ran, shown by `SG-WORLD-housing-landlord` and `SG-WORLD-property-tax-rate` appearing, and a test in `src/core2/` asserts both. The year's time is unchanged within the 20 percent speed rule.

**Files.** src/core2/stopgaps.ts, src/core2/state.ts, src/core2/tooling/tripwires.ts

**Notes.** Found Oct 20 (claude) while looking for open rows that could be resolved as unused. The probe was a throwaway test and is not kept.
