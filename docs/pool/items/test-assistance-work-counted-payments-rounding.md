---
id: test-assistance-work-counted-payments-rounding
title: "law-reach-group-b: the assistance work requirement's counted payments differ from the test's sum by rounding in Inarajan, Guam"
area: laws
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/work-rounding
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T16:14:43.338Z
---

**What.** With GOLDEN_PATH_SEED 741e1fe731e2aef3a39de315f1d07c4368754d2d0409b3bbeacc39f43896b2b6 and GOLDEN_PATH_PLACE_KEY territory:GU:inarajan, the assistance work requirement test expects counted groups' payments of rate times counted heads (97713) but the engine pays 97728: the test floors the per-head rate and counts heads, while payBenefits floors per group on the fitted household weight. Make the test's expected value follow the engine's per-group arithmetic, or fix the engine if the test's rule is the intended one.

**Rules.** Do not loosen the assertion to a tolerance without naming the arithmetic. One rule, all 56 places.

**Done when.** The assistance work requirement case passes for the seed and place above and for two other drawn places.

**Files.** src/core2/law-reach-group-b.test.ts, src/core2/law-reach/group-b-money.ts

**Notes.** TODO
