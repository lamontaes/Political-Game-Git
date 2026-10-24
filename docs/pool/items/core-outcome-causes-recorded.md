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

Looked at Oct 17 (claude), link by link, which are one engine record away from built: none is. `disaster-to-out-migration` waits only on `disaster.severe`, but the disasters module replays real FEMA declarations for the town's county from the world's start date and then stops (its header: a world past the end of the records has no new disasters until the owner rules on `owner-disasters-in-play`), and the FEMA data carries no deaths, which is the research's threshold for severe. Recording a cause now would fire in few worlds and take its size from an invented mapping from damaged homes to deaths. `marriage-equality-to-coverage` has no place that differs (national law since 2015). The counted-moves pull already reads the income-tax law in force directly, so adding the web's `population.out-migration` as a second reader would count the same cause twice. The health, lead, heat, press and pretrial links each need an engine that does not exist. Recommended order once `owner-disasters-in-play` is ruled: disaster records first (severity from a ruled measure), then coverage (needs a coverage engine), the rest as their engines land.

Oct 23, merger A: The historical recommendation above is not a current coverage inventory; the later main send-back and current wired coverage remain authoritative. No implementation is completed by this historical Notes addition.

Oct 23 (claude, fixer): accounting against current `src/core2/data/outcome-web/coverage.json`: of the 18 links named above, `home-prices-to-owner-births` and `home-prices-to-renter-births` are wired and 16 still wait. The three child items cover all 16: outcome-causes-press-government (2), outcome-causes-health-programs (7, including `abortion-denied-to-financial-distress`) and outcome-causes-housing-disaster-justice (7). This item stays open until its children are built.
Sent back 2026-10-24 from planning PR #5075 (branch claude/outcome-causes-split): own-environment applicable checks passed on ad9e8cac2813c16e38dab993c97776441a603cc3, but the head-pinned merge returned 405 merge conflicts after main advanced; implementation acceptance remains open. Finish the planning merge on that branch, merge current main into it first and rerun the changed-file checks.
