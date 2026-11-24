---
id: core-state-country-term-read-six-areas-from-played-web
title: "A state's and the country's term read still takes rent, crime, schools, health, roads and the environment from the played web, not from their own records"
area: core
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
after: core-outcome-web-follows-only-the-played-town
source: account lead thread "Give rivals more than one issue", Nov 14 (#9342; coordinator: a tracked gap, not a quiet one)
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** After #9342 a state's and the country's term read takes jobs and prices from their own monthly records (the regional and macro months). The six other areas, rent, crime, schools, health, roads and the environment, are still the old mean over the places the outcome web keeps, which is the played town and the places the economy records. A governor or President after a term where crime or schools slid reads the played town's slide as a proxy. Seen: in seed t2 (Forman, North Dakota, key 3827260) the state's read for crime is the played town's alone, and the country's is the same town's.

**Cause.** Found in code: `figuredRead` in src/core2/term-read.ts reads only the measures `jurisdictionFigures` in src/core2/data/term-read/areas.json lists (unemployment, hourly earnings, price level), because the regional and macro months keep no figure for the others; `withFigured` keeps the old mean for every area the figured read does not cover.

**Fix.** Give a state and the country a monthly figure for each of the six areas from the engine that already makes it (rent from housing's monthly rents, crime from the public-safety engine's counts, schools from the school measures, health from the health records, roads from the roads engine, the environment from its engine), counted as a state's or the country's total, never a town's; add each measure to `jurisdictionFigures`; delete the mean once the last of the six is covered.

**Time box.** 6 hours for an Opus session, one area per PR.

**Rules.** One model, two tiers: a counted state or the country reads with the same measures as the played town, times its count. Replace, never layer: each area's own figure replaces its share of the mean, and the mean is deleted with the last.

**Done when.** A second session sees, at a place drawn from all 56 (name the place and seed), a governor's and a President's address after a term where crime or schools slid whose read comes from the state's and the country's own records by record id, in a played world with the records proof showing the mean's tables unread.

**Waits on.** core-outcome-web-follows-only-the-played-town (#9342).

**Files.** src/core2/term-read.ts, src/core2/data/term-read/areas.json, src/core2/modules/housing.ts, src/core2/modules/crime.ts, src/core2/modules/world-metrics.ts

**Notes.** Filed Nov 14 by hand with #9342. Pay for states and the country is read from what their jobs pay for each resident (`core-state-country-pay-from-regional-months`); poverty stays open.
