---
id: story-opening-evening-lines-rebuilt
title: "The opening evening's talk at home is written again after the cut, through the English engine"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-opening-evening-lines
pr:
after:
blocked-on:
lead: story
model: fable
effort: medium
root: none
source: owner, Nov 17, the cut (everything the engine did not write goes); CTO, Nov 18 08:47Z on #9750, the order for the opening evening at home (engine first, then the lines through the English engine with many versions and inserts, then the four replies by trait)
checked:
---

**What.** On the first evening a housemate who watched the President's address with the player raises one of its points and where they stand, and the player answers. After the cut of Nov 17 every line of this talk (the address pieces, the point, the replies and the housemate's answers) is gone from `data/english/parts/conversation.json`, so the talk cannot compose and the housemates at home cannot be clicked. Seen: the opening evening in every drawn world on the deletion branch.

**Cause.** Design: the pieces that composed this talk were written before Nov 15 and were deleted whole by the cut (`docs/current.json`, replaced list, Nov 17). The talk engine (`addressPoints`, `addressPointFor`, `answerPoint` in `src/director/conversation.ts` and `src/director/opening-facts.ts`) is whole; only its words are missing.

**Fix.** Write the talk again as bank pieces in `data/english/parts/conversation.json`, every line through the English engine: the point in several versions with the subject and the President's side as inserts, the housemate's stand worded by bearing (calm, guarded, braced, glad, curious, warm, solemn, hopeful and the rest, matched to traits), the asking turn naming its subject, the replies agree and disagree with an insert each (the housemate's name, the President, the place or the subject), and the answers to each reply. No stock sentence, no figure aloud. The pieces carry the `piece`, `uses` and bearing rows the engine already reads, so no code changes.

**Time box.** 4 hours.

**Rules.** No hand-written player text in code; words come from the banks (`scene-standard`). Talk is dialogue only; people say how it feels and never the figure (owner, `owners-words-to-threads`). The English guards' rules: a question names its subject, no stock phrases, no short reply that says nothing of its own.

**Done when.** A second session, in a drawn place with a housemate of 16 or more on the branch, clicks the housemate on the opening evening and the housemate raises a point of this world's address with a stand and offers two replies; the guards in `tests/guards/english/` and `src/director/conversation-address-talk.test.ts` are green; three drawn worlds' first talks are posted as screenshots on #9750 for the CTO's read.

**Waits on.** director-address-points-read-the-plan (the engine fix this branch is stacked on).

**Files.** data/english/parts/conversation.json, docs/play-first/shots/opening-evening-lines-2026-11-18/README.md

**Notes.** Nov 18 (Story): the here and instead replies (ask, let it go) are offered only where `pointAnswerable` holds, which a housemate whose reason is their own view does not meet; in five drawn worlds the talk offers agree and disagree, with Say nothing and Leave as the player's way out. The old item words-opening-evening-talk-raises-what-the-president-said (pr #8736, Words lead) covered the engine; this item is the words alone.
