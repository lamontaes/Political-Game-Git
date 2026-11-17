---
id: words-family-loss-same-reply-under-two-branches
title: "After a lost race, one reply is not offered again deeper in the same talk"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: Words read of pull request 9512 at its merged head, Nov 17
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** After a lost race the player is offered "I really thought we had it." on the first branch and again under the deflect branch of the same talk, and the thank reply is offered at the top and again one level down in different words.
The repeats make the tree feel padded when a player reads it branch by branch.
Seen: Shiloh, Georgia, seed read-9512-f, family-loss talk, the replies under "I put about $1,200 in and lost" and under "Give me a day before we add it up".

**Cause.** Found in code: the move picker `wordSceneMove` in src/english/scene-talk-words.ts (its `unsaidSentence` check) excludes a part already said on the same branch but not one said on a sibling branch, and the family-loss bank gives several branches the same few replies.

**Fix.** Make the picker prefer a reply not already offered anywhere in the talk's tree while another fits, in the same stable pick, without a dice roll; where no other reply fits, say so in the item's Notes and leave the repeat.

**Time box.** 3 hours for a Sonnet session.

**Rules.** No dice: the choice among equal fits is the stable pick by the speaker's voice, and nothing is rolled.

**Done when.** A second session sees, in a drawn place with a lost race (name the place and seed), that no reply appears under two branches of one family-loss talk while another fitting reply exists, checked by a test that walks the played tree.

**Waits on.** Nothing.

**Files.** src/english/scene-talk-words.ts, data/english/parts/scene-talk.json, src/director/family-loss-stake-scene.test.ts

**Notes.** Filed Nov 17 from the Words read of pull request 9512; not fixed in that pull request.
