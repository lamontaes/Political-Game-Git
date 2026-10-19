---
id: world-counted-weight-money-few-rents
title: "counted-weight-money.test.ts fails on main in a place with few rents (Pencil Bluff, Arkansas: 3 compared, 5 needed)"
area: world
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:30:04.577Z
---

**What.** `src/core2/counted-weight-money.test.ts` draws one place and asserts it has more than five rents to compare, so it fails on main in a place with few renters (Pencil Bluff, Arkansas, 0554410, seed 4812d72a49f0e26afc626af1e89d1cf21e856badce58f4fb038533a91dd58bf3: 3 compared). It also failed with 0 compared in another place during a loaded run. The test should draw places until one has enough rents and name each that does not, as `counted-weight-unplaced.test.ts` now does.

**Rules.** Tests draw a random place from all 56 and name place and seed; a test that cannot reach its case draws again rather than failing.

**Done when.** `npx vitest run src/core2/counted-weight-money.test.ts` passes on a fresh random seed, and fails with the named places only if none of twelve draws has enough rents.

**Files.** src/core2/counted-weight-money.test.ts

**Notes.** Found Oct 19 comparing the loaded-run failures of #5076 with origin/main: the other five files that failed in the loaded run pass on main, so only this one is a failure on main itself.

Built Oct 19 (claude/peaceful-ritchie-03780x): the comparison is a function `compareDrawn` that returns why a town cannot be compared (too few rents or payrolls), and the test draws up to eight places until one can, then runs every assertion on it; it throws naming each skipped place if none can. Passes on a fresh random seed.
