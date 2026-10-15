---
id: play-history-before-the-start-d1
title: "History before the start (D1):"
area: play
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/play.md line 95 (unchecked checklist line)"
---

**What.** The Politics screen does not show officials' careers or past results, and the loading screen does not show the history passes as they run. The history before day one (how long each official has served, past elections, the news archive) now exists on the engine side (`townSeats` carries `serviceStart`, `startDate`, `endDate`, `party` and `elected`, and `pastElections(api, seatId)` lists earlier elections). Show those in Politics, and have the loading screen name each history pass as it runs. The player would notice that the mayor has a career he can read and that the start of a game shows the world being built.

**Rules.** An effect is a read, not a record: Politics shows only records `townSeats` and `pastElections` return, and a read-only screen spends no game time and creates no facts; No hand-written player text: every sentence is worded by the English engine and every label is a control name; no raw ids or 'undefined'; Replace, never layer: any placeholder 'unknown' history text is deleted; One rule, all 56 places: no place named in code; Estimate, never UNKNOWN: an official's missing career starts from the real average marked ESTIMATED, never UNKNOWN; This is a game, not a spreadsheet: no new step; the history is information; Speed: history loads at the opening and the screen reads it.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): Politics lists the town's officials with service years and the last election result for the drawn place (seat and election ids named), and the loading screen names each history pass. A full-window screenshot at 1672x941 of the finished screen is attached to the PR and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: opens Politics and reads when his mayor was first elected and by how much.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/title.ts, src/core2/modules/offices.ts, src/bench/data/controls.json

**Notes.** Checklist line from play.md; verify against main before starting.
