---
id: play-at-large-race-one-row
title: "Campaigns and the clerk offer an at-large council as one race, not one per seat"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer replay of Lane 1 path 1 on main 516a0f9070 (includes #7269, at-large seats counted as one race): New Game in Haleyville, Alabama (0132704, replay ab5f58e9be125c95). On May 20, 2025 the Campaigns screen lists five races for the August 26 election, 'Council member (Andrew Clay)', '(Cora Daniels)', '(Keith Robinson)', '(Robert Chavez)' and '(Suzanne Copeland)', each with its own running count, plus Mayor; File for it files for one seat (filing:contest:seat:gus2025:160735:council:0:2025-08-26). The count is pooled now, but the player still sees and files for one seat of five.

**Rules.** One engine per mechanic: the screens read the pooled race the elections engine keeps; a view never splits it back into seats. No hand-written player text: the race's label comes from the English engine's banks, not from text typed into the screen.

**Done when.** A fresh session replays New Game in Haleyville, Alabama at replay ab5f58e9be125c95 on main and on May 20, 2025 sees one Council member race for five seats on Campaigns, with everyone running in it, and files for that race; the same in one other at-large town drawn from all 56 (place and seed named). It is shown in a played world by screenshot, with the contest id named.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/filing.ts

**Notes.** TODO

Nov 10, Fable audit: still shows. The audit (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Not fixed (measured)") found on Nov 9 that races are still named by their holder: "Selectman (Brandon Reed)". The audit's line names no place or seed; its browser life was in Blodgett Landing, New Hampshire, a random world. The owner met the same thing on Nov 8 in Manchester, Connecticut (docs/coordination/playtest/2026-11-08-1.md, point C14): "Selectman (Amy Villarreal)", "Selectman (Janet Giles)", "Selectman (Karen Li)", each with "1 running". Read on main, Nov 10: the renaming is the second `.map` in `localRaces` of `src/bench/government.ts`, lines 470 to 482, which adds the holder's name whenever two races share a title; the Elections screen (`campaigns()` in `src/bench/play.mjs`, line 4217) draws one row per contest it is sent. The playtest check (`2026-11-08-1-check.md`, C14) names this item as the fix. Whoever claims it should check a board of selectmen as well as a council, in a drawn place, with a screenshot of Politics, Elections that shows one race for the board and no holder's name in a race title.
