---
id: gov-every-legislature-test-finds-an-outside-seat-filled-in
title: "The every-legislature test finds an outside state seat already filled in with a person at the opening, by drawn place"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: opus
effort: medium
lead: governing
root: none
source: Account lead, Nov 15 (red on the clean Train head ff9703d7 at Bixby TX seed a0d5835ecae61337, Live Oak SC seed eead0e7f2201c044 and Honokaa HI seed 133347db9d05f4df, always the same seat)
claimed-at:
after:
checked:
---

**What.** `src/core2/offices-every-legislature.test.ts` expects every seat outside the played town to be named but not filled with a person at the opening; at three drawn places it finds `term:seat:US-AR:lower:001:0:2025-01-20` filled in (a `personId` that is not null), so the test is red on the Train by draw. Guards: the opening's outside seats.

**Cause.** Needs cause. Read first: whether something at the opening (a draw of who exists, a person who works in or moves to an Arkansas House seat, or the player's own household) fills seat 001 of the Arkansas lower chamber with a full person, and whether the test's expectation or the opening is wrong; the same seat in all three places says the draw is not the cause.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session to find the cause and write it here. When it runs out, write what was read and stop.

**Rules.** One rule, all 56 places; two-level population: only the people the player meets are filled in.

**Done when.** A second session, in a played world at a drawn place and seed nobody chose, runs the test and sees it pass, and sees that no outside seat holds a person who was not met.

**Waits on.** Nothing.

**Files.** src/core2/offices-every-legislature.test.ts, src/core2/modules/offices.ts
