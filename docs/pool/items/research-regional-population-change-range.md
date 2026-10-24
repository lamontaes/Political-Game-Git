---
id: research-regional-population-change-range
title: "M1-13: no sourced range for a state's or region's one-year population change to check other places against"
area: world
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Roadmap M1-13 asks that other places' populations change within real ranges. data/research/regional holds state jobs, pay and unemployment series and their spreads (series/stats.json), but nothing on population change, so the new M1-13 check (src/bench/m1-13-check.ts) cannot test the clause and says so. Fetch the Census Bureau's state population estimates (vintage components of change, 2000 onward), and record the 5th to 95th percentile of the one-year state change, with metros if the same series gives them.

**Rules.** Research before building: the range is SOURCED from fetched Census pages with citation and only checks totals; it never moves a place's population by itself (No dice).

**Done when.** data/research/regional/series/stats.json carries a sourced one-year state population change range with its citation, and the M1-13 command checks every region's yearly change against it in a place drawn from all 56, named with its result in the PR body.

**Files.** data/research/regional/series/stats.json, src/bench/m1-13-check.ts

**Notes.** Found by the M0-M2 lead writing M1-13's command, Oct 24. Blocks roadmap M1-13.
