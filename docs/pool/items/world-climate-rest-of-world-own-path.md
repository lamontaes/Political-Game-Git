---
id: world-climate-rest-of-world-own-path
title: "The rest of the world's CO2 follows a real published scenario path; it must follow each world's own trend"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
after:
pr: 0
blocked-on:
model: sonnet
effort: medium
root: none
source: "owner's calibration answers, Nov 16, 2026: disasters and the carbon path come from each world's own risks, never a real year's list"
lead: world
---

**What.** Every world's rest-of-world fossil CO2 followed the same IEA scenario path (38.1 Gt in 2025, 35 in 2035, 30 in 2050), so two worlds with the same laws warmed identically.
Seen: dev mode's climate line (warming and hazard levels) in two drawn places.

**Cause.** Found in code: `worldFossilGt` in `src/core2/modules/climate.ts` read a straight line between three real points by date, with no world input.

**Fix.** The month's rest-of-world CO2 carries on from the last month's at a steady yearly trend each world draws from its seed within the span the scenarios cover (`restOfWorldTrend`). Only the opening stock (38.1 Gt) and the span of the trend are read from data. The check `src/core2/climate-rest-of-world-own.test.ts` runs two drawn places with the same laws for two years and needs different cumulative CO2; it fails on the old code.

**Time box.** 2 hours.

**Rules.** No dice, numbers in a parameter table, no real year's list.

**Done when.** A second session opens two drawn places in the running game (places and seeds named) with the same laws, runs two years in dev mode, and sees different warming in each. Two drawn places with the same laws show different warming after two years, and a world's trend sits inside the stated span.

**Waits on.** Nothing.

**Files.** src/core2/modules/climate.ts, src/core2/data/climate/emissions.json, src/core2/climate-rest-of-world-own.test.ts (new)
