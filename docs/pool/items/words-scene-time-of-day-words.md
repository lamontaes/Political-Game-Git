---
id: words-scene-time-of-day-words
title: "A scene says tonight or this morning only when the scene's own hour makes it true"
area: words
kind: bug
priority: 2
size: M
status: done
claimed-by: words/time-of-day
pr: #6982
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T15:26:00.426Z
---

**What.** Of the 137 spoken scene-talk lines that use a day word, some claim the scene is happening in the evening ("Thanks for your time tonight.", "Then we're done tonight.", "I can't take more on this tonight.") while the scene may play at 9 AM. The bank test checks only narration for today, tomorrow and yesterday (vote-today, vote-tomorrow, same-day, day-after marks). The scheduler keeps the player's stop time (ScheduleEntry.stop.at.minuteOfDay), so a purpose scene can mark morning or evening from it, and the lines that state the present time of day can require the mark. Lines that promise a future time ("I'll write it tonight.") stay as they are.

**Rules.** No hand-written player text; marks come from the record (the stop's minute of day), never a guess. One rule, all 56 places. scene-standard: lines say only what the record holds.

**Done when.** In a played world (buildBenchWorld, a drawn place and a seed the builder did not choose), a purpose scene that plays before the evening says no line claiming the present is tonight or this evening, and one that plays in the evening may; tests/english-parts-banks.test.ts refuses a spoken line that states the present time of day without the mark that makes it true.

**Files.** src/director/purpose-scene.ts,data/english/parts/scene-talk.json,tests/english-parts-banks.test.ts

**Notes.** TODO
