---
id: tests-bill-paper-amending-estimate-machias-me-no-statute
title: "bill-paper fails in Machias, Maine: an amending bill's estimate names no bill that passed the law"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: 9376
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

**Cause.** Found in code: src/bench/bill-paper.test.ts guessed the earlier law's level from the body's kind (county board means county, anything else means city). Machias's body is a town board (`office:gus2025:190419:board`), whose bills are the township's (`billJurisdiction` = `gus2025:190419`). So the earlier law sat at `place:2341925`, a level the township's bill never reads, and the estimate fell through to the state row with no statute.

**Fix.** The test reads the level from the bill's record: the law-chain level whose jurisdiction is `billJurisdiction(api, row)`. No assertion changes, and the engine is untouched (PR 9376).

**Time box.** 2 hours.

**Rules.** Pinned tests: replay the named seed and keep every assertion of the test exactly as it stands. One rule, all 56 places: whatever reads the level reads it from the body's record, never from a named place.

**Done when.** The test passes at the named seed on the train. A second session then drafts an amending bill in a drawn town of its own choosing in the running game, and sees on the bill paper the bill that passed the law it amends.

**Waits on.** Nothing.

**Files.** src/bench/bill-paper.test.ts, src/bench/bill-stage.ts
