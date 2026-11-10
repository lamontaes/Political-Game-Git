---
id: core-played-game-saves-and-continues-part-1-bench-saves-life
title: "The bench saves the played life on advance and on quit through saves.ts"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: opus
effort: medium
root: none
source: split from core-played-game-saves-and-continues in the pool redo, Nov 10, 2026
---

**What.** The bench holds the played life only in memory, so restarting the server loses it. Write the life to a save file through saveGame in src/core2/saves.ts (backed by src/core2/snapshot.ts) when time advances and when the server quits, with no second save writer. A save made under an older CORE_API_VERSION must still load after an update (the clause taken from core-m7-02-saves-that-last), which saves.ts supports by replaying its commands. This is part 1 of core-played-game-saves-and-continues.

**Cause.** Found in code: src/bench/handler.ts line 760 ("continue (the server's current life), or none") is only the server's in-memory life, and nothing in src/bench or the desktop host calls `saveGame` or `loadGame` from src/core2/saves.ts. saves.ts replays every command from the opening unless `uncoveredModules(core)` is empty (lines 215 and 238).

**Fix.** On advance and on quit the bench handler calls saveGame and writes the result to the saves folder; one function loads it back through loadGame. Add a test that saves a played life, loads it, and compares every field of the core.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: save through saves.ts and snapshot.ts only, never a second save writer. Wire to the world: the saved life is the same records, proven by a round trip naming no differing field. Speed: saving on advance must not slow the played day measurably.

**Done when.** A second session, not the builder, plays two months in a drawn place on the bench (place and seed named), restarts the bench, and the save file exists and loads through saves.ts with no differing field. A save written under an older version loads after the version changes.

**Waits on.** Nothing. (Early-access preparation gates saves in AGENTS.md; the CTO may lift it for the owner's path 6.)

**Files.** src/bench/handler.ts, src/core2/saves.ts, src/core2/snapshot.ts, src/core2/saves.test.ts
