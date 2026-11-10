---
id: tests-m2-07-drawn-place-without-race
title: "The M2-07 voting spec fails where the runner draws a place with no race two residents can file for at the start"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: claude/tests-m2-07-race-draw
pr: #6135
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T02:57:09.395Z
after:
lead: wire-elections
model: sonnet
effort: medium
root: rc9-place-facts-one-default
---

**What.** The golden-path runner gives src/core2/voting.test.ts (M2-07) the place it draws for the head commit, and the test used that place as is. Ivan, Arkansas (place key 0534540, seed 8204cf02c98b04d40207d6a46ee6d70f291c3712872130e95c5e24b207debf76) holds no local or state race that two residents can file for on January 5, 2026, so the spec failed with "no open local or state race". It failed again on Nov 8 in Waikoloa Village, Hawaii (1576600, seed 67c6696d488be63625780c83a2553abb64a3aaf1df2ea0e0a9ccbb0136e6adcc) after trying nine places, one of them twice. Eight other drawn towns fail the election-day test the same way (tests-election-day-no-race-to-enter is proposed to merge here), because filing is not yet open at the start date.

**Cause.** Found in code: src/core2/voting.test.ts lines 140 to 147 report "no open local or state race" after trying only the places drawn at the start date, with the filing window never waited for. Measured: seed 8204cf02c98b04d40207d6a46ee6d70f291c3712872130e95c5e24b207debf76 (Ivan, Arkansas) and seed 67c6696d488be63625780c83a2553abb64a3aaf1df2ea0e0a9ccbb0136e6adcc (Waikoloa Village, Hawaii).

**Fix.** Advance the drawn world weeks (bounded, as src/director/primary-challenge.test.ts does) until a race has filing open that two residents can file for, then run it to its result, naming every place passed over. Take the election-day test case with it, adding seed e253fc7f73075455 and its eight places (Milbridge, Maine; South Barre, Vermont; Tellico Village, Tennessee; Dixon, Iowa; Tuckerton, New Jersey; Rose Hill, Virginia; place 3722305 in North Carolina; Agana Heights, Guam) and using the clerk's list (playerContests) in src/bench/election-day.test.ts once filing opens.

**Time box.** 3 hours.

**Rules.** Never loosen the check to get green: the spec must still run a real race in a drawn place to its result. One rule, all 56 places: keep drawing from all 56 and name the place and seed, including every place passed over. The filing answer is the elections engine's (playerMayFileFor, filingWindowOpen), not the test's.

**Done when.** A second session runs src/core2/voting.test.ts with GOLDEN_PATH_SEED=8204cf02c98b04d40207d6a46ee6d70f291c3712872130e95c5e24b207debf76 and GOLDEN_PATH_PLACE_KEY=0534540, with the Waikoloa Village seed above, and with two fresh seeds, and sees each pass, logging every place passed over and the place it ran in; the played race still checks every named adult's ballot against their own reasons. src/bench/election-day.test.ts passes with GOLDEN_PATH_SEED=e253fc7f73075455 and one more drawn seed.

**Waits on.** Nothing.

**Files.** src/core2/voting.test.ts, src/bench/election-day.test.ts, src/core2/modules/elections.ts, src/director/primary-challenge.test.ts

**Notes.** Found Oct 26 by the traits lead while diagnosing #5979's golden-path red.

Nov 8, merge desk: it fails again on main at 757242caa6. Waikoloa Village, Hawaii (place key 1576600, seed 67c6696d488be63625780c83a2553abb64a3aaf1df2ea0e0a9ccbb0136e6adcc): no open local or state race in any of the nine places tried (1576600, 2539152, 1150000, 3731360, 0937770, 2880160, 4001400, 4454460, 1150000); 1150000 is tried twice. It is the same on #7455's head, so it is not that PR's. Reopened.
