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

**Fix.** 56 lines lose the name; 25 named lines are cut onto the plain line the bank already held (uses move over only where a fact places them); one stock closer ("Take care of yourself.") stays until the second reader answers, and the conversation no-insert baseline is up by one for it; the thank-yous stay. The padded-name baseline for conversation goes to zero.

**Time box.** 1 hour, Sonnet.

**Rules.** No hand-written player text in code; reworded lines go to the second reader; lines changed are shown played in /mnt/project-files/words-lead/padding/conversation-names-lines.md.

**Done when.** The padded-name count for `conversation` in `line-inserts-baseline.json` is absent and the guard passes. In three drawn places (pad-conv-1, pad-conv-2, pad-conv-3), `scripts/dialogue-batch/greet-part-probe.ts` plays 40 talks each and no goodbye says the player's first name. A second session, on main, plays a life, talks with household members and neighbors, and sees goodbyes and views about the news read without the player's name added.

**Waits on.** The eighteen-line item (words-padded-names-out-of-talk-lines-that-came-in-after-the-pass) folding.

**Files.** data/english/parts/conversation.json, data/english/pulled.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Built after the eighteen-line item; the scene-talk padded names that remain (15) are asks to run together and are under the baseline.
