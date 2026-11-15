---
id: words-played-talks-cause-invite-yes-not-followed-up
title: 'A cause invite answered "Yes, I do." ends the talk with no line back'
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Found while gating #9440 on Train 88b5b879 (Nov 15); red the same on that Train alone
---

**What.** `src/director/played-talks.test.ts` ("fifteen talks run to their close ... follow up every answer") is red at Cumming, Iowa, seed 7952d3f3e3253ee4: a cause-invite talk on 2025-11-15 between person_141e48f6edb5fe78 and person_301ea8d02246ff01 (the cause is allowing multifamily housing in single-family zones) has 3 lines and 1 reply, and the player's "Yes, I do." gets nothing back. It was green on Train d82bf47e and came in with one of the folds between d82bf47e and 88b5b879.
Seen: a neighbor asks the player to join a cause, the player says yes, and the talk just stops.

**Cause.** Measured: `GOLDEN_PATH_SEED=7952d3f3e3253ee4 npx vitest run src/director/played-talks.test.ts` on the clean Train 88b5b8796aae165be2228c7b8b614707dcd7d390 fails at line 206 with `"Yes, I do." not followed up`. Which fold brought it in is not yet traced.

**Fix.** Bisect the folds from d82bf47e to 88b5b879 on the seed above, name the move and record that left the yes without a reply, and give the asker's answer from the existing cause-invite moves (or restore what the fold removed). Do not loosen the test.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** Ask why: the fix names the fold, the move and the record that left the player's yes with no line back before changing anything.

**Done when.** A second session, on the Train, plays talks in a drawn place and sees every yes to a cause invite get a line back; the test passes at 7952d3f3e3253ee4 and c55062fdf88f46ad.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/played-talks.test.ts
