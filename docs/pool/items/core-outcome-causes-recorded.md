---
id: core-outcome-causes-recorded
title: "The engines record the causes the outcome web waits on"
area: core
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr: #5075
blocked-on:
source: "split from core-stopgap-outcome-web-faked-mechanic (SG-WEB-outcome-drift), Oct 15"
claimed-at:
---

**What.** 18 links wait because no engine records their cause (`cause-not-recorded`): pretrial detention, a severe disaster, health coverage, the earned income credit, blood lead, school-year heat, home prices, marriage equality, a denied abortion, a local newspaper closing and an exposed corruption case. Each cause is recorded by the engine that owns the thing (justice, disasters, health, programs, housing, press, officials) as a kept measure the web reads, one link at a time. The links include: `pretrial-detention-to-conviction`, `pretrial-detention-to-employment`, `release-lower-level-to-larceny`, `disaster-to-public-transfers`, `disaster-to-out-migration`, `disaster-to-home-values`, `coverage-to-catastrophic-bills`, `coverage-to-medical-debt`, `coverage-to-depression`, `eitc-to-low-birthweight`, `lead-to-reading`, `heat-to-learning`, `home-prices-to-owner-births`, `home-prices-to-renter-births`, `marriage-equality-to-coverage`, `abortion-denied-to-financial-distress`, `newspaper-clos

**Rules.** Wire to the world: an effect is a read, not a record. Each cause is a record another engine writes and the web reads. One rule, all 56 places.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) each cause wired in this item is recorded by its owning engine and the web moves its outcome from it, shown by the cause record id, the link key and the web month record id; the test in src/core2/outcome-web.test.ts lists the link as built.

**Files.** src/core2/modules/outcome-web.ts, src/core2/outcome-web-model.ts, data/research/outcome-web/links.json

**Notes.** Split from core-stopgap-outcome-web-faked-mechanic. Take one cause per PR if it grows. The crime-engine question is owner-crime-engine.

Sent back 2026-10-22 from PR #5075 (branch claude/outcome-causes-split): The proposed split is stale/incomplete against current main. Its three children list 2 + 6 + 9 = 17 links, while the body and parent claim 18; abortion-denied-to-financial-distress is in the parent and current coverage waiting list but is assigned to none of the children. Also outcome-causes-housing-disaster-justice.md:16 describes home-prices-to-owner-births and home-prices-to-renter-births as waiting, while src/core2/data/outcome-web/coverage.json already lists both as wired. Reconcile the split with current coverage and account for the omitted link, preserving completed work rather than creating duplicate implementation tasks. The bare first-line core-outcome-causes-recorded marker would automatically complete the unfinished parent despite this being specifications only; correct its routing and keep the parent acceptance open. No local standard gate pass or engine completion is claimed for this source review.; finish on that branch, merge main into it first.
