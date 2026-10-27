---
id: outcome-causes-health-programs
title: "The coverage, earned-income-credit and blood-lead links run: health and programs engines record their causes and the web keeps the outcomes"
area: people
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

**What.** Seven links wait on causes the health, programs and pregnancy engines do not record: `coverage-to-catastrophic-bills`, `coverage-to-medical-debt`, `coverage-to-depression` (health coverage share), `marriage-equality-to-coverage`, `eitc-to-low-birthweight` (earned income credit dollars) `lead-to-reading` (children's blood lead) and `abortion-denied-to-financial-distress` (a person whose abortion was denied, outcome finance.past-due-debt; waiting on `person.abortion-denied` in `coverage.json`). Each cause is a share or total over the place's people, read from the coverage, benefit and health rows the engines already write. A link runs on the new core only when its cause is readable (an engine measure in `engineMeasures`, a government measure in `src/core2/gov-measures.ts`, or a law) and its outcome is one the web keeps (`keptOutcomes` in `src/core2/data/outcome-web/outcome-web.json` with a sourced or estimated national base), and `linkCoverage` in `src/core2/outcome-web-model.ts` checks both. So each link here needs two things: the owning engine's record of the cause, and a kept outcome with its base and source.

**Rules.** Wire to the world: an effect is a read, not a record, so the outcome is read by the engine that owns it through `outcomeWebFactor` or a kept measure that views and news read. No dice: the cause record moves the outcome by the link's researched size, never a roll. One rule, all 56 places: place facts live in data.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place of all 56 and a seed the builder did not choose, a change in the place's coverage share, earned-income-credit dollars, blood lead or the people denied an abortion moves the linked outcome by the link's size after its lag, named by the engine's record id, the link key and the web month record id. The test src/core2/outcome-web.test.ts lists each link as built, and `src/core2/data/outcome-web/coverage.json` moves it from waiting to wired.

**Files.** src/core2/modules/outcome-web.ts, src/core2/data/outcome-web/outcome-web.json, src/core2/modules/health.ts

**Notes.** No engine pays an earned income credit yet (no module mentions it), so that link also needs the credit built in the government area first. Split from core-outcome-causes-recorded, which was really three bounded pieces (found building it: engine measures are read from world-metrics month fields, government measures from `gov-measures.ts`, and a wired link also needs a kept outcome, so no link is a one-line change). The links' sizes and anchors are in data/research/outcome-web/links.json.
