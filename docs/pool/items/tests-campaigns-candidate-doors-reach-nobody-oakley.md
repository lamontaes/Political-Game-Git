---
id: tests-campaigns-candidate-doors-reach-nobody-oakley
title: "M2-05 and M2-06 fail where the candidate's own door-knocking reaches nobody (Oakley, Wyoming)"
area: elections
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/candidate-doors-small-town
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T17:28:58.061Z
---

**What.** The golden-path specs M2-05 and M2-06 (`src/core2/campaigns.test.ts`) fail on clean main (bda737333a) in Oakley, Wyoming (place key 5657375, seed 430e9eafc5940132146378a5b8aed5d56a21072290fb2952ac4f2f83e04f97d6) with "expected 0 to be greater than 0" at `campaigns.test.ts:130`: the candidate's own `knockDoors` for three hours reaches no door. This is a different check from the rival's turn fixed by `tests-campaigns-rival-reaches-nobody-small-place` (line 191). The golden path draws its place from each PR's commit, so it turned #5582's golden-path check red although the same seed fails on main.

**Rules.** One rule, all 56 places: the campaigns test must hold in every drawn place, so fix why a small town's candidate reaches nobody at the door; no dice decides who is reached; never skip or weaken the assertion.

**Done when.** GOLDEN_PATH_SEED=430e9eafc5940132146378a5b8aed5d56a21072290fb2952ac4f2f83e04f97d6 GOLDEN_PATH_PLACE_KEY=5657375 npx vitest run src/core2/campaigns.test.ts passes, with the cause named in the PR by file and line, and the test passes on three more drawn places named with their seeds.

**Files.** src/core2/campaigns.test.ts, src/core2/modules/campaigns.ts

**Notes.** From the laws lead, Oct 25, reproducing #5582's golden-path failure on main.
