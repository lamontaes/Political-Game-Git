---
id: tests-campaign-turn-donor-total-mildred
title: "The campaign-turn donor-total test fails in a drawn Kansas town: a donor gives again after payments are forgotten"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/campaign-turn.test.ts:246 (a donor's running total is read from its indexed row) fails on main with GOLDEN_PATH_SEED=5c889114d55002d33b15aaa8fee51c97466951d20e0037d2cda905baa12e207f in Mildred, Kansas (2046500): after every money row is removed, askForDonation gives 2100 instead of 0 (line 279). Either the donor's total is read from the money rows rather than the gift row, or the test's expectation is wrong for a donor who has room left under their own limit. Found Oct 24 by the traits lead while checking an unrelated press change (the same failure with and without it).

**Rules.** No dice: whether a donor gives again follows their gift row and their own reasons. Wire to the world: the gift row is the record the campaign reads.

**Done when.** With that seed the test passes, and the fix names whether the gift row or the test was wrong, with the line.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-turn.test.ts

**Notes.** TODO
