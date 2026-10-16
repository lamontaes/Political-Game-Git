---
id: play-politics-hub
title: "Politics opens as a compact hub (#4296)"
area: play
kind: feature
priority: 2
status: open
claimed-by:
pr: #4577
blocked-on:
milestone:
source: "astra order 1; PR #4296 branch play/politics-hub"
claimed-at:
---

**What.** PR #4296 (branch play/politics-hub) makes Politics open as a compact hub: who governs you, the laws in force, elections and your standing, one place to start. It was sent back on 2026-10-15 for code conflicts with main in `src/bench/play.mjs` and `src/bench/data/controls.json`. Merge main, finish the hub to the owner's mockup in `docs/ui/mocks/screens-2026-10-14/` (README.md, shots/, page/), and retake the screenshot. The player would notice a short hub instead of a long page, his own office absent until he holds one, and Issues showing the law in words with history and votes on click.

**Rules.** No hand-written player text: every label, row and sentence is a record worded by the English engine or a control name from `src/bench/data/controls.json`; no raw ids, no 'undefined' and nothing immersion-breaking on a person card; Replace, never layer: the old look of this screen and the generic `row(label, value)` printer it used are deleted in the same change, and the PR body counts what was removed; An effect is a read, not a record: the screen shows only records an engine wrote, and a read-only screen spends no game time and creates no facts; This is a game, not a spreadsheet: the screen adds no form or paperwork; it only presents the golden path, with Day advancing time and never opening a choice list; One rule, all 56 places: the seats and laws shown come from `townSeats` and the law in force for the place, with no place named; Ask why: an Issues entry shows the law in words, and clicking it shows the history and votes.

**Done when.** The branch merges clean with main and the hub for the drawn place (name it and the seed) lists its real seats, laws and elections in words, hides the player's office until he holds one, and opens Issues with history on click. A full-window screenshot at 1672x941 of the finished screen is attached to the PR and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: opens Politics and sees who governs him.

**Files.** src/bench/government.ts, src/bench/office.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** One PR per screen; gate: browser spec for the screen.
Sent back 2026-10-15 from PR #4296 (branch play/politics-hub): code conflict with main in src/bench/play.mjs, src/bench/data/controls.json; finish on that branch, merge main into it first.
