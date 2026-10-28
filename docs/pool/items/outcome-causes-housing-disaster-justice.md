---
id: outcome-causes-housing-disaster-justice
title: "The home-price, disaster and pretrial-detention links run: housing, disasters and justice record their causes and the web keeps the outcomes"
area: world
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from core-outcome-causes-recorded, Oct 19"
claimed-at:
---

**What.** Seven links wait on causes or outcomes that the disaster and justice engines and the school-year environment do not record: the three `disaster-to-*` links (a severe disaster), `pretrial-detention-to-conviction` and `pretrial-detention-to-employment`, `release-lower-level-to-larceny`, and `heat-to-learning`. (`home-prices-to-owner-births` and `home-prices-to-renter-births` were listed here and are already wired in `src/core2/data/outcome-web/coverage.json`; nothing is left to build for them.) A link runs on the new core only when its cause is readable (an engine measure in `engineMeasures`, a government measure in `src/core2/gov-measures.ts`, or a law) and its outcome is one the web keeps (`keptOutcomes` in `src/core2/data/outcome-web/outcome-web.json` with a sourced or estimated national base), and `linkCoverage` in `src/core2/outcome-web-model.ts` checks both. So each link here needs two things: the owning engine's record of the cause, and a kept outcome with its base and source.

**Rules.** Wire to the world: an effect is a read, not a record, so the outcome is read by the engine that owns it through `outcomeWebFactor` or a kept measure that views and news read. No dice: the cause record moves the outcome by the link's researched size, never a roll. One rule, all 56 places: place facts live in data.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place of all 56 and a seed the builder did not choose, a recorded severe disaster moves the linked transfers, moves out and home values, each named by the engine record id, the link key and the web month record id. The test src/core2/outcome-web.test.ts lists each link as built, and `src/core2/data/outcome-web/coverage.json` moves it from waiting to wired.

**Files.** src/core2/modules/outcome-web.ts, src/core2/data/outcome-web/outcome-web.json, src/core2/modules/housing.ts

**Notes.** Split from core-outcome-causes-recorded, which was really three bounded pieces (found building it: engine measures are read from world-metrics month fields, government measures from `gov-measures.ts`, and a wired link also needs a kept outcome, so no link is a one-line change). The links' sizes and anchors are in data/research/outcome-web/links.json.
