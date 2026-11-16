---
id: tests-promises-broken-vote-through-the-players-seat
title: "The promises test breaks a vote promise with a stand-in vote instead of the player's own vote"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: words
source: S6 (gov-serve-ask-price-said-aloud, #9548), Nov 15 2026; Account lead, Nov 15 20:30Z
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The vote-promise broken raises ("You told me yes on {bill}. Then you voted no.", "I counted on your vote for {bill}. I won't again." and "You gave me your word on {bill}. What happened?") are proved by a test that casts the player's breaking "no" with `castMemberVote` directly, not through the player's own seat. By the Account lead's ruling on #9369 (Nov 15 19:48Z), that is a stand-in vote, and lines resting on it are not played. Seen: in src/director/promises.test.ts, the vote case.

**Cause.** Found in code: src/director/promises.test.ts (added by #9192, folded into the Train as ba154ac9) calls `castMemberVote(api, billId, player, "no")` before advancing to the bill's floor date. The roll itself comes on the body's own floor day, but the vote skips `chooseOwnVote` (src/bench/bill-stage.ts), the player's seat path that checks `mayChoose`.

**Fix.** Cast the player's vote with `chooseOwnVote(core, billId, "no")` before the floor day, as src/director/serve-price-scene.test.ts does after #9548. Do it in the test where the promise code is moving into the engine (thread "Build saves and move promises into the engine"), so the moved test plays the vote that way.

**Time box.** 1 hour for one sonnet session.

**Rules.** Wire to the world: the player's vote goes through the player's own seat, and the roll is the body's own on its floor day.

**Done when.** A second session runs the moved promises test at its pinned place and seed, and sees the broken vote promise settled by a vote cast through `chooseOwnVote` at the body's own roll, with the three broken raises said in the next talk.

**Waits on.** The promise code's move into the engine (thread "Build saves and move promises into the engine").

**Files.** src/director/promises.test.ts (or where it moves)
