---
id: world-disaster-repairs-no-outside-market
title: "A disaster declared in a town with no builders and no outside market stopped the game (Guthrie, Oklahoma, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83)"
area: world
kind: bug
priority: 1
size: S
status: open
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
