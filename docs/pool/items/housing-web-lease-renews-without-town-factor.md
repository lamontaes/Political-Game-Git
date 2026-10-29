---
id: housing-web-lease-renews-without-town-factor
title: "housing-web red on main by draw: a lease in the shifted run renews with no web change (Macon, Georgia, seed d36f407e7c697a43)"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/housing-web.test.ts fails on clean main (31ad11a8c6, Oct 28 23:20 UTC) with WEB_HOUSING_SEED=d36f407e7c697a43 (Macon, Georgia): 'lease:household_5a537cd7cd145512: expected 1 to be close to 1.05'. The test shifts the town's outcome-web month (property-tax-to-rent 0.05) and expects every renewed lease to record webChange 1.05; this lease records 1, so the renewal read a factor of 1 for it. Other seeds pass, so it turns red by draw on any PR that runs the test. Found by the laws session while gating the disasters family.

**Rules.** Fix it at the root: either the renewal reads the web factor of the place the lease is in and the test should only expect the shift for leases in the shifted town, or the renewal reads the wrong place for this lease. One rule, all 56 places: no place named in code; the test keeps drawing its place.

**Done when.** housing-web.test.ts passes with WEB_HOUSING_SEED=d36f407e7c697a43 and on three further random seeds, each named in the PR body with the lease ids checked; the PR body says which place the failing lease is in and why its factor was 1.

**Files.** src/core2/housing-web.test.ts; src/core2/modules/housing.ts (renewRentalLeases)

**Notes.** TODO
