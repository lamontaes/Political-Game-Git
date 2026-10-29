---
id: words-scene-narration-does-not-restate-where-you-are
title: "A scene's opening narration says what happened, never where you obviously are or the wrong day"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: words/today-only-on-the-day
pr: #6750
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: words
milestone: play-first
claimed-at: 2026-10-29T06:14:48.570Z
---

**What.** The filing-reaction scene opened with "It is a Monday in January. You're at home. You filed today to run for Council member. Kendall Roberts has been waiting for you at home." The clock read Wednesday, January 22 at 12:00 AM, so the weekday and "today" were wrong, and "You're at home" restates what the picture shows. The owner: "I assume this is a scene. It is a Monday in January. You're at home. ... It shouldn't say you're at home. You're obviously [there]." This item changes the narration so no lead sentence states only the player's own location or the time of year, a relative-day word ("today") appears only when true to the clock, and the lead opens with what happened and who is waiting.

**Rules.** Serves LAW.md §4, Scenes and conversations (the narrator sets the scene in a few sentences, OD:307) and LAW.md §7, Words that ship. No hand-written player text: the lead comes from the English engine's parts. Ask why: a lead says what a record says and nothing else. This is a game, not a spreadsheet.

**Done when.** In a drawn place's filing-reaction scene, a test over the scene lead parts in data/english/parts/scene-words.json fails on any lead whose only content is the player's own location or a weekday-and-month phrase, and a test comparing the clock's date with the lead's weekday and relative-day words passes for a scene opened on a later day than its record; shown by a screenshot of the scene's opening narration with the clock visible, with the place and seed named.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** A scene opens by telling you what happened and who is waiting for you, not where you are or what month it is.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** data/english/parts/scene-words.json, src/director/scene.ts, src/director/scene-talk.ts, src/director/ledger.ts

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "It shouldn't say you're at home. You're obviously [there]." The scene opening on Wednesday at midnight for a record made on Monday is words-day-end-scene-opens-next-midnight (open); this item is the narration's wording, which must also be true when the day differs. Lead: words (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
