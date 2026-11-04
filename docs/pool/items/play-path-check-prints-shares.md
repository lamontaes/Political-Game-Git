---
id: play-path-check-prints-shares
title: "The path check prints each candidate's vote share on election night"
area: elections
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The path check reported only won or lost, so a loss in a fixed town could not be read: a close race and a crowded field looked the same. It now prints each candidate's share of the race's votes, the player's marked.

**Rules.** Lane 4 owns src/bench; reporting only, read from the result record (agreement 1-4).

**Done when.** In Jericho, Vermont (replay 6f539fcfdf6d96f9-5) and Hardyville, Kentucky (storrs-1) the path check prints each election night's shares, the player's marked.

**Files.** src/bench/path-check.ts

**Notes.** Lane 1, Nov 4.
