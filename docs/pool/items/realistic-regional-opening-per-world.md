---
id: realistic-regional-opening-per-world
title: "Each world's states and metros open on their own unemployment, jobs, pay and prices"
area: core
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/realistic-regional-opening
pr: #6450
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:15:17.343Z
---

**What.** The regional layer opens every state and metro on its published LAUS, CES and BEA figures (openingRegionMonths, src/core2/regional-model.ts:122), shifted only by a custom world's chosen national rate. The first night's jobs report and the Economy screen's region row print those figures. The owner ruled on Oct 27 that every statistic starts realistic, not real, and differs per world.

**Rules.** No dice: each state's offsets are seeded generation of the starting world, drawn once from the world's seed, never an actor's outcome. One rule, all 56 places: every state and territory gets the same rule from data, and its metros move with it.

**Done when.** In two played worlds (buildBenchWorld) on drawn places and seeds, the jobs report's region record id prints a rate that differs from the published one, and src/core2/regional.test.ts fails when two seeds or the published figures give the same unemployment, jobs, pay or price level for any region.

**Files.** src/core2/regional-model.ts, src/core2/modules/regional.ts, src/core2/data/regional/parameters.json

**Notes.** TODO
