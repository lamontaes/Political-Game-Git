---
id: director-friend-ask-test-needs-a-friend-in-a-party
title: "The friend-ask scene test staged a friend with no party, so its one remaining request cannot be worded"
area: director
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: 9341
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: filed by hand by the meetings and floor builder from the Account lead's red report (promises builder, train ce166298), Nov 14 2026
checked: meetings and floor builder 2026-11-14
---

**What.** The meeting-scene friend-ask test drew a town where the player and the new friend shared no party, and the scene was skipped ("cannot be worded from the records given"), so the test could not show a friend's ask. In play a friend with no shared party asks nothing, which is right while the one remaining request names the next meeting of a party. Seen: the meeting scene test skipped at Arab, Alabama on the Train's clean head ce166298.

**Cause.** Found in code: b97d14d147 (Nov 14) cut the eleven friend-ask requests that promised a day no engine holds, a Words lead ruling, leaving one request that requires the `party` fact, which src/director/meeting-facts.ts sets only when both people hold the same party tie (partyTie); at Arab, Alabama (0102116, run on a seed that draws it) the player starts with no party ("the-player-chooses") and the test's friend was the first townsperson sorted by id, in no shared party.

**Fix.** The test's friend is a townsperson in a party and the player joins that party first (joinParty, the player's own act), so the scene is worded through the game's own path. No line or assertion changed; the broader fix (a friend's ask that names a held day) stays with words-friend-ask-leads-to-a-held-day.

**Time box.** 2 hours.

**Rules.** No dice; one rule for every place; no new stopgaps.

**Done when.** A second session runs the friend-ask test in the running game's world and sees it pass at Arab, Alabama (seed s32151) and at a random drawn place, with the scene composed in the played world and its yes keeping a promise. Names place and seed.

**Waits on.** Nothing.

**Files.** src/director/data/kept-scene-kinds.json

**Notes.** Seen: Arab, Alabama, seed s32151, skipped before and composed after. For a player who is playing, the stop is already refused: the ledger's registerInterrupts asks `speaks`, which asks the bench's `wordsPurpose`, and a scene the bank cannot word goes to the Journal as a line with no stop (src/director/ledger.ts, src/bench/world.ts). That is the staging condition the Account lead asked for, and it reads whether the scene can be worded now, so it widens by itself when friend requests that need no party return. This is read from the code and not yet seen played: whoever builds words-friend-ask-leads-to-a-held-day plays the no-party Journal line then.

- Nov 17, story-cut-deleted-scene-kinds: src/director/meeting-scene.test.ts deleted with its scene kind (owner, Nov 17: "DELETE EVERYTHING THAT IT HASNT WRITTEN").
