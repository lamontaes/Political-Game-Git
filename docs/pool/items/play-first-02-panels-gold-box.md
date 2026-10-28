---
id: play-first-02-panels-gold-box
title: "Every panel keeps its slight gold box at all times, never see-through"
area: play
kind: bug
priority: 1
size: S
status: dropped
claimed-by:
pr:
blocked-on:
after: play-stop-17-see-through-panels
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** The owner's read of the playtest screenshots: panels keep the slight gold box permanently, not transparent. In the v0.22.10 release panels drew over the scene with the room showing through the text. This item gives every panel one style: the Kit 13 gold edge always on, over a backing that holds the room back.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §10, The owner's read of the Oct 24 screenshots. Replace, never layer: one panel style in play.css, the transparent variants deleted. This is a game, not a spreadsheet: every reading screen is readable at a glance over any room.

**Done when.** In a drawn place, the News panel, a person card, Politics and the talk box each show the gold edge over the busiest first-evening backdrop at rest and on hover, shown by a screenshot of each.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Every panel and menu keeps its slight gold edge and a backing you can read over, all the time, never fading to see-through.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.css

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `play-stop-17-see-through-panels`; close into it and carry any line it lacks there. (one panel style)
