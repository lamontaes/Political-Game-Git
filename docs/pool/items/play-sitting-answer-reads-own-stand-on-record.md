---
id: play-sitting-answer-reads-own-stand-on-record
title: "In a debate or interview the player's answer on a question outside the filed platform reads their own stand on record"
area: play
kind: bug
priority: 3
size: S
status: in-pr
claimed-by:
pr: 9152
after: elections-filing-platform-from-views
blocked-on:
source: campaign events playthrough Nov 14 (/mnt/project-files/words-lead/campaign-events/report-1.md)
lead: elections
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** The player sits for a debate or interview and the asker puts a question the filed platform does not take up (the platform holds at most three of the seat's questions). The sitting offers no stand and the answer is "I haven't said where I stand on that", though the player has a view, a vote or a party position on it. Seen: in the campaign events runs, where county-q3 answered "I haven't said" twice, state-q5 had a stand on one of four questions.

**Cause.** Found in code: `standOf` in src/director/sitting.ts read only `platformAnswers` (src/core2/modules/press.ts), which looks a question up in the filed platform and nothing else. A simulated candidate's `candidateAnswers` in the same file already falls back to `candidateStance` (view, votes, party); the player's path did not.

**Fix.** `standsOnRecord` in press.ts: the filed stand where there is one, else `candidateStance`; `standOf` reads it. Nothing is invented: where the player has no view, no vote and no party, the stand stays none and "I haven't said" stands. The player still chooses whether to give the stand. Promises made and answers given feeding back into the platform are not in this item.

**Time box.** 2 hours.

**Rules.** No dice. A stand is a read of records another engine already keeps.

**Done when.** In a pinned place, a filing with no platform asked a seat's questions returns the player's own stand on each question the record holds and none where it holds none (src/core2/stands-on-record.test.ts); a second session sitting for a debate sees the answer menu offer a stand on a question outside the filed three.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/director/sitting.ts

**Notes.** Nov 14: built on #9140's head; leaves the debate and interview lines to the campaign events thread.
