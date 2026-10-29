---
id: realistic-base-rates-per-world
title: "Health, birth, death, moving and time-use base rates open drawn per world"
area: core
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/realistic-base-rates
pr: #6599
blocked-on:
lead: m0-m2
source: owner, Oct 27, 5:40 PM Eastern ("realistic not real"); docs/reports/real-statistics-in-play-2026-10-27.md
claimed-at: 2026-10-28T05:27:47.039Z
---

**What.** Rows 32 to 36 of docs/reports/real-statistics-in-play-2026-10-27.md: chronic condition prevalence, the SSA life table and state ratios, natality and cohort tables, ACS mover rates and ATUS time use. Each is the published rate in every world. The owner ruled on Oct 27 that every non-law statistic starts realistic, not real, and differs in every world from the moment Start is pressed.

**Rules.** Estimate, never UNKNOWN: A world draws one multiplier per table from its seed at Start around 1, tagged in its parameter table; the rates still check totals and never pick one actor's outcome (no dice). One rule, all 56 places: the draw and its spread come from data, never a named state, city or GEOID in logic.

**Done when.** In two played worlds on drawn places and seeds, each table's rate differs between the worlds and from the published one; the guard covers it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/condition-pack.ts, src/core2/health-mortality-table.ts, src/core2/births-counted.ts, src/core2/modules/moves.ts, src/core2/free-block.ts

**Notes.** Filed by the realistic-not-real audit of Oct 27.

Oct 29 (CTO): set done; PR #6599 merged (the done flip failed while branch protection refused the flip job's push).
