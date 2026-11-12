---
id: core-played-game-saves-and-continues-part-1-bench-saves-life
title: "The bench saves the played life on advance and on quit through saves.ts"
area: core
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-core-played-game-saves-and-continues-part-1-bench-saves-life
pr: #8742
after:
blocked-on:
lead: play-first
model: opus
effort: medium
root: none
source: split from core-played-game-saves-and-continues in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T07:31:19.693Z
branch: claude/pool-core-played-game-saves-and-continues-part-1-bench-saves-life
---

**What.** The bench holds the played life only in memory, so restarting the server loses it. Record every action the player takes in a life and write it as a save through saveGame in src/core2/saves.ts when time advances and when the server quits, with no second save writer, and replay it into the same world. A save made under an older CORE_API_VERSION must still load after an update (the clause taken from core-m7-02-saves-that-last), which a replay save does by design. This is part 1 of core-played-game-saves-and-continues. Feeds: core-played-game-saves-and-continues-part-2-continue-saved-games.

**Cause.** Measured: in a fresh draw (seed cause-snap, Nov 11, main d64255aa) `uncoveredModules` (src/core2/snapshot.ts line 66) lists 62 of the bench world's 81 modules, so `saveGame` can never take a snapshot of a bench life, and a snapshot is 52 MB at the opening and 123 MB after two months anyway. Found in code: the bench never calls `runCommand`, so a save of a bench life holds no commands either. Every action reaches the world through one entry point, `benchRequest` in src/bench/handler.ts (line 2355), as a method and a URL (each POST carries its input in the query, for example /api/newlife's seed, person and placeKey), and nothing records those requests. A screen that only reads can still change the world: `personCard` (handler.ts line 1968) and 15 other bench and director calls go through `personOrFillIn` (src/core2/state.ts line 2294), which makes a counted person a full person. Measured: the bench world is deterministic. Built twice from the same seed (cause-twin) and played two months with `advanceCore`, both snapshots had the same hash (2216af2e…), each in 4 s to build and 7 s to play. So replaying the recorded requests rebuilds the same life; no snapshot is needed for this part.

**Fix.** 1. In src/core2/state.ts, count fill-ins per world: a module-level `WeakMap<CoreState, number>` that `fillInPerson` increments when it makes a full person, read by an exported `fillInCount(core)`. 2. In src/bench/handler.ts `benchRequest`, keep the life's `Game` (from saves.ts: recipe, commands, skipped) beside `state.core`. Start it on POST /api/newlife (recipe: place seed and key from the built world, `twoLevel: true`). Record a request as `{ date: core date before it ran, kind: "bench.request", payload: { method, url: path and query } }` when it is a POST under /api/ other than /api/grade and /api/gap (they write files, not the world), or a GET during which `fillInCount` rose. Register the kind with `registerCommand` so saves.ts knows it. 3. Write the save with `saveGame(game, { snapshot: false })` to one JSON file after every request that moved the core date, and on quit: SIGINT and SIGTERM in src/bench/server.ts, and the host's `stop` in desktop/play-api-host.mjs (part 3 picks the folder; until then the path comes from `OCD_SAVE_PATH` or the system temporary folder). 4. Add to saves.ts one async `replaySave(save, run)` that checks the format, sets `upgradedFrom` when the version differs, and runs each command through `run`, putting a failed one in `skipped` with its reason; move `loadGame`'s skip rule into one helper both use. The bench's `run` calls `benchRequest` with the recorded method and URL and awaits it. 5. Test (src/bench/save-life.test.ts, new): in a drawn place, POST /api/newlife, wait a few days and open one person card, save, reset the bench state, replay, and compare `snapshotWorld` of both worlds field by field; a version-changed save (edit `coreApiVersion` in the file) still replays and reports `upgradedFrom`.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: save through saves.ts only (`saveGame` writes, `replaySave` reads), never a second save writer. Wire to the world: the replayed life is the same records, proven by a snapshot comparison naming no differing field. Speed: saving writes only the command list (kilobytes), never a snapshot, so the played day does not slow. Every request the save replays is one the player made; nothing is replayed that the bench did on its own.

**Done when.** A second session, not the builder, plays two months in a drawn place on the bench (place and seed named), opens at least one person card, restarts the bench, finds the save file, replays it with `replaySave`, and `snapshotWorld` of the replayed world matches the played one with no differing field. A save whose `coreApiVersion` is changed by hand still replays, with `upgradedFrom` set.

**Waits on.** Nothing. (Early-access preparation gates saves in AGENTS.md; the CTO may lift it for the owner's path 6.)

**Files.** src/bench/handler.ts, src/bench/server.ts, desktop/play-api-host.mjs, src/core2/saves.ts, src/core2/state.ts, src/core2/saves.test.ts, src/bench/save-life.test.ts (new)

**Notes.** Released (2026-11-11): Cause differs from code (Nov 11, opus-1fd7): saveGame can only save a bench life through a snapshot, and 62 of a bench world's 81 modules are not declared covered (uncoveredModules, src/core2/snapshot.ts line 67; measured in Neptune Beach, Florida, seed snap1). The bench's actions do not go through runCommand, so the command replay cannot save it either, and the bench builds its world with benchWorldStages (src/bench/world.ts line 357), not newGame, so loadGame cannot rebuild it. The snapshot is 150 MB of JSON and takes 2 s. Needs a cause-and-split: audit each engine for state outside its tables and declare it covered (declareSnapshotCovered), then a load path that rebuilds through benchWorldStages. Continue on branch claude/pool-core-played-game-saves-and-continues-part-1-bench-saves-life.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:12 UTC) on branch claude/pool-core-played-game-saves-and-continues-part-1-bench-saves-life.

Released (2026-11-11): Re-offered after opus-1fd7's release; confirmed nothing in src/bench calls saveGame or loadGame and only 9 source files declare snapshot coverage; marking its Cause Needs cause with that finding. Continue on branch claude/pool-core-played-game-saves-and-continues-part-1-bench-saves-life.

Cause found (Nov 11, 2026, cause finder for Fable B): reproduced on a fresh draw (62 of 81 modules uncovered, seed cause-snap). The snapshot route is part 4's work and is not needed here: the bench world rebuilds identically from its seed (two builds of seed cause-twin played two months gave the same snapshot hash), so this part saves the recipe plus the player's recorded requests and replays them. The one trap is a read-only screen that fills someone in; the fill-in count catches it.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 07:31 UTC) on branch claude/pool-core-played-game-saves-and-continues-part-1-bench-saves-life.
