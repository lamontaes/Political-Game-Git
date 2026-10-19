---
id: play-mark-gap
title: "Mark a line or scene as a gap while playing"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: words-scene-talk-in-play
source: added with npm run pool -- add
---

**What.** While playing, a tester should be able to mark a line or a scene as a gap with one control, so the Words line can find missing or wrong wording. The mark records the scene or line id, the place, the seed and the date. It is a developer control and shows no text of its own.

**Rules.** No hand-written player text: the control uses control names only. Bookkeeping is a debug switch, so the mark is available in developer mode and costs nothing in ordinary play.

**Done when.** In the bench game started in a drawn place and seed, marking a line writes a record naming the scene or line id, the place, the seed and the date, a test in src/bench states it, and a browser check of the control on the play screen passes.

**Files.** src/bench/play.mjs, src/bench/handler.ts, src/bench/dev-api.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
