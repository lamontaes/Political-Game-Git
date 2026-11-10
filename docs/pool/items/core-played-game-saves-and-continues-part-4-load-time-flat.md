---
id: core-played-game-saves-and-continues-part-4-load-time-flat
title: "Loading a save takes the same time after 2 months as after 24 months of play"
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
---

**What.** saves.ts replays every command from the opening unless every module is covered by the snapshot, so a load can grow with played years. Measure load time after 2 and after 24 played months in a drawn place, find any module that is not covered (`uncoveredModules`), and cover it so a load restores the snapshot and replays only the days since. This is part 4 of core-played-game-saves-and-continues.

**Cause.** Found in code: src/bench/handler.ts line 760 ("continue (the server's current life), or none") is only the server's in-memory life, and nothing in src/bench or the desktop host calls `saveGame` or `loadGame` from src/core2/saves.ts. saves.ts `uncoveredModules` (lines 215 and 238) decides whether a load restores the snapshot or replays the whole history.

**Fix.** Time the load at 2 and 24 months, list `uncoveredModules` for the played world, and cover what it lists through snapshot.ts; add a test that fails when the list is not empty in a played world.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: load time does not grow with played years; records kept hold the same way. Wire to the world: the covered module's records round trip with no differing field. One run, one number: time each load once, not repeat medians.

**Done when.** A second session, not the builder, loads a save made after 2 and after 24 played months in a drawn place (named with its seed) and the two load times differ by under 20 percent, reported as figures, with `uncoveredModules` empty for the played world.

**Waits on.** core-played-game-saves-and-continues-part-1-bench-saves-life.

**Files.** src/core2/saves.ts, src/core2/snapshot.ts, src/core2/saves.test.ts, scripts/core2-year/saves.mjs
