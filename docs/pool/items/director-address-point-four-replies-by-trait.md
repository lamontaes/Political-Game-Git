---
id: director-address-point-four-replies-by-trait
title: "The player answers the President's point four ways (agree, disagree, ask, let it go), worded by trait, each writing its record"
area: director
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: director-address-point-reasons-lease-relative-story
blocked-on:
lead: story
model: fable
effort: medium
root: none
source: CTO, Nov 18 08:47Z on the Story thread (issue 9750), order item 3: "The replies: the four moves (agree, disagree, ask, let it go), worded by trait. The record each move writes, as you listed."; owner, Nov 11: "The player's replies are up to four, each a different move about what was said."
checked:
---

**What.** After a housemate raises the President's point on the first evening, the player has up to four replies, each a different move: agree, disagree, ask what it means for them, or let it go. Each is worded by the player's traits and writes its own record. In five drawn worlds on Nov 18 only agree and disagree were offered. Say nothing and Leave sat under them, and Leave writes no record of a point let go. Seen: the replies under the talk box on the first evening at home.

**Cause.** Found in code: the point's reply moves come from `replyMoves` in `src/director/data/conversation-rules.json` (agree, disagree, here, instead). `pointAnswerable` in `src/director/conversation.ts` offers "here" only to an office holder with a state law or town figure, and "instead" only with a decided stand and a work or money reason. The "ask" the CTO's order names ("ask what it means for them") is neither of these: it asks about the speaker's own reason. No reply move lets the point go and keeps it for another evening.

**Fix.** Make the four moves the ones in the order. Agree and disagree stay. "Ask" asks what it means for them and is answered from their reason (work, money, lease, relative, story). It is offered only when they have one, by the existing `pointAnswerable` pattern. "Let it go" closes the talk and writes a no as a record: the point stays unheard for the player (the `pointKey` mark is not set) so another evening can raise it, and the tie gets its two minutes. The player's lines are worded by the trait lean the composer already reads (blunt, cautious, sociable), as bank pieces with inserts. Agree and disagree write the player's stance through `learnView`, as today.

**Time box.** 4 hours.

**Rules.** No dice: which replies are offered and how they are worded follow the player's traits and the speaker's records, never a roll. A no is a record (Story's first report, ruled by the CTO, Nov 18). Every line goes through the English engine with inserts (owner, Nov 11). One engine: the conversation's own reply rows, no second talk.

**Done when.** A second session, in a played opening evening at a drawn place, the talk offers each move whose record exists, the player's words differ by trait in two lives, "let it go" leaves the point to be raised again on a later evening (seen in a second evening's talk), and the dev mode Trace shows the record each move wrote.

**Waits on.** director-address-point-reasons-lease-relative-story (the "ask" answer needs a reason to answer from).

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, data/english/parts/conversation.json

**Notes.** Nov 18 (Story): filed with the rebuilt opening-evening lines.
