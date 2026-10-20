---
id: core-estate-contracts-test-small-place
title: "estate-contracts.test.ts fails in places with no household of two living payers (Dededo, Guam): it should draw on"
area: core
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/fs11vb-estate
pr: #5723
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T15:04:09.289Z
---

**What.** src/core2/estate-contracts.test.ts draws one place from all 56 and throws 'no housing contract with two living payers', 'no household with two living adults' and 'no housing contract of a one-adult household' when the drawn town's sample lacks that household shape. It failed this way in Dededo, Guam (territory:GU:dededo, seed dab66b6edba370f8) and passed in another drawn place on the next run, so the test fails by the luck of the draw rather than by a defect. Draw further places until one has the shape, as other proofs do (budget-line-schools-staffing draws on), and name every place skipped.

**Rules.** One rule, all 56 places: the test still covers any place that has the shape, with the place and seed named in a failure. Never skip a test to get green: the skip is per drawn place, and the test fails if no place in the draws has the shape.

**Done when.** src/core2/estate-contracts.test.ts passes on ten random seeds including GOLDEN_PATH_PLACE_KEY=territory:GU:dededo with seed dab66b6edba370f8, and fails with the list of tried places only when none of 25 draws has each shape.

**Files.** src/core2/estate-contracts.test.ts

**Notes.** TODO
