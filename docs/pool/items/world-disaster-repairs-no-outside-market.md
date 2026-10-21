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

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): src/core2/disasters-no-market.test.ts uses only one pinned seed with no drawn-place case beside it, and never asserts that a disaster or the no-payee repair path occurred. The date-advanced and balanced-ledger assertions can pass without exercising the claimed regression. Keep the named repro, add a bounded drawn-place case, and assert the declared disaster/repair record and absent-payee path before asserting balanced money.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): The added declared-disaster assertion and drawn case improve the test, but src/core2/disasters-no-market.test.ts:40-52 still loops over damaged with no positive-length assertion, so all absent-payee checks can be skipped. The body reports exactly that for the drawn Michigan run: one disaster, zero damaged homes. The named repro must unconditionally assert positive damaged homes, no builder and no outside payee, plus no repair payment; keep the drawn case alongside it and do not let a repaired/has-payee case substitute for the missing-payee regression. Also filter damage by its numeric value rather than mere fact presence.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5327 (branch claude/disaster-repairs-no-market): The nonempty damaged-home and absent-payee assertions address the previous weakness. The body is stale against the checked diff, however: it says up to 12 draws, but src/core2/disasters-no-market.test.ts uses draw < 24 and played < 6; it says no game code changed, but src/core2/modules/disasters.ts adds townDisastersWithDamage; and check() no longer has the described return shape. Correct those claims. Also the updated merger skill requires a Done when table with one evidence row per acceptance line: https://github.com/lamontaes/Political-Game-Git/blob/f495d2c42735da1465d768954e6e69171a5b2abb/.agents/skills/merger/SKILL.md says a missing table is a send-back. Map the named and drawn cases, full seeds, positive damaged records, actual absent payees, zero repair payments and balanced journal to the item acceptance. No local gate pass is claimed here.; finish on that branch, merge main into it first.
