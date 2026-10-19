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

**What.** Checked against main on Oct 16: The engine sends each seat's service dates and past elections to the client, but the Politics seat rows show only title, name and party, and no bench code reads `pastElections`. Next: Politics shows service years and the last election result per official, and the loading screen names each history pass. The player would see it as a choice among people, never a form.

**Rules.** An effect is a read, not a record: Politics shows only records `townSeats` and `pastElections` return, and a read-only screen spends no game time and creates no facts; No hand-written player text: every sentence is worded by the English engine and every label is a control name; no raw ids or 'undefined'; Replace, never layer: any placeholder 'unknown' history text is deleted; One rule, all 56 places: no place named in code; Estimate, never UNKNOWN: an official's missing career starts from the real average marked ESTIMATED, never UNKNOWN; This is a game, not a spreadsheet: no new step; the history is information; Speed: history loads at the opening and the screen reads it.

**Done when.** In a drawn place (buildBenchWorld, seed named in the PR body) a browser spec shows the `townSeats` term id and a `pastElections` election id on screen for an official. The owner plays it: Politics shows service years and the last election result per official, and the loading screen names each history pass.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/title.ts, src/core2/modules/offices.ts, src/bench/data/controls.json

**Notes.** Checklist line from play.md; verify against main before starting.
