---
id: words-filing-and-victory-replies-say-what-the-record-lacks
title: "At the filing counter the player says they've run before when they haven't, and a victory reply says 'them' with nobody named"
area: words
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/project-thread-5efbu8-replies
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

**What.** Now that the filing and the victory night stage by presses (#9655), two old replies are offered that the record does not back. Both were played by presses at Amherst, NH (3301220, world seed 2988b829…df4a9) and Haleyville, AL (0132704, world seed ab5f58e9be125c95). Seen: the filing scene offers a reply claiming an earlier campaign, and the victory night offers a reply naming nobody.

**Cause.** Found in code: `scene-talk.reply-agree.i-have-i-ll-take-it-from-here` (data/english/parts/scene-talk.json) requires the fact `first-filing`, which src/director/purpose-scene.ts `walkThroughFacts` gives only when the player has exactly one filing on record, so the line claims an earlier campaign exactly when there was none. `scene-talk.reply-answer.that-i-ll-be-calling-them-tomorrow-to-ask-for-help` (victory-night, key honor) answers a manager question that names no one ("You won. What's the first thing you want to say?"); its neighbors in the same key are about the opponent ("That they ran hard, and I'll need their voters by Monday."), so "them" was likely meant as the opponent and their voters, but nothing in the packet says so.

**Fix.** Words lead, Nov 16: take "I have. I'll be ready for {vote-day}." out (it can never be true where it plays). Replace the victory reply with "That I'll call {opponent} tomorrow and ask for help.", gated on the `opponent` fact; if "That they ran hard, and I'll need their voters by Monday." plays with no one named before it, replace it with "That {opponent} ran hard, and I'll need those voters by Monday.", gated the same way.

**Time box.** 1 hour for one session.

**Rules.** Ask why: every line a person says rests on a record the packet holds, so no reply claims a campaign the filings table lacks or a person it never names. Review: words.

**Done when.** A second session files by presses in a drawn place from all 56, on a first filing, and is not offered "I have."; then wins a race by presses there or in another drawn place and sees the victory-night reply name the runner-up, citing place, seed and the moment's record id.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json

**Notes.** Played files: /mnt/project-files/election-results/venue/amherst-played-at-3a28eca8.md, haleyville-played-at-3a28eca8.md.
