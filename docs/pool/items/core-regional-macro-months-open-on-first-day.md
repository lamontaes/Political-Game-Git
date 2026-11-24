---
id: core-regional-macro-months-open-on-first-day
title: "The regional and macro months are empty when a world is created and fill on its first day"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: core-outcome-web-follows-only-the-played-town
source: account lead thread "Give rivals more than one issue", Nov 14 (the state and country term read; skill day-one-in-motion)
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** In a world built by `buildBenchWorld` the regional module's months table and the macro module's months table hold no rows at creation, and hold 15 and 49 rows after the first day's step, with real history back to 2021. A screen, a paper line or a speech read before that first step sees a country and a state with no record, though a real place on that date has years of them. Seen: Blades, Delaware (1006730), seed a7c13e:1, read at 2025-01-20 with 0 and 0 rows, and at 2025-01-22 with 15 regional months (2021-12 to 2025-01) and 49 macro months (2021-01 to 2025-01).

**Cause.** Measured: at Blades, Delaware, seed a7c13e:1 (the test src/core2/term-read-figures.test.ts advances a day first for this reason), both tables are written by the modules' opening on the first step, not when the world is built; the state and country term read (src/core2/term-read.ts `figuredRead`) reads them and so reads nothing until a day has passed.

**Fix.** Needs cause. Run the same opening (`openRegional` and the macro opening, with the real history they already read) at world creation, so day 0 has the records a real day has; no second writer.

**Time box.** 3 hours for an Opus session.

**Rules.** One engine per mechanic: the same opening runs earlier, never a copy of its rows. Replace, never layer: the first-step opening is removed once creation runs it, so a world is not opened twice.

**Done when.** A second session sees, at a place drawn from all 56 (name the place and seed), the regional and macro months present in a played world built by `buildBenchWorld` before any day has run, and a governor's or the President's first address reading them by record id, with the records proof unchanged after the first day.

**Waits on.** core-outcome-web-follows-only-the-played-town.

**Files.** src/core2/modules/regional.ts, src/core2/modules/macro.ts, src/core2/day-zero.test.ts (the day-zero table list).

**Notes.** Filed Nov 14 by hand with the PR that reads them.
