---
id: world-disaster-repairs-no-outside-market
title: "A disaster declared in a town with no builders and no outside market stopped the game (Guthrie, Oklahoma, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83)"
area: world
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/disaster-repairs-no-market
pr: #5327
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:22:10.636Z
---

**What.** A disaster declared in a town with no builder and no recorded outside market stopped the game with "No outside market recorded for jurisdiction_b0f9d889016644c9". The household repair payment in `src/core2/modules/disasters.ts` pays builders in town, or the town's outside market when there are none, and the outside market is not recorded for every town. Households now keep their money and nothing moves where there is no one to pay.

**Rules.** Wire to the world: the repair payment moves money only to a recorded payee. Estimate, never UNKNOWN does not apply here because no payee exists; the stopgap marker already on this path stays.

**Done when.** The test in src/core2/disasters-no-market.test.ts plays a year in Guthrie, Oklahoma on seed 35f504a41ec4764f52666b6c5ccd1992aa077e83 (salt "stories-from-engines") through the declared disaster without stopping, with the ledger balanced.

**Files.** src/core2/modules/disasters.ts, src/core2/modules/residents.ts, src/core2/disasters-no-market.test.ts

**Notes.** Found Oct 19 while writing the M4-01 moments test. A town with no builders and no outside market may still deserve a repair payee (a county contractor); that is a design question left for the disasters owner.
