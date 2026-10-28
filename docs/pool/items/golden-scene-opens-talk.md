---
id: golden-scene-opens-talk
title: "A scene with a speaker opens into the talk; no Talk step, no Leave on its narration"
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

**What.** When the director stops time for a scene with a person, the talk box shows the narration with a hand-typed 'Talk · Name' reply and a Leave button; the player must click Talk before anyone speaks. Golden path step 2 and every campaign scene after it.

**Rules.** LAW.md §4; OWNER-DECISIONS Oct 27 5 PM (clicking a person starts the talk, no Talk button) and Oct 27 6:20 PM (no Leave or Say nothing on narration); AGENTS.md no hand-written player text.

**Done when.** In a drawn town, a scene with a speaker shows its narration and the speaker's first line with four replies at once; no 'Talk ·' control; circumstance-scene.browser.mjs passes.

**Files.** src/bench/play.mjs, src/bench/circumstance-scene.browser.mjs

**Notes.** TODO
