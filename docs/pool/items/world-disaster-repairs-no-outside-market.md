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
claimed-at: 2026-10-23T23:03:14.628Z
---

**What.** A disaster declared in a town whose households had no open builder and no recorded outside market stopped the game on the declaration day: "No outside market recorded for jurisdiction_b0f9" (Guthrie, Oklahoma, place 4031700, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83, drawn with the salt "stories-from-engines"). The repair payment in `src/core2/modules/disasters.ts` sent the households' repair money to builders outside the town when none was open in it, and threw when the world recorded no outside market for the town. Main now returns there, so the households pay nothing for repairs where nobody can be paid. This item is the regression test that keeps that path played and checked.

**Rules.** Wire to the world: where a builder or an outside market is recorded on the day, the repairs are paid to it; where none is, no money moves and the journal still balances. One rule, all 56 places: beside the named repro, a case draws its place from all 56 and names the place and seed. A test proves the path only if it asserts the path ran: damaged homes, the payees as they stood, and the repair payments, never only that the date advanced.

**Done when.**

1. `src/core2/disasters-no-market.test.ts` plays a year in the named repro (Guthrie, Oklahoma, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83, salt "stories-from-engines") through the declared disaster without stopping, and asserts that a disaster damaged homes (a numeric damaged-home count above 0), that on the eve of its declaration the player's town had no open builder and no outside market, that no repair was paid for it, and that the journal's debits equal its credits. When the crash was found the player had moved to such a town on their own; where current main keeps them home, the test makes that one move itself, through the writer the moves engine uses, and says so.
2. Beside it, a case draws places from all 56 until one has a disaster that damaged homes in its first year, and asserts that repairs were paid for it exactly when a builder or an outside market was recorded on the eve, with the journal balanced, naming the place and seed.
3. Each case's timeout is a measured bound: its worst case on a measured run, stated beside it.
4. The PR body names, for both cases, the disaster record id, the damaged homes, the payees on the eve, the repair payments and the journal totals.

**Files.** `src/core2/disasters-no-market.test.ts`; `src/core2/modules/disasters.ts` (only the `townDisastersWithDamage` reader the drawn case uses to pass over a place with no damaging disaster due).

**Notes.** The specification was written on Oct 23 from the acceptance the PR quoted and the send-backs below.

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): src/core2/disasters-no-market.test.ts uses only one pinned seed with no drawn-place case beside it, and never asserts that a disaster or the no-payee repair path occurred. The date-advanced and balanced-ledger assertions can pass without exercising the claimed regression. Keep the named repro, add a bounded drawn-place case, and assert the declared disaster/repair record and absent-payee path before asserting balanced money.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): The added declared-disaster assertion and drawn case improve the test, but src/core2/disasters-no-market.test.ts:40-52 still loops over damaged with no positive-length assertion, so all absent-payee checks can be skipped. The body reports exactly that for the drawn Michigan run: one disaster, zero damaged homes. The named repro must unconditionally assert positive damaged homes, no builder and no outside payee, plus no repair payment; keep the drawn case alongside it and do not let a repaired/has-payee case substitute for the missing-payee regression. Also filter damage by its numeric value rather than mere fact presence.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): The nonempty damaged-home and absent-payee assertions address the previous weakness. The body is stale against the checked diff, however: it says up to 12 draws, but src/core2/disasters-no-market.test.ts uses draw < 24 and played < 6; it says no game code changed, but src/core2/modules/disasters.ts adds townDisastersWithDamage; and check() no longer has the described return shape. Correct those claims. Also the updated merger skill requires a Done when table with one evidence row per acceptance line: https://github.com/lamontaes/Political-Game-Git/blob/f495d2c42735da1465d768954e6e69171a5b2abb/.agents/skills/merger/SKILL.md says a missing table is a send-back. Map the named and drawn cases, full seeds, positive damaged records, actual absent payees, zero repair payments and balanced journal to the item acceptance. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5327 (branch claude/disaster-repairs-no-market): Pool specification is still a TODO shell despite the quoted body acceptance, and the one-hour drawn-test timeout lacks a measured reason; write the actual specification and corresponding evidence; finish on that branch, merge main into it first.
