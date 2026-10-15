---
id: core-disasters-ss-prices
title: "Real disasters through Oct 9 2026, Social Security under the law in force, steady prices, a year under two minutes (#4125)"
area: core
kind: feature
priority: 2
status: claimed
claimed-by: opus-core
pr: #4125
blocked-on:
milestone:
source: "open PR #4125"
claimed-at: 2026-10-15T22:44:04.634Z
---

**What.** The carrying pull request opens games on Jan 20, 2025 with FEMA's real disasters, their aid and repairs, pays Social Security under the law in force, holds prices steady, and brings a town year under two minutes. It conflicts with main in scripts/zero-dice-guard.mjs, src/core2/choice.ts and src/core2/module-data.ts, so none of it reaches the owner. The player would notice real storms hitting a drawn town with aid paid and repairs made, and retirees' checks that follow the law in force. The owner call still open is what happens after FEMA's records end.

**Rules.** Wire to the world: disaster aid and repairs must move money and homes through the ledger in every one of the 56 places, not one example. Speed: a town's game year must stay under two minutes and no more than 20 percent slower than base. No dice: a disaster comes from a hazard record, never a monthly chance.

**Done when.** Branch merged with main (plain merge, never force) and the release declaration present. In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) a disaster record id is followed to the aid payment and the repair, a retiree's Social Security payment record id matches the law in force, and the year runs under two minutes. The test files changed by the branch pass. The owner plays it: start in a drawn town and see a real storm and its aid.

**Files.** src/core2/choice.ts, src/core2/module-data.ts, scripts/zero-dice-guard.mjs, docs/release/changes/

**Notes.** Read the PR body and any CTO comment first.
Sent back 2026-10-15 from PR #4125 (branch opus-core): code conflict with main in scripts/zero-dice-guard.mjs, src/core2/choice.ts, src/core2/module-data.ts; finish on that branch, merge main into it first. (PR references as of 2026-10-15.)
