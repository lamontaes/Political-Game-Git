---
id: play-stop-01-talk-says-nothing-b
title: "A moment that stops you for someone says who they are, why they came, and lets you answer it"
area: words
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: play-stop-01-talk-says-nothing-a
source: added with npm run pool -- add
---

**What.** Eleven weeks into the playtest campaign the game stopped me for Noah Chan in a café; the screen said only "Noah Chan is with you." and the talk was "Hi." and "Have a good day.". The moment came from a shared cause on record (right to counsel in eviction), but none of it reached the screen. This part makes a director moment open with narration that introduces the person and the reason, then the person's opener with that purpose, then four replies with stakes.

**Rules.** Wire to the world: the moment's record (the shared cause, the person, the place) is what the screen reads and shows. No hand-written player text: narration, opener and replies come from the English engine. Nobody is drawn without a reason on record (LAW.md §2).

**Done when.** In a drawn place, the first director moment with a person outside the household shows narration naming who they are and why they came, an opener naming the purpose, and four replies, and the talk runs until the purpose is answered.

**Files.** src/bench/play.mjs, src/bench/handler.ts, src/director/scene-talk.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-01-talk-says-nothing (Oct 24, lane). Engine changes are the Words lead's (`needs-from: words`). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
