---
id: tests-campaign-turn-donor-total-mildred
title: "The campaign-turn donor-total test fails in a drawn Kansas town: a donor gives again after payments are forgotten"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** The campaign-turn test (a donor's running total is read from its indexed row) fails on main with GOLDEN_PATH_SEED=5c889114d55002d33b15aaa8fee51c97466951d20e0037d2cda905baa12e207f in Mildred, Kansas (2046500): after every money row is removed, askForDonation gives 2100 instead of 0. Either the donor's total is read from the money rows rather than the gift row, or the test's expectation is wrong for a donor who has room left under their own limit. Found Oct 24 by the traits lead while checking an unrelated press change, with the same failure with and without it. The test lines the item cited have since moved.

**Cause.** Needs cause. Looked at src/core2/campaign-turn.test.ts, whose donor-total case no longer sits at line 246, and askForDonation at src/core2/modules/campaigns.ts line 3309; whether the gift row or the money rows set the total after the money rows are removed was not read. Measured: GOLDEN_PATH_SEED=5c889114d55002d33b15aaa8fee51c97466951d20e0037d2cda905baa12e207f, Mildred, Kansas.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session, to run the seed and read whether the gift row or the money rows set the total. When it runs out, write what was read in the item and stop.

**Rules.** No dice: whether a donor gives again follows their gift row and their own reasons. Wire to the world: the gift row is the record the campaign reads. Ask why: the fix names whether the gift row or the test was wrong, by line.

**Done when.** A second session runs the donor-total case in src/core2/campaign-turn.test.ts on that seed in Mildred, Kansas and on two fresh drawn seeds, and sees every run pass. The PR names whether the gift row or the test was wrong, with the file and line, and the donor by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-turn.test.ts

**Notes.** TODO
