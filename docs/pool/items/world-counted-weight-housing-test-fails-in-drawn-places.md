---
id: world-counted-weight-housing-test-fails-in-drawn-places
title: "counted-weight-housing.test.ts fails in random places: Pine Island, Florida has no rental units and Saugatuck, Michigan is 3 over the bound"
area: world
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/counted-housing-test
pr: #5058
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T18:49:11.056Z
---

**What.** counted-weight-housing.test.ts, which sizes the rental stock to the renting households the counted records stand for, fails in drawn places with no change to the code under test. Run twice on the same branch with different random seeds it failed both times: in Pine Island, Florida (seed eff7c8b29cd72af67fa4c522065e4c36996404a324e627af4db5e25e45bd6aaa) the opening holds no rental units at all, and in Saugatuck, Michigan (seed 7dbba1780893c1a7b0ffa40750a0deb4b86288d0efaf413d125f591404c7f898) the stock is 207.3 against an allowed 204. The test builds the opening only, so the fault is in how the housing stock is sized from the counts, or in the test's bound.

**Rules.** One rule, all 56 places: the test draws a place and names it; no place is named in logic. Wire to the world: the stock must follow the counted renters the same way a full renter's is followed. Estimate, never UNKNOWN: a town with renters has rental units.

**Done when.** The test passes in ten drawn places with seeds the builder did not choose, shown by place and seed, and a town with counted renters never opens with zero rental units; a test in src/core2/counted-weight-housing.test.ts covers the zero case.

**Files.** src/core2/counted-weight-housing.test.ts, src/core2/housing-construction.ts

**Notes.** Found while running the residents tests for the household release change; the tests do not touch anything that change edited. Not diagnosed beyond the two reproductions.
