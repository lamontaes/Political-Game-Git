---
id: realistic-regional-and-jobs-per-world
title: "State and metro economy, employment rates and pay open drawn per world"
area: core
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/realistic-regional-and-jobs
pr: #6593
blocked-on:
lead: m0-m2
source: owner, Oct 27, 5:40 PM Eastern ("realistic not real"); docs/reports/real-statistics-in-play-2026-10-27.md
claimed-at: 2026-10-28T05:27:53.451Z
---

**What.** Rows 3, 4 and 10 to 13 of docs/reports/real-statistics-in-play-2026-10-27.md: regional unemployment, jobs, pay, income, price parity and sector mix; age unemployment ratios; employment-to-population; OEWS pay centers; sector mix; place earnings. Each opens on the published value. The owner ruled on Oct 27 that every non-law statistic starts realistic, not real, and differs in every world from the moment Start is pressed.

**Rules.** Estimate, never UNKNOWN: Each value starts from the published one as the center of a per-world spread drawn from the world seed at Start, tagged ESTIMATED or TUNABLE with the source as calibration; no dice decide an actor's outcome. One rule, all 56 places: the draw and its spread come from data, never a named state, city or GEOID in logic.

**Done when.** In two played worlds on drawn places and seeds, each listed statistic differs between the worlds and from its published row, named by record id; the guard covers it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/regional-model.ts, src/core2/opening-employment.ts, src/core2/town-pay.ts, src/core2/town-employment-mix.ts, src/core2/residents.ts

**Notes.** Filed by the realistic-not-real audit of Oct 27.

Oct 29 (CTO): set done; PR #6593 merged (the done flip failed while branch protection refused the flip job's push).
