---
id: core-journal-invalid-nonnegative-amount-owner-after-i-liyang
title: "A played world in I Liyang, Northern Mariana Islands stops in the first years with 'Invalid nonnegative integer journal amount: owner after'"
area: core
kind: bug
priority: 1
size: M
status: open
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

**Cause.** Needs cause. Not found: the throw is `journal-state.ts` line 229 (`Invalid nonnegative integer journal amount: <field>`) and the field is "owner after"; the engine that wrote it is not named.

**Fix.** None until the cause is found.

**Time box.** 2 hours to find the cause, then re-claimed at the standard.

**Rules.** No dice. One rule, all 56 places: the fix is in the engine, never a case for this place.

**Done when.** A second session builds I Liyang at that seed (`buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: "territory:MP:i-liyang" })`), advances it three years with no error, and names the record that held the bad amount; a test pins that place and seed with an explicit timeout.

**Waits on.** Nothing.

**Files.** src/core2/journal-state.ts

**Notes.** Reproduce: the seed above is the world seed and the place key is `territory:MP:i-liyang`; `src/core2/state.test.ts` line 398 holds a test for the same message.
