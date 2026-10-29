---
id: realistic-sitting-holders-vote-share
title: "Sitting holders' winning shares are drawn per seat, not one figure per office kind"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/realistic-sitting-vote-shares
pr: #6448
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:05:42.718Z
---

**What.** Every sitting holder of an office kind opens with the same winning share from src/core2/data/offices/tenure.json (local 0.60, U.S. House 0.64, U.S. Senate 0.57, legislature 0.635, statewide 0.56), written by electionBehind in src/core2/modules/offices.ts. The Government sheet prints it, so every council member reads elected with 60% of the vote. The owner ruled on Oct 27 that every statistic starts realistic, not real, and differs per world.

**Rules.** No dice: the share is seeded generation of the past before day one, drawn once per seat and race from the world's seed inside the office kind's ESTIMATED spread, never an actor's choice in play. One rule, all 56 places: the spread comes from the tenure table for every office kind, never a named place.

**Done when.** In two played worlds (buildBenchWorld) on drawn places and seeds, the Government sheet's sitting holders print distinct shares by term record id, each inside its office kind's spread, and src/core2/offices.test.ts fails when the share is one figure per office kind.

**Files.** src/core2/modules/offices.ts, src/core2/offices.test.ts

**Notes.** TODO
