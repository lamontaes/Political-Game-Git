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
after:
standard: 2
model: sonnet
effort: medium
root: rc4-hand-written-words
---

**What.** Four lines of minutes the owner graded good sit in data/english/parts/minutes.json under stopgap SG-WORDS-minutes-no-reader: "Participants discussed {topic}.", "The staff provided an update on {topic}.", "The manager turned next to {topic}." and "Voting against this action: {members}.". No engine words the minutes of a meeting. Word the minutes of a recorded council or board meeting from its agenda and roll call records, using these pieces, and show them where the meeting's record is read.

**Cause.** Found in code: data/english/parts/minutes.json holds four owner-graded lines under stopgap SG-WORDS-minutes-no-reader (src/director/data/stopgaps.json, line 640), and no engine words the minutes of a meeting.

**Fix.** Word a recorded meeting's minutes from its agenda item and roll call with these four pieces, shown by one named screen that reads them, then delete the stopgap.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every topic is the bill or agenda item on the meeting's record and every member on the roll call is named from the vote record. An effect is a read, not a record: the minutes are read by a screen or the paper. No hand-written player text: only these bank pieces and new bank pieces word them.

**Done when.** A second session, not the builder, opens the minutes screen for a recorded meeting in a drawn place from all 56 in a one-year run of the played world (buildBenchWorld, place and seed named) and reads minutes that discuss the meeting's agenda item and name the members who voted against it, by record id. A test beside src/english/bill-paper-words.test.ts proves it, and SG-WORDS-minutes-no-reader is deleted from src/director/data/stopgaps.json.

**Waits on.** Nothing.

**Files.** data/english/parts/minutes.json, src/director/data/situation-types.json, src/english/screen-words.ts, src/english/bill-paper-words.test.ts, src/director/data/stopgaps.json

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.
