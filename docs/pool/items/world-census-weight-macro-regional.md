---
id: world-census-weight-macro-regional
title: "Macro and regional engines read the Census-scaled employment and housing, and the town's employers and units are sized to match"
area: world
kind: wiring
priority: 1
size: M
status: done
claimed-by: claude/census-weight-macro-s5
pr: #4844
blocked-on:
after: world-census-weight-hiring,world-census-weight-housing
source: added with npm run pool -- add
claimed-at: 2026-10-16T23:52:25.839Z
---

**What.** With headcount, hiring and housing weighted, size the town to its Census count: employment by industry and the housing stock follow the Census reference population (the local business counts in `src/simulation/local-business-counts.ts` already do) instead of the 10,000-person sample, and the macro and regional engines (`modules/macro.ts`, `modules/regional.ts`) read the scaled counts. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count); no dice; one rule, all 56 places; an effect is a read; speed (a year under two minutes, no more than 20% slower than base); replace, never layer.

**Done when.** In a one-year run of a drawn place above 10,000, employment by industry and the housing stock match the Census-scaled counts with named business and unit record ids, and the macro and regional rows read them. Scale one is identical to base. The owner plays it: nothing yet; this is the base for the Census-size opening.

**Files.** src/simulation/local-business-counts.ts, src/core2/modules/macro.ts, src/core2/modules/regional.ts, src/core2/modules/business.ts, src/core2/modules/housing.ts

**Notes.** Split from world-census-weight-economy (claude/world-census-weight-economy) when it was claimed: the original is an L. The weight is `CountedStore.weightOf` (core-census-weight-model, merged); counted money already moves times the weight (core-census-weight-money, #4467). Test by opening a drawn town with `buildBenchWorld(..., { countScale: 3 })` against the same seed at scale one.
