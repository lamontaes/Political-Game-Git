---
id: tests-recalls-no-recall-started-again
title: "recalls.test fails on main again: no recall starts in six drawn places (seed 1b251a8a...55da)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: wire-elections
source: wire-office session, Oct 28 (found red on main)
---

**What.** `src/core2/recalls.test.ts` fails two of six cases on clean main with GOLDEN_PATH_SEED=1b251a8aaa0f7710143adc4ff3cd45fa37ae0151be5cce350c171993b62555da: "no recall started in US-WA 5327960, US-KS 2029600, US-MT 3060450, US-WA 5322115, US-FL 1253850, US-ND 3813020". The same failure was fixed once under `tests-recall-ordinance-no-recall-started` (done), so something since has made recalls rarer or the draw narrower. Other seeds pass.

**Rules.** No dice: a recall starts from voters' anger at a member's recorded vote and the state's recall law, never a roll, so the fix finds why no voter group reached the petition threshold in these six places. One rule, all 56 places: the test draws places from all 56 and names the place and seed; a place without a recall law is passed over by name. Never weaken a test: the expectation stays that some drawn place starts a recall.

**Done when.** `src/core2/recalls.test.ts` passes with that seed and on ten more drawn seeds, and the PR body names, by record id, the vote and the petition that start the recall in at least one of the six places above, or why none of them can (no recall law, no recorded vote).

**Time box.** 3 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Files.** src/core2/recalls.test.ts, src/core2/modules/recalls.ts

**Notes.** Reproduced on main at d3ee6986bc and on the wire-office row 42 branch with the same seed (both 2 failed, 4 passed).
