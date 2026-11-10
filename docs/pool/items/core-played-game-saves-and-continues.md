---
id: core-played-game-saves-and-continues
title: "The played game saves its life to disk and Continue brings it back after quitting, without replaying every day"
area: core
kind: feature
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on: core-played-game-saves-and-continues-part-1-bench-saves-life, core-played-game-saves-and-continues-part-2-continue-saved-games, core-played-game-saves-and-continues-part-3-desktop-persists-save, core-played-game-saves-and-continues-part-4-load-time-flat
model: sonnet
effort: low
root: none
lead: play-first
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Continue on the title screen is only the server's current life in memory (src/bench/handler.ts, /api/title: 'continue (the server's current life)'), and nothing in src/bench or the desktop host calls saveGame or loadGame from src/core2/saves.ts. Quitting the app or restarting the bench loses the life. The owner's path 6 is play two months, quit, reopen, and Continue returns the same date and people. A save is also versioned so an old save loads and plays after an update (the clause taken from core-m7-02-saves-that-last). It is split into four parts: the bench writes the save, the title screen continues it, the desktop host persists it, and load time stays flat.

**Cause.** Found in code: src/bench/handler.ts line 760 ("continue (the server's current life), or none"): Continue is only the server's in-memory life, and nothing in src/bench or desktop calls saveGame or loadGame from src/core2/saves.ts. saves.ts replays every command from the opening unless `uncoveredModules(core)` is empty (lines 215 and 238); core-snapshot-cover-rest is done.

**Fix.** Bench and desktop save the life through saves.ts and snapshot.ts (no second writer), Continue and Saved games list and load it, and load time stays flat as played months grow. Built in the four parts named in blocked-on, in order: part 1 first, parts 2 to 4 after it.

**Time box.** 12 hours across the four parts for one Opus session; each part has its own box. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the bench saves and loads through saves.ts and snapshot.ts, never a second save writer. Wire to the world: the saved life is the same records, proven by the snapshot round trip naming no differing field. This is a game, not a spreadsheet: the player sees Continue and Saved games, nothing about files. Speed: load time must not grow with played years.

**Done when.** A second session, not the builder, plays two months on the bench in a drawn place (named with its seed), restarts the server, and Continue shows the same date and the same player and household by person record id; the load time after 2 and after 24 played months is reported; and the four parts are all done. The packaged desktop app quits and reopens to the same life.

**Waits on.** The four parts (core-played-game-saves-and-continues-part-1-bench-saves-life to -part-4-load-time-flat). Also early-access preparation (AGENTS.md: "Saves don't matter until early-access preparation"); the CTO may lift this for the owner's path 6 (play two months, quit, Continue).

**Files.** src/bench/handler.ts, src/core2/saves.ts, src/core2/snapshot.ts, desktop/play-api-host.mjs, scripts/core2-year/saves.mjs

**Notes.** TODO
