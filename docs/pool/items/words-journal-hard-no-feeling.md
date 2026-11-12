---
id: words-journal-hard-no-feeling
title: "The journal shows what happened after a hard event and never narrates the feeling"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: story/journal-hard-no-feeling
pr: #8153
blocked-on:
lead: words
source: "CTO ruling, Nov 10: prior-rulings/people.md section 24 (owner-locked, Sept 6: imply tension through ordinary concrete behavior and dialogue rather than narrating feelings) binds the journal"
claimed-at: 2026-11-10T14:00:00.000Z
merged-at: 2026-11-10T18:36:15.838Z
seen-by: second-session-2
seen-at: 2026-11-11T03:14:01.756Z
---

**What.** The memoir's "hard time" field (after a death in the family or a lost job) was worded by twelve feeling lines ("It was hard.", "That was difficult.", "It was a very difficult time.", "It was a terrible time.", "It was rough.", "It was really tough."); the "got a raise" line said "it was a relief". The twelve are gone and so is "We got through it." (no record says it); the one graded line, `journal.memoir-hard.that-was-tough`, keeps its key and now says what the record backs after a lost job: "I had no job after {lost_employer}." After a death the memoir goes on to what the records hold (the age and the illness), with no feeling line. "Up from {paid_more_than}, it was a relief." says "and it was work again." journal-bank.test.ts's FEELINGS list adds difficult, hard, tough, terrible, wonderful, relieved, relief, rough, nervous, anxious, lucky, painful, awful, heartbreaking and overwhelmed. The two memoir-meant-friend pieces are on story/journal-no-feeling-words.

**Done when.** journal-bank.test.ts' no-feeling check passes for these words (its remaining failure is memoir-meant-friend); the printed death line in New London, New Hampshire has no feeling line.

**Files.** data/english/parts/journal.json, src/director/journal.ts, src/english/mined/journal-bank.test.ts

**Time box.** 1 hour.

**You will see.** "My father died. John was 56 years old. John had been seriously ill."

**Notes.** Seen in the game (2026-11-11, second-session-2): Willow Branch, Indiana (the test's own draw; New London NH not reproduced), seed f322fbf95f560b63d553a3172e22a22c19d799ea38cfcaec16541fcc1baf51af, main 67947ae8: journal-bank no-feeling test passed and the printed death entry read 'My father died. Peter was 64 and had been seriously ill.' with no feeling line
