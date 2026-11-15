---
id: campaign-circulator-pay-posts-negative-owner-balance
title: "A campaign's circulator pay posts a cash amount below zero and stops the world build"
area: gov
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: wire-office
model: sonnet
effort: medium
source: Journal builder, Nov 14, 2026, journal-race-margin.test.ts and journal-story.test.ts on the train 6738bf8417 merged into #9119
---

**What.** Advancing a world throws "Invalid nonnegative integer journal amount: owner after" (src/core2/journal.ts:176) on some draws. Stack: circulatorShift (campaigns.ts:3560) → spend (campaigns.ts:4312) → postMoney (campaigns.ts:4484) → postJournal (state.ts:1041) → postCashJournal (journal-state.ts:1417) → projectCashJournal (journal.ts:498).

**Cause.** Needs cause. Seen with GOLDEN_PATH_SEED=f06e00f0538bf6809078d24a90485082d362b578 in src/director/journal-race-margin.test.ts (places drawn from that seed as "journal-race-margin:0", the first being Dagu, Northern Mariana Islands, then Laramie, Wyoming and Maunabo, Puerto Rico); a second throw with the same message came in journal-story.test.ts on a random seed. A circulator's pay is posted when the paying owner's balance after it would be below zero; which account and amount is not yet read.

**Rules.** Fix at the root in the campaign's spending or its funds, never by clamping or skipping a posting. One rule, all 56 places.

**Done when.** The race-margin test at that seed builds and runs its days with no journal error, and the PR names the account, amount and record id that carried the negative balance and why.

**Time box.** 2 hours; if not done, push what exists and write the handoff.

**Files.** src/core2/modules/campaigns.ts, src/core2/journal-state.ts.
