---
id: tests-campaigns-candidate-doors-reach-nobody-oakley
title: "M2-05 and M2-06 fail where the candidate's own door-knocking reaches nobody (Oakley, Wyoming)"
area: elections
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/oakley-doors
pr: #6293
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T11:22:12.585Z
---

**What.** The golden-path specs M2-05 and M2-06 (`src/core2/campaigns.test.ts`) fail on clean main (bda737333a) in Oakley, Wyoming (place key 5657375, seed 430e9eafc5940132146378a5b8aed5d56a21072290fb2952ac4f2f83e04f97d6) with "expected 0 to be greater than 0" at `campaigns.test.ts:130`: the candidate's own `knockDoors` for three hours reaches no door. This is a different check from the rival's turn fixed by `tests-campaigns-rival-reaches-nobody-small-place` (line 191). The golden path draws its place from each PR's commit, so it turned #5582's golden-path check red although the same seed fails on main.

**Rules.** One rule, all 56 places: the campaigns test must hold in every drawn place, so fix why a small town's candidate reaches nobody at the door; no dice decides who is reached; never skip or weaken the assertion.

**Done when.** GOLDEN_PATH_SEED=430e9eafc5940132146378a5b8aed5d56a21072290fb2952ac4f2f83e04f97d6 GOLDEN_PATH_PLACE_KEY=5657375 npx vitest run src/core2/campaigns.test.ts passes, with the cause named in the PR by file and line, and the test passes on three more drawn places named with their seeds. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/campaigns.test.ts, src/core2/modules/campaigns.ts

**Notes.** From the laws lead, Oct 25, reproducing #5582's golden-path failure on main.

Oct 25 (claude/candidate-doors-small-town, released): diagnosed, not fixed; it needs a model change larger than this S item. Reproduced on main of Oct 25, about 17:30 UTC, with the item's seed and key. The candidate's 3 hours walk 49 of Oakley's 75 doors from 5 pm; at every door all adults are home, and none opens: the best adult's score at each door runs from -0.07 to -0.6. In walkDoors (src/core2/modules/campaigns.ts) a door opens when leanedScore(campaigns.open-door) of (age - doorAnswerPivotAge 55) / doorAnswerAgeSpan 40 - doorAnswerThreshold 0.46 is above zero. The personality term measured here is narrow and all positive (+0.15 to +0.4 per adult), so opening reduces to an age cutoff near 73 to 77; Oakley's adults at the doors walked are 45 to 68. The threshold was set to make 18% of adults open across Newfane VT, Ute IA, Clifton KS and Cameron SC, older towns, so a town with no one past the cutoff gets no contact at all, where field contact runs a quarter to a third of doors (the parameter's own source). src/core2/campaign-calibration.test.ts still passes in its random towns. The fix is to make door answering depend on more than age with a weak trait term (for example a base willingness calibrated to the field contact rate with age as a modest gradient, or a wider recorded cause such as being home and not busy), then re-check campaign-calibration.test.ts and M2-05/M2-06 in Oakley and two drawn places; that is a campaigns calibration change for the elections or laws lead.

Same cause as campaigns-canvass-reaches-nobody-for-months, measured over 12 drawn places in its Notes (Oct 25).

Worker check (Claude, Oct 27): no longer reproduces on main. At the item's seed and key (Oakley, Wyoming, 5657375) `campaigns.test.ts` passes with the candidate meeting 12 doors, 8 speech listeners; fresh seeds oak-f1 (place 5302585, 22 doors), oak-f2 (place 0966770, 23 doors) and oak-f3 (territory:MP:tapochao, 24 doors) pass. The door-answering model change the Oct 25 note asked for appears to have landed since; I did not trace which merge.
