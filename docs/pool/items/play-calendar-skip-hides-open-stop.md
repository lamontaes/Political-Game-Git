---
id: play-calendar-skip-hides-open-stop
title: "After a calendar skip the play screen can lose an open stop and show no Continue"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A browser drive on the bench (Kelly, Wyoming, new life seed 4e1bb0a5-4d3f-42e9-bc9b-fc5d88a29251; and Farmington, Michigan, seed 4d90a5aa-4347-43ea-90e4-1ec33a6de06a) skipping ahead with the calendar's skip-forward reached days where the clock stopped moving, Continue was hidden, and every further skip did nothing: the server held an open stop (in Farmington a story-director moment, pauseId player:person_86f19e5c351b74b4:316, December 2, 2025) while the screen showed none, and /api/advance answered 'Answer the open choice or stop first.' Reloading and pressing Continue on the title screen recovered it each time. act() in src/bench/play.mjs swallows that error and leaves the page's packet stale. Reproduce with a player's own clicks only and confirm whether the drive's order of clicks caused it before fixing.

**Rules.** This is a game, not a spreadsheet: a held clock always shows what holds it and a way to answer (play-first Tier 1). Never dev mode to get past something.

**Done when.** A life in a drawn place, skipped forward through two years with the calendar, never reaches a day where the clock is held with no Continue or answer on screen, shown by the browser check's log with the place and seed named, or the item is closed with the drive's own click order named as the cause.

**Files.** src/bench/play.mjs

**Notes.** TODO
