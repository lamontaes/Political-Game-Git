---
id: world-census-weight-housing
title: "Housing stock, vacancy, construction and rents read the household weight"
area: world
kind: wiring
priority: 1
size: M
status: done
claimed-by: claude/world-census-weight-housing
pr: #4605
blocked-on:
after: core-census-weight-money
source: added with npm run pool -- add
claimed-at: 2026-10-16T04:36:15.840Z
---

**What.** The housing engine reads the weight wherever it counts households or units: occupied and vacant units, construction demand, rent and mortgage flows of a weighted counted household, and the foreclosure and homeless counts that touch the stock (`modules/housing.ts`). The people-count readers in `housing-foreclosure.ts` and `housing-homeless.ts` belong to core-census-weight-readers (#4456); read through them, do not redo them.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count); no dice; one rule, all 56 places; an effect is a read; speed (a year under two minutes, no more than 20% slower than base); replace, never layer.

**Done when.** In a one-year run of a drawn town at scale 3, units occupied, rents collected and units finished are three times the scale-one town's within rounding, with named unit and household ids, and scale one is identical to base. The owner plays it: nothing yet; this is the base for the Census-size opening.

**Files.** src/core2/modules/housing.ts

**Notes.** Split from world-census-weight-economy (claude/world-census-weight-economy) when it was claimed: the original is an L. The weight is `CountedStore.weightOf` (core-census-weight-model, merged); counted money already moves times the weight (core-census-weight-money, #4467). Test by opening a drawn town with `buildBenchWorld(..., { countScale: 3 })` against the same seed at scale one.
