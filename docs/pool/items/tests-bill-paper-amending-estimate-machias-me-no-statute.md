---
id: tests-bill-paper-amending-estimate-machias-me-no-statute
title: "bill-paper fails in Machias, Maine: an amending bill's estimate names no bill that passed the law"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found by the bargaining thread (brief O) running changed tests on train 8bb1ff9d6eeb81f07b995d916b888f640f0a9c42, Nov 14 2026; the same red on the clean train
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** src/bench/bill-paper.test.ts, "an amending bill's estimate names the bill that passed the law, as its section text does", fails. It ran with GOLDEN_PATH_SEED=612deadbcae7ad23 in Machias, Maine (2341925), place seed 0f534d575e80597b3a9db0c3262d6eee657365d1aa0125699052642b531e9a7a: bill ...:board:...:5 amends the law bill ...:board:...:4 enacted, and `paper.sections[0].estimate.statute` is null where 'Ordinance 2025-1' is expected. It fails the same way on the clean train 8bb1ff9d, without the amount-bills change. Guards: the bill paper's line that names the bill which passed the law a section amends.

**Cause.** Needs cause. One lead to check first: the test enacts the earlier law at the "city" level of the town's law chain whenever the body is not a county board, and Machias's body is a town board, so the law row may sit at a level the amending bill's estimate does not read.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** Pinned tests: replay the named seed and keep every assertion of the test exactly as it stands. One rule, all 56 places: whatever reads the level reads it from the body's record, never from a named place.

**Done when.** The test passes at the named seed on the train. A second session then drafts an amending bill in a drawn town of its own choosing in the running game, and sees on the bill paper the bill that passed the law it amends.

**Waits on.** Nothing.

**Files.** src/bench/bill-paper.test.ts, src/bench/bill-stage.ts
