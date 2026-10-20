---
id: world-test-housing-county-estimate-red
title: "housing-county-estimate.test fails on main in county 0968240: a county whose median value the ACS withholds gives its owners no home value"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/housing-county-estimate-red
pr: #5604
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:58:49.494Z
---

**What.** On main (Oct 20) src/core2/housing-county-estimate.test.ts fails with 'expected 0 to be greater than 0' in place 0968240 with seed 2aaf02fefa56c179: in a county whose median home value the ACS withholds, the test finds no owner home value and no property tax bill. The test passes in other places, so find which record is missing in this county (the county estimate, the owner rows, or the tax billing) and fix it at the cause. Found while running the housing tests one file at a time; the same run also showed housing-laws and housing-no-opening-value red, which have their own items.

**Rules.** One rule, all 56 places: the county estimate fills every county whose value the ACS withholds, with no place-specific exception. Estimate, never UNKNOWN: an owner's home value starts from an estimate marked with its source. An effect is a read: the property tax bill must read the estimated value.

**Done when.** housing-county-estimate.test passes with seed 2aaf02fefa56c179 in place 0968240 and on a fresh drawn world, with each owner home value and property tax bill in the county named by record id, and the changed-file checks pass.

**Files.** src/core2/housing-county-estimate.test.ts, src/core2/housing-property-tax.ts, src/core2/modules/housing.ts

**Notes.** TODO
