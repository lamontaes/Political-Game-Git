---
id: core-journal-invalid-nonnegative-amount-owner-after-i-liyang
title: "A played world in I Liyang, Northern Mariana Islands stops in the first years with 'Invalid nonnegative integer journal amount: owner after'"
area: core
kind: bug
priority: 1
size: M
status: merged
pr: #9318
standard: 2
after:
blocked-on:
model: opus
effort: medium
root: none
source: found by the #9153 filing-fee carry thread, Nov 14
lead: money
---

**What.** Building the played world for I Liyang, Northern Mariana Islands (`territory:MP:i-liyang`) with seed `9a0022709c0625e7690862cc99da809bdc21c4e18dc26457386aa69cee9ef78e` and advancing it three years with `advanceCore` stops with `Error: Invalid nonnegative integer journal amount: owner after`. The same crash is on the clean train 214e6a6e and on the filing-fee carry, so it is not from either. A player who starts a life in that place loses the game when the year runs. Seen: the game stops in the first three years of a life in I Liyang instead of running on.

**Cause.** Measured: the item's own recipe (`buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: "territory:MP:i-liyang" })`, then `advanceCore`) at the train head 214e6a6e stops on October 8, 2025 with this stack: `circulatorShift` (src/core2/modules/campaigns.ts) calls `spend`, which posts the circulators' pay, and the campaign's cash is already gone. It is the fault pull request #9318 fixed for Tutu, U.S. Virgin Islands (`campaigns-purchases-spend-the-set-aside-funds`): a purchase budgeted from raised less spent and so spent the money set aside for the circulators, whose pay then fell due with nothing left.

**Fix.** Built by pull request #9318, folded into the train at f6eba317f1: every purchase and venue offer budgets from `freeMinor` (src/core2/modules/campaigns.ts), the money not set aside. A life in I Liyang now runs on instead of stopping in its first autumn.

**Time box.** 2 hours to find the cause, then re-claimed at the standard.

**Rules.** No dice. One rule, all 56 places: the fix is in the engine, never a case for this place.

**Done when.** A second session builds I Liyang at that seed (`buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: "territory:MP:i-liyang" })`), advances it three years with no error, and names the record that held the bad amount; a test pins that place and seed with an explicit timeout.

**Waits on.** Nothing.

**Files.** src/core2/journal-state.ts

**Notes.** Reproduce: the seed above is the world seed and the place key is `territory:MP:i-liyang`; `src/core2/state.test.ts` line 398 holds a test for the same message. Checked by Fable B, Nov 15, 2026, on the train at 32a994212b: the same place and seed ran three years to January 24, 2028 with no error, built both without and with the warm-up days. Fixed by #9318; nothing further to build. The pinned test the Done when asks for was not written.
