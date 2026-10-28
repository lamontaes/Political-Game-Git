---
id: realistic-outcome-bases-per-world
title: "The outcome web's 55 state measures and crime rates open drawn per world"
area: core
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/realistic-outcome-bases
pr: #6468
blocked-on:
lead: m0-m2
source: owner, Oct 27, 5:40 PM Eastern ("realistic not real"); docs/reports/real-statistics-in-play-2026-10-27.md
claimed-at: 2026-10-28T00:23:05.477Z
---

**What.** Rows 39 and 40 of docs/reports/real-statistics-in-play-2026-10-27.md: poverty, uninsured, graduation, turnout, violent crime, homelessness and the other outcome bases (src/core2/outcome-web-model.ts:243 says 'never drawn'), and the NCVS victimization rates. The owner ruled on Oct 27 that every non-law statistic starts realistic, not real, and differs in every world from the moment Start is pressed. Each row names its file and reader so the fix lands in one place.

**Rules.** Estimate, never UNKNOWN: Each base starts from the published one as the center of a per-world spread drawn from the world seed at Start, tagged in its parameter table; the measures then move with the simulation. One rule, all 56 places: the draw and its spread come from data, never a named state, city or GEOID in logic.

**Done when.** In two played worlds on drawn places and seeds, each base differs between the worlds and from its published row, named by record id; the guard covers it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/outcome-web-model.ts, src/core2/modules/crime.ts

**Notes.** Filed by the realistic-not-real audit of Oct 27.
