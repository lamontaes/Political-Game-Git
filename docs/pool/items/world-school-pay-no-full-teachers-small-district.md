---
id: world-school-pay-no-full-teachers-small-district
title: "School-pay test finds no full teachers paid in a small drawn district"
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

**What.** src/core2/school-pay.test.ts fails on clean main with GOLDEN_PATH_SEED=9c9f0e287480bcf02e45374469eca456646c879c: 'Lamar Public Schools full teachers: expected 0 to be greater than 0', while the same run's counted case passes (Jolivue Public Schools paid from organization:treasury:county:51015). The laws lead found it in its gate on Oct 24 and confirmed it on main with the same seed. Either the district has no full (named) teacher to pay, which the test should read from the district's records before asserting, or a named teacher there is not paid from the treasury.

**Rules.** One model, two tiers: a named teacher and a counted teacher at the same district are paid from the same treasury by the same rule; one rule, all 56 places: the test may redraw only for a reason read from the district's records, naming each district it passed over.

**Done when.** src/core2/school-pay.test.ts passes on GOLDEN_PATH_SEED=9c9f0e287480bcf02e45374469eca456646c879c and on two fresh random seeds named in the PR body; the PR says whether Lamar had no named teacher or an unpaid one, by record id.

**Files.** src/core2/school-pay.test.ts

**Notes.** TODO
