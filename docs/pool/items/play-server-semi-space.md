---
id: play-server-semi-space
title: "Start the play server with a larger young generation (a year runs about 25% faster in Node)"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found by the session that took core-year-speed-remaining"
---

**What.** In Node, `--max-semi-space-size=64` on the command line cut a played Exeter, New Hampshire year (key 3325300, seed speed-ex-1) from 153.6 s to 114.2 s with identical cash, gross debit and journal entries, and the first 120 days from 51 s to 45 s. Setting it from inside the process with `v8.setFlagsFromString` does not help (140 s, then no gain at 120 days), so it has to be a start flag. The packaged game runs the play server as an Electron utility process (`desktop/play-api-client.mjs`, `utilityFork`); pass it through `execArgv` and confirm in the packaged app that the server still starts and a year runs faster.

**Rules.** Check in the packaged Mac build before merging: a flag the utility process rejects stops the play server at start. Also set it for the private hub's fork, if it has one, and for the speed guard's runs, so the guard times the game's path.

**Done when.** The packaged game's play server starts with the flag, and a year in a drawn town is measurably faster than without it (name the place, seed and both times). A test or a startup log line shows the flag took effect (`v8.getHeapStatistics()` or `process.execArgv`).

**Files.** desktop/play-api-client.mjs, desktop/main.mjs, scripts/core2-guard/

**Notes.** Measured on a 4-core cloud container, one process at a time, base against flag. `--max-semi-space-size=128` gave 44.6 s against 45.2 s at 64 for 120 days, so 64 is enough.
