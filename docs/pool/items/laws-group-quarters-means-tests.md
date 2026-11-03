---
id: laws-group-quarters-means-tests
title: "Law reach and the poverty count read inmates and nursing-home residents as poor households"
area: laws
lead: laws
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-group-quarters-population
source: speed lead, Nov 1, review of core-group-quarters-population
claimed-at:
---

**What.** Group-quarters residents are counted room records with no income of their own (core-group-quarters-population). Law reach (src/core2/counted-reach.ts, src/core2/law-reach/group-b-people.ts) and the poverty count (src/core2/world-poverty.ts) read each zero-income room as a poor household, so an inmate or a nursing-home resident reads as eligible for a means-tested program and as poor (stopgap SG-GQ-means-tests-poverty). A prison or nursing-home town's poverty rate and a program's reach there are overstated.

**Rules.** Research before building: the Census poverty universe leaves out institutional residents, military quarters and college dormitories, and each program's own eligibility rule says who in group quarters it serves. One model, two tiers: the same universe applies to full residents of rooms as to counted ones, times their count.

**Done when.** In a played world (buildBenchWorld) in a drawn place with institutional group quarters, place and seed named, a test in src/core2 shows the poverty count leaves room records out of its universe and law reach counts a room only where the program's rule serves it, by room record id, and SG-GQ-means-tests-poverty is resolved.

**Files.** src/core2/counted-reach.ts, src/core2/law-reach/group-b-people.ts, src/core2/world-poverty.ts

**Notes.** Markers: src/core2/counted-reach.ts, src/core2/world-poverty.ts.
