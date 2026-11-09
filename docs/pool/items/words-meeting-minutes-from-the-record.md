---
id: words-meeting-minutes-from-the-record
title: "A council or board meeting has minutes worded from its records"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: words
source: story/restore-liked-lines, Nov 8 (a rewrite never deletes a line the owner graded good)
claimed-at:
---

**What.** Four lines of minutes the owner graded good sit in data/english/parts/minutes.json under stopgap SG-WORDS-minutes-no-reader: "Participants discussed {topic}.", "The staff provided an update on {topic}.", "The manager turned next to {topic}." and "Voting against this action: {members}.". No engine words the minutes of a meeting. Word the minutes of a recorded council or board meeting from its agenda and roll call records, using these pieces, and show them where the meeting's record is read.

**Time box.** Three hours for one Sonnet session.

**Rules.** Wire to the world: every topic is the bill or agenda item on the meeting's record and every member on the roll call is named from the vote record. An effect is a read, not a record: the minutes are read by a screen or the paper. No hand-written player text: only these bank pieces and new bank pieces word them.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place from all 56, named with its seed, a recorded meeting has minutes that discuss its agenda item and name the members who voted against by record id, read by a named screen; a test beside src/english/bill-paper-words.test.ts proves it. Then delete SG-WORDS-minutes-no-reader.

**Files.** data/english/parts/minutes.json, src/director/situation-types.json, src/english/screen-words.ts, src/english/bill-paper-words.test.ts

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.
