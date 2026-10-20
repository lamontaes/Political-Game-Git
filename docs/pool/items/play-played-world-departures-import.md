---
id: play-played-world-departures-import
title: "The played-world golden-path proof stops on import: it reads departuresOf, which the moves engine no longer exports"
area: play
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/played-world-departures
pr: #5603
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:29:13.171Z
---

**What.** tests/golden-path/played-world.node-test.ts imports departuresOf from the moves module, but the commit that deleted the unread departures table removed that export, so the played-world proof stops on import with 'does not provide an export named departuresOf' on current main. Every session that proves a feature with that command is blocked, and the nobody-serves-after-moving-away verdict cannot run. Start the departure watcher right after the world is built and read the departures it saw, as the other year proofs now do.

**Rules.** An effect is a read: the verdict reads the moved-away event's departure record, the same record the engine emitted, never a rebuilt copy. Replace, never layer: the dead import goes, no second departures source is added. One rule, all 56 places: the proof still draws its place by seed.

**Done when.** node --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts with PLAYED_WORLD_SEED set runs to its end on a drawn place (name the place and seed in the PR body) and its nobody-serves-after-moving-away verdict reports a departures count taken from the moved-away events.

**Files.** tests/golden-path/played-world.node-test.ts

**Notes.** Found Oct 20 running the played-world proof for PR 4146 against current main; the cause is the commit that deleted moves/departures (table-unread-moves-departures).
