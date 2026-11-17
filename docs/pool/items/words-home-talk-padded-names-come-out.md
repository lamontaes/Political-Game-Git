---
id: words-home-talk-padded-names-come-out
title: "Home-talk answers stop ending in the player's name; where a line needs the record it names the thing"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by: Story lead
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: owner card, Nov 14 06:38Z ("A line counts as tied to the world when the moment it plays in was chosen by a fact about the world. The padded names come out."); Words lead rule 105
claimed-at: 2026-11-17
branch: claude/story-you-padded
---

**What.** Home-talk answers such as "Not yet, Eva." and "Good for you, Eva." end in the listener's name only so the line carries a record insert. The owner ruled on Nov 14 that the padded names come out, and the Words lead's rule 105 lets a speaker use the listener's name in at most one line of a talk, where it does work. Seen: in any home talk with a housemate, an answer reads without the name, and a line that names a thing names it from the record.

**Cause.** Found in code: data/english/parts/conversation.json holds 128 pieces whose text carries the slot `{you}`; the 14 thanks, sorry and please lines and the three first-meeting lines in the here-back move do work with a name, and the rest (112 on Nov 17 00:33) are the padding. The owner's card of Nov 14 is the cause of the rule.

**Fix.** Edit the `text` of each padded piece in data/english/parts/conversation.json and leave its key: drop `, {you}` and keep the line's other insert; replace the name with a record insert (`{said}`, `{employer}`, `{office}`, `{decider}`, `{hours}`, `{school}`, `{rent_again}`, `{illness}`) where the line's own facts set it, adding the fact to `requiresFacts`; or strip the name and let the line join the conversation bank's no-insert count. The player sees it in every home talk, in the answers a housemate gives back.

**Time box.** 4 hours for one session.

**Rules.** No hand-written player text in code: every change is a bank piece the English engine composes, with every slot declared in the bank's table. Wire to the world: a new insert must read from a record the same talk's subject sets, proven in a played world.

**Done when.** A second session, on main, plays a drawn place (a town, a state, a seed it draws) through home talks with a housemate for 90 days and reads that no answer ends in the player's name except a thanks, sorry or please line or a first meeting, and that each rewritten line that plays carries the thing from the record, named in the place and seed.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json, tests/guards/english/line-inserts-baseline.json, scripts/words/home-talk-walk.ts, tests/guards/english/home-talk-padded-names.test.ts

**Notes.**

- Nov 17: the stripped lines raise the conversation bank's no-insert count in tests/guards/english/line-inserts-baseline.json; the pull request names the exact rise and asks the CTO for the line (done-proof rule 1).
