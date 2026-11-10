---
id: play-talk-opens-with-no-line-after-a-year
title: "A talk with someone at home opened with no line at all, only Continue and Mark gap, a year into a game"
area: play
kind: bug
priority: 1
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
root: rc4-hand-written-words
source: second session's check of the words machine, Nov 10, 2026 (Notes on words-machine-rules-from-the-owners-notes); filed by Fable
---

**What.** In a new game the player talked to a household member on the first day and got a line and four replies. A year later the player opened a talk with the same person and the box had no line, only the controls Continue and Mark gap. A talk with nothing to say should not open, and nobody knows yet why this one had nothing.

**Cause.** Needs cause. Looked at: the second session's note of Nov 10 on the item words-machine-rules-from-the-owners-notes, which names the place, the seed and the person. Not yet known: whether the rules run had pulled or held every line that spot had (data/english/pulled.json, data/english/part-grades.json), whether the spot never had a line, or whether the composer in src/director/conversation.ts found no subject between the two people after a year. The second session did not press Mark gap and closed the game.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session, to play it again, read what the talk was built from, and rewrite this item with the cause. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** An effect is a read, not a record: the finding names the spot or the composer step by file and line, and the pieces by key. No hand-written player text: if lines are missing, the spot is named for Story and no line is written here. Ask why: say which of the three causes it was, by record.

**Done when.** A second session starts a game in a drawn place it names with its seed, plays a year, and opens a talk with each member of the player's household: every talk that opens has a line, and a person with nothing to say opens no talk box. This item's Cause names the file and line, and a test in a drawn place fails on a talk that opens with no line.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, data/english/pulled.json, data/english/part-grades.json

**Notes.** Seen in Rehoboth Beach, Delaware (place key 1060290), seed dc376939-ac22-45ce-836f-5027c4f0799f, on main at 756370e86b: Patrick McCarthy, at home, on Jan 23, 2026, after a first talk with him on the first day. In the same run, pressing Hour after starting several dev mode scenes in a row from the Calendar's scene list gave "Player stop clock cannot cross an unresolved stop."; that may be a separate defect.
