---
id: words-reads-wrong-nov10
title: "The scenes merged on Nov 10 read the way the owner read batch 3: no name tag on every line, no stranger named, no 'this town'"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: story/reads-wrong-nov10
pr: #8138
blocked-on:
lead: words
source: "read-through of celebration and gathering, rescue, apology and accusation, new baby, reporter story, race told, rival filed late and the win side against the owner's batch 3 notes"
claimed-at: 2026-11-10T12:00:00.000Z
merged-at: 2026-11-10T11:34:57.457Z
seen-by: second-session-2
seen-at: 2026-11-11T01:25:32.709Z
---

**What.** Composed in drawn worlds (seeds rw1 Casco, Wisconsin and rw2 Barrigada, Guam through the grading bench's staged year; the celebration, gathering and rescue tests' own printed scenes on seeds 101 and 102), read line by line, and the bank of every scene named above scanned for each class. Found and fixed:

1. **The name tag on every line.** A voice called the other person by first name on nearly every line after the first ("Thank you, Devon. I'm so glad you said yes." / "Can I count on that, Devon?" / "Thanks, Devon."): 69 name tags in the two letter scenes of seed rw1. `wordSceneMove` (src/english/scene-talk-words.ts) now says a name tagged after a comma once on a branch; while another piece fits the next line leaves it off, and a piece that tags the name after a comma is said without it. 9 left in the same scenes. It applies to every scene's pieces that use `{first}` (411 pieces), keys unchanged.
2. **A stranger named.** A rescue's question named a child nobody had mentioned ("Will you talk to James yourself?"). It now says who they are.
3. **'This town'.** The morning after a lost race had the player say "I'm not done with this town."; it names the place.

Checked and clean: no article before a phrase slot (a bill, rivals, a source, a story, a stand) and no sentence opening, after the first, with a slot that fills in lowercase, in the scenes' bank; a raw id, "the a year" or an unfilled slot in the lines printed.

**Not found / held.** The opening speeches say "this town" in 30-odd lines; they are held with the pledges and salutation (#8074). The honors headline waits on `play-honor-headline-reads-school` (#8133).

**Done when.** src/director/reads-wrong-scenes.test.ts passes: one assertion for each class (this town; an article before a phrase slot; a lowercase slot opening a later sentence; a rescue's child introduced where the question names them; the name tag once on a branch).

**Files.** src/english/scene-talk-words.ts, data/english/parts/scene-talk.json, src/director/reads-wrong-scenes.test.ts

**Time box.** 2 hours.

**You will see.** "Come and see me in Casco. I would love to show you what it's like here." then "Thank you. I'm so glad you said yes."

**Notes.** Seen in the game (2026-11-11, second-session-2): drawn seed 1611a4081e31 (test world), seed 1611a4081e31, main 32a6683b: reads-wrong-scenes.test.ts passed all 8 assertions on a fresh seed, covering every class the item lists
