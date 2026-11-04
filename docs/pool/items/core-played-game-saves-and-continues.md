---
id: core-played-game-saves-and-continues
title: "The played game saves its life to disk and Continue brings it back after quitting, without replaying every day"
area: core
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Today Continue on the title screen is only the server's current life in memory (src/bench/handler.ts, /api/title: 'continue (the server's current life)'). Quitting the app or restarting the bench loses the life, and nothing in src/bench calls saveGame or loadGame from src/core2/saves.ts. The owner's path 6 is play two months, quit, reopen, and Continue returns the same date and people. saves.ts replays every command from the opening while uncoveredModules is non-empty, so a load would grow with played years unless the snapshot cover (core-snapshot-cover-rest, branch claude/snapshot-cover-s5) lands first.

**Rules.** One engine per mechanic: the bench saves and loads through saves.ts and snapshot.ts, never a second save writer. Wire to the world: the saved life is the same records, proven by the snapshot round trip naming no differing field. This is a game, not a spreadsheet: the player sees Continue and Saved games, nothing about files.

**Done when.** On the bench and the desktop build, in a place drawn from all 56 named with its seed, a life played two months, then the server restarted, then Continue shows the same date, the same player and household by person record id, and the load time measured after 2 and after 24 played months differs by less than 20 percent; scripts/core2-guard/snapshot-roundtrip.mjs reports no differing field.

**Files.** src/bench/handler.ts, src/core2/saves.ts, src/core2/snapshot.ts, desktop/play-api-host.mjs

**Notes.** TODO
