---
id: play-scene-records-only
title: "Nobody is drawn in your bedroom unless the records put them there (#4293)"
area: play
kind: feature
priority: 2
status: done
claimed-by: claude/play-scene-records-only
pr: #4574
blocked-on:
milestone:
source: "astra order 1; PR #4293 branch play/scene-records-only"
claimed-at: 2026-10-16T03:27:07.116Z
---

**What.** PR #4293 (branch play/scene-records-only) fixes the bedroom scene so nobody is drawn in the player's bedroom unless the records put them there. Today the scene stager can draw a household member or a stranger who is not recorded as being in the room. It was sent back on 2026-10-15 for code conflicts with main in `src/bench/play.mjs` and `src/bench/data/controls.json`. Merge main, finish the fix, and retake the screenshot. The player would notice an empty bedroom when he is alone and the right people only when the records say they are there.

**Rules.** No hand-written player text: every label, row and sentence is a record worded by the English engine or a control name from `src/bench/data/controls.json`; no raw ids, no 'undefined' and nothing immersion-breaking on a person card; Replace, never layer: the old look of this screen and the generic `row(label, value)` printer it used are deleted in the same change, and the PR body counts what was removed; An effect is a read, not a record: the screen shows only records an engine wrote, and a read-only screen spends no game time and creates no facts; This is a game, not a spreadsheet: the screen adds no form or paperwork; it only presents the golden path, with Day advancing time and never opening a choice list; One model, two tiers: only people the household records place in the room are drawn; no full figure is invented for a scene; Ask why: each figure in a scene has a record of why they are there.

**Done when.** The branch merges clean with main and the scene stager in the drawn place (name it and the seed) draws only people whose records place them in the room, shown by a test in `src/bench/scene-staging.test.ts` and in a full-window screenshot at 1672x941 of the finished screen is attached to the pr and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: wakes in his bedroom and sees only who should be there.

**Files.** src/bench/staging.ts, src/bench/scene.ts, src/bench/scene-staging.test.ts, src/bench/play.mjs

**Notes.** One PR per screen; gate: browser spec for the screen.
Sent back 2026-10-15 from PR #4293 (branch play/scene-records-only): code conflict with main in src/bench/play.mjs, src/bench/data/controls.json; finish on that branch, merge main into it first.
