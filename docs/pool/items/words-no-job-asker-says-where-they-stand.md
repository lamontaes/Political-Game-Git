---
id: words-no-job-asker-says-where-they-stand
title: "A person with no job who asks what the player does for a living says what they do in return"
area: words
kind: bug
priority: 2
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
root: none
source: Words builder A, Nov 16 (second reader's played talks for #9697, six talks end on the player's line)
claimed-at:
checked:
---

**What.** A child or a retired person asks "What do you do for a living?" or "What are you doing now?" of the player, the player answers, and the other person says nothing back, so the talk ends on the player's own line. Played at South Haven, Minnesota (2761402), seed tw3: Luke Chavez (age 9), Riley Chavez (14), Rowan Silva (6), Gabriella Silva (7), Sasha Reeves (79) and Eugene Reeves (79), all with no job on record. Seen: each of the six says one true thing about their own day (school, retired) after the answer.

**Cause.** Found in code: `giveBack` (src/director/conversation.ts, the `own-work-new` branch) returns facts with no employer and stage "none" for an asker with no job, and the bank has only "I'm between jobs right now" and "Nothing steady for me at the moment", which are wrong for a child at school and a retired person, so `sayGiveBack` composes nothing; nothing else on the record is read (school: `schoolOf`, age and retirement).

**Fix.** Give the `own-work-new-give` move stages for a person in school and a person retired, from the school and age records (`schoolOf`, the person's birth date), and the Words lead writes the pieces for them; where a child has no school on record the person does not ask the question.

**Time box.** 3 hours for one Sonnet session at medium effort, after the Words lead's lines.

**Rules.** Wire to the world: the answer reads the school and age records the engine already keeps, proven in a played town. The lines under data/english/parts are the Words lead's alone to write.

**Done when.** At South Haven (seed tw3) the six talks above end on the other person's line about their own day; a second session asks a child and a retired person in a drawn place from all 56 (name the place and seed) and reads that line.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json

**Notes.** Also covers the person whose job is out of town for outside buyers: `replyFacts` for their-work returns null (src/director/conversation.ts), the question is not offered after this PR, and a true answer ("It's out of town") needs a Words lead piece that takes the work-place slot.
