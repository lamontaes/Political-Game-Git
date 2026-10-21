---
id: world-disaster-repairs-no-outside-market
title: "A disaster declared in a town with no builders and no outside market stopped the game (Guthrie, Oklahoma, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83)"
area: world
kind: bug
priority: 1
size: S
status: in-pr
claimed-by:
pr: #5327
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A disaster declared in a town with no builder and no recorded outside market stopped the game with "No outside market recorded for jurisdiction_b0f9d889016644c9". The household repair payment in `src/core2/modules/disasters.ts` pays builders in town, or the town's outside market when there are none, and the outside market is not recorded for every town. Households now keep their money and nothing moves where there is no one to pay.

**Rules.** Wire to the world: the repair payment moves money only to a recorded payee. Estimate, never UNKNOWN does not apply here because no payee exists; the stopgap marker already on this path stays.

**Done when.** The test in src/core2/disasters-no-market.test.ts plays a year in Guthrie, Oklahoma on seed 35f504a41ec4764f52666b6c5ccd1992aa077e83 (salt "stories-from-engines") through the declared disaster without stopping, with the ledger balanced.

**Files.** src/core2/modules/disasters.ts, src/core2/modules/residents.ts, src/core2/disasters-no-market.test.ts

**Notes.** Found Oct 19 while writing the M4-01 moments test. A town with no builders and no outside market may still deserve a repair payee (a county contractor); that is a design question left for the disasters owner.

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): src/core2/disasters-no-market.test.ts uses only one pinned seed with no drawn-place case beside it, and never asserts that a disaster or the no-payee repair path occurred. The date-advanced and balanced-ledger assertions can pass without exercising the claimed regression. Keep the named repro, add a bounded drawn-place case, and assert the declared disaster/repair record and absent-payee path before asserting balanced money.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): The added declared-disaster assertion and drawn case improve the test, but src/core2/disasters-no-market.test.ts:40-52 still loops over damaged with no positive-length assertion, so all absent-payee checks can be skipped. The body reports exactly that for the drawn Michigan run: one disaster, zero damaged homes. The named repro must unconditionally assert positive damaged homes, no builder and no outside payee, plus no repair payment; keep the drawn case alongside it and do not let a repaired/has-payee case substitute for the missing-payee regression. Also filter damage by its numeric value rather than mere fact presence.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): The nonempty damaged-home and absent-payee assertions address the previous weakness. The body is stale against the checked diff, however: it says up to 12 draws, but src/core2/disasters-no-market.test.ts uses draw < 24 and played < 6; it says no game code changed, but src/core2/modules/disasters.ts adds townDisastersWithDamage; and check() no longer has the described return shape. Correct those claims. Also the updated merger skill requires a Done when table with one evidence row per acceptance line: https://github.com/lamontaes/Political-Game-Git/blob/f495d2c42735da1465d768954e6e69171a5b2abb/.agents/skills/merger/SKILL.md says a missing table is a send-back. Map the named and drawn cases, full seeds, positive damaged records, actual absent payees, zero repair payments and balanced journal to the item acceptance. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Oct 21 (claude, fixing PR #5336 branch claude/director-m4-01): merged main; main had a try/catch around outsideMarketFor in payHouseholds, replaced by this branch's non-throwing findOutsideMarket (outsideMarketFor stays, now built on it).
