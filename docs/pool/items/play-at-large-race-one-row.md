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

**Rules.** One engine per mechanic: the screens read the pooled race the elections engine keeps; a view never splits it back into seats. No hand-written player text in code.

**Done when.** A fresh session replays New Game in Haleyville, Alabama at replay ab5f58e9be125c95 on main and on May 20, 2025 sees one Council member race for five seats on Campaigns, with everyone running in it, and files for that race; the same in one other at-large town drawn from all 56 (place and seed named).

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/filing.ts

**Notes.** TODO
