---
id: test-assistance-work-counted-payments-rounding
title: "law-reach-group-b: the assistance work requirement's counted payments differ from the test's sum by rounding in Inarajan, Guam"
area: laws
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr: #5730
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** With GOLDEN_PATH_SEED 741e1fe731e2aef3a39de315f1d07c4368754d2d0409b3bbeacc39f43896b2b6 and GOLDEN_PATH_PLACE_KEY territory:GU:inarajan, the assistance work requirement test expects counted groups' payments of rate times counted heads (97713) but the engine pays 97728: the test floors the per-head rate and counts heads, while payBenefits floors per group on the fitted household weight. Make the test's expected value follow the engine's per-group arithmetic, or fix the engine if the test's rule is the intended one.

**Rules.** Do not loosen the assertion to a tolerance without naming the arithmetic. One rule, all 56 places.

**Done when.** The assistance work requirement case passes for the seed and place above and for two other drawn places.

**Files.** src/core2/law-reach-group-b.test.ts, src/core2/law-reach/group-b-money.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5731 (branch claude/fs11vb-assist): src/core2/law-reach-group-b.test.ts in the changed counted-payment block still wraps the equality in if (expectedCounted > 0), so an empty rateOf or empty group selection bypasses the payment proof. Assert the required rows and positive expected payment before the equality. docs/pool/items/test-assistance-work-counted-payments-rounding.md:20 also requires the original Guam seed/place to pass, which the body says was not replayed; restore that regression alongside drawn-place coverage.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5730 (branch claude/gb-fixture): The conflict repair is present, but the body and release declaration still claim a welfare-payment arithmetic change that is absent from this diff: the fixer correctly retained mains existing assertion. The actual code change is the draw bound and hook timeout. Correct those claims and add the required Done when evidence table (.agents/skills/merger/SKILL.md section 2.5), mapping the item acceptance to evidence actually supplied by this branch. The body also says a pinned place is one draw, whereas build now retains PINNED_DRAWS = 40. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5731 (branch claude/fs11vb-assist): src/core2/law-reach-group-b.test.ts:1306-1321 now restores the Inarajan regression and the fixer comment reports it passed, addressing the previous return. The PR description still says under Not done that this exact pin cannot build and could not be replayed, and describes the old test totals. Replace that obsolete claim with the final pinned and drawn-case results so the review description agrees with the code. No new table is required for this older PR. Main merged cleanly and was plain-pushed here; no local gate pass is claimed.; finish on that branch, merge main into it first.
