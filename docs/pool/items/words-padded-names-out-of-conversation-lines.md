---
id: words-padded-names-out-of-conversation-lines
title: "Take the listener's name off the padded lines in conversation.json"
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
source: Account lead, Nov 14, 2026: the 81 padded names the guard baseline let stand in conversation.json after the eighteen-line item
checked:
---

**What.** Owner, Nov 14, 06:38Z: "Lines keep saying the listener's name ('Thanks, Alice.' 'Not yet, Eva.') only to pass a rule... The padded names come out." The padding pass left conversation.json out, so 81 lines still end or open on the listener's name: farewells (57), own-view answers (14) and news answers (10). A talk at home says goodbye to the player with their name tacked on. Seen: a played goodbye at home reads without the player's name on the end.

**Cause.** Found in code: `hasInsert` in `tests/guards/english/line-inserts.test.ts` counts a name slot as the line's insert, so these lines passed the old rule by carrying `{player-first}` or `{first}`.

**Fix.** The listener's name comes off the padded lines, named lines that say the same as a plain one are cut onto it (uses move over only where a fact places them), and "Take care of yourself." is cut onto "Take care."; the thank-yous and the like stay, and the no-insert baseline does not rise. Four replies that still carry a name wait for their own pull request, so the padded-name baseline for conversation goes to four.

**Time box.** 1 hour, Sonnet.

**Rules.** No hand-written player text in code; reworded lines go to the second reader; lines changed are shown played in /mnt/project-files/words-lead/padding/conversation-names-lines.md.

**Done when.** The padded-name count for `conversation` in `line-inserts-baseline.json` is four and the guard passes. Every changed text is shown said in a played talk at the final head, in the played file, with people the player has met before for the goodbyes; none says a name that only pads. A second session, on main, plays a life, talks with household members and neighbors, and sees goodbyes and views about the news read without the player's name added.

**Waits on.** The eighteen-line item (words-padded-names-out-of-talk-lines-that-came-in-after-the-pass) folding.

**Files.** data/english/parts/conversation.json, data/english/pulled.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Built after the eighteen-line item; the scene-talk padded names that remain (15) are asks to run together and are under the baseline.
