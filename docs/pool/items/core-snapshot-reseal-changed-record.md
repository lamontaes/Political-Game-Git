---
id: core-snapshot-reseal-changed-record
title: "A save restore seals a changed frozen record again, so a record edited after loading does not fail the save check"
area: core
kind: feature
priority: 2
size: S
status: claimed
claimed-by: claude/political-game-pool-3xfqef-27
pr:
blocked-on:
source: "split of core-outside-wage-obligation (L), Oct 20"
claimed-at: 2026-10-20T06:34:29.380Z
---

**What.** Restoring a save re-freezes the core's records, and a frozen record that changed since it was saved fails the seal check. Make the restore in `src/core2/snapshot.ts` seal a record that was changed by a producer after load, rather than throwing, while a record that changed without a producer still fails. This was the one change in PR #5076 that the commuter work needed so that a filled-in household's new job survives a save.

**Rules.** No dice. Wire to the world: the seal is read when a save is restored and fails on an unexplained change. Replace, never layer: the old behavior is replaced, not kept beside a flag. Estimate, never UNKNOWN does not apply; nothing here is a number.

**Done when.** A test in `src/core2/saves.test.ts` saves a world, changes a frozen record through its producer, restores, and passes the seal check, and a second case changes a record with no producer and fails it, in a place drawn from all 56 with the seed in the failure message.

**Files.** src/core2/snapshot.ts, src/core2/saves.test.ts

**Notes.** Split Oct 20 from core-outside-wage-obligation (L). Independent of the other two parts.
