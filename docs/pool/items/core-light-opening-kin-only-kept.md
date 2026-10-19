---
id: core-light-opening-kin-only-kept
title: "Kin, temperament and falling-outs are built only for the households the opening keeps full"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-light-opening-kin-households
source: split from core-light-opening (M, really L) by the claiming session, Oct 19
claimed-at:
---

**What.** Pass the kept-household set into openingFamilies so buildOpeningKin and openingTemperaments run for those households alone, and leave kin, temperament and falling-outs out of every counted household. The counted population then counts only the people who live in the town, not their relatives outside it. Parent-child links and family facts exist for the kept households and no others.

**Rules.** One model, two tiers: a counted household has no individual kin until it is filled in, and the counts it contributes to are read by every engine as before. Speed: a town's game year runs in under two minutes; measure the opening before and after on the same machine. Estimate, never unknown: a counted person's kin count shown anywhere is an estimate from the same fertility tables.

**Done when.** In buildBenchWorld in a drawn place and a seed the builder did not choose, the opening shows kin and temperament records only for kept households, by record id, and the opening time before and after on one machine is in the PR body; the tests that read opening kin (src/core2/opening-kin.test.ts, fill-in-people.test.ts) are updated to draw a kept household.

**Files.** src/core2/population.ts, src/core2/opening-kin.ts, src/core2/opening-personality.ts, src/core2/opening-falling-outs.ts

**Notes.** Wider population should fall back toward the town's real count; check births-counted and views-counted readers for anything that expected husk kin in the counts.
