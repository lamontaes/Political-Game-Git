---
id: core-played-game-saves-and-continues-part-2-continue-saved-games
title: "Title screen Continue and Saved games load the saved life"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: core-played-game-saves-and-continues-part-1-bench-saves-life
blocked-on:
lead: play-first
model: opus
effort: medium
root: none
source: split from core-played-game-saves-and-continues in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** After part 1 writes a save, the title screen must offer it. Continue returns the most recent life and Saved games lists the saves by player name and date, with no file names shown. Loading restores the same date, player and household. This is part 2 of core-played-game-saves-and-continues. Feeds: core-played-game-saves-and-continues (the title screen's Continue and Saved games list).

**Cause.** Found in code: src/bench/handler.ts line 760 ("continue (the server's current life), or none") is only the server's in-memory life, and nothing in src/bench or the desktop host calls `saveGame` or `loadGame` from src/core2/saves.ts. The title route at line 757 builds the scenes and the in-progress life only from memory.

**Fix.** In the /api/title route and the title screen code (src/bench/ui), list the saves from the saves folder through one reader of saves.ts, label them with worded names and dates, and load the chosen one through loadGame.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Screens follow the mocks and the shared controls (screen-to-mock). No hand-written player text in code: labels come from the English engine's banks. This is a game, not a spreadsheet: the player sees Continue and Saved games, nothing about files.

**Done when.** A second session, not the builder, plays two months in a drawn place (named with its seed), restarts the bench, and the title Continue shows the same date, player and household by person record id; Saved games lists the save with a worded name and date.

**Waits on.** core-played-game-saves-and-continues-part-1-bench-saves-life.

**Files.** src/bench/handler.ts, src/core2/saves.ts, src/bench/ui
