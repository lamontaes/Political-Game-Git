---
id: story-vote-ask-second-round-moves-on
title: "The second round of a vote ask moves the talk on instead of repeating the first"
area: words
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/story-vote-ask-later-replies
pr: 10141
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: Story lead's fresh-reader pass on the cut (#10063), Nov 18: 79 of 144 vote-ask paths judged a rehash under the rule later-replies-move-the-talk-on
checked:
---

**What.** When a colleague asks the player's vote on a bill and presses, pleads or bargains, the player's second-round replies said the first-round stances again in new words ("You've got my vote" after "Put me down"). Seen: the vote ask's second round, after the colleague's first answer.

**Cause.** Measured: a fresh reader judged 79 of 144 paths a rehash. The second round is the `reply` rows chosen by `after` (the asker's move before); the first-round rows, which carry no `after`, were offered again, and the two relent rows were flat yeses.

**Fix.** Write second-round rows for each `after` the arcs offer (plea, press, threaten, bargain) that say something the first round did not: a yes with a condition, a no with its reason, an ask for the next draft or a sponsor's call, a way to sit it out, a polite end. Keep the facts each use requires.

**Time box.** 2 hours.

**Rules.** The player says only what they chose: a reply never promises an act the engine does not record. Every line of four words or more carries an insert.

**Done when.** A fresh reader judges the vote ask's second-round paths under later-replies-move-the-talk-on and finds no rehash beyond the planted row; the scene-talk test passes.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json

**Notes.** Nov 18 (Story): 25 rows added, 2 deleted; 233 paths judged by a fresh reader, 232 passed (the plant failed); 218 pairs judged, every plant caught. Two decline lines that promised an act the engine never records (leaving the floor, being marked not voting) reworded by the lead.
