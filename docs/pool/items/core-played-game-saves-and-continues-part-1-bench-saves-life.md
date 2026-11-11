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
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-core-played-game-saves-and-continues-part-1-bench-saves-life
---

**What.** The bench holds the played life only in memory, so restarting the server loses it. Write the life to a save file through saveGame in src/core2/saves.ts (backed by src/core2/snapshot.ts) when time advances and when the server quits, with no second save writer. A save made under an older CORE_API_VERSION must still load after an update (the clause taken from core-m7-02-saves-that-last), which saves.ts supports by replaying its commands. This is part 1 of core-played-game-saves-and-continues.

**Cause.** Found in code: src/bench/handler.ts line 760 ("continue (the server's current life), or none") is only the server's in-memory life, and nothing in src/bench or the desktop host calls `saveGame` or `loadGame` from src/core2/saves.ts. saves.ts replays every command from the opening unless `uncoveredModules(core)` is empty (lines 215 and 238).

**Fix.** On advance and on quit the bench handler calls saveGame and writes the result to the saves folder; one function loads it back through loadGame. Add a test that saves a played life, loads it, and compares every field of the core.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: save through saves.ts and snapshot.ts only, never a second save writer. Wire to the world: the saved life is the same records, proven by a round trip naming no differing field. Speed: saving on advance must not slow the played day measurably.

**Done when.** A second session, not the builder, plays two months in a drawn place on the bench (place and seed named), restarts the bench, and the save file exists and loads through saves.ts with no differing field. A save written under an older version loads after the version changes.

**Waits on.** Nothing. (Early-access preparation gates saves in AGENTS.md; the CTO may lift it for the owner's path 6.)

**Files.** src/bench/handler.ts, src/core2/saves.ts, src/core2/snapshot.ts, src/core2/saves.test.ts

**Notes.** Released (2026-11-11): Cause differs from code (Nov 11, opus-1fd7): saveGame can only save a bench life through a snapshot, and 62 of a bench world's 81 modules are not declared covered (uncoveredModules, src/core2/snapshot.ts line 67; measured in Neptune Beach, Florida, seed snap1). The bench's actions do not go through runCommand, so the command replay cannot save it either, and the bench builds its world with benchWorldStages (src/bench/world.ts line 357), not newGame, so loadGame cannot rebuild it. The snapshot is 150 MB of JSON and takes 2 s. Needs a cause-and-split: audit each engine for state outside its tables and declare it covered (declareSnapshotCovered), then a load path that rebuilds through benchWorldStages. Continue on branch claude/pool-core-played-game-saves-and-continues-part-1-bench-saves-life.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:12 UTC) on branch claude/pool-core-played-game-saves-and-continues-part-1-bench-saves-life.

Released (2026-11-11): Re-offered after opus-1fd7's release; confirmed nothing in src/bench calls saveGame or loadGame and only 9 source files declare snapshot coverage; marking its Cause Needs cause with that finding. Continue on branch claude/pool-core-played-game-saves-and-continues-part-1-bench-saves-life.
