---
id: counted-moves-baseline-inflow-from-abroad
title: "Counted moves gets a baseline inflow of people from abroad, from the ACS abroad margin"
area: core
kind: feature
priority: 2
size: M
status: done
claimed-by:
pr: #7591
blocked-on:
source: added with npm run pool -- add
---

**What.** Counted moves (src/core2/modules/counted-moves.ts) has no arrivals from abroad: the ACS mover-rates file keeps one combined arrivals-per-resident figure (B07001_081 'Moved from abroad' is quoted in its method but not stored apart), and the gravity fit scales arrivals to departures, so abroad is netted out. Real arrivals from abroad run about a million people a year. Give counted moves a baseline inflow from abroad per state from the ACS abroad margin, so every place's population includes it, then let us-federal-positions:immigration.admit-more-immigrants scale it (the question reaches nobody today: law-wiring reach 0, Butte AK, seed 3d8e41c7a09b25f6; outcome-web link more-immigration-to-workforce is size-not-set).

**Rules.** No dice. Sourced from the ACS abroad margin, never a remembered figure. Re-check Washington, D.C. (world seed 03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e) and Futiga, American Samoa (seed dpA) stay within 1.5 percent a year in counted-moves-balance.test.ts. One model: the same pull and arrivals path, not a second. Blocked: census.gov does not resolve from a cloud session; allow the host or give the margin.

**Done when.** Every place's counted population includes a sourced yearly inflow from abroad; counted-moves-balance, counted-moves-town/places/causes and moves tests pass; the federal question enacted by a real bill raises that inflow and the checker grades its reach; SG-LAWS-federal-position-no-reader loses this question.

**Files.** src/core2/modules/counted-moves.ts, data/research/migration/mover-rates-acs-2024.json, src/core2/modules/laws.ts

**Notes.** Found by the Dev Tester, Nov 8 night. Blocked on census.gov.
