---
id: laws-group-quarters-means-tests
title: "Law reach and the poverty count read inmates and nursing-home residents as poor households"
area: laws
lead: laws
kind: stopgap
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-laws-group-quarters-means-tests
pr: #8690
blocked-on:
after: core-group-quarters-population
model: sonnet
effort: medium
root: none
source: speed lead, Nov 1, review of core-group-quarters-population
claimed-at: 2026-11-11T06:12:07.893Z
checked: fable 2026-11-10
---

**What.** Group-quarters residents are counted room records with no income of their own. Law reach and the poverty count read each zero-income room as a poor household, so an inmate or a nursing-home resident reads as eligible for a means-tested program and as poor (stopgap SG-GQ-means-tests-poverty). A prison or nursing-home town's poverty rate and a program's reach there are overstated. The Census poverty universe leaves out institutional residents, military quarters and college dormitories, and each program's own eligibility rule says who in group quarters it serves. Seen: the Metrics tab's poverty rate and a program's reach in a prison or nursing-home town.

**Cause.** Found in code: src/core2/counted-reach.ts (the SG-GQ-means-tests-poverty marker at line 207) and src/core2/world-poverty.ts treat zero-income room records as poor, and src/core2/law-reach/group-b-people.ts reads them for program eligibility; the stopgap row is in src/core2/data/stopgaps/gq.json.

**Fix.** Leave institutional room records out of the poverty universe, and count a room for a program only where the program's own rule serves group quarters. Resolve the stopgap.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: the Census poverty universe leaves out institutional residents, military quarters and college dormitories, and each program's eligibility rule says who in group quarters it serves. One model, two tiers: the same universe applies to full residents of rooms as to counted ones, times their count.

**Done when.** A second session, not the builder, plays a drawn place with institutional group quarters (`buildBenchWorld`, place and seed named). A test in src/core2 shows the poverty count leaves room records out of its universe and law reach counts a room only where the program's rule serves it, by room record id, and SG-GQ-means-tests-poverty is resolved.

**Waits on.** Nothing (core-group-quarters-population is done).

**Files.** src/core2/counted-reach.ts, src/core2/law-reach/group-b-people.ts, src/core2/world-poverty.ts, src/core2/data/stopgaps/gq.json

**Notes.** Markers: src/core2/counted-reach.ts, src/core2/world-poverty.ts.
