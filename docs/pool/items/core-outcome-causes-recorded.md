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
