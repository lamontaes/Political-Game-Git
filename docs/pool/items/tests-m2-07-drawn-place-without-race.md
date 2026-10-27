---
id: tests-m2-07-drawn-place-without-race
title: "The M2-07 voting spec fails where the runner draws a place with no race two residents can file for at the start"
area: elections
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/tests-m2-07-race-draw
pr: #6135
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T02:57:09.395Z
---

**What.** The golden-path runner gives src/core2/voting.test.ts (M2-07) the place it draws for the head commit, and the test used that place as is. Ivan, Arkansas (place key 0534540, seed 8204cf02c98b04d40207d6a46ee6d70f291c3712872130e95c5e24b207debf76) holds no local or state race that two residents can file for on January 5, 2026, so the spec failed with no open local or state race. It fails the same way on clean main at 3e4f57237f, and it turned the golden-path check red on #5979, whose merge commit drew Ivan.

**Rules.** Never loosen the check to get green: the spec must still run a real race in a drawn place to its result. One rule, all 56 places: keep drawing from all 56 and name the place and seed, including every place passed over.

**Done when.** src/core2/voting.test.ts passes with GOLDEN_PATH_SEED=8204cf02c98b04d40207d6a46ee6d70f291c3712872130e95c5e24b207debf76 and GOLDEN_PATH_PLACE_KEY=0534540, logging that Ivan, Arkansas was passed over and naming the place it ran in, and passes on two fresh seeds with no place key; the played race still checks every named adult's ballot against their own reasons.

**Files.** src/core2/voting.test.ts

**Notes.** Found Oct 26 by the traits lead while diagnosing #5979's golden-path red.
