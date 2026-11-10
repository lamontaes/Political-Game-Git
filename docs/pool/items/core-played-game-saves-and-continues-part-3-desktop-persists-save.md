---
id: core-played-game-saves-and-continues-part-3-desktop-persists-save
title: "The packaged desktop app keeps the same save across quit and reopen"
area: core
kind: feature
priority: 1
size: S
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

**What.** The packaged desktop app runs the bench through desktop/play-api-host.mjs and must keep the life across quitting and reopening. It writes its save where the operating system keeps app data and reads it through the same saves.ts path as the bench, not a second writer. This is part 3 of core-played-game-saves-and-continues. Feeds: core-played-game-saves-and-continues.

**Cause.** Found in code: desktop/play-api-host.mjs hosts the bench API in the packaged app and has no call to `saveGame` or `loadGame` from src/core2/saves.ts, so the life in memory is lost when the app quits.

**Fix.** Point the host at the app data folder for the saves folder that part 1 writes, and load the latest on start through the same reader. Add a host test that quits and reopens.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the host uses the one save path of part 1, never its own. Wire to the world: the reopened life is the same records. Storage: a cloud session sets the storage override and never copies the repository.

**Done when.** A second session, not the builder, plays two months in the packaged desktop app on a drawn place, quits, and reopens: Continue shows the same date, player and household by person record id.

**Waits on.** core-played-game-saves-and-continues-part-1-bench-saves-life.

**Files.** desktop/play-api-host.mjs, desktop/main.mjs, src/core2/saves.ts
