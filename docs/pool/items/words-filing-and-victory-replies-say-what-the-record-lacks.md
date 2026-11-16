---
id: words-filing-and-victory-replies-say-what-the-record-lacks
title: "At the filing counter the player says they've run before when they haven't, and a victory reply says 'them' with nobody named"
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
source: election-results thread press walks, Nov 16 2026 (Words lead's read of #9655)
checked:
---

**What.** Now that the filing and the victory night stage by presses (#9655), two old replies are offered that the record does not back. Seen: at Amherst, NH (3301220, world seed 2988b829…df4a9) and Haleyville, AL (0132704, world seed ab5f58e9be125c95), the clerk asks "Have you ever run a campaign before?" and the first reply offered is "I have. I'll be ready for November 4." on the player's first filing. At Haleyville the manager asks "You won. What's the first thing you want to say?" and the reply "That I'll be calling them tomorrow to ask for help." names nobody for "them".

**Cause.** Found in code. `scene-talk.reply-agree.i-have-i-ll-take-it-from-here` (data/english/parts/scene-talk.json) requires the fact `first-filing`, which src/director/purpose-scene.ts `walkThroughFacts` gives only when the player has exactly one filing on record, so the line claims an earlier campaign exactly when there was none. `scene-talk.reply-answer.that-i-ll-be-calling-them-tomorrow-to-ask-for-help` (victory-night, key honor) answers a manager question that names no one ("You won. What's the first thing you want to say?"); its neighbors in the same key are about the opponent ("That they ran hard, and I'll need their voters by Monday."), so "them" was likely meant as the opponent and their voters, but nothing in the packet says so.

**Fix.** Take both pieces out of the bank now. The Words lead rewords the second once told what it answers (the opponent and their voters, by the honor key's other answers), and it comes back gated on the `opponent` fact. The first has no true version on a first filing; on a repeat filing the clerk does not ask.

**Time box.** 1 hour for one session.

**Rules.** A line may not claim more than the record holds. No hand-written player text in code. Review: words.

**Done when.** A second session files by presses in a place drawn from all 56, on a first filing, and is not offered "I have."; and wins a race by presses and sees no victory-night reply that says "them" without naming who, naming place, seed and the moment ids.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json

**Notes.** Played files: /mnt/project-files/election-results/venue/amherst-played-at-3a28eca8.md, haleyville-played-at-3a28eca8.md.
