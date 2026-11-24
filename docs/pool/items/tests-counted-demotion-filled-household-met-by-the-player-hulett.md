---
id: tests-counted-demotion-filled-household-met-by-the-player-hulett
title: "The demotion test is red at Hulett, Wyoming: the player comes to know someone in the household it filled in, so it is never returned to the counts"
area: core
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: none
source: "Fable B, Nov 15 (seen in the gate of #9520; red on the clean train at the same seed)"
---

**What.** `GOLDEN_PATH_SEED=315ea1ded963515d50417297344d0373 npx vitest run src/core2/counted-demotion.test.ts` fails at Hulett, Wyoming with "household_5aef44534f07020e: expected undefined to be defined": the household the test filled in is not back in the counts after 300 days. The test draws a fresh place on every run, so any pull request that runs it can go red on it. Seen: a drawn test, red on the clean train at df168042e6.

**Cause.** Measured: Hulett, Wyoming, seed 315ea1ded963515d50417297344d0373, `GOLDEN_PATH_SEED=315ea1ded963515d50417297344d0373 npx vitest run src/core2/counted-demotion.test.ts` on the train at df168042e6, with a scratch copy of the test (not committed) that wrote down the household's members on the last day. The engine is right. The test picks a counted household nobody in the player's circle belongs to, fills it in, and waits for the monthly review to return it. During the 300 days the player's own life goes on, and by November 16, 2025 one of the two members, person_58b32c54c18e7645, is among the people the player knows. `protectedPeople` (src/core2/modules/counted-demotion.ts) never returns the player's circle to the counts, so the review passes the household over every month, as it should. The wait there is 222 days and six other households were returned in the same run. The test checks its premise (nobody in the circle) only on the first day.

**Fix.** In the test, the household is one that stays out of the player's life for the whole wait: after the wait, if a member has entered the player's circle, say so by person id and take the next such household, as `drawn-place-tests` describes for a case the draw does not hold, or pin the test to named places where the first household stays out (`pinned-tests`). No check is loosened and no engine code changes.

**Time box.** 1 hour for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never loosen a test to get green: the checks on the returned household stay as they are. One rule, all 56 places: the test names its place and seed.

**Done when.** A second session runs the command above on the train or main and it passes at Hulett, Wyoming, then runs it in a drawn place it names with its seed and sees a filled-in household returned to the counts with its money, jobs and people, by record id.

**Waits on.** Nothing.

**Files.** src/core2/counted-demotion.test.ts

**Notes.** Nov 15 (Fable B): not traced: which record made the player know that person (a meeting, work, a neighbor). The other member, person_58b32b54c18e7492, is not known to the player and is not protected.
