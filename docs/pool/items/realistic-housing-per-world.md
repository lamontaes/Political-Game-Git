---
id: realistic-housing-per-world
title: "House prices, rents and home values open drawn per world"
area: core
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/realistic-housing-rows
pr: #6597
blocked-on:
lead: m0-m2
source: owner, Oct 27, 5:40 PM Eastern ("realistic not real"); docs/reports/real-statistics-in-play-2026-10-27.md
claimed-at: 2026-10-28T06:09:23.970Z
---

**What.** Rows 5 to 9 of docs/reports/real-statistics-in-play-2026-10-27.md: the state house price index, county median rent and home value, the old core's county home value, HUD rents, shelter beds and permits. Each opens on the published value. The ACS effective property-tax rate (row 53) is not a statute; the CTO rules whether it is law. The owner ruled on Oct 27 that every non-law statistic starts realistic, not real, and differs in every world from the moment Start is pressed.

**Rules.** Estimate, never UNKNOWN: Each value starts from the published one as the center of a per-world spread drawn from the world seed at Start, tagged in its parameter table with the source as calibration. One rule, all 56 places: the draw and its spread come from data, never a named state, city or GEOID in logic.

**Done when.** In two played worlds on drawn places and seeds, each listed statistic differs between the worlds and from its published row, named by record id; the guard covers it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/housing-prices.ts, src/core2/modules/housing.ts, src/simulation/county-home-value.ts, src/core2/hud-rents.ts

**Notes.** Filed by the realistic-not-real audit of Oct 27.

Oct 29 (CTO): set done; PR #6597 merged (the done flip failed while branch protection refused the flip job's push).
