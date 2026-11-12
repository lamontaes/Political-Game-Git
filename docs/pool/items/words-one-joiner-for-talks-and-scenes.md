---
id: words-one-joiner-for-talks-and-scenes
title: "Talks and scenes join their sentences through one helper and mark a piece's part one way"
area: words
kind: cleanup
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: words-opening-evening-talk-raises-what-the-president-said, words-run-filing-clerk-lines-are-composed
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: lead's read of the two Words branches, Nov 11, 2026
checked:
claimed-at:
branch:
---

**What.** On Nov 11 two builders each wrote the step that joins a sentence from bank pieces, one for conversations and one for scenes, in the same hour. Both group pieces by the part of the sentence (opener, core, reason, closer) and hand them to the one composer, so the words on screen are right, but there are now two groupers and two ways to say which part a piece is. The next change to how sentences are joined would have to be made twice. Guards: the English engine has one joiner, so a change to how a sentence is joined is made once.

**Cause.** Found in code: `composedConversationBank` in src/english/conversation-words.ts (PR 8736) builds a `ComposedLineBank` from the conversation bank's pieces, reading the part from a use's `role` when the role is one of `LINE_PARTS`. `composeJoinedLine` in src/english/english-composition.ts (the filing-clerk branch) builds the same bank from pieces that carry a `piece` field (`of`, `part`, `required`), and its comment says a conversation can share it. Both then call `composeGroundedLine`. The insert guard (tests/guards/english/line-inserts.test.ts) excuses joined pieces by the `piece` field only.

**Fix.**

1. **One joiner.** `wordConversationMove` joins through `composeJoinedLine`. Delete `composedConversationBank` and its cache, with every reference.
2. **One way to mark a part.** A conversation piece that is part of a joined sentence carries the `piece` field, as scene pieces do; the use's `role` goes back to saying what the line does in the talk (raise, answer, leave). Rewrite the conversation bank's joined pieces by script and commit the script's output only.
3. **What the conversation joiner did that the shared one does not** (stages on a use, `requiresFacts`, a piece the grades hold back): move each into `composeJoinedLine` or into what its caller passes, so nothing is lost. Name each in the pull request.
4. **Tests.** The conversation tests and the scene-talk tests pass unchanged. Over 200 openings in one drawn world the first evening's talk gives the same lines before and after for the same seeds (the dev mode records proof, or a saved list of lines compared by script).

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: a second joiner is a duplicate to delete. Replace, never layer: the old grouper and the role-as-part convention leave in the same change. No behavior change: the lines played are the same.

**Done when.** `git grep -n "composedConversationBank" -- src` returns nothing; every joined piece in data/english/parts carries the `piece` field; and a test on a drawn place shows the same 200 opening lines for the same seeds before and after, with the place and seed named in the pull request. A second session, in the running game on main in a drawn place it writes down, plays the first evening's talk and the filing counter and sees composed lines in both.

**Waits on.** PR 8736 and the filing-clerk pull request landing.

**Files.** src/english/conversation-words.ts, src/english/english-composition.ts, src/english/scene-talk-words.ts, src/director/conversation.ts, data/english/parts/conversation.json, tests/guards/english/line-inserts.test.ts

**Notes.** Neither builder did wrong: each built to its own item, and the items were written before either existed. The lesson is in the crew's skill for messages: two builders whose items name the same new step talk to each other before either writes it.
