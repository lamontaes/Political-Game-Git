---
id: play-path-check-waits-for-filing
title: "The path check waits for a filing window instead of giving up the day after the player turns 18"
area: elections
kind: bug
priority: 1
size: S
status: claimed
claimed-by: lane-1/path-measure
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T11:55:46.572Z
---

**What.** src/bench/path-check.ts tried to file the day after the player turns 18. Since filing opens on a set day (elections-filing-window-opens, #7168) that day is usually outside every window, so Haleyville, Alabama and Murray, Nebraska reported no step at all: 'no contest the player can enter'. A player waits for filing to open. The check now lives on a week at a time, up to two years, until a race the clerk's answer offers is open, and names the unmet checks if none opens.

**Rules.** Lane 4 owns src/bench; agreement 1-4 has Lane 1 update the bench checks that file the player when Lane 1 changes the filing rule (Review: Lane 4). No player boost: the character waits as a player would and files through the clerk's answer.

**Done when.** In Haleyville, Alabama (0132704, replay ab5f58e9be125c95) and Murray, Nebraska (3133425, replay 1d3f0e18ca4ba7e5) the path check files once filing opens and prints how far the life got, with the opening day it waited for.

**Files.** src/bench/path-check.ts, docs/lanes/agreements/1-4.md

**Notes.** Lane 1, Nov 4: built on lane-1/path-measure.
