---
id: words-budget-story-told-by-what-happened-to-the-money
title: "A budget story is told by what happened to the money, and a neighbor can ask about it by the line"
area: words
kind: bug
priority: 2
size: M
status: merged
standard: 2
claimed-by:
pr: 9500
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: Second reader on #9455 and Account lead, Nov 15
---

**What.** A neighbor tells a budget story as "A bigger police budget came up in the news today. About time, I say." while the story's row records a cut. The talk names the proposal the question stands for and cheers it, and the record holds the opposite outcome. The neighbor's ask is also left out for budget stories until they can be named by the line. Seen: Creve Coeur, Illinois (1717549), seed pl5, a budget story whose row is a cut (second reader on #9455, Nov 15).

**Cause.** Found in code: src/director/conversation.ts `printedSubject` words a printed story's `about` from `questionAbout(story.topic)`, the proposal a question stands for ("a bigger police budget"), while a budget story's row (`budget-line-changed`, written in src/core2/press-desk.ts from the budget module's event) holds `line`, `deltaMinor` (its sign is the direction), `carried` and `side`, so the telling never reads what happened to the money; `raiseSubject` leaves such stories out of the ask (fact `story-budget`) because no line the row holds can be said as a thing ("the police budget").

**Fix.** Tell a budget story from its row: more money or less, by the sign of `deltaMinor` and only where `carried` is not no, and name the line as a thing through one said form for a budget line (a data row keyed by the line, in src/english/question-names.ts or beside it), in new parts the Words lead writes; then drop the `story-budget` exclusion in `raiseSubject` so the ask opens a budget story as it does any other. Existing pieces for the proposal are replaced, not left beside.

**Time box.** 6 hours.

**Rules.** No hand-written player text; one said form per budget line in data; no named line in logic; no scan in the test (named place and seeds).

**Done when.** In the played world at a drawn place, Creve Coeur, Illinois (1717549, seed pl5), a second session plays a budget story whose row is a cut and one whose row is a raise, and reads each told as what happened to the money, with the neighbor's stand following from their own view and no line cheering the opposite outcome.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts,src/core2/press-desk.ts,src/english/bill-names.ts,data/english/parts/conversation.json,src/director/outlet-ask-talk.test.ts

**Notes.** Built from the existing said form for a budget line (`budgetPurposeSaid` in src/english/bill-names.ts, the bill catalog's more/less purposes), not a new data row. A budget story is asked and told as more or less money for what the line pays for; its row's `carried` and `level` give "The council passed it."; a cut reverses the neighbor's stand on the question (`news.reverses` in `newsStake`), so a neighbor for a bigger police budget is glad of a raise and wishes a cut had not passed. Where their own view is on another question, the stand follows the telling as its own line (six pieces, for and against, on a decided story). Played at Creve Coeur, Illinois (1717549), seed pl5, in src/director/outlet-ask-talk.test.ts.
