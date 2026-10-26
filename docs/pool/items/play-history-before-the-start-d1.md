---
id: play-history-before-the-start-d1
title: "History before the start (D1):"
area: play
kind: feature
priority: 2
status: done
claimed-by: claude/politics-history-s11
pr: #5154
blocked-on:
milestone:
source: "docs/coordination/play.md line 95 (unchecked checklist line)"
claimed-at: 2026-10-19T21:02:46.510Z
---

**What.** Checked against main on Oct 16: The engine sends each seat's service dates and past elections to the client, but the Politics seat rows show only title, name and party, and no bench code reads `pastElections`. Next: Politics shows service years and the last election result per official, and the loading screen names each history pass. The player would see it as a choice among people, never a form.

**Rules.** An effect is a read, not a record: Politics shows only records `townSeats` and `pastElections` return, and a read-only screen spends no game time and creates no facts; No hand-written player text: every sentence is worded by the English engine and every label is a control name; no raw ids or 'undefined'; Replace, never layer: any placeholder 'unknown' history text is deleted; One rule, all 56 places: no place named in code; Estimate, never UNKNOWN: an official's missing career starts from the real average marked ESTIMATED, never UNKNOWN; This is a game, not a spreadsheet: no new step; the history is information; Speed: history loads at the opening and the screen reads it.

**Done when.** In a drawn place (buildBenchWorld, seed named in the PR body) a browser spec shows the `townSeats` term id and a `pastElections` election id on screen for an official. The owner plays it: Politics shows service years and the last election result per official, and the loading screen names each history pass.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/title.ts, src/core2/modules/offices.ts, src/bench/data/controls.json

**Notes.** Checklist line from play.md; verify against main before starting.

Checked Oct 19 (claude), nothing built: this is already on main. src/bench/play.mjs (the Politics sheet, near line 3557) prints each holder's service years, how they reached the seat and, from `pastElections`, the election date, share and the term id they won, and `src/bench/government.test.ts` (passes today) checks every holder carries serviceStart, how they reached the seat and a matching election in a drawn place. The loading card names each pass: src/bench/data/controls.json `loading` holds people, past, economy, core, government, opening, pictures and done, read at play.mjs line 4359. The one thing the done-when asks that no spec shows is the browser seeing the term id; the CTO can mark this done or ask for that spec as its own item.

Oct 20: PR #5154 merged to main: Politics shows service years and the election per official with no raw term id.
