---
id: play-first-17-buttons-same-size
title: "Buttons in a row share one size"
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

**What.** The owner's read of the playtest screenshots: buttons are the same size. In the v0.22.10 release buttons in one row differ in height and width (the title menu, the creator's Back and Continue, the talk box's controls). This item sets one button size rule in the Kit 13 styles and applies it everywhere.

**Rules.** Replace, never layer: one button rule in play.css, the per-screen sizes deleted. This is a game, not a spreadsheet: controls look made, one family across the game.

**Done when.** In a drawn place, the title menu, New game, the creator's buttons, the talk box and a menu's buttons each share one height per row, checked by a test on computed sizes, shown by a screenshot of each.

**Files.** src/bench/play.css

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
