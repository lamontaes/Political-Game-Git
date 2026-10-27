---
id: people-owed-talk-record
title: "A reply that puts a talk off to a day writes an owed-talk record the director can read when the day comes"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: effects
---

**What.** Today a reply such as 'Give me tonight. Sunday we sit down with the bills.' is stored as a scene reply with its line and move, and nothing records that a talk is owed, to whom, about what or for which day. The closing lines 'We'll talk more later.' and 'I'll see you later.' write nothing either. This item adds the record, written by the relationships writer when a reply defers a matter to a day, with the person owed, the topic (money or evenings, from the stake record), the due day, and closed or moved when they next talk.

**Rules.** Serves wire-to-the-world: the director's scene for a talk that comes due reads this record, and the relationship engine reads whether the two talked since. No dice: whether the day passes unkept follows recorded time together, never a chance.

**Done when.** In a drawn place in buildBenchWorld after the player files and answers the household stake talk with the put-off reply, an owed-talk record names the relative, the topic and the due day; a test advances the world to the due day with no time together and reads the record, and with time together reads it closed, naming the place, the seed and the record ids.

**Files.** src/core2/modules/people.ts, src/director/purpose-scene.ts

**Notes.** Needed by scene-owed-talk-comes-due (packet docs/design/scenes/from-life/owed-talk-comes-due.md). Filed by Scene researcher A, Oct 27; lead effects owns the relationships writer.
