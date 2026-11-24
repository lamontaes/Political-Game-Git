---
id: words-sitting-decline-repeats-one-wording
title: "A sitting declined all the way through says the same line each time, and a moderator has no wording of their own"
area: words
lead: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread, Nov 14, political-asks advice test
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** After the interview and debate decline fix, a sitting where the player picks "Nothing to add on that." for every question has the asker say "No comment, then." after each, word for word. A moderator on a stage says it as a reporter does. Seen at Climax, Georgia (1316908), seed pin-b draw 0 (interview, three times) and Shelby, Mississippi (2867040), seed pin-b draw 1 (debate, four times). Seen: the asker's line after a declined question in an interview or debate sitting.

**Cause.** Found in code: in `take()` (src/director/sitting.ts) the pieces under `interview-take-declined-reply-take`, `debate-take-declined-reply-take` and the brief takes in data/english/parts/conversation.json hold one text for this take, "No comment, then.", and none is written for a moderator.

**Fix.** The Story session writes more ways for a reporter to take a pass and a separate set for a moderator, as bank pieces keyed to the declined or brief take of each kind. The lines under data/english/parts/ are the Story session's alone, so this item names the moves.

**Time box.** 1 hour for one sonnet session, after the Story session writes the lines.

**Rules.** People say how it feels, never the figure. Plain American English. A builder does not judge its own lines.

**Done when.** A second session declines every question in an interview and in a debate at a drawn place and seed in the running game, and no two askers' takes in the same sitting read word for word the same, the moderator's reading as a moderator's.

**Waits on.** The Story session's lines.

**Files.** data/english/parts/conversation.json

**Notes.** Follow-up from the second words reader on #9311. Filed by hand.
