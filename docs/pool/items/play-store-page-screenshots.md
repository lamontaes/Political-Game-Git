---
id: play-store-page-screenshots
title: "Store page screenshots."
area: play
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/play.md line 138 (unchecked checklist line)"
---

**What.** Store page screenshots are captured by `src/bench/store-shots.mjs` (1920x1080 shots of real play from `/play`), and the second set (19 shots from two games, Hugo, Colorado and Cornwall, Connecticut) is store-ready for the person card and a conversation. Some shots still show unopposed candidates in election night and an exit-poll line that reads like raw data, and the choice buttons need English names and the capsule art. Fix those causes in the game (not in the shots), regenerate the final set, and do not commit the PNGs beyond the final approved ones. The player would notice nothing different, but the store page shows the game as it plays.

**Rules.** No hand-written player text: button names and election-night lines come from the English engine, never typed for the shot; Replace, never layer: no staged or edited screenshot stands in for real play; An effect is a read, not a record: each shot is a real `/play` screen reading engine records; One rule, all 56 places: the towns are drawn from all 56 and named in the PR body; This is a game, not a spreadsheet: no mechanic is added for a shot; Placeholders: the capsule art and any missing backdrop are registered stopgaps; American English: captions follow the spelling sweep.

**Done when.** Store shots regenerate from `src/bench/store-shots.mjs` in two drawn towns (named with seeds), election night shows contested counts and a worded exit-poll line, every button has an English name, and the set is shown to the owner as full-window screenshots, merged on his yes. Check by `npm run lint` on `src/bench/store-shots.mjs` and a read of the shot list. The owner plays it: looks at the shots and sees the game as it plays.

**Files.** src/bench/store-shots.mjs, src/bench/play.mjs, docs/store/steam-page-draft.md, art/backdrops/manifest.json

**Notes.** Checklist line from play.md; verify against main before starting.
Absorbs play-store-screenshots-by-friday-in-progress (second run of 19 shots, seeds store-e and store-f, as of 2026-10-15).
