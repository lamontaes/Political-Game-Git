---
id: realistic-county-rent-value-per-world
title: "County rents, home values and town owner shares open drawn per world"
area: core
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/realistic-housing
pr: #6472
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T01:30:18.125Z
---

**What.** Every world opens each county on its published ACS median gross rent and owner home value and each town on its published owner-occupied share (rentValueOf and tenureOfTown, src/core2/modules/housing.ts). Every household's rent, home value and mortgage start from those. The owner ruled on Oct 27 that every statistic starts realistic, not real, and differs per world.

**Rules.** No dice: the offsets are seeded generation of the starting world, drawn once from the world's seed, never an actor's outcome. One rule, all 56 places: every county and island area gets the same rule from the housing parameter table.

**Done when.** In two played worlds (buildBenchWorld) on drawn places and seeds, the county's rent and value differ from the published medians and leases read them by record id, and src/core2/housing-world.test.ts fails when any county opens on its published median or two seeds give the same one.

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/parameters.json

**Notes.** TODO

Oct 29 (CTO): set done; PR #6472 merged (the done flip failed while branch protection refused the flip job's push).
