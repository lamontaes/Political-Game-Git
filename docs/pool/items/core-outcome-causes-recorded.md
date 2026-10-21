---
id: core-outcome-causes-recorded
title: "The engines record the causes the outcome web waits on"
area: core
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/outcome-causes-recorded
pr: #5075
blocked-on:
source: "split from core-stopgap-outcome-web-faked-mechanic (SG-WEB-outcome-drift), Oct 15"
claimed-at: 2026-10-19T18:17:59.568Z
---

**What.** 18 links wait because no engine records their cause (`cause-not-recorded`): pretrial detention, a severe disaster, health coverage, the earned income credit, blood lead, school-year heat, home prices, marriage equality, a denied abortion, a local newspaper closing and an exposed corruption case. Each cause is recorded by the engine that owns the thing (justice, disasters, health, programs, housing, press, officials) as a kept measure the web reads, one link at a time. The links include: `pretrial-detention-to-conviction`, `pretrial-detention-to-employment`, `release-lower-level-to-larceny`, `disaster-to-public-transfers`, `disaster-to-out-migration`, `disaster-to-home-values`, `coverage-to-catastrophic-bills`, `coverage-to-medical-debt`, `coverage-to-depression`, `eitc-to-low-birthweight`, `lead-to-reading`, `heat-to-learning`, `home-prices-to-owner-births`, `home-prices-to-renter-births`, `marriage-equality-to-coverage`, `abortion-denied-to-financial-distress`, `newspaper-clos

**Rules.** Wire to the world: an effect is a read, not a record. Each cause is a record another engine writes and the web reads. One rule, all 56 places.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) each cause wired in this item is recorded by its owning engine and the web moves its outcome from it, shown by the cause record id, the link key and the web month record id; the test in src/core2/outcome-web.test.ts lists the link as built.

**Files.** src/core2/modules/outcome-web.ts, src/core2/outcome-web-model.ts, data/research/outcome-web/links.json

**Notes.** Split from core-stopgap-outcome-web-faked-mechanic. Take one cause per PR if it grows. The crime-engine question is owner-crime-engine.

Looked at Oct 17 (claude), link by link, which are one engine record away from built: none is. `disaster-to-out-migration` waits only on `disaster.severe`, but the disasters module replays real FEMA declarations for the town's county from the world's start date and then stops (its header: a world past the end of the records has no new disasters until the owner rules on `owner-disasters-in-play`), and the FEMA data carries no deaths, which is the research's threshold for severe. Recording a cause now would fire in few worlds and take its size from an invented mapping from damaged homes to deaths. `marriage-equality-to-coverage` has no place that differs (national law since 2015). The counted-moves pull already reads the income-tax law in force directly, so adding the web's `population.out-migration` as a second reader would count the same cause twice. The health, lead, heat, press and pretrial links each need an engine that does not exist. Recommended order once `owner-disasters-in-play` is ruled: disaster records first (severity from a ruled measure), then coverage (needs a coverage engine), the rest as their engines land.
