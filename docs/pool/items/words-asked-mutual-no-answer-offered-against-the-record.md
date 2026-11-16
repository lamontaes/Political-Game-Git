---
id: words-asked-mutual-no-answer-offered-against-the-record
title: 'Asked "Have you seen Margaret?", the player is offered "Nope. Not in a while." beside "I saw Margaret a few days ago."'
area: words
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/project-thread-5efbu8
pr: 9440
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Found while playing #9374's talks (Nov 15), on the train 07919bd2
---

**What.** When someone asks the player about a person both know, the three answers offered are one from the player's own last contact ("I saw Margaret Wolfe a few days ago.") and two that say the player has not seen them ("Not lately.", "Nope. Not in a while."), even when the record says the player saw them days ago. The no answers are plain answers, not marked lies, so the talk goes on as if they were true. Found at seed 9f8e7d6c5b4a3921, 2025-03-02, and 0c04a6003b5e2e63, 2025-03-30. Seen: in a talk in town, someone asks after a person you saw days ago and you are offered a plain no beside the true answer.

**Cause.** Found in code: the `asked-mutual-answer-not` and `asked-mutual-answer-brief` pieces in data/english/parts/conversation.json carry no stage or fact that ties them to the player's own contact (only three "not" pieces require `my_not`), and the answers are offered from `conversationMoves(last.kind, "answers", data)` in src/director/conversation.ts with no check against the player's last contact, so a no reply is offered against the record (Words lead rule 113, words-lead/owner-feedback/played-scenes-feedback.md).

**Fix.** Give the no answers the `my_not` requirement (or a stage from the player's own `lastContact`), so a player who saw the person is offered the true answer and a no only as a marked lie through the existing lie choices. Do not change the line wordings.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** Ask why: name the move and the record that offer a plain no against the player's own contact before changing anything. No reply against the record (Words lead rule 113). No line changes only to pass a test.

**Done when.** A second session plays talks in a drawn place and, asked about someone the player saw within the last weeks, is never offered a plain no; the pinned test at seed 9f8e7d6c5b4a3921 passes.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json

**Notes.** Nov 15: built on claude/project-thread-5efbu8 after #9374: `playerFacts` sets `my-lately` when the player's own last contact is within weeks (spoken-when gap not long), and the five plain no answers exclude it; pinned test src/director/asked-mutual-no-against-record.test.ts at seed 9f8e7d6c5b4a3921. The player keeps a choice of acts (coordinator, Nov 15): the true answer, or the true answer with "How about you?" or "Why do you ask?" after it (`givesBack.plain` names the plain answer; the ask-why turn rides after it as "turn" does); the asker's give-back answers each in its own stage (`givesBack.answers`), and says "Same, about then." where it would repeat the player's words. After the Words lead's pre-read: the answer says the person's pronoun (the asker just said the name), "Nope. Not in a while." is deleted beside "Not in a while.", "No, I haven't." and "I can't remember the last time." need no contact on record, and the decline is not offered (nothing reads it).
