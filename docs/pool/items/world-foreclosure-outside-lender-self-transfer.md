---
id: world-foreclosure-outside-lender-self-transfer
title: "Foreclosure sale transfers from the outside buyer to itself when it also holds the mortgage"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A foreclosure can sell a home to the outside market that also holds its mortgage. foreclosureSale currently calls transferCash from buyer.id to row.holderId unconditionally for the lender share, so identical owner accounts reach the self-transfer guard and stop the game. The corresponding moving-household sellHome caller was fixed in PR #5795; that fix does not cover this separate foreclosure caller.

**Rules.** Every dollar balances: settle the self-held loan without moving cash to the same account, preserve the normal distinct-lender transfer and borrower surplus, and never catch the guard or weaken it.

**Done when.** A focused regression in a generated buildBenchWorld town names the drawn place, seed, foreclosure record, mortgage and identical payer/payee account IDs, completes the foreclosure sale without a self-transfer error, and verifies loan settlement, surplus and price balance. Keep a distinct-lender case, and run the changed-file checks on main integrated with the repair.

**Files.** src/core2/housing-foreclosure.ts, src/core2/housing-homeless.test.ts or a focused foreclosure self-lender regression test

**Notes.** Source path identified while reviewing #5815: its housing-foreclosure.ts change proposes the same-party settlement repair, but that PR was returned for its separate poll-proof gaps. This item tracks the foreclosure defect independently. Main source still unconditionally calls transferCash in foreclosureSale around line 232. No current-main played-world reproduction is claimed by this source report; the new regression must supply it.
