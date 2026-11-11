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
after:
standard: 2
model: sonnet
effort: medium
root: design-life-record
checked: fable 2026-11-10
---

**What.** Today a reply such as "Give me tonight. Sunday we sit down with the bills." is stored as a scene reply with its line and move, and nothing records that a talk is owed, to whom, about what or for which day. The closing lines "We'll talk more later." and "I'll see you later." write nothing either. This item adds the record, written by the relationships writer when a reply defers a matter to a day, with the person owed, the topic (money or evenings, from the stake record), the due day, and closed or moved when they next talk. Seen: a talk the player or a neighbor put off, coming due on the promised day.

**Cause.** Design: docs/design/scenes/from-life/owed-talk-comes-due.md and docs/design/life-record.md (the relationships writer keeps a short list of what a person went through).

**Fix.** When a reply defers a matter to a day, write an owed-talk record (person owed, topic, due day) from the relationships writer in src/core2/modules/people.ts, closed or moved when they next talk, and read it in the director's purpose scene.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the director's scene for a talk that comes due reads this record, and the relationship engine reads whether the two talked since. No dice: whether the day passes unkept follows recorded time together, never a chance.

**Done when.** A second session plays a drawn place in buildBenchWorld, files and answers the household stake talk with the put-off reply, and sees an owed-talk record name the relative, the topic and the due day; a test advances the world to the due day with no time together and reads the record, and with time together reads it closed, naming the place, the seed and the record ids.

**Waits on.** Nothing.

**Files.** src/core2/modules/people.ts, src/director/purpose-scene.ts, docs/design/scenes/from-life/owed-talk-comes-due.md

**Notes.** Needed by scene-owed-talk-comes-due (packet docs/design/scenes/from-life/owed-talk-comes-due.md). Filed by Scene researcher A, Oct 27; lead effects owns the relationships writer.
