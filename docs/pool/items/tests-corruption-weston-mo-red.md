---
id: tests-corruption-weston-mo-red
title: "M3-09 corruption spec failed in Weston, Missouri on a PR that touches no corruption code"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The golden-path run on PR 6097's head d890c67d3a drew Weston, Missouri (place 2978856, seed 1512c792766b67c4084e842b0841c4d520930ce6eef442caaf31fdb6940a78ba) for M3-09 (src/core2/corruption.test.ts) and it failed; the PR changes only bench screens. The next draw on the PR passed. Earlier place-dependent M3-09 failures were fixed under tests-corruption-dulac-no-offer-answer and gov-corruption-test-two-taken-bribes.

**Rules.** One rule, all 56 places: an accepted spec passes in every drawn place. No dice.

**Done when.** M3-09 passes with GOLDEN_PATH_SEED=1512c792766b67c4084e842b0841c4d520930ce6eef442caaf31fdb6940a78ba and GOLDEN_PATH_PLACE_KEY=2978856, with the cause named by record if a fix was needed.

**Files.** src/core2/corruption.test.ts, src/core2/modules/corruption.ts

**Notes.** Filed by the m0-m2 lead from CI run 40240835920 (job 121312058489). Lead: gov.
