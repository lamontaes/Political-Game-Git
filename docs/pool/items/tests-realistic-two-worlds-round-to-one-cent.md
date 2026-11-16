---
id: tests-realistic-two-worlds-round-to-one-cent
title: "realistic-not-real fails when two worlds' drawn levels land within a cent of each other after rounding (row 15 at Coinjock, NC)"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: world
model: sonnet
effort: medium
source: "World-opening thread, Nov 16, gating the recorded-share change on train3"
---

**What.** `src/core2/realistic-not-real.test.ts`, "household money ... (audit rows 14 to 18)", fails at REALISTIC_SEED=637e415cfd281725 (Coinjock, North Carolina, 3713500) with "row 15: expected 188469 not to be 188469". The two worlds `637e415cfd281725:a` and `:b` each open a three-person household's monthly living costs at 188,469 cents against the published 172,500. It is red on train3 c0f54ca0 without any other change. Guards: the realistic-not-real guard (`npm run guards`, two-seeds-differ), which goes red by draw.

**Cause.** Measured: with `worldOffsetUnit(seed, "world-living-cost-level")`: the two worlds draw sizes 0.887464 and 0.887491, so the levels differ by about 0.0000018. That difference times 172,500 is under half a cent, and `worldMonthlyHouseholdLivingCosts` (src/core2/reference/living-costs-data.ts) rounds to the cent, so the two worlds land on the same value. Over 20,000 random seed pairs, 2 had sizes within 0.0001 of each other, about what an even draw gives, so the seeded unit mixes properly. The test asks two continuous draws never to land on the same rounded cent, and that fails by chance about once in ten thousand runs per checked figure. The fault is in the test, not the engine.

**Fix.** In the test, compare the two worlds by their drawn offsets (`worldOffsetUnit`) and not by the rounded cents, or require the rounded values to differ only when the offsets differ by more than one cent's worth. Keep the check that a world never opens on the published value. Apply the same reading to every rounded "two worlds differ" check in that file.

**Time box.** 1 hour.

**Rules.** No dice. The test is pinned through REALISTIC_SEED. One rule, all 56 places.

**Done when.** The test passes at REALISTIC_SEED=637e415cfd281725 (Coinjock, North Carolina) and at a drawn place it names with its seed, and it still fails when the two worlds are given the same seed. A second session sees in the running game, at a drawn place it names with its seed, that dev mode's "How this world opened" shows the household's living costs as a world offset, not the published figure.

**Waits on.** Nothing.

**Files.** src/core2/realistic-not-real.test.ts

**Notes.**
