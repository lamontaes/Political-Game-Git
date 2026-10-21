---
id: world-no-counted-rent-flows-small-town
title: "A town opens with no counted rent flows: Remy, Oklahoma has 194 counted flows and none is a rent"
area: world
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/world-no-counted-rent-flows-small-town
pr: #5351
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:33:48.906Z
---

**What.** Remy, Oklahoma opened with all 236 homes owned, so no renter paid rent. Root cause: the place's ACS tenure row reads 200 of 200 owned, and 2,873 of 31,711 place rows read exactly 100% owned (700 of them with 100 or more homes), a sample reading taken as truth. A place's owner share is now pulled toward its county's by sample size (`housingTenureShrinkHomes`, TUNABLE, 30 homes).

**Rules.** Estimate, never UNKNOWN; one rule for all 56 places; no place named in logic.

**Done when.** A drawn place whose row reads all owned opens with renters (src/core2/housing-opening.test.ts, names place and seed).

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/parameters.json, src/core2/housing-opening.test.ts

**Notes.** Owner question for the PR body: should shrinkage be heavier for very small places?
