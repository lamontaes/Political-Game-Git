---
id: play-first-17-buttons-same-size
title: "Buttons in a row share one size"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: play-first/play-first-17-buttons-same-size
pr: #6090
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-25T19:31:40.583Z
---

**What.** The owner's read of the playtest screenshots: buttons are the same size. In the v0.22.10 release buttons in one row differ in height and width (the title menu, the creator's Back and Continue, the talk box's controls). This item sets one button size rule in the Kit 13 styles and applies it everywhere.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §10, The owner's read of the Oct 24 screenshots. Replace, never layer: one button rule in play.css, the per-screen sizes deleted. This is a game, not a spreadsheet: controls look made, one family across the game.

**Done when.** In a drawn place, the title menu, New game, the creator's buttons, the talk box and a menu's buttons each share one height per row, checked by a test on computed sizes, shown by a screenshot of each.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Buttons in a row (the title menu, New game, the creator, the talk box, the menus) share one height and width rule.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.css

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): The selected Male button grows wider with a gold tab; the campaign act buttons differ in size; the Week button moves between screens.
