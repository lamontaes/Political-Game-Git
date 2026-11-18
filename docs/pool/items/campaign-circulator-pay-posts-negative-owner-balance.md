---
id: campaign-circulator-pay-posts-negative-owner-balance
title: "A campaign's circulator pay posts a cash amount below zero and stops the world build"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: wire-office
source: Journal builder, Nov 14, 2026, journal-race-margin.test.ts and journal-story.test.ts on the train 6738bf8417 merged into #9119
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** Advancing a world throws "Invalid nonnegative integer journal amount: owner after" (src/core2/journal.ts line 176) on some draws, so a played town stops mid-year. It happens while a campaign pays its circulators. Seen: a player whose town has a campaign with paid circulators sees the world stop instead of the race going on.

**Cause.** Needs cause. Stack: circulatorShift (campaigns.ts line 3560), spend (4312), postMoney (4484), postJournal (state.ts 1041), postCashJournal (journal-state.ts 1417), projectCashJournal (journal.ts 498). Seen with GOLDEN_PATH_SEED=f06e00f0538bf6809078d24a90485082d362b578 in src/director/journal-race-margin.test.ts (places drawn from that seed as "journal-race-margin:0": Dagu, Northern Mariana Islands, then Laramie, Wyoming and Maunabo, Puerto Rico); a second throw with the same message came in journal-story.test.ts on a random seed. Which account and amount went below zero is not yet read.

**Fix.** None until the cause is found.

**Time box.** 2 hours; if not done, push what exists and write the handoff.

**Rules.** One rule, all 56 places; no named place in logic.

**Done when.** A second session, on main in the drawn places Dagu (Northern Mariana Islands), Laramie (Wyoming) and Maunabo (Puerto Rico) at that seed, advances the race-margin test's days in the running game with no journal error and sees the campaign's circulators paid. The PR names the account, amount and record id that carried the negative balance and why.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/journal-state.ts

**Notes.** The journal-story test that hit this fault on a random seed was re-pinned on Nov 15 (Account lead, ruling 1) to Stockton, Utah (key 4973050): the old premise was that other people's filings and oaths were told over three random draws; rule 87 tells them only where they name the subject, so the test no longer draws.
